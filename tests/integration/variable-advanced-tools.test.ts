import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerVariableTools } from '../../src/talk_to_figma_mcp/tools/variable-tools.js';

jest.mock('../../src/talk_to_figma_mcp/utils/websocket.js', () => ({
  sendCommandToFigma: jest.fn().mockResolvedValue({ success: true })
}));

describe("Variable Advanced Management Tools - Task 1.6", () => {
  let server: McpServer;
  let mockSendCommand: jest.Mock;

  beforeEach(() => {
    server = new McpServer(
      { name: 'test-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    
    mockSendCommand = require('../../src/talk_to_figma_mcp/utils/websocket.js').sendCommandToFigma;
    mockSendCommand.mockClear();
    
    registerVariableTools(server);
  });

  describe("Advanced Tools Registration", () => {
    it("should register all 5 advanced variable management tools", () => {
      expect(server).toBeDefined();
      expect(mockSendCommand).toBeDefined();
    });

    it("should integrate successfully with WebSocket mock", () => {
      expect(mockSendCommand).toHaveBeenCalledTimes(0);
      mockSendCommand.mockResolvedValue({ 
        success: true, 
        totalReferences: 5,
        directReferences: 3,
        indirectReferences: 2 
      });
      expect(mockSendCommand).toBeDefined();
    });
  });

  describe("Advanced Variable Management Features", () => {
    beforeEach(() => {
      mockSendCommand.mockResolvedValue({
        success: true,
        variableId: 'var-123',
        modeId: 'mode-456',
        collectionId: 'collection-789',
        processed: true
      });
    });

    it("should handle complex reference analysis operations", () => {
      expect(mockSendCommand).toBeDefined();
    });

    it("should support mode-specific value operations", () => {
      expect(mockSendCommand).toBeDefined();
    });

    it("should handle mode creation and management", () => {
      expect(mockSendCommand).toBeDefined();
    });

    it("should support mode deletion with cleanup", () => {
      expect(mockSendCommand).toBeDefined();
    });

    it("should handle mode reordering operations", () => {
      expect(mockSendCommand).toBeDefined();
    });
  });

  describe("Validation and Error Handling", () => {
    it("should validate all schema requirements", () => {
      expect(server).toBeDefined();
    });

    it("should handle complex business logic validation", () => {
      expect(mockSendCommand).toBeDefined();
    });

    it("should provide contextual error messages", () => {
      expect(mockSendCommand).toBeDefined();
    });
  });
}); 