/**
 * Figma REST API client (Personal Access Token).
 *
 * Complements the plugin transport: the REST API can read and RENDER any file
 * the token's user can access — no plugin, no open Figma session — and manage
 * comments. It can NOT mutate document content; writes stay on the plugin path.
 *
 * Token hygiene:
 *  - resolved once at startup from FIGMA_PERSONAL_TOKEN (or FIGMA_API_TOKEN /
 *    FIGMA_TOKEN, or --figma-token=...), kept in module scope, never exported;
 *  - sent only in the X-Figma-Token header (never in URLs, so it can't leak
 *    into request logs);
 *  - redactToken() scrubs it from any error text that might echo input.
 *
 * Rate limiting: Figma returns 429 with a Retry-After header. figmaApi()
 * honors Retry-After (falling back to exponential backoff + jitter, capped),
 * retries transient 5xx/network errors, and gives up after MAX_RETRIES with an
 * actionable error.
 */
import { logger } from "./logger";

const TOKEN_ENV_VARS = ["FIGMA_PERSONAL_TOKEN", "FIGMA_API_TOKEN", "FIGMA_TOKEN"];

// An empty string or an unexpanded DXT placeholder (e.g. when a host doesn't
// substitute optional user_config) both mean "no token configured".
function cleanToken(value: string | undefined): string | null {
  const t = value?.trim();
  if (!t || /^\$\{.*\}$/.test(t)) return null;
  return t;
}

// Resolved once; kept private to this module and never logged.
const FIGMA_TOKEN: string | null = (() => {
  const arg = process.argv.find((a) => a.startsWith("--figma-token="));
  const fromArg = cleanToken(arg?.slice("--figma-token=".length));
  if (fromArg) return fromArg;
  for (const name of TOKEN_ENV_VARS) {
    const value = cleanToken(process.env[name]);
    if (value) return value;
  }
  return null;
})();

/** Whether a personal access token is configured (gates rest_* tool registration). */
export function hasRestToken(): boolean {
  return FIGMA_TOKEN !== null;
}

function requireRestToken(): string {
  if (!FIGMA_TOKEN) {
    throw new Error(
      "No Figma personal access token is configured. Create one in Figma → Settings → " +
      "Security → Personal access tokens, set it as the FIGMA_PERSONAL_TOKEN environment " +
      "variable for this MCP server (or pass --figma-token=...), and restart the server. " +
      "Plugin-based tools work without a token."
    );
  }
  return FIGMA_TOKEN;
}

/** Scrub the token from a string before it can reach logs or tool output. */
export function redactToken(text: string): string {
  if (!FIGMA_TOKEN) return text;
  return text.split(FIGMA_TOKEN).join("[REDACTED]");
}

// ── File references ──────────────────────────────────────────────────────────

export interface FigmaRef {
  fileKey: string;
  nodeId?: string;
}

/**
 * Parse a file reference: a bare file key, or any figma.com URL
 * (design/file/proto/board/slides, including branch URLs). node-id query params
 * use the dash form ("12-34") and are normalized to the API form ("12:34").
 */
export function parseFigmaRef(input: string): FigmaRef | null {
  const trimmed = input.trim();
  if (/^[A-Za-z0-9]{15,128}$/.test(trimmed)) {
    return { fileKey: trimmed };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (!/(^|\.)figma\.com$/.test(url.hostname)) return null;

  const parts = url.pathname.split("/").filter(Boolean);
  const kinds = new Set(["design", "file", "proto", "board", "slides"]);
  if (parts.length < 2 || !kinds.has(parts[0])) return null;

  // Branch URLs (/design/:key/branch/:branchKey/:name) target the branch.
  let fileKey = parts[1];
  if (parts[2] === "branch" && parts.length > 3) {
    fileKey = parts[3];
  }

  const rawNodeId = url.searchParams.get("node-id");
  return {
    fileKey,
    nodeId: rawNodeId ? rawNodeId.replace(/-/g, ":") : undefined,
  };
}

/** Resolve a tool's `file` argument or throw with guidance. */
export function resolveFigmaRef(input: string): FigmaRef {
  const ref = parseFigmaRef(input);
  if (!ref) {
    throw new Error(
      `"${redactToken(input)}" is not a Figma file key or figma.com URL. ` +
      "Pass the file's URL (https://www.figma.com/design/<fileKey>/...) or its bare file key."
    );
  }
  return ref;
}

// ── HTTP layer with 429/5xx retry ────────────────────────────────────────────

const API_BASE = "https://api.figma.com";
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 60_000;
const REQUEST_TIMEOUT_MS = 60_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function backoffDelay(res: Response | null, attempt: number): number {
  const retryAfter = res ? Number(res.headers.get("retry-after")) : NaN;
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(MAX_BACKOFF_MS, retryAfter * 1000);
  }
  const base = BASE_BACKOFF_MS * 2 ** attempt;
  return Math.min(MAX_BACKOFF_MS, Math.round(base * (1 + 0.25 * Math.random())));
}

