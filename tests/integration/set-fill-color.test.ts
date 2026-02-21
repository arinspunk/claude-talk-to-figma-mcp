import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerModificationTools } from '../../src/talk_to_figma_mcp/tools/modification-tools';

jest.mock('../../src/talk_to_figma_mcp/utils/websocket', () => ({
  sendCommandToFigma: jest.fn().mockResolvedValue({ name: "MockNode" })
}));

describe("set_fill_color tool integration", () => {
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
        if (name === 'set_fill_color') {
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
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(1);
      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(command).toBe("set_fill_color");
      expect(payload).toEqual({
        nodeId: "nodeA",
        color: { r: 0.2, g: 0.4, b: 0.6, a: 1 },
      });

      expect(response.content[0].text).toContain("RGBA(0.2, 0.4, 0.6, 1)");
    });

    it("preserves `a = 0` when explicitly provided (the main bug fix)", async () => {
      const response = await callToolWithValidation({
        nodeId: "nodeB",
        r: 0.1,
        g: 0.3,
        b: 0.5,
        a: 0, // This should be preserved as 0, not converted to 1
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(1);
      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(payload.color.a).toBe(0); // Critical: should be 0, not 1

      expect(response.content[0].text).toContain("RGBA(0.1, 0.3, 0.5, 0)");
    });

    it("preserves semi-transparent values", async () => {
      const response = await callToolWithValidation({
        nodeId: "nodeC",
        r: 1,
        g: 0,
        b: 0,
        a: 0.5,
      });

      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(payload.color.a).toBe(0.5);
      expect(response.content[0].text).toContain("RGBA(1, 0, 0, 0.5)");
    });
  });

  describe("RGB component handling", () => {
    it("preserves pure black (0,0,0)", async () => {
      await callToolWithValidation({
        nodeId: "nodeD",
        r: 0,
        g: 0,
        b: 0,
        a: 1,
      });

      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(payload.color.r).toBe(0);
      expect(payload.color.g).toBe(0);
      expect(payload.color.b).toBe(0);
    });

    it("preserves zero red component", async () => {
      await callToolWithValidation({
        nodeId: "nodeE1",
        r: 0,
        g: 0.5,
        b: 0.8,
        a: 1,
      });

      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(payload.color.r).toBe(0);
      expect(payload.color.g).toBe(0.5);
    });

    it("preserves zero green component", async () => {
      await callToolWithValidation({
        nodeId: "nodeE2",
        r: 0.5,
        g: 0,
        b: 0.8,
        a: 1,
      });

      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(payload.color.g).toBe(0);
    });

    it("preserves zero blue component", async () => {
      await callToolWithValidation({
        nodeId: "nodeE3",
        r: 0.5,
        g: 0.8,
        b: 0,
        a: 1,
      });

      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(payload.color.b).toBe(0);
    });
  });

  describe("Zod validation (real validation layer)", () => {
    it("rejects undefined r component", async () => {
      await expect(callToolWithValidation({
        nodeId: "nodeF1",
        // r is missing
        g: 0.5,
        b: 0.8,
        a: 1,
      })).rejects.toThrow();
      
      // WebSocket should not be called if validation fails
      expect(mockSendCommand).not.toHaveBeenCalled();
    });

    it("rejects undefined g component", async () => {
      await expect(callToolWithValidation({
        nodeId: "nodeF2",
        r: 0.5,
        // g is missing
        b: 0.8,
        a: 1,
      })).rejects.toThrow();
      
      expect(mockSendCommand).not.toHaveBeenCalled();
    });

    it("rejects undefined b component", async () => {
      await expect(callToolWithValidation({
        nodeId: "nodeF3",
        r: 0.5,
        g: 0.8,
        // b is missing
        a: 1,
      })).rejects.toThrow();
      
      expect(mockSendCommand).not.toHaveBeenCalled();
    });

    it("rejects string r component", async () => {
      await expect(callToolWithValidation({
        nodeId: "nodeF4",
        r: "red", // Invalid type
        g: 0.5,
        b: 0.8,
        a: 1,
      })).rejects.toThrow();
      
      expect(mockSendCommand).not.toHaveBeenCalled();
    });

    it("coerces null g component to 0", async () => {
      const result = await callToolWithValidation({
        nodeId: "nodeF5",
        r: 0.5,
        g: null, // coerced to 0 by z.coerce.number()
        b: 0.8,
        a: 1,
      });

      expect(mockSendCommand).toHaveBeenCalledWith("set_fill_color", expect.objectContaining({
        color: expect.objectContaining({ g: 0 }),
      }));
    });

    it("coerces boolean b component to number", async () => {
      const result = await callToolWithValidation({
        nodeId: "nodeF6",
        r: 0.5,
        g: 0.8,
        b: true, // coerced to 1 by z.coerce.number()
        a: 1,
      });

      expect(mockSendCommand).toHaveBeenCalledWith("set_fill_color", expect.objectContaining({
        color: expect.objectContaining({ b: 1 }),
      }));
    });

    it("rejects NaN values", async () => {
      await expect(callToolWithValidation({
        nodeId: "nodeF7",
        r: NaN, // Invalid value
        g: 0.5,
        b: 0.8,
        a: 1,
      })).rejects.toThrow();
      
      expect(mockSendCommand).not.toHaveBeenCalled();
    });

    it("rejects out-of-range values", async () => {
      await expect(callToolWithValidation({
        nodeId: "nodeF8",
        r: 1.5, // Out of 0-1 range
        g: 0.5,
        b: 0.8,
        a: 1,
      })).rejects.toThrow();
      
      expect(mockSendCommand).not.toHaveBeenCalled();
    });

    it("rejects negative values", async () => {
      await expect(callToolWithValidation({
        nodeId: "nodeF9",
        r: -0.1, // Negative value
        g: 0.5,
        b: 0.8,
        a: 1,
      })).rejects.toThrow();
      
      expect(mockSendCommand).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("handles transparent black correctly", async () => {
      const response = await callToolWithValidation({
        nodeId: "nodeG",
        r: 0,
        g: 0,
        b: 0,
        a: 0, // Transparent black
      });

      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(payload.color).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(response.content[0].text).toContain("RGBA(0, 0, 0, 0)");
    });

    it("handles boundary values", async () => {
      const response = await callToolWithValidation({
        nodeId: "nodeH",
        r: 1,
        g: 1,
        b: 1,
        a: 1,
      });

      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(payload.color).toEqual({ r: 1, g: 1, b: 1, a: 1 });
    });

    it("accepts valid decimal values", async () => {
      await callToolWithValidation({
        nodeId: "nodeI",
        r: 0.123,
        g: 0.456,
        b: 0.789,
        a: 0.5,
      });

      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(payload.color.r).toBeCloseTo(0.123);
      expect(payload.color.g).toBeCloseTo(0.456);
      expect(payload.color.b).toBeCloseTo(0.789);
      expect(payload.color.a).toBeCloseTo(0.5);
    });
  });
});