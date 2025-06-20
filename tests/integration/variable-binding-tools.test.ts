import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerVariableTools } from '../../src/talk_to_figma_mcp/tools/variable-tools';

jest.mock('../../src/talk_to_figma_mcp/utils/websocket', () => ({
  sendCommandToFigma: jest.fn().mockResolvedValue({ name: "MockNode" })
}));

describe("Variable Binding Tools Integration Tests - Task 1.4", () => {
  let server: McpServer;
  let mockSendCommand: jest.Mock;
  let setBoundVariableHandler: Function;
  let setBoundVariableForPaintHandler: Function;
  let removeBoundVariableHandler: Function;

  beforeEach(() => {
    server = new McpServer(
      { name: 'test-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    
    mockSendCommand = require('../../src/talk_to_figma_mcp/utils/websocket').sendCommandToFigma;
    mockSendCommand.mockClear();
    
    // Capture tool handlers
    const originalTool = server.tool.bind(server);
    jest.spyOn(server, 'tool').mockImplementation((...args: any[]) => {
      if (args.length === 4) {
        const [name, description, schema, handler] = args;
        if (name === 'set_bound_variable') {
          setBoundVariableHandler = handler;
        } else if (name === 'set_bound_variable_for_paint') {
          setBoundVariableForPaintHandler = handler;
        } else if (name === 'remove_bound_variable') {
          removeBoundVariableHandler = handler;
        }
      }
      return (originalTool as any)(...args);
    });
    
    registerVariableTools(server);
  });

  describe("set_bound_variable tool", () => {
    it("should bind a variable to a node property successfully", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        binding: {
          nodeId: 'node-123',
          property: 'width',
          variableId: 'var-456',
          boundAt: new Date().toISOString()
        }
      });

      const result = await setBoundVariableHandler({
        nodeId: 'node-123',
        property: 'width',
        variableId: 'var-456'
      });

      expect(mockSendCommand).toHaveBeenCalledWith('set_bound_variable', {
        nodeId: 'node-123',
        property: 'width',
        variableId: 'var-456'
      });

      expect(result.content[0].text).toContain('bound successfully');
    });

    it("should validate property-variable type compatibility", async () => {
      const result = await setBoundVariableHandler({
        nodeId: 'node-123',
        property: 'width', // numeric property
        variableId: 'var-456',
        variableType: 'STRING' // incompatible type
      });

      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('incompatible');
      expect(mockSendCommand).not.toHaveBeenCalled();
    });

    it("should handle validation errors", async () => {
      const result = await setBoundVariableHandler({
        nodeId: '', // invalid empty nodeId
        property: 'width',
        variableId: 'var-456'
      });

      expect(result.content[0].text).toContain('Error');
      expect(mockSendCommand).not.toHaveBeenCalled();
    });
  });

  describe("set_bound_variable_for_paint tool", () => {
    it("should bind a COLOR variable to paint successfully", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        binding: {
          nodeId: 'node-123',
          paintType: 'fills',
          paintIndex: 0,
          variableId: 'color-var-456',
          boundAt: new Date().toISOString()
        }
      });

      const result = await setBoundVariableForPaintHandler({
        nodeId: 'node-123',
        paintType: 'fills',
        paintIndex: 0,
        variableId: 'color-var-456'
      });

      expect(mockSendCommand).toHaveBeenCalledWith('set_bound_variable_for_paint', {
        nodeId: 'node-123',
        paintType: 'fills',
        paintIndex: 0,
        variableId: 'color-var-456'
      });

      expect(result.content[0].text).toContain('bound successfully');
    });

    it("should reject non-COLOR variables for paint binding", async () => {
      const result = await setBoundVariableForPaintHandler({
        nodeId: 'node-123',
        paintType: 'fills',
        paintIndex: 0,
        variableId: 'string-var-456',
        variableType: 'STRING'
      });

      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('COLOR variable required');
      expect(mockSendCommand).not.toHaveBeenCalled();
    });

    it("should validate paint index ranges", async () => {
      const result = await setBoundVariableForPaintHandler({
        nodeId: 'node-123',
        paintType: 'fills',
        paintIndex: -1, // invalid negative index
        variableId: 'color-var-456'
      });

      expect(result.content[0].text).toContain('Error');
      expect(mockSendCommand).not.toHaveBeenCalled();
    });
  });

  describe("remove_bound_variable tool", () => {
    it("should remove binding from property successfully", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        unbinding: {
          nodeId: 'node-123',
          property: 'width',
          previousVariableId: 'var-456',
          unboundAt: new Date().toISOString(),
          referencesCleanedUp: 1
        }
      });

      const result = await removeBoundVariableHandler({
        nodeId: 'node-123',
        property: 'width'
      });

      expect(mockSendCommand).toHaveBeenCalledWith('remove_bound_variable', {
        nodeId: 'node-123',
        property: 'width'
      });

      expect(result.content[0].text).toContain('removed successfully');
    });

    it("should remove binding from paint successfully", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        unbinding: {
          nodeId: 'node-123',
          paintType: 'fills',
          paintIndex: 0,
          unboundAt: new Date().toISOString(),
          referencesCleanedUp: 1
        }
      });

      const result = await removeBoundVariableHandler({
        nodeId: 'node-123',
        paintType: 'fills',
        paintIndex: 0
      });

      expect(mockSendCommand).toHaveBeenCalledWith('remove_bound_variable', {
        nodeId: 'node-123',
        paintType: 'fills',
        paintIndex: 0
      });

      expect(result.content[0].text).toContain('removed successfully');
    });

    it("should validate parameter requirements", async () => {
      const result = await removeBoundVariableHandler({
        nodeId: 'node-123'
        // Missing both property and paint specification
      });

      expect(result.content[0].text).toContain('Error');
      expect(mockSendCommand).not.toHaveBeenCalled();
    });

    it("should reject conflicting parameters", async () => {
      const result = await removeBoundVariableHandler({
        nodeId: 'node-123',
        property: 'width',
        paintType: 'fills', // Can't specify both
        paintIndex: 0
      });

      expect(result.content[0].text).toContain('Error');
      expect(mockSendCommand).not.toHaveBeenCalled();
    });
  });

  describe("Tool Registration", () => {
    it("should register binding tools with proper handlers", () => {
      expect(setBoundVariableHandler).toBeDefined();
      expect(setBoundVariableForPaintHandler).toBeDefined();
      expect(removeBoundVariableHandler).toBeDefined();
    });
  });
}); 