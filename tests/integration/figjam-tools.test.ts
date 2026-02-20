import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerFigJamTools } from "../../src/talk_to_figma_mcp/tools/figjam-tools";

jest.mock("../../src/talk_to_figma_mcp/utils/websocket", () => ({
  sendCommandToFigma: jest.fn().mockResolvedValue({ id: "mock:1" }),
}));

// Helper: set up a fresh server with FigJam tools registered and capture all
// tool handlers so individual tests can invoke them directly.
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
      // schema may be empty object ({}) for no-param tools — wrap safely
      schemas[name] =
        Object.keys(schema).length > 0
          ? z.object(schema)
          : z.object({});
    }
    return (originalTool as any)(...args);
  });

  registerFigJamTools(server);

  const mockSendCommand: jest.Mock = require("../../src/talk_to_figma_mcp/utils/websocket").sendCommandToFigma;

  async function call(toolName: string, args: any = {}) {
    mockSendCommand.mockClear();
    const schema = schemas[toolName];
    const validated = schema.parse(args);
    return handlers[toolName](validated, { meta: {} });
  }

  return { call, mockSendCommand };
}

// ─── get_figjam_elements ──────────────────────────────────────────────────────

describe("get_figjam_elements tool", () => {
  it("calls sendCommandToFigma with no payload", async () => {
    const { call, mockSendCommand } = makeServer();
    mockSendCommand.mockResolvedValueOnce({ stickies: [] });

    const result = await call("get_figjam_elements");

    expect(mockSendCommand).toHaveBeenCalledWith("get_figjam_elements", {});
    expect(result.content[0].text).toContain("stickies");
  });

  it("surfaces errors in the response text", async () => {
    const { call, mockSendCommand } = makeServer();
    mockSendCommand.mockRejectedValueOnce(new Error("not a FigJam document"));

    const result = await call("get_figjam_elements");

    expect(result.content[0].text).toContain("not a FigJam document");
  });
});

// ─── create_sticky ────────────────────────────────────────────────────────────

describe("create_sticky tool", () => {
  describe("default values", () => {
    it("defaults color to yellow and isWide to false", async () => {
      const { call, mockSendCommand } = makeServer();
      await call("create_sticky", { x: 0, y: 0, text: "Hello" });

      const [, payload] = mockSendCommand.mock.calls[0];
      expect(payload.color).toBe("yellow");
      expect(payload.isWide).toBe(false);
    });

    it("forwards x, y, and text as-is", async () => {
      const { call, mockSendCommand } = makeServer();
      await call("create_sticky", { x: 100, y: 200, text: "Note" });

      const [, payload] = mockSendCommand.mock.calls[0];
      expect(payload.x).toBe(100);
      expect(payload.y).toBe(200);
      expect(payload.text).toBe("Note");
    });
  });

  describe("color enum", () => {
    const validColors = [
      "yellow", "pink", "green", "blue", "purple",
      "red", "orange", "teal", "gray", "white",
    ] as const;

    it.each(validColors)("accepts color '%s'", async (color) => {
      const { call, mockSendCommand } = makeServer();
      await call("create_sticky", { x: 0, y: 0, text: "", color });

      const [, payload] = mockSendCommand.mock.calls[0];
      expect(payload.color).toBe(color);
    });

    it("rejects an invalid color string", async () => {
      const { call } = makeServer();
      await expect(
        call("create_sticky", { x: 0, y: 0, text: "", color: "magenta" })
      ).rejects.toThrow();
    });
  });

  describe("Zod validation", () => {
    it("rejects missing x", async () => {
      const { call } = makeServer();
      await expect(call("create_sticky", { y: 0, text: "" })).rejects.toThrow();
    });

    it("rejects missing y", async () => {
      const { call } = makeServer();
      await expect(call("create_sticky", { x: 0, text: "" })).rejects.toThrow();
    });

    it("rejects missing text", async () => {
      const { call } = makeServer();
      await expect(call("create_sticky", { x: 0, y: 0 })).rejects.toThrow();
    });

    it("rejects non-numeric x", async () => {
      const { call } = makeServer();
      await expect(
        call("create_sticky", { x: "left", y: 0, text: "" })
      ).rejects.toThrow();
    });
  });

  describe("optional fields", () => {
    it("forwards name when provided", async () => {
      const { call, mockSendCommand } = makeServer();
      await call("create_sticky", { x: 0, y: 0, text: "", name: "My sticky" });

      const [, payload] = mockSendCommand.mock.calls[0];
      expect(payload.name).toBe("My sticky");
    });

    it("forwards parentId when provided", async () => {
      const { call, mockSendCommand } = makeServer();
      await call("create_sticky", { x: 0, y: 0, text: "", parentId: "2:1" });

      const [, payload] = mockSendCommand.mock.calls[0];
      expect(payload.parentId).toBe("2:1");
    });

    it("forwards isWide: true", async () => {
      const { call, mockSendCommand } = makeServer();
      await call("create_sticky", { x: 0, y: 0, text: "", isWide: true });

      const [, payload] = mockSendCommand.mock.calls[0];
      expect(payload.isWide).toBe(true);
    });
  });

  it("surfaces errors in the response text", async () => {
    const { call, mockSendCommand } = makeServer();
    mockSendCommand.mockRejectedValueOnce(new Error("not a FigJam document"));

    const result = await call("create_sticky", { x: 0, y: 0, text: "" });

    expect(result.content[0].text).toContain("not a FigJam document");
  });
});

