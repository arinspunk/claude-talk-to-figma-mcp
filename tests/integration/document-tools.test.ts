import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerDocumentTools } from "../../src/talk_to_figma_mcp/tools/document-tools";

jest.mock("../../src/talk_to_figma_mcp/utils/websocket", () => ({
  sendCommandToFigma: jest.fn(),
  joinChannel: jest.fn(),
  getConnectionStatus: jest.fn(),
}));

function makeServer() {
  const server = new McpServer(
    { name: "test-server", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  const handlers: Record<string, Function> = {};
  const schemas: Record<string, z.ZodObject<any>> = {};

  const originalTool = server.tool.bind(server);
  jest.spyOn(server, "tool").mockImplementation((...args: any[]) => {
    if (args.length === 4) {
      const [name, , schema, handler] = args;
      handlers[name] = handler;
      schemas[name] =
        Object.keys(schema).length > 0
          ? z.object(schema)
          : z.object({});
    }
    return (originalTool as any)(...args);
  });

  registerDocumentTools(server);
  return { server, handlers, schemas };
}

describe("get_connection_status tool", () => {
  let handlers: Record<string, Function>;
  let getConnectionStatus: jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
    const ws = require("../../src/talk_to_figma_mcp/utils/websocket");
    getConnectionStatus = ws.getConnectionStatus;
    ({ handlers } = makeServer());
  });

  it("returns connected=true and a channel when connected", async () => {
    getConnectionStatus.mockReturnValue({ connected: true, channel: "my-channel" });
    const result = await handlers["get_connection_status"]({}, { meta: {} });
    expect(result.content[0].text).toBe(JSON.stringify({ connected: true, channel: "my-channel" }));
  });

  it("returns connected=false and channel=null when disconnected", async () => {
    getConnectionStatus.mockReturnValue({ connected: false, channel: null });
    const result = await handlers["get_connection_status"]({}, { meta: {} });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.connected).toBe(false);
    expect(parsed.channel).toBeNull();
  });

  it("does not call sendCommandToFigma (no network round-trip)", async () => {
    const ws = require("../../src/talk_to_figma_mcp/utils/websocket");
    getConnectionStatus.mockReturnValue({ connected: true, channel: "test" });
    await handlers["get_connection_status"]({}, { meta: {} });
    expect(ws.sendCommandToFigma).not.toHaveBeenCalled();
  });
});

describe("get_document_info tool", () => {
  let handlers: Record<string, Function>;
  let mockSendCommand: jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
    const ws = require("../../src/talk_to_figma_mcp/utils/websocket");
    mockSendCommand = ws.sendCommandToFigma;
    ({ handlers } = makeServer());
  });

  it("returns a shallow summary with pages and top-level frames", async () => {
    mockSendCommand.mockResolvedValue({
      id: "0:1",
      name: "My Document",
      type: "DOCUMENT",
      children: [
        {
          id: "1:0",
          name: "Page 1",
          type: "PAGE",
          children: [
            { id: "1:1", name: "Frame", type: "FRAME", absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 } },
            { id: "1:2", name: "Arrow", type: "VECTOR" },
          ],
        },
      ],
    });
    const result = await handlers["get_document_info"]({}, { meta: {} });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe("0:1");
    expect(parsed.name).toBe("My Document");
    expect(parsed.pages).toHaveLength(1);
    expect(parsed.pages[0].name).toBe("Page 1");
    // Top-level frames are included, VECTOR nodes are filtered out
    const frameTypes = parsed.pages[0].frames.map((f: any) => f.type);
    expect(frameTypes).toContain("FRAME");
    expect(frameTypes).not.toContain("VECTOR");
    // Frames include bounding box but no deep children
    expect(parsed.pages[0].frames[0].absoluteBoundingBox).toBeDefined();
    expect(parsed.pages[0].frames[0].children).toBeUndefined();
  });

  it("surfaces errors in the response text", async () => {
    mockSendCommand.mockRejectedValue(new Error("connection lost"));
    const result = await handlers["get_document_info"]({}, { meta: {} });
    expect(result.content[0].text).toContain("Error getting document info");
    expect(result.content[0].text).toContain("connection lost");
  });
});

