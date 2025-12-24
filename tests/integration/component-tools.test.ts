import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerComponentTools } from '../../src/talk_to_figma_mcp/tools/component-tools';

jest.mock('../../src/talk_to_figma_mcp/utils/websocket', () => ({
  sendCommandToFigma: jest.fn()
}));

describe("component tools integration", () => {
  let server: McpServer;
  let mockSendCommand: jest.Mock;
  let toolHandlers: Map<string, Function> = new Map();
  let toolSchemas: Map<string, z.ZodObject<any>> = new Map();

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
        toolHandlers.set(name, handler);
        toolSchemas.set(name, z.object(schema));
      }
      return (originalTool as any)(...args);
    });

    registerComponentTools(server);
  });

  async function callTool(toolName: string, args: any) {
    const schema = toolSchemas.get(toolName);
    const handler = toolHandlers.get(toolName);
    if (!schema || !handler) {
      throw new Error(`Tool ${toolName} not found`);
    }
    const validatedArgs = schema.parse(args);
    return await handler(validatedArgs, { meta: {} });
  }

  describe("create_component_from_node", () => {
    it("creates component from node with required params", async () => {
      mockSendCommand.mockResolvedValue({
        id: "component-123",
        name: "MyComponent",
        key: "abc123key"
      });

      const response = await callTool("create_component_from_node", {
        nodeId: "node-456"
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(1);
      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(command).toBe("create_component_from_node");
      expect(payload.nodeId).toBe("node-456");
      expect(response.content[0].text).toContain("MyComponent");
      expect(response.content[0].text).toContain("component-123");
    });

    it("creates component with optional name", async () => {
      mockSendCommand.mockResolvedValue({
        id: "component-789",
        name: "CustomName",
        key: "xyz789key"
      });

      const response = await callTool("create_component_from_node", {
        nodeId: "node-123",
        name: "CustomName"
      });

      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(payload.name).toBe("CustomName");
      expect(response.content[0].text).toContain("CustomName");
    });

    it("handles error when node not found", async () => {
      mockSendCommand.mockRejectedValue(new Error("Node not found"));

      const response = await callTool("create_component_from_node", {
        nodeId: "invalid-node"
      });

      expect(response.content[0].text).toContain("Error");
    });

    it("rejects missing nodeId", async () => {
      await expect(callTool("create_component_from_node", {}))
        .rejects.toThrow();
      expect(mockSendCommand).not.toHaveBeenCalled();
    });
  });

  describe("create_component_set", () => {
    it("creates component set from multiple components", async () => {
      mockSendCommand.mockResolvedValue({
        id: "set-123",
        name: "ButtonVariants",
        key: "setkey123",
        variantCount: 3
      });

      const response = await callTool("create_component_set", {
        componentIds: ["comp-1", "comp-2", "comp-3"]
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(1);
      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(command).toBe("create_component_set");
      expect(payload.componentIds).toEqual(["comp-1", "comp-2", "comp-3"]);
      expect(response.content[0].text).toContain("ButtonVariants");
      expect(response.content[0].text).toContain("3 variants");
    });

    it("creates component set with custom name", async () => {
      mockSendCommand.mockResolvedValue({
        id: "set-456",
        name: "MyCustomSet",
        key: "setkey456",
        variantCount: 2
      });

      const response = await callTool("create_component_set", {
        componentIds: ["comp-a", "comp-b"],
        name: "MyCustomSet"
      });

      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(payload.name).toBe("MyCustomSet");
    });

    it("handles empty componentIds array (validation at Figma level)", async () => {
      mockSendCommand.mockRejectedValue(new Error("Missing or empty componentIds parameter"));

      const response = await callTool("create_component_set", {
        componentIds: []
      });

      expect(response.content[0].text).toContain("Error");
    });

    it("rejects missing componentIds", async () => {
      await expect(callTool("create_component_set", {}))
        .rejects.toThrow();
      expect(mockSendCommand).not.toHaveBeenCalled();
    });

    it("handles error when components are not valid", async () => {
      mockSendCommand.mockRejectedValue(new Error("Node is not a component"));

      const response = await callTool("create_component_set", {
        componentIds: ["not-a-component"]
      });

      expect(response.content[0].text).toContain("Error");
    });
  });
});
