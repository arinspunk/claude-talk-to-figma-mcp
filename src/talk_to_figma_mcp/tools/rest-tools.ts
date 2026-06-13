import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { coerceJson } from "../utils/schema-helpers";
import { filterFigmaNode } from "../utils/figma-helpers";
import { logger } from "../utils/logger";
import {
  hasRestToken,
  resolveFigmaRef,
  redactToken,
  restWhoami,
  restGetFile,
  restGetNodes,
  restRenderImages,
  restGetComments,
  restPostComment,
  downloadRender,
} from "../utils/figma-rest";
import fs from "fs";
import path from "path";

/**
 * Figma REST API tools (personal access token).
 *
 * These work WITHOUT the plugin or an open Figma session: they read and render
 * any file the token's user can access, and manage comments. They are only
 * registered when a token is configured (FIGMA_PERSONAL_TOKEN), so the tool
 * list stays clean for plugin-only setups. The REST API cannot modify document
 * content — use the plugin tools for writes.
 */

const fileParam = z
  .string()
  .describe("Figma file: paste a figma.com URL (node-id is picked up automatically) or a bare file key.");

const restError = (what: string, error: unknown) => ({
  content: [
    {
      type: "text" as const,
      text: `Error ${what}: ${redactToken(error instanceof Error ? error.message : String(error))}`,
    },
  ],
  isError: true,
});

