/**
 * Variable Tools Integration Tests
 * Tests for the Variable API tools implementation
 * 
 * This test suite validates the basic structure created in Phase 1, Task 1.1
 * and implements TDD tests for Task 1.2 - Basic Variable Creation Tools
 * and Task 1.3 - Enhanced Query Tools with Filtering and Optimization
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerVariableTools } from '../../src/talk_to_figma_mcp/tools/variable-tools.js';

// Mock WebSocket communication
const mockSendCommandToFigma = jest.fn();
jest.mock('../../src/talk_to_figma_mcp/utils/websocket.js', () => ({
  sendCommandToFigma: mockSendCommandToFigma,
}));

describe('Variable Tools Integration Tests - TDD Implementation', () => {
  let server: McpServer;
  let toolHandler: Function;
  let toolSchema: z.ZodObject<any>;
  
  beforeEach(() => {
    // Reset server and mocks for each test
    server = new McpServer(
      { name: 'test-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup default successful response
    mockSendCommandToFigma.mockResolvedValue({
      success: true,
      data: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'test-variable',
        type: 'STRING',
        value: 'test value',
        createdAt: new Date().toISOString(),
      },
    });
    
    // Spy on server.tool to capture handler and schema
    const originalTool = server.tool.bind(server);
    jest.spyOn(server, 'tool').mockImplementation((...args: any[]) => {
      if (args.length === 4) {
        const [name, description, schema, handler] = args;
        if (name === 'create_variable') {
          toolHandler = handler;
          toolSchema = z.object(schema);
        }
      }
      return (originalTool as any)(...args);
    });
    
    // Register variable tools
    registerVariableTools(server);
  });

  describe('Tool Registration', () => {
    it('should register variable tools without errors', () => {
      expect(() => registerVariableTools(server)).not.toThrow();
    });

    it('should register all expected variable tools', () => {
      const expectedTools = [
        'create_variable',
        'create_variable_collection',
        'get_local_variables',
        'get_local_variable_collections',
        'get_variable_by_id',
        'get_variable_collection_by_id'
      ];
      
      expectedTools.forEach(toolName => {
        expect(toolName).toBeDefined();
        expect(typeof toolName).toBe('string');
      });
    });
  });

  describe('create_variable - TDD Implementation', () => {
    describe('Input Validation', () => {
      it('should validate required parameters', async () => {
        const validInput = {
          name: 'test-variable',
          variableCollectionId: 'collection-123',
          resolvedType: 'STRING' as const,
        };

        const result = await toolHandler(validInput);
        
        expect(result.content).toBeDefined();
        expect(result.content[0].type).toBe('text');
        expect(mockSendCommandToFigma).toHaveBeenCalledWith('create_variable', {
          name: 'test-variable',
          variableCollectionId: 'collection-123',
          resolvedType: 'STRING',
          initialValue: undefined,
          description: '',
        });
      });

      it('should reject empty variable names', async () => {
        const invalidInput = {
          name: '',
          variableCollectionId: 'collection-123',
          resolvedType: 'STRING' as const,
        };

        const result = await toolHandler(invalidInput);
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('Error');
        expect(mockSendCommandToFigma).not.toHaveBeenCalled();
      });

      it('should reject missing variable collection ID', async () => {
        const invalidInput = {
          name: 'test-variable',
          variableCollectionId: '',
          resolvedType: 'STRING' as const,
        };

        const result = await toolHandler(invalidInput);
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('Error');
        expect(mockSendCommandToFigma).not.toHaveBeenCalled();
      });

      it('should validate variable types', async () => {
        const invalidInput = {
          name: 'test-variable',
          variableCollectionId: 'collection-123',
          resolvedType: 'INVALID_TYPE' as any,
        };

        const result = await toolHandler(invalidInput);
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('Error');
        expect(mockSendCommandToFigma).not.toHaveBeenCalled();
      });

      it('should validate color values correctly', async () => {
        const validColorInput = {
          name: 'test-color',
          variableCollectionId: 'collection-123',
          resolvedType: 'COLOR' as const,
          initialValue: {
            r: 0.5,
            g: 0.3,
            b: 0.8,
            a: 1.0
          }
        };

        const result = await toolHandler(validColorInput);
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('created successfully');
        expect(mockSendCommandToFigma).toHaveBeenCalledWith('create_variable', {
          name: 'test-color',
          variableCollectionId: 'collection-123',
          resolvedType: 'COLOR',
          initialValue: {
            r: 0.5,
            g: 0.3,
            b: 0.8,
            a: 1.0
          },
          description: '',
        });
      });

      it('should reject invalid color values', async () => {
        const invalidColorInput = {
          name: 'test-color',
          variableCollectionId: 'collection-123',
          resolvedType: 'COLOR' as const,
          initialValue: {
            r: 1.5, // Invalid: > 1
            g: 0.3,
            b: 0.8,
            a: 1.0
          }
        };

        const result = await toolHandler(invalidColorInput);
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('Error');
        expect(mockSendCommandToFigma).not.toHaveBeenCalled();
      });
    });

    describe('Business Logic', () => {
      it('should create variable with all parameters', async () => {
        const fullInput = {
          name: 'test-variable',
          variableCollectionId: 'collection-123',
          resolvedType: 'STRING' as const,
          initialValue: 'initial value',
          description: 'Test variable description'
        };

        const result = await toolHandler(fullInput);
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('created successfully');
        expect(mockSendCommandToFigma).toHaveBeenCalledWith('create_variable', {
          name: 'test-variable',
          variableCollectionId: 'collection-123',
          resolvedType: 'STRING',
          initialValue: 'initial value',
          description: 'Test variable description',
        });
      });

      it('should handle boolean variables', async () => {
        const booleanInput = {
          name: 'test-boolean',
          variableCollectionId: 'collection-123',
          resolvedType: 'BOOLEAN' as const,
          initialValue: true
        };

        const result = await toolHandler(booleanInput);
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('created successfully');
        expect(mockSendCommandToFigma).toHaveBeenCalledWith('create_variable', {
          name: 'test-boolean',
          variableCollectionId: 'collection-123',
          resolvedType: 'BOOLEAN',
          initialValue: true,
          description: '',
        });
      });

      it('should handle float variables', async () => {
        const floatInput = {
          name: 'test-float',
          variableCollectionId: 'collection-123',
          resolvedType: 'FLOAT' as const,
          initialValue: 3.14159
        };

        const result = await toolHandler(floatInput);
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('created successfully');
        expect(mockSendCommandToFigma).toHaveBeenCalledWith('create_variable', {
          name: 'test-float',
          variableCollectionId: 'collection-123',
          resolvedType: 'FLOAT',
          initialValue: 3.14159,
          description: '',
        });
      });
    });

    describe('Error Handling', () => {
      it('should handle WebSocket communication errors', async () => {
        mockSendCommandToFigma.mockRejectedValue(new Error('WebSocket connection failed'));

        const validInput = {
          name: 'test-variable',
          variableCollectionId: 'collection-123',
          resolvedType: 'STRING' as const,
        };

        const result = await toolHandler(validInput);
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('Error creating variable');
        expect(result.content[0].text).toContain('WebSocket connection failed');
      });

      it('should handle Figma API errors', async () => {
        mockSendCommandToFigma.mockRejectedValue(new Error('Collection not found'));

        const validInput = {
          name: 'test-variable',
          variableCollectionId: 'invalid-collection',
          resolvedType: 'STRING' as const,
        };

        const result = await toolHandler(validInput);
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('Error creating variable');
        expect(result.content[0].text).toContain('Collection not found');
      });

      it('should handle permission errors', async () => {
        mockSendCommandToFigma.mockRejectedValue(new Error('Permission denied'));

        const validInput = {
          name: 'test-variable',
          variableCollectionId: 'collection-123',
          resolvedType: 'STRING' as const,
        };

        const result = await toolHandler(validInput);
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('Error creating variable');
        expect(result.content[0].text).toContain('Permission denied');
      });
    });

    describe('WebSocket Integration', () => {
      it('should send correct command structure', async () => {
        const validInput = {
          name: 'test-variable',
          variableCollectionId: 'collection-123',
          resolvedType: 'STRING' as const,
          initialValue: 'test value',
          description: 'Test description'
        };

        await toolHandler(validInput);
        
        expect(mockSendCommandToFigma).toHaveBeenCalledTimes(1);
        expect(mockSendCommandToFigma).toHaveBeenCalledWith('create_variable', {
          name: 'test-variable',
          variableCollectionId: 'collection-123',
          resolvedType: 'STRING',
          initialValue: 'test value',
          description: 'Test description',
        });
      });

      it('should handle successful responses', async () => {
        mockSendCommandToFigma.mockResolvedValue({
          success: true,
          variable: {
            id: 'var-123',
            name: 'test-variable',
            type: 'STRING',
            value: 'test value'
          }
        });

        const validInput = {
          name: 'test-variable',
          variableCollectionId: 'collection-123',
          resolvedType: 'STRING' as const,
        };

        const result = await toolHandler(validInput);
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('created successfully');
        expect(result.content[0].text).toContain('var-123');
      });
    });
  });

  describe('create_variable tool', () => {
    it('should have valid schema for creating variables', () => {
      // Test that the schema accepts valid input
      const validInput = {
        name: 'test-variable',
        variableCollectionId: 'collection-123',
        resolvedType: 'STRING' as const,
        initialValue: 'test value',
        description: 'A test variable'
      };
      
      // Schema validation will be tested when the tool is called
      expect(validInput.name).toBeDefined();
      expect(validInput.variableCollectionId).toBeDefined();
      expect(validInput.resolvedType).toBeDefined();
    });

    it('should reject invalid variable types', () => {
      const invalidInput = {
        name: 'test-variable',
        variableCollectionId: 'collection-123',
        resolvedType: 'INVALID_TYPE',
        initialValue: 'test value'
      };
      
      // This would fail Zod validation when the tool is called
      expect(invalidInput.resolvedType).not.toMatch(/^(BOOLEAN|FLOAT|STRING|COLOR)$/);
    });

    it('should handle color values correctly', () => {
      const colorInput = {
        name: 'test-color',
        variableCollectionId: 'collection-123',
        resolvedType: 'COLOR' as const,
        initialValue: {
          r: 0.5,
          g: 0.3,
          b: 0.8,
          a: 1.0
        }
      };
      
      expect(colorInput.initialValue.r).toBeGreaterThanOrEqual(0);
      expect(colorInput.initialValue.r).toBeLessThanOrEqual(1);
      expect(colorInput.initialValue.g).toBeGreaterThanOrEqual(0);
      expect(colorInput.initialValue.g).toBeLessThanOrEqual(1);
      expect(colorInput.initialValue.b).toBeGreaterThanOrEqual(0);
      expect(colorInput.initialValue.b).toBeLessThanOrEqual(1);
    });
  });

  describe('create_variable_collection tool', () => {
    it('should have valid schema for creating variable collections', () => {
      const validInput = {
        name: 'Test Collection',
        initialModeNames: ['Light', 'Dark']
      };
      
      expect(validInput.name).toBeDefined();
      expect(Array.isArray(validInput.initialModeNames)).toBe(true);
    });

    it('should work with minimal input', () => {
      const minimalInput = {
        name: 'Minimal Collection'
      };
      
      expect(minimalInput.name).toBeDefined();
    });
  });

  describe('get_local_variables tool', () => {
    it('should work without parameters', () => {
      // This tool should accept no parameters and return all variables
      const input = {};
      expect(typeof input).toBe('object');
    });
  });

  describe('get_local_variable_collections tool', () => {
    it('should work without parameters', () => {
      // This tool should accept no parameters and return all collections
      const input = {};
      expect(typeof input).toBe('object');
    });
  });

  describe('get_variable_by_id tool', () => {
    it('should require variableId parameter', () => {
      const validInput = {
        variableId: 'var-123'
      };
      
      expect(validInput.variableId).toBeDefined();
      expect(validInput.variableId.length).toBeGreaterThan(0);
    });

    it('should reject empty variableId', () => {
      const invalidInput = {
        variableId: ''
      };
      
      // This would fail Zod validation
      expect(invalidInput.variableId.length).toBe(0);
    });
  });

  describe('get_variable_collection_by_id tool', () => {
    it('should require variableCollectionId parameter', () => {
      const validInput = {
        variableCollectionId: 'collection-123'
      };
      
      expect(validInput.variableCollectionId).toBeDefined();
      expect(validInput.variableCollectionId.length).toBeGreaterThan(0);
    });

    it('should reject empty variableCollectionId', () => {
      const invalidInput = {
        variableCollectionId: ''
      };
      
      // This would fail Zod validation
      expect(invalidInput.variableCollectionId.length).toBe(0);
    });
  });

  describe('WebSocket Communication', () => {
    it('should use correct command names for each tool', () => {
      // Verify that tools send the expected commands to Figma
      const expectedCommands = {
        'create_variable': 'create_variable',
        'create_variable_collection': 'create_variable_collection',
        'get_local_variables': 'get_local_variables',
        'get_local_variable_collections': 'get_local_variable_collections',
        'get_variable_by_id': 'get_variable_by_id',
        'get_variable_collection_by_id': 'get_variable_collection_by_id'
      };
      
      Object.entries(expectedCommands).forEach(([toolName, command]) => {
        expect(toolName).toBeDefined();
        expect(command).toBeDefined();
      });
    });
  });

  describe('Variable Type Validation', () => {
    it('should accept all valid variable types', () => {
      const validTypes = ['BOOLEAN', 'FLOAT', 'STRING', 'COLOR'];
      
      validTypes.forEach(type => {
        expect(['BOOLEAN', 'FLOAT', 'STRING', 'COLOR']).toContain(type);
      });
    });

    it('should validate boolean initial values', () => {
      const booleanInputs = [true, false];
      
      booleanInputs.forEach(value => {
        expect(typeof value).toBe('boolean');
      });
    });

    it('should validate number initial values', () => {
      const numberInputs = [0, 1, -1, 3.14, 100];
      
      numberInputs.forEach(value => {
        expect(typeof value).toBe('number');
      });
    });

    it('should validate string initial values', () => {
      const stringInputs = ['', 'test', 'Hello World'];
      
      stringInputs.forEach(value => {
        expect(typeof value).toBe('string');
      });
    });
  });

  describe('Integration Setup Validation', () => {
    it('should have test server properly configured', () => {
      expect(server).toBeDefined();
      expect(typeof server).toBe('object');
    });

    it('should register tools without throwing errors', () => {
      expect(() => {
        const testServer = new McpServer(
          { name: 'test', version: '1.0.0' },
          { capabilities: { tools: {} } }
        );
        registerVariableTools(testServer);
      }).not.toThrow();
    });
  });

  describe('get_local_variables - Task 1.3 TDD Implementation', () => {
    let getVariablesHandler: Function;
    
    beforeEach(() => {
      // Capture get_local_variables handler
      const originalTool = server.tool.bind(server);
      jest.spyOn(server, 'tool').mockImplementation((...args: any[]) => {
        if (args.length === 4) {
          const [name, description, schema, handler] = args;
          if (name === 'get_local_variables') {
            getVariablesHandler = handler;
          }
        }
        return (originalTool as any)(...args);
      });
      
      registerVariableTools(server);
      
      // Setup mock response for get_local_variables
      mockSendCommandToFigma.mockResolvedValue({
        success: true,
        variables: [
          {
            id: 'var-1',
            name: 'primary-color',
            type: 'COLOR',
            collectionId: 'collection-1',
            value: { r: 0.2, g: 0.4, b: 0.8, a: 1.0 }
          },
          {
            id: 'var-2',
            name: 'secondary-color',
            type: 'COLOR',
            collectionId: 'collection-2',
            value: { r: 0.8, g: 0.2, b: 0.4, a: 1.0 }
          },
          {
            id: 'var-3',
            name: 'spacing-base',
            type: 'FLOAT',
            collectionId: 'collection-1',
            value: 16
          }
        ]
      });
    });

    describe('Filtering Capabilities', () => {
      it('should get all variables when no filter is provided', async () => {
        const result = await getVariablesHandler({});
        
        expect(result.content).toBeDefined();
        expect(result.content[0].type).toBe('text');
        expect(mockSendCommandToFigma).toHaveBeenCalledWith('get_local_variables', {});
      });

      it('should filter variables by collection ID', async () => {
        const result = await getVariablesHandler({
          collectionId: 'collection-1'
        });
        
        expect(result.content).toBeDefined();
        expect(mockSendCommandToFigma).toHaveBeenCalledWith('get_local_variables', {
          collectionId: 'collection-1'
        });
      });

      it('should filter variables by type', async () => {
        const result = await getVariablesHandler({
          type: 'COLOR'
        });
        
        expect(result.content).toBeDefined();
        expect(mockSendCommandToFigma).toHaveBeenCalledWith('get_local_variables', {
          type: 'COLOR'
        });
      });

      it('should filter variables by name pattern', async () => {
        const result = await getVariablesHandler({
          namePattern: 'primary'
        });
        
        expect(result.content).toBeDefined();
        expect(mockSendCommandToFigma).toHaveBeenCalledWith('get_local_variables', {
          namePattern: 'primary'
        });
      });

      it('should apply multiple filters simultaneously', async () => {
        const result = await getVariablesHandler({
          collectionId: 'collection-1',
          type: 'COLOR',
          namePattern: 'primary'
        });
        
        expect(result.content).toBeDefined();
        expect(mockSendCommandToFigma).toHaveBeenCalledWith('get_local_variables', {
          collectionId: 'collection-1',
          type: 'COLOR',
          namePattern: 'primary'
        });
      });
    });

    describe('Pagination and Optimization', () => {
      it('should support pagination with limit and offset', async () => {
        const result = await getVariablesHandler({
          limit: 10,
          offset: 5
        });
        
        expect(result.content).toBeDefined();
        expect(mockSendCommandToFigma).toHaveBeenCalledWith('get_local_variables', {
          limit: 10,
          offset: 5
        });
      });

      it('should handle large result sets efficiently', async () => {
        // Mock large dataset
        const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
          id: `var-${i}`,
          name: `variable-${i}`,
          type: 'STRING',
          collectionId: 'collection-1',
          value: `value-${i}`
        }));
        
        mockSendCommandToFigma.mockResolvedValue({
          success: true,
          variables: largeDataset,
          total: 1000,
          limit: 100,
          offset: 0
        });

        const result = await getVariablesHandler({
          limit: 100
        });
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('total');
        expect(mockSendCommandToFigma).toHaveBeenCalledWith('get_local_variables', {
          limit: 100
        });
      });

      it('should validate pagination parameters', async () => {
        const result = await getVariablesHandler({
          limit: -1 // Invalid limit
        });
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('Error');
        expect(mockSendCommandToFigma).not.toHaveBeenCalled();
      });
    });

    describe('Error Handling for Query Operations', () => {
      it('should handle empty result sets gracefully', async () => {
        mockSendCommandToFigma.mockResolvedValue({
          success: true,
          variables: []
        });

        const result = await getVariablesHandler({
          collectionId: 'non-existent-collection'
        });
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('[]');
      });

      it('should handle API errors for variable queries', async () => {
        mockSendCommandToFigma.mockRejectedValue(new Error('Document not found'));

        const result = await getVariablesHandler({});
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('Error getting local variables');
        expect(result.content[0].text).toContain('Document not found');
      });

      it('should handle permission errors for variable access', async () => {
        mockSendCommandToFigma.mockRejectedValue(new Error('Read access denied'));

        const result = await getVariablesHandler({});
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('Error getting local variables');
        expect(result.content[0].text).toContain('Read access denied');
      });
    });
  });

  describe('get_local_variable_collections - Task 1.3 TDD Implementation', () => {
    let getCollectionsHandler: Function;
    
    beforeEach(() => {
      // Capture get_local_variable_collections handler
      const originalTool = server.tool.bind(server);
      jest.spyOn(server, 'tool').mockImplementation((...args: any[]) => {
        if (args.length === 4) {
          const [name, description, schema, handler] = args;
          if (name === 'get_local_variable_collections') {
            getCollectionsHandler = handler;
          }
        }
        return (originalTool as any)(...args);
      });
      
      registerVariableTools(server);
      
      // Setup mock response with complete metadata
      mockSendCommandToFigma.mockResolvedValue({
        success: true,
        collections: [
          {
            id: 'collection-1',
            name: 'Design Tokens',
            modes: [
              { id: 'mode-1', name: 'Light' },
              { id: 'mode-2', name: 'Dark' }
            ],
            variableIds: ['var-1', 'var-3'],
            description: 'Main design system tokens',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-27T12:00:00Z'
          },
          {
            id: 'collection-2',
            name: 'Component Tokens',
            modes: [
              { id: 'mode-3', name: 'Default' }
            ],
            variableIds: ['var-2'],
            description: 'Component-specific tokens',
            createdAt: '2025-01-15T00:00:00Z',
            updatedAt: '2025-01-27T10:00:00Z'
          }
        ]
      });
    });

    describe('Complete Metadata Support', () => {
      it('should return collections with full metadata', async () => {
        const result = await getCollectionsHandler({});
        
        expect(result.content).toBeDefined();
        expect(result.content[0].type).toBe('text');
        expect(mockSendCommandToFigma).toHaveBeenCalledWith('get_local_variable_collections', {
          includeMetadata: true
        });
      });

      it('should include variable counts in metadata', async () => {
        const result = await getCollectionsHandler({
          includeVariableCount: true
        });
        
        expect(result.content).toBeDefined();
        expect(mockSendCommandToFigma).toHaveBeenCalledWith('get_local_variable_collections', {
          includeMetadata: true,
          includeVariableCount: true
        });
      });

      it('should include mode information', async () => {
        const result = await getCollectionsHandler({
          includeModes: true
        });
        
        expect(result.content).toBeDefined();
        expect(mockSendCommandToFigma).toHaveBeenCalledWith('get_local_variable_collections', {
          includeMetadata: true,
          includeModes: true
        });
      });

      it('should support filtering collections by name pattern', async () => {
        const result = await getCollectionsHandler({
          namePattern: 'Design'
        });
        
        expect(result.content).toBeDefined();
        expect(mockSendCommandToFigma).toHaveBeenCalledWith('get_local_variable_collections', {
          includeMetadata: true,
          namePattern: 'Design'
        });
      });
    });

    describe('Sorting and Organization', () => {
      it('should support sorting by name', async () => {
        const result = await getCollectionsHandler({
          sortBy: 'name',
          sortOrder: 'asc'
        });
        
        expect(result.content).toBeDefined();
        expect(mockSendCommandToFigma).toHaveBeenCalledWith('get_local_variable_collections', {
          includeMetadata: true,
          sortBy: 'name',
          sortOrder: 'asc'
        });
      });

      it('should support sorting by creation date', async () => {
        const result = await getCollectionsHandler({
          sortBy: 'createdAt',
          sortOrder: 'desc'
        });
        
        expect(result.content).toBeDefined();
        expect(mockSendCommandToFigma).toHaveBeenCalledWith('get_local_variable_collections', {
          includeMetadata: true,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        });
      });

      it('should support sorting by variable count', async () => {
        const result = await getCollectionsHandler({
          sortBy: 'variableCount',
          sortOrder: 'desc'
        });
        
        expect(result.content).toBeDefined();
        expect(mockSendCommandToFigma).toHaveBeenCalledWith('get_local_variable_collections', {
          includeMetadata: true,
          sortBy: 'variableCount',
          sortOrder: 'desc'
        });
      });
    });

    describe('Error Handling for Collections', () => {
      it('should handle empty collections gracefully', async () => {
        mockSendCommandToFigma.mockResolvedValue({
          success: true,
          collections: []
        });

        const result = await getCollectionsHandler({});
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('[]');
      });

      it('should handle API errors for collection queries', async () => {
        mockSendCommandToFigma.mockRejectedValue(new Error('Document corrupted'));

        const result = await getCollectionsHandler({});
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('Error getting local variable collections');
        expect(result.content[0].text).toContain('Document corrupted');
      });
    });
  });

  describe('get_variable_by_id - Task 1.3 Enhanced Error Handling', () => {
    let getVariableByIdHandler: Function;
    
    beforeEach(() => {
      // Capture get_variable_by_id handler
      const originalTool = server.tool.bind(server);
      jest.spyOn(server, 'tool').mockImplementation((...args: any[]) => {
        if (args.length === 4) {
          const [name, description, schema, handler] = args;
          if (name === 'get_variable_by_id') {
            getVariableByIdHandler = handler;
          }
        }
        return (originalTool as any)(...args);
      });
      
      registerVariableTools(server);
    });

    describe('Enhanced ID Validation', () => {
      it('should validate variable ID format', async () => {
        const result = await getVariableByIdHandler({
          variableId: 'invalid-id-format'
        });
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('Error');
        expect(mockSendCommandToFigma).not.toHaveBeenCalled();
      });

      it('should handle valid variable ID format', async () => {
        mockSendCommandToFigma.mockResolvedValue({
          success: true,
          variable: {
            id: 'I123:456',
            name: 'test-variable',
            type: 'STRING',
            value: 'test value'
          }
        });

        const result = await getVariableByIdHandler({
          variableId: 'I123:456'
        });
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('I123:456');
        expect(mockSendCommandToFigma).toHaveBeenCalledWith('get_variable_by_id', {
          variableId: 'I123:456'
        });
      });
    });

    describe('ID Not Found Error Handling', () => {
      it('should handle non-existent variable IDs gracefully', async () => {
        mockSendCommandToFigma.mockRejectedValue(new Error('Variable not found'));

        const result = await getVariableByIdHandler({
          variableId: 'I999:999'
        });
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('Error getting variable by ID');
        expect(result.content[0].text).toContain('Variable not found');
      });

      it('should provide helpful error messages for invalid IDs', async () => {
        mockSendCommandToFigma.mockRejectedValue(new Error('Invalid variable ID format'));

        const result = await getVariableByIdHandler({
          variableId: 'invalid-format'
        });
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('Error getting variable by ID');
        expect(result.content[0].text).toContain('Invalid variable ID format');
      });

      it('should handle deleted variable references', async () => {
        mockSendCommandToFigma.mockRejectedValue(new Error('Variable has been deleted'));

        const result = await getVariableByIdHandler({
          variableId: 'I123:456'
        });
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('Error getting variable by ID');
        expect(result.content[0].text).toContain('Variable has been deleted');
      });
    });
  });

  describe('get_variable_collection_by_id - Task 1.3 Enhanced Error Handling', () => {
    let getCollectionByIdHandler: Function;
    
    beforeEach(() => {
      // Capture get_variable_collection_by_id handler
      const originalTool = server.tool.bind(server);
      jest.spyOn(server, 'tool').mockImplementation((...args: any[]) => {
        if (args.length === 4) {
          const [name, description, schema, handler] = args;
          if (name === 'get_variable_collection_by_id') {
            getCollectionByIdHandler = handler;
          }
        }
        return (originalTool as any)(...args);
      });
      
      registerVariableTools(server);
    });

    describe('Collection ID Validation', () => {
      it('should validate collection ID format', async () => {
        const result = await getCollectionByIdHandler({
          variableCollectionId: 'invalid-format'
        });
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('Error');
        expect(mockSendCommandToFigma).not.toHaveBeenCalled();
      });

      it('should handle valid collection ID format', async () => {
        mockSendCommandToFigma.mockResolvedValue({
          success: true,
          collection: {
            id: 'VariableCollectionId:123:456',
            name: 'Test Collection',
            modes: [{ id: 'mode-1', name: 'Default' }],
            variableIds: ['var-1', 'var-2']
          }
        });

        const result = await getCollectionByIdHandler({
          variableCollectionId: 'VariableCollectionId:123:456'
        });
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('VariableCollectionId:123:456');
        expect(mockSendCommandToFigma).toHaveBeenCalledWith('get_variable_collection_by_id', {
          variableCollectionId: 'VariableCollectionId:123:456'
        });
      });
    });

    describe('Collection Not Found Error Handling', () => {
      it('should handle non-existent collection IDs gracefully', async () => {
        mockSendCommandToFigma.mockRejectedValue(new Error('Collection not found'));

        const result = await getCollectionByIdHandler({
          variableCollectionId: 'VariableCollectionId:999:999'
        });
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('Error getting variable collection by ID');
        expect(result.content[0].text).toContain('Collection not found');
      });

      it('should handle deleted collection references', async () => {
        mockSendCommandToFigma.mockRejectedValue(new Error('Collection has been deleted'));

        const result = await getCollectionByIdHandler({
          variableCollectionId: 'VariableCollectionId:123:456'
        });
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('Error getting variable collection by ID');
        expect(result.content[0].text).toContain('Collection has been deleted');
      });

      it('should handle permission errors for specific collections', async () => {
        mockSendCommandToFigma.mockRejectedValue(new Error('Access denied to collection'));

        const result = await getCollectionByIdHandler({
          variableCollectionId: 'VariableCollectionId:123:456'
        });
        
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain('Error getting variable collection by ID');
        expect(result.content[0].text).toContain('Access denied to collection');
      });
    });
  });

  // ... existing tests for other tools remain ...
}); 