// ─── set_sticky_text ──────────────────────────────────────────────────────────

describe("set_sticky_text tool", () => {
  it("sends nodeId and text to Figma", async () => {
    const { call, mockSendCommand } = makeServer();
    await call("set_sticky_text", { nodeId: "5:1", text: "Updated" });

    expect(mockSendCommand).toHaveBeenCalledWith("set_sticky_text", {
      nodeId: "5:1",
      text: "Updated",
    });
  });

  it("rejects missing nodeId", async () => {
    const { call } = makeServer();
    await expect(call("set_sticky_text", { text: "Hi" })).rejects.toThrow();
  });

  it("rejects missing text", async () => {
    const { call } = makeServer();
    await expect(call("set_sticky_text", { nodeId: "5:1" })).rejects.toThrow();
  });
});

// ─── create_shape_with_text ───────────────────────────────────────────────────

describe("create_shape_with_text tool", () => {
  describe("default values", () => {
    it("defaults width and height to 200", async () => {
      const { call, mockSendCommand } = makeServer();
      await call("create_shape_with_text", { x: 0, y: 0 });

      const [, payload] = mockSendCommand.mock.calls[0];
      expect(payload.width).toBe(200);
      expect(payload.height).toBe(200);
    });

    it("defaults shapeType to ROUNDED_RECTANGLE", async () => {
      const { call, mockSendCommand } = makeServer();
      await call("create_shape_with_text", { x: 0, y: 0 });

      const [, payload] = mockSendCommand.mock.calls[0];
      expect(payload.shapeType).toBe("ROUNDED_RECTANGLE");
    });

    it("defaults text to empty string", async () => {
      const { call, mockSendCommand } = makeServer();
      await call("create_shape_with_text", { x: 0, y: 0 });

      const [, payload] = mockSendCommand.mock.calls[0];
      expect(payload.text).toBe("");
    });
  });

  describe("shapeType enum", () => {
    const validShapes = [
      "SQUARE",
      "ELLIPSE",
      "ROUNDED_RECTANGLE",
      "DIAMOND",
      "TRIANGLE_UP",
      "TRIANGLE_DOWN",
      "PARALLELOGRAM_RIGHT",
      "PARALLELOGRAM_LEFT",
    ] as const;

    it.each(validShapes)("accepts shapeType '%s'", async (shapeType) => {
      const { call, mockSendCommand } = makeServer();
      await call("create_shape_with_text", { x: 0, y: 0, shapeType });

      const [, payload] = mockSendCommand.mock.calls[0];
      expect(payload.shapeType).toBe(shapeType);
    });

    it("rejects an invalid shapeType", async () => {
      const { call } = makeServer();
      await expect(
        call("create_shape_with_text", { x: 0, y: 0, shapeType: "HEXAGON" })
      ).rejects.toThrow();
    });
  });

  describe("fillColor validation", () => {
    it("accepts a valid RGBA fill color", async () => {
      const { call, mockSendCommand } = makeServer();
      await call("create_shape_with_text", {
        x: 0,
        y: 0,
        fillColor: { r: 0.5, g: 0.2, b: 0.8, a: 1 },
      });

      const [, payload] = mockSendCommand.mock.calls[0];
      expect(payload.fillColor).toEqual({ r: 0.5, g: 0.2, b: 0.8, a: 1 });
    });

    it("rejects out-of-range r value", async () => {
      const { call } = makeServer();
      await expect(
        call("create_shape_with_text", {
          x: 0,
          y: 0,
          fillColor: { r: 1.5, g: 0, b: 0 },
        })
      ).rejects.toThrow();
    });
  });

  it("rejects missing x", async () => {
    const { call } = makeServer();
    await expect(call("create_shape_with_text", { y: 0 })).rejects.toThrow();
  });
});

