/**
 * Integration tests for the REST API tools. The figma-rest client is mocked;
 * these verify tool registration gating (token present vs absent), argument
 * plumbing, and output formatting.
 */
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fs from "fs";
import os from "os";
import path from "path";

// Variables referenced inside jest.mock's factory must be prefixed with "mock".
let mockHasToken = true;
const mockResolveFigmaRef = jest.fn();
const mockWhoami = jest.fn();
const mockGetFile = jest.fn();
const mockGetNodes = jest.fn();
const mockRenderImages = jest.fn();
const mockGetComments = jest.fn();
const mockPostComment = jest.fn();
const mockDownloadRender = jest.fn();

jest.mock("../../src/talk_to_figma_mcp/utils/figma-rest", () => ({
  hasRestToken: () => mockHasToken,
  redactToken: (s: string) => s,
  resolveFigmaRef: (...a: any[]) => mockResolveFigmaRef(...a),
  restWhoami: (...a: any[]) => mockWhoami(...a),
  restGetFile: (...a: any[]) => mockGetFile(...a),
  restGetNodes: (...a: any[]) => mockGetNodes(...a),
  restRenderImages: (...a: any[]) => mockRenderImages(...a),
  restGetComments: (...a: any[]) => mockGetComments(...a),
  restPostComment: (...a: any[]) => mockPostComment(...a),
  downloadRender: (...a: any[]) => mockDownloadRender(...a),
}));

import { registerRestTools } from "../../src/talk_to_figma_mcp/tools/rest-tools";

const handlers = new Map<string, { handler: Function; schema: z.ZodObject<any> }>();

function makeServer() {
  handlers.clear();
  const server = new McpServer({ name: "test", version: "1.4.0" }, { capabilities: { tools: {} } });
  const orig = server.registerTool.bind(server);
  jest.spyOn(server, "registerTool").mockImplementation((...args: any[]) => {
    if (args.length === 3) {
      const [name, config, handler] = args;
      handlers.set(name, { handler, schema: z.object(config.inputSchema ?? {}) });
    }
    return (orig as any)(...args);
  });
  registerRestTools(server);
  return server;
}

async function call(name: string, args: any) {
  const entry = handlers.get(name);
  if (!entry) throw new Error(`tool not registered: ${name}`);
  return entry.handler(entry.schema.parse(args), { meta: {} });
}

function firstText(result: any): string {
  return (result?.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");
}

beforeEach(() => {
  mockHasToken = true;
  [mockResolveFigmaRef, mockWhoami, mockGetFile, mockGetNodes, mockRenderImages, mockGetComments, mockPostComment, mockDownloadRender].forEach((m) => m.mockReset());
  mockResolveFigmaRef.mockImplementation((s: string) => ({ fileKey: "KEY", nodeId: undefined }));
});

describe("registration gating", () => {
  it("registers REST tools when a token is configured", () => {
    makeServer();
    expect(handlers.has("rest_get_file")).toBe(true);
    expect(handlers.has("rest_render_image")).toBe(true);
    expect(handlers.has("rest_post_comment")).toBe(true);
  });

  it("registers NO REST tools when no token is configured", () => {
    mockHasToken = false;
    makeServer();
    expect(handlers.size).toBe(0);
  });
});

describe("rest_get_file", () => {
  it("reads the file root and returns a filtered document", async () => {
    makeServer();
    mockGetFile.mockResolvedValue({
      name: "My File",
      lastModified: "2026-01-01",
      version: "9",
      document: { id: "0:0", name: "Document", type: "DOCUMENT", children: [] },
    });

    const result = await call("rest_get_file", { file: "KEY", depth: 1 });
    expect(mockGetFile).toHaveBeenCalledWith("KEY", 1);
    expect(result.structuredContent.file).toBe("My File");
    expect(result.structuredContent.document.id).toBe("0:0");
  });

  it("reads a specific node when nodeId is given (depth+1 to the plugin)", async () => {
    makeServer();
    mockGetNodes.mockResolvedValue({
      name: "My File",
      lastModified: "2026-01-01",
      nodes: { "12:34": { document: { id: "12:34", name: "Card", type: "FRAME", children: [] } } },
    });

    const result = await call("rest_get_file", { file: "KEY", nodeId: "12:34", depth: 1 });
    expect(mockGetNodes).toHaveBeenCalledWith("KEY", ["12:34"], 2);
    expect(result.structuredContent.node.name).toBe("Card");
  });

  it("flags a missing node as an error", async () => {
    makeServer();
    mockGetNodes.mockResolvedValue({ name: "F", lastModified: "x", nodes: { "9:9": null } });
    const result = await call("rest_get_file", { file: "KEY", nodeId: "9:9" });
    expect(result.isError).toBe(true);
    expect(firstText(result)).toContain("was not found");
  });
});

describe("rest_render_image", () => {
  it("renders, writes files, and returns the first raster inline", async () => {
    makeServer();
    mockResolveFigmaRef.mockReturnValue({ fileKey: "KEY", nodeId: "1:2" });
    mockRenderImages.mockResolvedValue({ err: null, images: { "1:2": "https://figma-render.example/abc.png" } });
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
    mockDownloadRender.mockResolvedValue(png);

    const outDir = path.join(os.tmpdir(), `rest-render-${Date.now()}`);
    try {
      const result = await call("rest_render_image", { file: "https://figma.com/design/KEY/x?node-id=1-2", outDir });
      expect(mockRenderImages).toHaveBeenCalledWith("KEY", ["1:2"], { format: "png", scale: 2 });
      const img = result.content.find((c: any) => c.type === "image");
      expect(img).toBeTruthy();
      expect(img.mimeType).toBe("image/png");
      expect(firstText(result)).toContain("→");
      const written = fs.readdirSync(outDir);
      expect(written.length).toBe(1);
    } finally {
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  it("errors when there are no nodes to render", async () => {
    makeServer();
    mockResolveFigmaRef.mockReturnValue({ fileKey: "KEY", nodeId: undefined });
    const result = await call("rest_render_image", { file: "KEY" });
    expect(result.isError).toBe(true);
    expect(firstText(result)).toContain("No nodes to render");
    expect(mockRenderImages).not.toHaveBeenCalled();
  });
});

describe("rest comments", () => {
  it("lists open comments and hides resolved ones by default", async () => {
    makeServer();
    mockGetComments.mockResolvedValue({
      comments: [
        { id: "c1", message: "Open one", user: { handle: "ana" }, created_at: "t", resolved_at: null },
        { id: "c2", message: "Done", user: { handle: "bob" }, created_at: "t", resolved_at: "t2" },
      ],
    });
    const result = await call("rest_get_comments", { file: "KEY" });
    const text = firstText(result);
    expect(text).toContain("Open one");
    expect(text).not.toContain("Done");
  });

  it("posts a comment anchored to a node", async () => {
    makeServer();
    mockResolveFigmaRef.mockReturnValue({ fileKey: "KEY", nodeId: undefined });
    mockPostComment.mockResolvedValue({ id: "new1", user: { handle: "me" } });
    const result = await call("rest_post_comment", { file: "KEY", message: "Looks great", nodeId: "5:5" });
    expect(mockPostComment).toHaveBeenCalledWith("KEY", "Looks great", { nodeId: "5:5", replyTo: undefined });
    expect(firstText(result)).toContain("Comment posted (id new1)");
  });
});