export function registerRestTools(server: McpServer): void {
  if (!hasRestToken()) {
    logger.info(
      "Figma REST API tools disabled (no FIGMA_PERSONAL_TOKEN configured). Plugin tools are unaffected."
    );
    return;
  }
  logger.info("Figma REST API tools enabled (personal access token detected)");

  server.registerTool(
    "rest_whoami",
    {
      description:
        "Verify the configured Figma personal access token: returns the token owner's handle and email. Use it to debug REST setup issues.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const me = await restWhoami();
        return {
          content: [{ type: "text", text: `Token OK — authenticated as ${me.handle} (${me.email})` }],
          structuredContent: { handle: me.handle, email: me.email },
        };
      } catch (error) {
        return restError("verifying the Figma token", error);
      }
    }
  );

  server.registerTool(
    "rest_get_file",
    {
      description:
        "Read a Figma file's structure via the REST API — works WITHOUT the plugin or an open Figma session, for ANY file the token's user can access. Pass a figma.com URL (its node-id is used automatically) or a file key. Returns the filtered node tree to the requested depth (deeper levels become id/name/type stubs). Read-only: use plugin tools to modify the open file.",
      inputSchema: {
        file: fileParam,
        nodeId: z.string().optional().describe('Node to read (e.g. "12:34"). Overrides the URL\'s node-id. Omit to read the file root (pages).'),
        depth: z.coerce.number().int().min(0).optional().describe("Child levels returned in full detail (default 1)."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ file, nodeId, depth }) => {
      try {
        const ref = resolveFigmaRef(file);
        const effectiveNodeId = nodeId || ref.nodeId;
        const effectiveDepth = depth ?? 1;

        if (effectiveNodeId) {
          const res = await restGetNodes(ref.fileKey, [effectiveNodeId], effectiveDepth + 1);
          const entry = res.nodes[effectiveNodeId];
          if (!entry) {
            throw new Error(`Node ${effectiveNodeId} was not found in this file.`);
          }
          const filtered = filterFigmaNode(entry.document, effectiveDepth);
          const payload = { file: res.name, lastModified: res.lastModified, node: filtered };
          return {
            content: [{ type: "text", text: JSON.stringify(payload) }],
            structuredContent: payload as Record<string, unknown>,
          };
        }

        const res = await restGetFile(ref.fileKey, effectiveDepth);
        const filtered = filterFigmaNode(res.document, effectiveDepth);
        const payload = { file: res.name, lastModified: res.lastModified, version: res.version, document: filtered };
        return {
          content: [{ type: "text", text: JSON.stringify(payload) }],
          structuredContent: payload as Record<string, unknown>,
        };
      } catch (error) {
        return restError("reading the file via REST API", error);
      }
    }
  );

  server.registerTool(
    "rest_render_image",
    {
      description:
        "Render Figma nodes to images via the REST API — works WITHOUT the plugin, for ANY file the token's user can access (the remote counterpart of get_visual_snapshot). Renders server-side, saves the files to disk, and returns the first raster inline so you can SEE it. Pass a figma.com URL with node-id, or file + nodeIds.",
      inputSchema: {
        file: fileParam,
        nodeIds: coerceJson(z.array(z.string()))
          .optional()
          .describe('Nodes to render (e.g. ["12:34"]). Defaults to the URL\'s node-id.'),
        format: z.enum(["png", "jpg", "svg"]).optional().describe("Render format (default png)."),
        scale: z.coerce.number().min(0.01).max(4).optional().describe("Render scale 0.01–4 (default 2)."),
        outDir: z.string().optional().describe("Directory to write renders into (default: ./figma-assets)."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ file, nodeIds, format, scale, outDir }) => {
      try {
        const ref = resolveFigmaRef(file);
        const ids = nodeIds && nodeIds.length ? nodeIds : ref.nodeId ? [ref.nodeId] : [];
        if (!ids.length) {
          throw new Error("No nodes to render: pass nodeIds, or a figma.com URL that includes ?node-id=…");
        }

        const fmt = format ?? "png";
        const res = await restRenderImages(ref.fileKey, ids, { format: fmt, scale: scale ?? 2 });
        if (res.err) throw new Error(`Figma could not render: ${res.err}`);

        const dir = outDir || path.join(process.cwd(), "figma-assets");
        fs.mkdirSync(dir, { recursive: true });

        const lines: string[] = [];
        let inlineImage: { data: string; mimeType: string } | null = null;
        const mime = fmt === "png" ? "image/png" : fmt === "jpg" ? "image/jpeg" : "image/svg+xml";

        for (const id of ids) {
          const url = res.images[id];
          if (!url) {
            lines.push(`✗ ${id}: Figma could not render this node (deleted, empty, or unsupported).`);
            continue;
          }
          const buffer = await downloadRender(url);
          const filepath = path.join(dir, `render-${id.replace(/[^a-z0-9]+/gi, "-")}-${Date.now()}.${fmt}`);
          fs.writeFileSync(filepath, buffer);
          lines.push(`✓ ${id} → ${filepath} (${Math.round(buffer.length / 1024)}KB)`);

          // Show the first raster inline (vision); skip SVG and oversized payloads.
          if (!inlineImage && fmt !== "svg" && buffer.length < 4 * 1024 * 1024) {
            inlineImage = { data: buffer.toString("base64"), mimeType: mime };
          }
        }

        const content: any[] = [];
        if (inlineImage) content.push({ type: "image", data: inlineImage.data, mimeType: inlineImage.mimeType });
        content.push({ type: "text", text: lines.join("\n") });
        return { content };
      } catch (error) {
        return restError("rendering via REST API", error);
      }
    }
  );

  server.registerTool(
    "rest_get_comments",
    {
      description:
        "List the comments on a Figma file via the REST API (author, message, anchored node, resolved state). Works without the plugin.",
      inputSchema: {
        file: fileParam,
        includeResolved: z.coerce.boolean().optional().describe("Include resolved comments (default false)."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ file, includeResolved }) => {
      try {
        const ref = resolveFigmaRef(file);
        const res = await restGetComments(ref.fileKey);
        const comments = res.comments.filter((c) => includeResolved || !c.resolved_at);

        if (!comments.length) {
          return { content: [{ type: "text", text: "No open comments on this file." }] };
        }

        const lines = comments.map((c) => {
          const anchor = c.client_meta?.node_id ? ` @node ${c.client_meta.node_id}` : "";
          const reply = c.parent_id ? ` (reply to ${c.parent_id})` : "";
          const resolved = c.resolved_at ? " [resolved]" : "";
          return `• [${c.id}] ${c.user.handle} (${c.created_at})${anchor}${reply}${resolved}: ${c.message}`;
        });
        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (error) {
        return restError("listing comments via REST API", error);
      }
    }
  );

  server.registerTool(
    "rest_post_comment",
    {
      description:
        "Post a comment to a Figma file via the REST API (visible to all file collaborators, attributed to the token's user). Optionally anchor it to a node or reply to an existing comment. The only write the REST API supports — document edits still need the plugin.",
      inputSchema: {
        file: fileParam,
        message: z.string().min(1).describe("Comment text."),
        nodeId: z.string().optional().describe("Anchor the comment to this node."),
        replyTo: z.string().optional().describe("Comment ID to reply to (from rest_get_comments)."),
      },
    },
    async ({ file, message, nodeId, replyTo }) => {
      try {
        const ref = resolveFigmaRef(file);
        const posted = await restPostComment(ref.fileKey, message, {
          nodeId: nodeId || ref.nodeId,
          replyTo,
        });
        return {
          content: [{ type: "text", text: `Comment posted (id ${posted.id}) as ${posted.user.handle}.` }],
        };
      } catch (error) {
        return restError("posting the comment via REST API", error);
      }
    }
  );
}
