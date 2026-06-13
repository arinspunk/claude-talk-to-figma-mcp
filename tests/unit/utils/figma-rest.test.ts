/**
 * Unit tests for the Figma REST client helpers:
 *  - parseFigmaRef / resolveFigmaRef (pure URL + file-key parsing)
 *  - redactToken (token never leaks into error text)
 *  - figmaApi 429/Retry-After retry + error mapping (mocked fetch)
 *
 * The token is resolved once at module load from env, so the token-dependent
 * suites import a FRESH module instance with a controlled env.
 */
import { parseFigmaRef, resolveFigmaRef } from "../../../src/talk_to_figma_mcp/utils/figma-rest";

describe("parseFigmaRef", () => {
  it("accepts a bare file key", () => {
    expect(parseFigmaRef("abcDEF123456789xyz")).toEqual({ fileKey: "abcDEF123456789xyz" });
  });

  it("parses a /design/ URL and converts node-id dashes to colons", () => {
    const ref = parseFigmaRef("https://www.figma.com/design/KEY12345678901234/My-File?node-id=12-34");
    expect(ref).toEqual({ fileKey: "KEY12345678901234", nodeId: "12:34" });
  });

  it("parses a legacy /file/ URL", () => {
    const ref = parseFigmaRef("https://figma.com/file/KEY12345678901234/Name");
    expect(ref?.fileKey).toBe("KEY12345678901234");
    expect(ref?.nodeId).toBeUndefined();
  });

  it("targets the branch key for branch URLs", () => {
    const ref = parseFigmaRef(
      "https://www.figma.com/design/MAINKEY1234567890/branch/BRANCHKEY1234567/Name?node-id=1-2"
    );
    expect(ref).toEqual({ fileKey: "BRANCHKEY1234567", nodeId: "1:2" });
  });

  it("handles board and slides URLs", () => {
    expect(parseFigmaRef("https://figma.com/board/BOARDKEY123456789/x")?.fileKey).toBe("BOARDKEY123456789");
    expect(parseFigmaRef("https://figma.com/slides/SLIDEKEY123456789/x")?.fileKey).toBe("SLIDEKEY123456789");
  });

  it("rejects non-figma URLs and junk", () => {
    expect(parseFigmaRef("https://example.com/design/KEY12345678901234/x")).toBeNull();
    expect(parseFigmaRef("https://evil-figma.com.attacker.net/design/KEY12345678901234/x")).toBeNull();
    expect(parseFigmaRef("not a url and not a key")).toBeNull();
    expect(parseFigmaRef("short")).toBeNull();
  });

  it("resolveFigmaRef throws a helpful error on invalid input", () => {
    expect(() => resolveFigmaRef("nope")).toThrow(/not a Figma file key or figma\.com URL/);
  });
});

describe("token-dependent helpers (fresh module per env)", () => {
  const ORIGINAL_ENV = process.env.FIGMA_PERSONAL_TOKEN;
  const realFetch = global.fetch;

  async function freshModule(token?: string) {
    jest.resetModules();
    for (const k of ["FIGMA_PERSONAL_TOKEN", "FIGMA_API_TOKEN", "FIGMA_TOKEN"]) delete process.env[k];
    if (token !== undefined) process.env.FIGMA_PERSONAL_TOKEN = token;
    return import("../../../src/talk_to_figma_mcp/utils/figma-rest");
  }

  afterEach(() => {
    global.fetch = realFetch;
    jest.useRealTimers();
  });

  afterAll(() => {
    if (ORIGINAL_ENV === undefined) delete process.env.FIGMA_PERSONAL_TOKEN;
    else process.env.FIGMA_PERSONAL_TOKEN = ORIGINAL_ENV;
  });

  it("hasRestToken reflects presence; empty/placeholder count as unset", async () => {
    expect((await freshModule(undefined)).hasRestToken()).toBe(false);
    expect((await freshModule("   ")).hasRestToken()).toBe(false);
    expect((await freshModule("${user_config.figma_personal_token}")).hasRestToken()).toBe(false);
    expect((await freshModule("figd_realtoken")).hasRestToken()).toBe(true);
  });

  it("redactToken scrubs the token from arbitrary text", async () => {
    const mod = await freshModule("figd_supersecret");
    expect(mod.redactToken("failed with figd_supersecret in header")).toBe("failed with [REDACTED] in header");
  });

  it("sends the token as a header (never in the URL) and parses JSON", async () => {
    const mod = await freshModule("figd_headercheck");
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ handle: "me", email: "me@x.com", id: "1" }), { status: 200 })
    );
    global.fetch = fetchMock as any;

    const me = await mod.restWhoami();
    expect(me.handle).toBe("me");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.figma.com/v1/me");
    expect(String(url)).not.toContain("figd_headercheck");
    expect((init.headers as Record<string, string>)["X-Figma-Token"]).toBe("figd_headercheck");
  });

  it("honors a 429 Retry-After, retries, then succeeds", async () => {
    const mod = await freshModule("figd_retry");
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(new Response('{"err":"rate limited"}', { status: 429, headers: { "retry-after": "2" } }))
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));
    global.fetch = fetchMock as any;

    jest.useFakeTimers();
    const p = mod.figmaApi("/v1/me");
    await jest.advanceTimersByTimeAsync(3000); // flush the ~2s Retry-After sleep
    const result = await p;

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("maps 401 to an actionable token error (no retry)", async () => {
    const mod = await freshModule("figd_bad");
    const fetchMock = jest.fn().mockResolvedValue(new Response('{"err":"Invalid token"}', { status: 401 }));
    global.fetch = fetchMock as any;

    await expect(mod.figmaApi("/v1/me")).rejects.toThrow(/invalid or has been revoked/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("requireRestToken path: calling an endpoint with no token throws guidance", async () => {
    const mod = await freshModule(undefined);
    await expect(mod.restWhoami()).rejects.toThrow(/No Figma personal access token is configured/);
  });
});
