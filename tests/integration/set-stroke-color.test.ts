import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerModificationTools } from '../../src/talk_to_figma_mcp/tools/modification-tools';

jest.mock('../../src/talk_to_figma_mcp/utils/websocket', () => ({
  sendCommandToFigma: jest.fn().mockResolvedValue({ name: "MockNode" })
}));

describe("set_stroke_color tool integration", () => {
  let server: McpServer;
  let mockSendCommand: jest.Mock;
  let toolHandler: Function;
  let toolSchema: z.ZodObject<any>;

  beforeEach(() => {
    server = new McpServer(
      { name: 'test-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    
    mockSendCommand = require('../../src/talk_to_figma_mcp/utils/websocket').sendCommandToFigma;
    mockSendCommand.mockClear();
    
    const originalTool = server.tool.bind(server);
    jest.spyOn(server, 'tool').mockImplementation((...args: any[]) => {
      if (args.length === 4) {
        const [name, description, schema, handler] = args;
        if (name === 'set_stroke_color') {
          toolHandler = handler;
          toolSchema = z.object(schema);
        }
      }
      return (originalTool as any)(...args);
    });
    
    registerModificationTools(server);
  });

  async function callToolWithValidation(args: any) {
    const validatedArgs = toolSchema.parse(args);
    const result = await toolHandler(validatedArgs, { meta: {} });
    return result;
  }

  describe("opacity handling (the critical fix)", () => {
    it("defaults `a` to 1 when `a` is undefined", async () => {
      const response = await callToolWithValidation({
        nodeId: "nodeA",
        r: 0.2,
        g: 0.4,
        b: 0.6,
        // a is undefined
        strokeWeight: 2,
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(1);
      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(command).toBe("set_stroke_color");
      expect(payload).toEqual({
        nodeId: "nodeA",
        color: { r: 0.2, g: 0.4, b: 0.6, a: 1 },
        strokeWeight: 2,
      });

      expect(response.content[0].text).toContain("RGBA(0.2, 0.4, 0.6, 1)");
      expect(response.content[0].text).toContain("weight 2");
    });

    it("preserves `a = 0` when explicitly provided (the main bug fix)", async () => {
      const response = await callToolWithValidation({
        nodeId: "nodeB",
        r: 0.1,
        g: 0.3,
        b: 0.5,
        a: 0, // This should be preserved as 0, not converted to 1
        strokeWeight: 1.5,
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(1);
      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(payload.color.a).toBe(0);
      expect(payload.strokeWeight).toBe(1.5);

      expect(response.content[0].text).toContain("RGBA(0.1, 0.3, 0.5, 0)");
      expect(response.content[0].text).toContain("weight 1.5");
    });

    it("preserves semi-transparent values", async () => {
      const response = await callToolWithValidation({
        nodeId: "nodeC",
        r: 1,
        g: 0,
        b: 0,
        a: 0.5,
        strokeWeight: 3,
      });

      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(payload.color.a).toBe(0.5);
      expect(payload.strokeWeight).toBe(3);
      expect(response.content[0].text).toContain("RGBA(1, 0, 0, 0.5)");
      expect(response.content[0].text).toContain("weight 3");
    });
  });

  describe("stroke weight handling (the other critical fix)", () => {
    it("defaults strokeWeight to 1 when undefined", async () => {
      const response = await callToolWithValidation({
        nodeId: "nodeD",
        r: 0.5,
        g: 0.5,
        b: 0.5,
        a: 1,
        // strokeWeight is undefined
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(1);
      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(payload.strokeWeight).toBe(1); // Should default to 1
      expect(response.content[0].text).toContain("weight 1");
    });

    it("preserves provided strokeWeight values", async () => {
      const response = await callToolWithValidation({
        nodeId: "nodeE",
        r: 0.5,
        g: 0.5,
        b: 0.5,
        a: 1,
        strokeWeight: 5.5,
      });

      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(payload.strokeWeight).toBe(5.5);
      expect(response.content[0].text).toContain("weight 5.5");
    });

    it("handles decimal strokeWeight values", async () => {
      await callToolWithValidation({
        nodeId: "nodeF",
        r: 0.2,
        g: 0.3,
        b: 0.4,
        a: 0.8,
        strokeWeight: 0.5,
      });

      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(payload.strokeWeight).toBe(0.5);
    });

    it("preserves strokeWeight of 0 (invisible stroke)", async () => {
      const response = await callToolWithValidation({
        nodeId: "nodeF2",
        r: 1,
        g: 0,
        b: 0,
        a: 1,
        strokeWeight: 0,
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(1);
      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(payload.strokeWeight).toBe(0);
      expect(response.content[0].text).toContain("weight 0");
    });

    it("handles zero strokeWeight with transparent color", async () => {
      const response = await callToolWithValidation({
        nodeId: "nodeF3",
        r: 0.5,
        g: 0.5,
        b: 0.5,
        a: 0,
        strokeWeight: 0,
      });

      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(payload.color.a).toBe(0);
      expect(payload.strokeWeight).toBe(0);
      expect(response.content[0].text).toContain("RGBA(0.5, 0.5, 0.5, 0)");
      expect(response.content[0].text).toContain("weight 0");
    });
  });

  describe("RGB component handling", () => {
    it("preserves pure black (0,0,0)", async () => {
      await callToolWithValidation({
        nodeId: "nodeG",
        r: 0,
        g: 0,
        b: 0,
        a: 1,
        strokeWeight: 1,
      });

      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(payload.color.r).toBe(0);
      expect(payload.color.g).toBe(0);
      expect(payload.color.b).toBe(0);
    });

    it("preserves zero red component", async () => {
      await callToolWithValidation({
        nodeId: "nodeH1",
        r: 0,
        g: 0.5,
        b: 0.8,
        a: 1,
        strokeWeight: 2,
      });

      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(payload.color.r).toBe(0);
      expect(payload.color.g).toBe(0.5);
    });

    it("preserves zero green component", async () => {
      await callToolWithValidation({
        nodeId: "nodeH2",
        r: 0.5,
        g: 0,
        b: 0.8,
        a: 1,
        strokeWeight: 2,
      });

      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(payload.color.g).toBe(0);
    });

    it("preserves zero blue component", async () => {
      await callToolWithValidation({
        nodeId: "nodeH3",
        r: 0.5,
        g: 0.8,
        b: 0,
        a: 1,
        strokeWeight: 2,
      });

      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(payload.color.b).toBe(0);
    });
  });

  describe("Zod validation (real validation layer)", () => {
    it("rejects undefined r component", async () => {
      await expect(callToolWithValidation({
        nodeId: "nodeI1",
        // r is missing
        g: 0.5,
        b: 0.8,
        a: 1,
        strokeWeight: 1,
      })).rejects.toThrow();
      
      expect(mockSendCommand).not.toHaveBeenCalled();
    });

    it("rejects undefined g component", async () => {
      await expect(callToolWithValidation({
        nodeId: "nodeI2",
        r: 0.5,
        // g is missing
        b: 0.8,
        a: 1,
        strokeWeight: 1,
      })).rejects.toThrow();
      
      expect(mockSendCommand).not.toHaveBeenCalled();
    });

    it("rejects undefined b component", async () => {
      await expect(callToolWithValidation({
        nodeId: "nodeI3",
        r: 0.5,
        g: 0.8,
        // b is missing
        a: 1,
        strokeWeight: 1,
      })).rejects.toThrow();
      
      expect(mockSendCommand).not.toHaveBeenCalled();
    });

    it("accepts zero strokeWeight for invisible stroke", async () => {
      const response = await callToolWithValidation({
        nodeId: "nodeI4",
        r: 0.5,
        g: 0.5,
        b: 0.5,
        a: 1,
        strokeWeight: 0,
      });
      
      expect(mockSendCommand).toHaveBeenCalledTimes(1);
      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(payload.strokeWeight).toBe(0);
      expect(response.content[0].text).toContain("weight 0");
    });

    it("rejects negative strokeWeight", async () => {
      await expect(callToolWithValidation({
        nodeId: "nodeI5",
        r: 0.5,
        g: 0.5,
        b: 0.5,
        a: 1,
        strokeWeight: -1,
      })).rejects.toThrow();
      
      expect(mockSendCommand).not.toHaveBeenCalled();
    });

    it("rejects string strokeWeight", async () => {
      await expect(callToolWithValidation({
        nodeId: "nodeI6",
        r: 0.5,
        g: 0.5,
        b: 0.5,
        a: 1,
        strokeWeight: "thick", // Invalid type
      })).rejects.toThrow();
      
      expect(mockSendCommand).not.toHaveBeenCalled();
    });

    it("rejects out-of-range color values", async () => {
      await expect(callToolWithValidation({
        nodeId: "nodeI7",
        r: 1.5, // Out of 0-1 range
        g: 0.5,
        b: 0.8,
        a: 1,
        strokeWeight: 1,
      })).rejects.toThrow();
      
      expect(mockSendCommand).not.toHaveBeenCalled();
    });

    it("rejects negative color values", async () => {
      await expect(callToolWithValidation({
        nodeId: "nodeI8",
        r: -0.1, // Negative value
        g: 0.5,
        b: 0.8,
        a: 1,
        strokeWeight: 1,
      })).rejects.toThrow();
      
      expect(mockSendCommand).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("handles transparent stroke correctly", async () => {
      const response = await callToolWithValidation({
        nodeId: "nodeJ",
        r: 1,
        g: 0,
        b: 0,
        a: 0,
        strokeWeight: 5,
      });

      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(payload.color).toEqual({ r: 1, g: 0, b: 0, a: 0 });
      expect(payload.strokeWeight).toBe(5);
      expect(response.content[0].text).toContain("RGBA(1, 0, 0, 0)");
      expect(response.content[0].text).toContain("weight 5");
    });

    it("handles boundary values", async () => {
      const response = await callToolWithValidation({
        nodeId: "nodeK",
        r: 1,
        g: 1,
        b: 1,
        a: 1,
        strokeWeight: 10,
      });

      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(payload.color).toEqual({ r: 1, g: 1, b: 1, a: 1 });
      expect(payload.strokeWeight).toBe(10);
    });

    it("accepts valid decimal values", async () => {
      await callToolWithValidation({
        nodeId: "nodeL",
        r: 0.123,
        g: 0.456,
        b: 0.789,
        a: 0.5,
        strokeWeight: 2.75,
      });

      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(payload.color.r).toBeCloseTo(0.123);
      expect(payload.color.g).toBeCloseTo(0.456);
      expect(payload.color.b).toBeCloseTo(0.789);
      expect(payload.color.a).toBeCloseTo(0.5);
      expect(payload.strokeWeight).toBeCloseTo(2.75);
    });

    it("handles both defaults simultaneously", async () => {
      const response = await callToolWithValidation({
        nodeId: "nodeM",
        r: 0.8,
        g: 0.2,
        b: 0.4,
        // Both a and strokeWeight are undefined, should get defaults
      });

      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(payload.color.a).toBe(1); // Default opacity
      expect(payload.strokeWeight).toBe(1); // Default weight
      expect(response.content[0].text).toContain("RGBA(0.8, 0.2, 0.4, 1)");
      expect(response.content[0].text).toContain("weight 1");
    });
  });
});