describe("get_selection tool", () => {
  let handlers: Record<string, Function>;
  let mockSendCommand: jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
    const ws = require("../../src/talk_to_figma_mcp/utils/websocket");
    mockSendCommand = ws.sendCommandToFigma;
    ({ handlers } = makeServer());
  });

  it("filters an array of selected nodes", async () => {
    mockSendCommand.mockResolvedValue([
      {
        id: "2:1",
        name: "Button",
        type: "FRAME",
        fills: [
          {
            type: "SOLID",
            color: { r: 0, g: 0.5, b: 1, a: 1 },
            boundVariables: { color: "var:abc" },
            imageRef: "img:xyz",
          },
        ],
        children: [],
      },
    ]);
    const result = await handlers["get_selection"]({}, { meta: {} });
    const parsed = JSON.parse(result.content[0].text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].fills[0].boundVariables).toBeUndefined();
    expect(parsed[0].fills[0].imageRef).toBeUndefined();
  });

  it("filters VECTOR nodes out of the selection array", async () => {
    mockSendCommand.mockResolvedValue([
      { id: "3:1", name: "Shape", type: "VECTOR" },
      { id: "3:2", name: "Box", type: "RECTANGLE" },
    ]);
    const result = await handlers["get_selection"]({}, { meta: {} });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.every((n: any) => n !== null)).toBe(true);
    const types = parsed.map((n: any) => n.type);
    expect(types).not.toContain("VECTOR");
    expect(types).toContain("RECTANGLE");
  });

  it("handles a single node (non-array) result", async () => {
    mockSendCommand.mockResolvedValue({
      id: "4:1",
      name: "Card",
      type: "FRAME",
      children: [],
    });
    const result = await handlers["get_selection"]({}, { meta: {} });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe("4:1");
    expect(parsed.name).toBe("Card");
  });

  it("surfaces errors in the response text", async () => {
    mockSendCommand.mockRejectedValue(new Error("not connected"));
    const result = await handlers["get_selection"]({}, { meta: {} });
    expect(result.content[0].text).toContain("Error getting selection");
    expect(result.content[0].text).toContain("not connected");
  });
});

describe("get_nodes_info tool", () => {
  let handlers: Record<string, Function>;
  let schemas: Record<string, z.ZodObject<any>>;
  let mockSendCommand: jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
    const ws = require("../../src/talk_to_figma_mcp/utils/websocket");
    mockSendCommand = ws.sendCommandToFigma;
    ({ handlers, schemas } = makeServer());
  });

  it("extracts node from result.document field", async () => {
    mockSendCommand.mockResolvedValue([
      {
        document: { id: "5:1", name: "Header", type: "FRAME", children: [] },
      },
    ]);
    const args = schemas["get_nodes_info"].parse({ nodeIds: ["5:1"] });
    const result = await handlers["get_nodes_info"](args, { meta: {} });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed[0].id).toBe("5:1");
    expect(parsed[0].name).toBe("Header");
  });

  it("falls back to result.info field when document is absent", async () => {
    mockSendCommand.mockResolvedValue([
      {
        info: { id: "6:1", name: "Footer", type: "FRAME", children: [] },
      },
    ]);
    const args = schemas["get_nodes_info"].parse({ nodeIds: ["6:1"] });
    const result = await handlers["get_nodes_info"](args, { meta: {} });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed[0].id).toBe("6:1");
    expect(parsed[0].name).toBe("Footer");
  });

  it("falls back to the result itself when neither document nor info is present", async () => {
    mockSendCommand.mockResolvedValue([
      { id: "7:1", name: "Direct", type: "FRAME", children: [] },
    ]);
    const args = schemas["get_nodes_info"].parse({ nodeIds: ["7:1"] });
    const result = await handlers["get_nodes_info"](args, { meta: {} });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed[0].id).toBe("7:1");
  });

  it("filters out VECTOR nodes from results", async () => {
    mockSendCommand.mockResolvedValue([
      { document: { id: "8:1", name: "Vec", type: "VECTOR" } },
      { document: { id: "8:2", name: "Rect", type: "RECTANGLE" } },
    ]);
    const args = schemas["get_nodes_info"].parse({ nodeIds: ["8:1", "8:2"] });
    const result = await handlers["get_nodes_info"](args, { meta: {} });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.length).toBe(1);
    expect(parsed[0].id).toBe("8:2");
  });

  it("surfaces errors in the response text", async () => {
    mockSendCommand.mockRejectedValue(new Error("timeout"));
    const args = schemas["get_nodes_info"].parse({ nodeIds: ["9:1"] });
    const result = await handlers["get_nodes_info"](args, { meta: {} });
    expect(result.content[0].text).toContain("Error getting nodes info");
    expect(result.content[0].text).toContain("timeout");
  });
});
