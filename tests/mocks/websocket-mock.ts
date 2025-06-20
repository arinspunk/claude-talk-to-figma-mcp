/**
 * WebSocket Mock for Tool Testing
 * Provides comprehensive mocking capabilities for WebSocket communication
 */

import { jest } from '@jest/globals';

/**
 * Mock response types for different scenarios
 */
export interface MockWebSocketResponse {
  success?: boolean;
  data?: any;
  error?: string;
  delay?: number;
}

/**
 * WebSocket mock configuration
 */
export interface WebSocketMockConfig {
  defaultResponse?: MockWebSocketResponse;
  commandResponses?: Record<string, MockWebSocketResponse>;
  shouldReject?: boolean;
  networkLatency?: number;
}

/**
 * Create a comprehensive WebSocket mock
 */
export function createWebSocketMock(config: WebSocketMockConfig = {}) {
  const {
    defaultResponse = { success: true, data: { name: "MockNode", id: "mock-id" } },
    commandResponses = {},
    shouldReject = false,
    networkLatency = 0
  } = config;

  const mockSendCommand = jest.fn(async (command: string, params?: any) => {
    // Simulate network latency
    if (networkLatency > 0) {
      await new Promise(resolve => setTimeout(resolve, networkLatency));
    }

    // Check if we should reject
    if (shouldReject) {
      throw new Error('WebSocket connection failed');
    }

    // Get command-specific response or use default
    const response = commandResponses[command] || defaultResponse;

    // Simulate delay if specified
    if (response.delay) {
      await new Promise(resolve => setTimeout(resolve, response.delay));
    }

    // Return error if specified
    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  });

  return {
    sendCommandToFigma: mockSendCommand,
    // Helper methods for testing
    clearMock: () => mockSendCommand.mockClear(),
    getCallCount: () => mockSendCommand.mock.calls.length,
    getLastCall: () => mockSendCommand.mock.calls[mockSendCommand.mock.calls.length - 1],
    getAllCalls: () => mockSendCommand.mock.calls,
    hasBeenCalledWith: (command: string, params?: any) => {
      return mockSendCommand.mock.calls.some(call => {
        const [calledCommand, calledParams] = call;
        return calledCommand === command && 
          (params ? JSON.stringify(calledParams) === JSON.stringify(params) : true);
      });
    }
  };
}

/**
 * Pre-configured mock scenarios for common testing cases
 */
export const MockScenarios = {
  /**
   * Standard successful response
   */
  success: () => createWebSocketMock({
    defaultResponse: { 
      success: true, 
      data: { name: "SuccessNode", id: "success-id" } 
    }
  }),

  /**
   * Network error scenario
   */
  networkError: () => createWebSocketMock({
    shouldReject: true
  }),

  /**
   * Timeout scenario (slow response)
   */
  timeout: () => createWebSocketMock({
    defaultResponse: { 
      success: true, 
      data: { name: "SlowNode", id: "slow-id" },
      delay: 20000 // 20 seconds to trigger timeout
    }
  }),

  /**
   * Figma API error scenario
   */
  figmaError: () => createWebSocketMock({
    defaultResponse: {
      error: "Node not found in Figma"
    }
  }),

  /**
   * Variable-specific responses
   */
  variableOperations: () => createWebSocketMock({
    commandResponses: {
      'create_variable': { 
        success: true, 
        data: { 
          id: "var-123", 
          name: "TestVariable", 
          type: "COLOR",
          resolvedType: "COLOR"
        } 
      },
      'create_variable_collection': { 
        success: true, 
        data: { 
          id: "collection-456", 
          name: "TestCollection" 
        } 
      },
      'get_local_variables': { 
        success: true, 
        data: [
          { id: "var-1", name: "Variable1", type: "COLOR" },
          { id: "var-2", name: "Variable2", type: "STRING" }
        ] 
      },
      'set_bound_variable': { 
        success: true, 
        data: { 
          nodeId: "node-123", 
          boundProperty: "fills",
          variableId: "var-123"
        } 
      }
    }
  }),

  /**
   * Style-specific responses
   */
  styleOperations: () => createWebSocketMock({
    commandResponses: {
      'create_paint_style': { 
        success: true, 
        data: { 
          id: "style-123", 
          name: "TestPaintStyle",
          type: "PAINT" 
        } 
      },
      'create_text_style': { 
        success: true, 
        data: { 
          id: "style-456", 
          name: "TestTextStyle",
          type: "TEXT" 
        } 
      },
      'get_local_paint_styles': { 
        success: true, 
        data: [
          { id: "style-1", name: "Primary Color", type: "PAINT" },
          { id: "style-2", name: "Secondary Color", type: "PAINT" }
        ] 
      }
    }
  }),

  /**
   * Boolean operations responses
   */
  booleanOperations: () => createWebSocketMock({
    commandResponses: {
      'union_nodes': { 
        success: true, 
        data: { 
          id: "union-result", 
          name: "Union Result",
          type: "BOOLEAN_OPERATION" 
        } 
      },
      'subtract_nodes': { 
        success: true, 
        data: { 
          id: "subtract-result", 
          name: "Subtract Result",
          type: "BOOLEAN_OPERATION" 
        } 
      }
    }
  }),

  /**
   * Layout operations responses
   */
  layoutOperations: () => createWebSocketMock({
    commandResponses: {
      'group_nodes': { 
        success: true, 
        data: { 
          id: "group-123", 
          name: "New Group",
          type: "GROUP" 
        } 
      },
      'create_auto_layout': { 
        success: true, 
        data: { 
          id: "frame-456", 
          name: "Auto Layout Frame",
          layoutMode: "VERTICAL" 
        } 
      }
    }
  })
};

/**
 * Mock the entire websocket module
 */
export function mockWebSocketModule(scenario: keyof typeof MockScenarios | WebSocketMockConfig = 'success') {
  const mock = typeof scenario === 'string' 
    ? MockScenarios[scenario]() 
    : createWebSocketMock(scenario);

  jest.doMock('../../src/talk_to_figma_mcp/utils/websocket', () => mock);
  
  return mock;
}

/**
 * Helper function to reset all WebSocket mocks
 */
export function resetWebSocketMocks() {
  jest.clearAllMocks();
  jest.resetModules();
}

/**
 * WebSocket test utilities
 */
export const WebSocketTestUtils = {
  /**
   * Wait for WebSocket calls to complete
   */
  async waitForCalls(mock: any, expectedCount: number, timeout = 5000) {
    const startTime = Date.now();
    while (mock.getCallCount() < expectedCount) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Timeout waiting for ${expectedCount} WebSocket calls. Got ${mock.getCallCount()}`);
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  },

  /**
   * Validate command sequence
   */
  validateCommandSequence(mock: any, expectedCommands: string[]) {
    const calls = mock.getAllCalls();
    const actualCommands = calls.map((call: any[]) => call[0]);
    
    expect(actualCommands).toEqual(expectedCommands);
  },

  /**
   * Check if all expected commands were called
   */
  expectCommandsCalled(mock: any, commands: string[]) {
    commands.forEach(command => {
      expect(mock.hasBeenCalledWith(command)).toBe(true);
    });
  }
};

export default {
  createWebSocketMock,
  MockScenarios,
  mockWebSocketModule,
  resetWebSocketMocks,
  WebSocketTestUtils
}; 