// ─── create_connector ─────────────────────────────────────────────────────────

describe("create_connector tool", () => {
  describe("default values", () => {
    it("defaults connectorLineType to ELBOWED", async () => {
      const { call, mockSendCommand } = makeServer();
      await call("create_connector", {});

      const [, payload] = mockSendCommand.mock.calls[0];
      expect(payload.connectorLineType).toBe("ELBOWED");
    });

    it("defaults startStrokeCap to NONE and endStrokeCap to ARROW", async () => {
      const { call, mockSendCommand } = makeServer();
      await call("create_connector", {});

      const [, payload] = mockSendCommand.mock.calls[0];
      expect(payload.startStrokeCap).toBe("NONE");
      expect(payload.endStrokeCap).toBe("ARROW");
    });
  });

  describe("connectorLineType enum", () => {
    it.each(["ELBOWED", "STRAIGHT", "CURVED"] as const)(
      "accepts connectorLineType '%s'",
      async (type) => {
        const { call, mockSendCommand } = makeServer();
        await call("create_connector", { connectorLineType: type });

        const [, payload] = mockSendCommand.mock.calls[0];
        expect(payload.connectorLineType).toBe(type);
      }
    );

    it("rejects invalid connectorLineType", async () => {
      const { call } = makeServer();
      await expect(
        call("create_connector", { connectorLineType: "WAVY" })
      ).rejects.toThrow();
    });
  });

  describe("node-to-node connection", () => {
    it("forwards startNodeId and endNodeId", async () => {
      const { call, mockSendCommand } = makeServer();
      await call("create_connector", {
        startNodeId: "1:1",
        endNodeId: "1:2",
      });

      const [, payload] = mockSendCommand.mock.calls[0];
      expect(payload.startNodeId).toBe("1:1");
      expect(payload.endNodeId).toBe("1:2");
    });
  });

  describe("position-based connection", () => {
    it("forwards startX/startY and endX/endY", async () => {
      const { call, mockSendCommand } = makeServer();
      await call("create_connector", {
        startX: 100,
        startY: 200,
        endX: 300,
        endY: 400,
      });

      const [, payload] = mockSendCommand.mock.calls[0];
      expect(payload.startX).toBe(100);
      expect(payload.startY).toBe(200);
      expect(payload.endX).toBe(300);
      expect(payload.endY).toBe(400);
    });
  });

  it("rejects negative strokeWeight", async () => {
    const { call } = makeServer();
    await expect(
      call("create_connector", { strokeWeight: -1 })
    ).rejects.toThrow();
  });
});

// ─── create_section ───────────────────────────────────────────────────────────

describe("create_section tool", () => {
  describe("default values", () => {
    it("defaults width to 800 and height to 600", async () => {
      const { call, mockSendCommand } = makeServer();
      await call("create_section", { x: 0, y: 0 });

      const [, payload] = mockSendCommand.mock.calls[0];
      expect(payload.width).toBe(800);
      expect(payload.height).toBe(600);
    });

    it("defaults name to 'Section'", async () => {
      const { call, mockSendCommand } = makeServer();
      await call("create_section", { x: 0, y: 0 });

      const [, payload] = mockSendCommand.mock.calls[0];
      expect(payload.name).toBe("Section");
    });
  });

  describe("Zod validation", () => {
    it("rejects missing x", async () => {
      const { call } = makeServer();
      await expect(call("create_section", { y: 0 })).rejects.toThrow();
    });

    it("rejects missing y", async () => {
      const { call } = makeServer();
      await expect(call("create_section", { x: 0 })).rejects.toThrow();
    });
  });

  it("forwards name and fillColor when provided", async () => {
    const { call, mockSendCommand } = makeServer();
    await call("create_section", {
      x: 0,
      y: 0,
      name: "My Section",
      fillColor: { r: 0.9, g: 0.9, b: 1 },
    });

    const [, payload] = mockSendCommand.mock.calls[0];
    expect(payload.name).toBe("My Section");
    expect(payload.fillColor).toEqual({ r: 0.9, g: 0.9, b: 1 });
  });

  it("surfaces errors in the response text", async () => {
    const { call, mockSendCommand } = makeServer();
    mockSendCommand.mockRejectedValueOnce(new Error("section creation failed"));

    const result = await call("create_section", { x: 0, y: 0 });

    expect(result.content[0].text).toContain("section creation failed");
  });
});
