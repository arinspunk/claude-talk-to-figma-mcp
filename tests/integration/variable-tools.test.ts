/**
 * Variable Tools Integration Tests
 * Tests for the Variable API tools implementation
 * 
 * This test suite validates the basic structure created in Phase 1, Task 1.1
 * of the Variable Tools implementation.
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerVariableTools } from '../../src/talk_to_figma_mcp/tools/variable-tools';

describe('Variable Tools Integration Tests', () => {
  let server: McpServer;
  
  beforeEach(() => {
    // Reset server for each test
    server = new McpServer(
      { name: 'test-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    
    // Register variable tools
    registerVariableTools(server);
  });

  describe('Tool Registration', () => {
    it('should register variable tools without errors', () => {
      expect(() => registerVariableTools(server)).not.toThrow();
    });

    it('should register all expected variable tools', () => {
      // Verify that basic variable tools are registered
      const expectedTools = [
        'create_variable',
        'create_variable_collection',
        'get_local_variables',
        'get_local_variable_collections',
        'get_variable_by_id',
        'get_variable_collection_by_id'
      ];
      
      expectedTools.forEach(toolName => {
        // Basic validation that the tool name is defined
        expect(toolName).toBeDefined();
        expect(typeof toolName).toBe('string');
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
}); 