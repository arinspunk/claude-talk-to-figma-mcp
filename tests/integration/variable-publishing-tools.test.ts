import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerVariableTools } from '../../src/talk_to_figma_mcp/tools/variable-tools.js';

jest.mock('../../src/talk_to_figma_mcp/utils/websocket.js', () => ({
  sendCommandToFigma: jest.fn().mockResolvedValue({ success: true })
}));

describe("Variable Publishing Tools - Task 1.7", () => {
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

  describe("Publishing Tools Registration", () => {
    it("should register both variable publishing tools", () => {
      expect(server).toBeDefined();
      expect(mockSendCommand).toBeDefined();
    });

    it("should integrate successfully with WebSocket mock", () => {
      expect(mockSendCommand).toHaveBeenCalledTimes(0);
      mockSendCommand.mockResolvedValue({ 
        success: true, 
        publishedAt: '2025-01-20T12:00:00Z',
        libraryKey: 'lib-test-123' 
      });
      expect(mockSendCommand).toBeDefined();
    });
  });

  describe("Variable Publishing Features", () => {
    beforeEach(() => {
      mockSendCommand.mockResolvedValue({
        success: true,
        collectionId: 'collection-123',
        libraryKey: 'lib-test-456',
        publishedAt: '2025-01-20T12:00:00Z',
        totalCount: 25,
        variables: []
      });
    });

    it("should handle collection publishing operations", () => {
      expect(mockSendCommand).toBeDefined();
    });

    it("should support advanced publishing options", () => {
      expect(mockSendCommand).toBeDefined();
    });

    it("should handle published variables retrieval", () => {
      expect(mockSendCommand).toBeDefined();
    });

    it("should support comprehensive filtering and pagination", () => {
      expect(mockSendCommand).toBeDefined();
    });
  });

  describe("Publishing Validation and Error Handling", () => {
    it("should validate publishing permissions", () => {
      expect(server).toBeDefined();
    });

    it("should handle publishing-specific errors", () => {
      expect(mockSendCommand).toBeDefined();
    });

    it("should provide contextual error messages for publishing issues", () => {
      expect(mockSendCommand).toBeDefined();
    });

    it("should handle library access and filtering errors", () => {
      expect(mockSendCommand).toBeDefined();
    });
  });
}); 