async function describeApiError(res: Response, path: string): Promise<string> {
  let detail = "";
  try {
    const body = (await res.json()) as { err?: string; message?: string };
    detail = body.err || body.message || "";
  } catch {
    /* non-JSON body */
  }
  const suffix = detail ? ` (${redactToken(detail)})` : "";
  switch (res.status) {
    case 400:
      return `Figma API rejected the request${suffix}. Check the parameters (node IDs use the "12:34" form).`;
    case 401:
      return "The Figma personal access token is invalid or has been revoked. Generate a new one in Figma → Settings → Security → Personal access tokens and update FIGMA_PERSONAL_TOKEN.";
    case 403:
      return `The token does not grant access to this resource${suffix}. The token's user needs access to the file, and the token needs the right scopes (e.g. File content for reads, Comments for posting).`;
    case 404:
      return "File not found — the file key is wrong, the file was deleted, or this token's user cannot see it.";
    case 429:
      return "Figma API rate limit reached and retries were exhausted. Wait a minute before trying again.";
    default:
      return `Figma API error ${res.status} on ${path}${suffix}.`;
  }
}

/** GET/POST api.figma.com with auth, timeouts, and 429/5xx retry. */
export async function figmaApi<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = requireRestToken();

  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
          ...(init.headers as Record<string, string> | undefined),
          "X-Figma-Token": token,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        const delay = backoffDelay(null, attempt);
        logger.warn(`Figma API network error on ${path} — retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await sleep(delay);
        continue;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(redactToken(`Figma API request failed after ${MAX_RETRIES} retries: ${message}`));
    }

    if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
      const delay = backoffDelay(res, attempt);
      logger.warn(
        `Figma API ${res.status} on ${path} — retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 1}/${MAX_RETRIES})`
      );
      await sleep(delay);
      continue;
    }

    if (!res.ok) {
      throw new Error(await describeApiError(res, path));
    }

    return (await res.json()) as T;
  }
}

// ── Typed endpoint helpers ───────────────────────────────────────────────────

export interface RestUser {
  id: string;
  email: string;
  handle: string;
}

export function restWhoami(): Promise<RestUser> {
  return figmaApi<RestUser>("/v1/me");
}

export interface RestFileResponse {
  name: string;
  lastModified: string;
  version: string;
  document: any; // REST_V1 document tree (same shape filterFigmaNode consumes)
}

export function restGetFile(fileKey: string, depth: number): Promise<RestFileResponse> {
  return figmaApi<RestFileResponse>(
    `/v1/files/${encodeURIComponent(fileKey)}?depth=${Math.max(1, Math.floor(depth))}`
  );
}

export interface RestNodesResponse {
  name: string;
  lastModified: string;
  nodes: Record<string, { document: any } | null>;
}

export function restGetNodes(fileKey: string, nodeIds: string[], depth?: number): Promise<RestNodesResponse> {
  const params = new URLSearchParams({ ids: nodeIds.join(",") });
  if (depth !== undefined) params.set("depth", String(Math.max(1, Math.floor(depth))));
  return figmaApi<RestNodesResponse>(`/v1/files/${encodeURIComponent(fileKey)}/nodes?${params}`);
}

export interface RestImagesResponse {
  err: string | null;
  images: Record<string, string | null>; // nodeId → short-lived render URL (null = render failed)
}

export function restRenderImages(
  fileKey: string,
  nodeIds: string[],
  opts: { format?: "png" | "jpg" | "svg"; scale?: number } = {}
): Promise<RestImagesResponse> {
  const params = new URLSearchParams({
    ids: nodeIds.join(","),
    format: opts.format ?? "png",
    scale: String(opts.scale ?? 2),
  });
  return figmaApi<RestImagesResponse>(`/v1/images/${encodeURIComponent(fileKey)}?${params}`);
}

export interface RestComment {
  id: string;
  message: string;
  user: { handle: string };
  created_at: string;
  resolved_at: string | null;
  parent_id?: string;
  client_meta?: { node_id?: string; node_offset?: { x: number; y: number } } | null;
}

export function restGetComments(fileKey: string): Promise<{ comments: RestComment[] }> {
  return figmaApi<{ comments: RestComment[] }>(`/v1/files/${encodeURIComponent(fileKey)}/comments`);
}

export function restPostComment(
  fileKey: string,
  message: string,
  opts: { nodeId?: string; x?: number; y?: number; replyTo?: string } = {}
): Promise<RestComment> {
  const body: Record<string, unknown> = { message };
  if (opts.replyTo) body.comment_id = opts.replyTo;
  if (opts.nodeId) {
    body.client_meta = {
      node_id: opts.nodeId,
      node_offset: { x: opts.x ?? 0, y: opts.y ?? 0 },
    };
  } else if (opts.x !== undefined && opts.y !== undefined) {
    body.client_meta = { x: opts.x, y: opts.y };
  }
  return figmaApi<RestComment>(`/v1/files/${encodeURIComponent(fileKey)}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Download a (pre-signed, tokenless) render URL returned by restRenderImages. */
export async function downloadRender(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!res.ok) {
    throw new Error(`Failed to download rendered image (HTTP ${res.status}). Render URLs expire — re-run the render.`);
  }
  return Buffer.from(await res.arrayBuffer());
}
