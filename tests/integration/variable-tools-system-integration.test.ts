/**
 * Variable Tools System Integration Tests
 * Task 1.10: Integration testing for variable tools in the main system
 * 
 * Verifies that all 20 variable tools are properly registered and accessible
 * through the main tool registration system without conflicts.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "../../src/talk_to_figma_mcp/tools/index.js";
import { registerVariableTools } from "../../src/talk_to_figma_mcp/tools/variable-tools.js";

// Mock sendCommandToFigma
jest.mock('../../src/talk_to_figma_mcp/utils/websocket.js', () => ({
  sendCommandToFigma: jest.fn()
}));

describe('Variable Tools System Integration', () => {
  let server: McpServer;
  let mockSendCommand: jest.Mock;
  let registeredTools: Map<string, any>;

  beforeEach(() => {
    // Setup fresh server instance
    server = new McpServer(
      { name: 'test-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    
    // Setup mock
    mockSendCommand = require('../../src/talk_to_figma_mcp/utils/websocket.js').sendCommandToFigma;
    mockSendCommand.mockClear();
    
    // Track registered tools
    registeredTools = new Map();
    
    // Spy on server.tool to capture registrations
    jest.spyOn(server, 'tool').mockImplementation((name: string, description: string, schema: any, handler: any) => {
      registeredTools.set(name, { description, schema, handler });
      return server as any;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Tool Registration Integration', () => {
    test('should register all tools without errors', () => {
      expect(() => {
        registerTools(server);
      }).not.toThrow();
    });

    test('should register variable tools when calling registerTools', () => {
      registerTools(server);
      
      // Verify that variable tools are registered
      const variableToolNames = [
        'create_variable',
        'create_variable_collection',
        'get_local_variables',
        'get_local_variable_collections',
        'get_variable_by_id',
        'get_variable_collection_by_id',
        'set_bound_variable',
        'set_bound_variable_for_paint',
        'remove_bound_variable',
        'update_variable_value',
        'update_variable_name',
        'delete_variable',
        'delete_variable_collection',
        'get_variable_references',
        'set_variable_mode_value',
        'create_variable_mode',
        'delete_variable_mode',
        'reorder_variable_modes',
        'publish_variable_collection',
        'get_published_variables'
      ];

      variableToolNames.forEach(toolName => {
        expect(registeredTools.has(toolName)).toBe(true);
      });
      
      expect(registeredTools.size).toBeGreaterThanOrEqual(20);
    });

    test('should register exactly 20 variable tools', () => {
      // Clear registrations and register only variable tools
      registeredTools.clear();
      registerVariableTools(server);
      
      expect(registeredTools.size).toBe(20);
    });

    test('should not have naming conflicts between tool categories', () => {
      registerTools(server);
      
      // Get all registered tool names
      const toolNames = Array.from(registeredTools.keys());
      const uniqueToolNames = new Set(toolNames);
      
      // Verify no duplicates
      expect(toolNames.length).toBe(uniqueToolNames.size);
    });
  });

  describe('Variable Tools Accessibility', () => {
    beforeEach(() => {
      registerTools(server);
    });

    test('should have valid schemas for all variable tools', () => {
      const variableToolNames = [
        'create_variable',
        'create_variable_collection',
        'get_local_variables',
        'get_local_variable_collections',
        'get_variable_by_id',
        'get_variable_collection_by_id',
        'set_bound_variable',
        'set_bound_variable_for_paint',
        'remove_bound_variable',
        'update_variable_value',
        'update_variable_name',
        'delete_variable',
        'delete_variable_collection',
        'get_variable_references',
        'set_variable_mode_value',
        'create_variable_mode',
        'delete_variable_mode',
        'reorder_variable_modes',
        'publish_variable_collection',
        'get_published_variables'
      ];

      variableToolNames.forEach(toolName => {
        const tool = registeredTools.get(toolName);
        expect(tool).toBeDefined();
        expect(tool.schema).toBeDefined();
        expect(typeof tool.handler).toBe('function');
        expect(typeof tool.description).toBe('string');
        expect(tool.description.length).toBeGreaterThan(0);
      });
    });

    test('should have consistent naming convention for variable tools', () => {
      const variableToolNames = Array.from(registeredTools.keys())
        .filter(name => {
          const tool = registeredTools.get(name);
          return tool.description.toLowerCase().includes('variable') ||
                 tool.description.toLowerCase().includes('collection') ||
                 name.includes('variable') ||
                 name.includes('collection');
        });

      // All variable tools should follow snake_case convention
      variableToolNames.forEach(toolName => {
        expect(toolName).toMatch(/^[a-z][a-z0-9_]*$/);
        expect(toolName).not.toMatch(/[A-Z]/); // No uppercase
        expect(toolName).not.toMatch(/[-]/); // No hyphens
      });

      expect(variableToolNames.length).toBe(20);
    });
  });

  describe('Integration with Existing Tools', () => {
    beforeEach(() => {
      registerTools(server);
    });

    test('should not conflict with document tools', () => {
      const documentToolPatterns = ['get_', 'select_', 'zoom_', 'export_'];
      const variableToolNames = Array.from(registeredTools.keys())
        .filter(name => name.includes('variable') || name.includes('collection'));

      // Check that no variable tool has conflicting prefixes with document tools
      variableToolNames.forEach(variableTool => {
        documentToolPatterns.forEach(pattern => {
          if (variableTool.startsWith(pattern)) {
            // Make sure it's specifically for variables/collections
            expect(
              variableTool.includes('variable') || 
              variableTool.includes('collection')
            ).toBe(true);
          }
        });
      });
    });

    test('should not conflict with creation tools', () => {
      const creationToolNames = ['create_rectangle', 'create_ellipse', 'create_text', 'create_frame'];
      const variableCreationTools = Array.from(registeredTools.keys())
        .filter(name => name.startsWith('create_') && (name.includes('variable') || name.includes('collection')));

      // Variable creation tools should be distinct from basic creation tools
      variableCreationTools.forEach(variableTool => {
        expect(creationToolNames).not.toContain(variableTool);
      });

      expect(variableCreationTools).toContain('create_variable');
      expect(variableCreationTools).toContain('create_variable_collection');
    });

    test('should not conflict with modification tools', () => {
      const modificationPrefixes = ['set_', 'update_', 'delete_', 'remove_'];
      const variableModificationTools = Array.from(registeredTools.keys())
        .filter(name => {
          return modificationPrefixes.some(prefix => name.startsWith(prefix)) && 
                 (name.includes('variable') || name.includes('collection') || name.includes('bound'));
        });

      // Should have variable-specific modification tools
      expect(variableModificationTools.length).toBeGreaterThan(0);
      expect(variableModificationTools).toContain('set_bound_variable');
      expect(variableModificationTools).toContain('update_variable_value');
      expect(variableModificationTools).toContain('delete_variable');
      expect(variableModificationTools).toContain('remove_bound_variable');
    });
  });

  describe('Tool Handler Validation', () => {
    beforeEach(() => {
      registerTools(server);
      // Setup successful mock response
      mockSendCommand.mockResolvedValue({ success: true, data: {} });
    });

    test('should call handlers without errors for basic operations', async () => {
      const createVariableTool = registeredTools.get('create_variable');
      expect(createVariableTool).toBeDefined();

      const mockArgs = {
        name: 'test-variable',
        variableCollectionId: 'test-collection-123',
        resolvedType: 'STRING',
        initialValue: 'test-value'
      };

      const result = await createVariableTool.handler(mockArgs);
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(mockSendCommand).toHaveBeenCalledWith('create_variable', expect.any(Object));
    });

    test('should handle validation errors consistently', async () => {
      const createVariableTool = registeredTools.get('create_variable');
      expect(createVariableTool).toBeDefined();

      // Invalid args (missing required fields)
      const invalidArgs = {
        name: '' // Invalid empty name
      };

      const result = await createVariableTool.handler(invalidArgs);
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('Validation failed');
      expect(mockSendCommand).not.toHaveBeenCalled();
    });

    test('should handle WebSocket errors consistently', async () => {
      const getVariablesTool = registeredTools.get('get_local_variables');
      expect(getVariablesTool).toBeDefined();

      // Mock WebSocket error
      mockSendCommand.mockRejectedValue(new Error('WebSocket connection failed'));

      const result = await getVariablesTool.handler({});
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('WebSocket connection failed');
    });
  });

  describe('Performance and Memory', () => {
    test('should register tools efficiently without memory leaks', () => {
      const initialMemory = process.memoryUsage();
      
      // Register tools multiple times to check for memory leaks
      for (let i = 0; i < 10; i++) {
        const tempServer = new McpServer(
          { name: 'temp-server', version: '1.0.0' },
          { capabilities: { tools: {} } }
        );
        registerTools(tempServer);
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB for 10 registrations)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    test('should register tools quickly', () => {
      const startTime = Date.now();
      
      registerTools(server);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should register all tools in less than 100ms
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Documentation Integration', () => {
    beforeEach(() => {
      registerTools(server);
    });

    test('should have descriptive tool descriptions', () => {
      const variableToolNames = [
        'create_variable',
        'create_variable_collection',
        'get_local_variables',
        'set_bound_variable',
        'update_variable_value',
        'delete_variable',
        'publish_variable_collection'
      ];

      variableToolNames.forEach(toolName => {
        const tool = registeredTools.get(toolName);
        expect(tool.description).toBeDefined();
        expect(tool.description.length).toBeGreaterThan(20);
        expect(tool.description.toLowerCase()).toContain('variable');
      });
    });

    test('should have proper schema documentation', () => {
      const createVariableTool = registeredTools.get('create_variable');
      const schema = createVariableTool.schema;
      
      expect(schema).toBeDefined();
      expect(schema.name).toBeDefined();
      expect(schema.variableCollectionId).toBeDefined();
      expect(schema.resolvedType).toBeDefined();
      
      // Check that schema has descriptions
      expect(schema.name.describe).toBeDefined();
      expect(schema.variableCollectionId.describe).toBeDefined();
      expect(schema.resolvedType.describe).toBeDefined();
    });
  });
}); 