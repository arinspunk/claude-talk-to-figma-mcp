/**
 * Tool Test Template
 * Provides standardized test structure for MCP Figma tools
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mockWebSocketModule, MockScenarios, resetWebSocketMocks } from '../mocks/websocket-mock';

/**
 * Configuration for tool test suite
 */
export interface ToolTestConfig {
  toolName: string;
  description: string;
  registerFunction: (server: McpServer) => void;
  mockScenario?: keyof typeof MockScenarios;
  validInputs: Array<{
    name: string;
    input: Record<string, any>;
    expectedCommand?: string;
    expectedParams?: Record<string, any>;
  }>;
  invalidInputs: Array<{
    name: string;
    input: Record<string, any>;
    expectedError?: string;
  }>;
  edgeCases?: Array<{
    name: string;
    input: Record<string, any>;
    mockConfig?: any;
    expectedBehavior: string;
  }>;
}

/**
 * Standard tool test suite generator
 */
export function createToolTestSuite(config: ToolTestConfig) {
  const {
    toolName,
    description,
    registerFunction,
    mockScenario = 'success',
    validInputs,
    invalidInputs,
    edgeCases = []
  } = config;

  describe(`${toolName} tool integration`, () => {
    let server: McpServer;
    let mockWebSocket: any;
    let toolHandler: Function;
    let toolSchema: z.ZodObject<any>;

    beforeAll(() => {
      // Setup WebSocket mock
      mockWebSocket = mockWebSocketModule(mockScenario);
    });

    beforeEach(() => {
      // Reset server for each test
      server = new McpServer(
        { name: 'test-server', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      
      // Clear mock calls
      mockWebSocket.clearMock();
      
      // Capture tool handler and schema
      const originalTool = server.tool.bind(server);
      jest.spyOn(server, 'tool').mockImplementation((...args: any[]) => {
        if (args.length === 4) {
          const [name, desc, schema, handler] = args;
          if (name === toolName) {
            toolHandler = handler;
            toolSchema = z.object(schema);
          }
        }
        return (originalTool as any)(...args);
      });
      
      // Register tools
      registerFunction(server);
    });

    afterAll(() => {
      resetWebSocketMocks();
    });

    /**
     * Helper function to call tool with validation
     */
    async function callToolWithValidation(args: any) {
      const validatedArgs = toolSchema.parse(args);
      const result = await toolHandler(validatedArgs, { meta: {} });
      return result;
    }

    describe('Tool Registration', () => {
      it(`should register ${toolName} tool`, () => {
        expect(toolHandler).toBeDefined();
        expect(typeof toolHandler).toBe('function');
      });

      it('should have valid Zod schema', () => {
        expect(toolSchema).toHaveValidZodSchema();
      });
    });

    describe('Parameter Validation', () => {
      validInputs.forEach(({ name, input }) => {
        it(`should accept valid input: ${name}`, async () => {
          expect(() => toolSchema.parse(input)).not.toThrow();
        });
      });

      invalidInputs.forEach(({ name, input, expectedError }) => {
        it(`should reject invalid input: ${name}`, async () => {
          await expect(callToolWithValidation(input)).rejects.toThrow();
          
          // WebSocket should not be called if validation fails
          expect(mockWebSocket.getCallCount()).toBe(0);
        });
      });
    });

    describe('Functionality', () => {
      validInputs.forEach(({ name, input, expectedCommand, expectedParams }) => {
        it(`should execute successfully: ${name}`, async () => {
          const response = await callToolWithValidation(input);
          
          // Validate response format
          expect(response).toHaveValidToolResponse();
          
          // Validate WebSocket call
          expect(mockWebSocket.getCallCount()).toBe(1);
          
          if (expectedCommand) {
            expect(mockWebSocket).toCallWebSocketWithCommand(expectedCommand, expectedParams);
          }
        });
      });
    });

    describe('Error Handling', () => {
      it('should handle WebSocket connection errors', async () => {
        // Setup network error mock
        const errorMock = MockScenarios.networkError();
        jest.doMock('../../src/talk_to_figma_mcp/utils/websocket', () => errorMock);
        
        const firstValidInput = validInputs[0];
        if (firstValidInput) {
          const response = await callToolWithValidation(firstValidInput.input);
          
          // Should return error response
          expect(response).toHaveValidToolResponse();
          expect(response.content[0].text).toContain('Error');
        }
      });

      it('should handle Figma API errors', async () => {
        // Setup Figma error mock
        const errorMock = MockScenarios.figmaError();
        jest.doMock('../../src/talk_to_figma_mcp/utils/websocket', () => errorMock);
        
        const firstValidInput = validInputs[0];
        if (firstValidInput) {
          const response = await callToolWithValidation(firstValidInput.input);
          
          // Should return error response
          expect(response).toHaveValidToolResponse();
          expect(response.content[0].text).toContain('Error');
        }
      });

      it('should handle timeout scenarios', async () => {
        // Note: This test should be implemented based on tool timeout configuration
        // For now, we'll skip it as it depends on specific timeout implementation
        pending('Timeout testing requires tool-specific timeout configuration');
      });
    });

    if (edgeCases.length > 0) {
      describe('Edge Cases', () => {
        edgeCases.forEach(({ name, input, mockConfig, expectedBehavior }) => {
          it(`should handle edge case: ${name}`, async () => {
            if (mockConfig) {
              // Setup custom mock for this edge case
              const customMock = mockWebSocketModule(mockConfig);
              jest.doMock('../../src/talk_to_figma_mcp/utils/websocket', () => customMock);
            }
            
            const response = await callToolWithValidation(input);
            
            // Validate response
            expect(response).toHaveValidToolResponse();
            
            // Additional assertions based on expectedBehavior
            // This would be customized per tool/test case
          });
        });
      });
    }

    describe('Performance', () => {
      it('should complete within reasonable time', async () => {
        const startTime = Date.now();
        const firstValidInput = validInputs[0];
        
        if (firstValidInput) {
          await callToolWithValidation(firstValidInput.input);
          const duration = Date.now() - startTime;
          
          // Should complete within 5 seconds for normal operations
          expect(duration).toBeLessThan(5000);
        }
      });

      if (validInputs.length > 1) {
        it('should handle multiple consecutive calls', async () => {
          const promises = validInputs.slice(0, 3).map(({ input }) => 
            callToolWithValidation(input)
          );
          
          const responses = await Promise.all(promises);
          
          // All responses should be valid
          responses.forEach(response => {
            expect(response).toHaveValidToolResponse();
          });
          
          // Should have made correct number of WebSocket calls
          expect(mockWebSocket.getCallCount()).toBe(responses.length);
        });
      }
    });
  });
}

/**
 * Helper function to create basic test configuration
 */
export function createBasicToolTestConfig(
  toolName: string,
  description: string,
  registerFunction: (server: McpServer) => void,
  sampleValidInput: Record<string, any>,
  sampleInvalidInput: Record<string, any>
): ToolTestConfig {
  return {
    toolName,
    description,
    registerFunction,
    validInputs: [
      {
        name: 'basic valid input',
        input: sampleValidInput,
        expectedCommand: toolName.replace('_', '-') // Convert snake_case to kebab-case for command
      }
    ],
    invalidInputs: [
      {
        name: 'invalid input',
        input: sampleInvalidInput
      }
    ]
  };
}

/**
 * Helper function for batch testing of multiple tools
 */
export function createBatchTestSuite(
  suiteName: string,
  toolConfigs: ToolTestConfig[]
) {
  describe(suiteName, () => {
    toolConfigs.forEach(config => {
      createToolTestSuite(config);
    });
  });
}

 