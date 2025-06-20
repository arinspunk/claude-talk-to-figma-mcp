/**
 * Variable Tools MCP-Plugin Synchronization Tests
 * Task 1.11 - Testing communication between MCP Server and Figma Plugin
 * 
 * This test suite verifies that all 20 variable tools work correctly
 * through the complete MCP-Plugin communication chain.
 */

import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { WebSocketMock } from '../mocks/websocket-mock';
import { setupToolsForTesting } from '../setup/tools-setup';

// Mock WebSocket for testing
let mockWebSocket: WebSocketMock;
let tools: any;

describe('Variable Tools MCP-Plugin Synchronization', () => {
  beforeEach(async () => {
    mockWebSocket = new WebSocketMock();
    tools = await setupToolsForTesting(mockWebSocket);
  });

  afterEach(() => {
    mockWebSocket.cleanup();
  });

  describe('Variable Creation Tools', () => {
    it('should synchronize create_variable command through MCP-Plugin chain', async () => {
      // Mock plugin response for variable creation
      mockWebSocket.mockPluginResponse('create_variable', {
        success: true,
        message: 'Variable "primary-color" created successfully',
        variable: {
          id: 'var:123',
          name: 'primary-color',
          resolvedType: 'COLOR',
          description: 'Primary brand color',
          variableCollectionId: 'collection:456',
          remote: false
        }
      });

      const result = await tools.create_variable({
        name: 'primary-color',
        variableCollectionId: 'collection:456',
        resolvedType: 'COLOR',
        initialValue: { r: 0.2, g: 0.4, b: 0.8, a: 1.0 },
        description: 'Primary brand color'
      });

      expect(result.content[0].text).toContain('Variable "primary-color" created successfully');
      expect(mockWebSocket.getLastCommand()).toEqual({
        command: 'create_variable',
        params: {
          name: 'primary-color',
          variableCollectionId: 'collection:456',
          resolvedType: 'COLOR',
          initialValue: { r: 0.2, g: 0.4, b: 0.8, a: 1.0 },
          description: 'Primary brand color'
        }
      });
    });

    it('should synchronize create_variable_collection command', async () => {
      mockWebSocket.mockPluginResponse('create_variable_collection', {
        success: true,
        message: 'Variable collection "Design Tokens" created successfully',
        collection: {
          id: 'collection:789',
          name: 'Design Tokens',
          modes: [
            { modeId: 'mode:1', name: 'Light' },
            { modeId: 'mode:2', name: 'Dark' }
          ],
          defaultModeId: 'mode:1',
          remote: false
        }
      });

      const result = await tools.create_variable_collection({
        name: 'Design Tokens',
        initialModeNames: ['Light', 'Dark']
      });

      expect(result.content[0].text).toContain('Variable collection "Design Tokens" created successfully');
      expect(mockWebSocket.getLastCommand().command).toBe('create_variable_collection');
    });
  });

  describe('Variable Query Tools', () => {
    it('should synchronize get_local_variables with filtering', async () => {
      mockWebSocket.mockPluginResponse('get_local_variables', {
        success: true,
        variables: [
          {
            id: 'var:1',
            name: 'primary-color',
            resolvedType: 'COLOR',
            description: 'Primary brand color',
            variableCollectionId: 'collection:1',
            remote: false,
            valuesByMode: { 'mode:1': { r: 0.2, g: 0.4, b: 0.8, a: 1.0 } }
          }
        ],
        pagination: {
          total: 1,
          offset: 0,
          limit: 1000,
          hasMore: false
        }
      });

      const result = await tools.get_local_variables({
        collectionId: 'collection:1',
        type: 'COLOR',
        limit: 50
      });

      expect(result.content[0].text).toContain('Found 1 variables');
      expect(mockWebSocket.getLastCommand().params).toMatchObject({
        collectionId: 'collection:1',
        type: 'COLOR',
        limit: 50
      });
    });

    it('should synchronize get_local_variable_collections', async () => {
      mockWebSocket.mockPluginResponse('get_local_variable_collections', {
        success: true,
        collections: [
          {
            id: 'collection:1',
            name: 'Design System',
            defaultModeId: 'mode:1',
            remote: false,
            modes: [{ modeId: 'mode:1', name: 'Default' }],
            variableCount: 5
          }
        ],
        total: 1
      });

      const result = await tools.get_local_variable_collections({
        includeVariableCount: true,
        sortBy: 'name'
      });

      expect(result.content[0].text).toContain('Found 1 variable collections');
      expect(mockWebSocket.getLastCommand().command).toBe('get_local_variable_collections');
    });

    it('should synchronize get_variable_by_id', async () => {
      mockWebSocket.mockPluginResponse('get_variable_by_id', {
        success: true,
        variable: {
          id: 'var:123',
          name: 'spacing-large',
          resolvedType: 'FLOAT',
          description: 'Large spacing value',
          variableCollectionId: 'collection:1',
          remote: false,
          valuesByMode: { 'mode:1': 24 }
        }
      });

      const result = await tools.get_variable_by_id({
        variableId: 'var:123'
      });

      expect(result.content[0].text).toContain('Variable details for spacing-large');
      expect(mockWebSocket.getLastCommand().params.variableId).toBe('var:123');
    });

    it('should synchronize get_variable_collection_by_id', async () => {
      mockWebSocket.mockPluginResponse('get_variable_collection_by_id', {
        success: true,
        collection: {
          id: 'collection:456',
          name: 'Typography',
          modes: [
            { modeId: 'mode:1', name: 'Desktop' },
            { modeId: 'mode:2', name: 'Mobile' }
          ],
          defaultModeId: 'mode:1',
          remote: false
        }
      });

      const result = await tools.get_variable_collection_by_id({
        collectionId: 'collection:456'
      });

      expect(result.content[0].text).toContain('Variable collection details for Typography');
      expect(mockWebSocket.getLastCommand().params.collectionId).toBe('collection:456');
    });
  });

  describe('Variable Binding Tools', () => {
    it('should synchronize set_bound_variable for node properties', async () => {
      mockWebSocket.mockPluginResponse('set_bound_variable', {
        success: true,
        message: 'Variable "button-width" bound to property "width" on node "Button"',
        binding: {
          nodeId: 'node:123',
          nodeName: 'Button',
          property: 'width',
          variableId: 'var:456',
          variableName: 'button-width',
          modeId: null
        }
      });

      const result = await tools.set_bound_variable({
        nodeId: 'node:123',
        property: 'width',
        variableId: 'var:456'
      });

      expect(result.content[0].text).toContain('Variable bound successfully');
      expect(mockWebSocket.getLastCommand().command).toBe('set_bound_variable');
    });

    it('should synchronize set_bound_variable_for_paint for color properties', async () => {
      mockWebSocket.mockPluginResponse('set_bound_variable_for_paint', {
        success: true,
        message: 'Color variable "primary-color" bound to fills[0] on node "Rectangle"',
        binding: {
          nodeId: 'node:789',
          nodeName: 'Rectangle',
          property: 'fills',
          paintIndex: 0,
          variableId: 'var:color',
          variableName: 'primary-color'
        }
      });

      const result = await tools.set_bound_variable_for_paint({
        nodeId: 'node:789',
        property: 'fills',
        variableId: 'var:color',
        paintIndex: 0
      });

      expect(result.content[0].text).toContain('Color variable bound successfully');
      expect(mockWebSocket.getLastCommand().params.property).toBe('fills');
    });

    it('should synchronize remove_bound_variable', async () => {
      mockWebSocket.mockPluginResponse('remove_bound_variable', {
        success: true,
        message: 'Bound variable removed from property "opacity" on node "Card"',
        nodeId: 'node:999',
        nodeName: 'Card',
        property: 'opacity'
      });

      const result = await tools.remove_bound_variable({
        nodeId: 'node:999',
        property: 'opacity'
      });

      expect(result.content[0].text).toContain('Variable binding removed successfully');
      expect(mockWebSocket.getLastCommand().command).toBe('remove_bound_variable');
    });
  });

  describe('Variable Modification Tools', () => {
    it('should synchronize update_variable_value', async () => {
      mockWebSocket.mockPluginResponse('update_variable_value', {
        success: true,
        message: 'Variable "accent-color" updated successfully',
        variable: {
          id: 'var:accent',
          name: 'accent-color',
          resolvedType: 'COLOR',
          modeId: 'mode:1',
          newValue: { r: 0.9, g: 0.1, b: 0.1, a: 1.0 }
        }
      });

      const result = await tools.update_variable_value({
        variableId: 'var:accent',
        modeId: 'mode:1',
        value: { r: 0.9, g: 0.1, b: 0.1, a: 1.0 }
      });

      expect(result.content[0].text).toContain('Variable value updated successfully');
      expect(mockWebSocket.getLastCommand().command).toBe('update_variable_value');
    });

    it('should synchronize update_variable_name', async () => {
      mockWebSocket.mockPluginResponse('update_variable_name', {
        success: true,
        message: 'Variable renamed from "old-name" to "new-name"',
        variable: {
          id: 'var:rename',
          oldName: 'old-name',
          newName: 'new-name',
          resolvedType: 'STRING'
        }
      });

      const result = await tools.update_variable_name({
        variableId: 'var:rename',
        newName: 'new-name'
      });

      expect(result.content[0].text).toContain('Variable renamed successfully');
      expect(mockWebSocket.getLastCommand().params.newName).toBe('new-name');
    });

    it('should synchronize delete_variable', async () => {
      mockWebSocket.mockPluginResponse('delete_variable', {
        success: true,
        message: 'Variable "deprecated-color" deleted successfully',
        deletedVariable: {
          id: 'var:deprecated',
          name: 'deprecated-color'
        }
      });

      const result = await tools.delete_variable({
        variableId: 'var:deprecated'
      });

      expect(result.content[0].text).toContain('Variable deleted successfully');
      expect(mockWebSocket.getLastCommand().command).toBe('delete_variable');
    });

    it('should synchronize delete_variable_collection', async () => {
      mockWebSocket.mockPluginResponse('delete_variable_collection', {
        success: true,
        message: 'Variable collection "Old Tokens" deleted successfully',
        deletedCollection: {
          id: 'collection:old',
          name: 'Old Tokens'
        }
      });

      const result = await tools.delete_variable_collection({
        collectionId: 'collection:old'
      });

      expect(result.content[0].text).toContain('Variable collection deleted successfully');
      expect(mockWebSocket.getLastCommand().params.collectionId).toBe('collection:old');
    });
  });

  describe('Variable Analysis Tools', () => {
    it('should synchronize get_variable_references', async () => {
      mockWebSocket.mockPluginResponse('get_variable_references', {
        success: true,
        variable: {
          id: 'var:popular',
          name: 'primary-button-color'
        },
        references: [
          {
            nodeId: 'node:btn1',
            nodeName: 'Primary Button',
            nodeType: 'RECTANGLE',
            property: 'fills',
            modeId: 'mode:1'
          },
          {
            nodeId: 'node:btn2',
            nodeName: 'CTA Button',
            nodeType: 'RECTANGLE',
            property: 'fills',
            modeId: 'mode:1'
          }
        ],
        referenceCount: 2
      });

      const result = await tools.get_variable_references({
        variableId: 'var:popular'
      });

      expect(result.content[0].text).toContain('Found 2 references');
      expect(mockWebSocket.getLastCommand().command).toBe('get_variable_references');
    });
  });

  describe('Variable Mode Management Tools', () => {
    it('should synchronize set_variable_mode_value', async () => {
      mockWebSocket.mockPluginResponse('set_variable_mode_value', {
        success: true,
        message: 'Variable "theme-color" value set for mode "dark"',
        variable: {
          id: 'var:theme',
          name: 'theme-color',
          modeId: 'mode:dark',
          value: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 }
        }
      });

      const result = await tools.set_variable_mode_value({
        variableId: 'var:theme',
        modeId: 'mode:dark',
        value: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 }
      });

      expect(result.content[0].text).toContain('Variable mode value set successfully');
      expect(mockWebSocket.getLastCommand().command).toBe('set_variable_mode_value');
    });

    it('should synchronize create_variable_mode', async () => {
      mockWebSocket.mockPluginResponse('create_variable_mode', {
        success: true,
        message: 'Mode "High Contrast" created in collection "Accessibility"',
        mode: {
          modeId: 'mode:hc',
          name: 'High Contrast'
        },
        collection: {
          id: 'collection:a11y',
          name: 'Accessibility',
          totalModes: 3
        }
      });

      const result = await tools.create_variable_mode({
        collectionId: 'collection:a11y',
        modeName: 'High Contrast'
      });

      expect(result.content[0].text).toContain('Variable mode created successfully');
      expect(mockWebSocket.getLastCommand().params.modeName).toBe('High Contrast');
    });

    it('should synchronize delete_variable_mode', async () => {
      mockWebSocket.mockPluginResponse('delete_variable_mode', {
        success: true,
        message: 'Mode "Deprecated" deleted from collection "Legacy"',
        deletedMode: {
          modeId: 'mode:deprecated',
          name: 'Deprecated'
        },
        collection: {
          id: 'collection:legacy',
          name: 'Legacy',
          remainingModes: 2
        }
      });

      const result = await tools.delete_variable_mode({
        collectionId: 'collection:legacy',
        modeId: 'mode:deprecated'
      });

      expect(result.content[0].text).toContain('Variable mode deleted successfully');
      expect(mockWebSocket.getLastCommand().command).toBe('delete_variable_mode');
    });

    it('should synchronize reorder_variable_modes', async () => {
      mockWebSocket.mockPluginResponse('reorder_variable_modes', {
        success: true,
        message: 'Modes reordered in collection "Theme Tokens"',
        collection: {
          id: 'collection:theme',
          name: 'Theme Tokens',
          reorderedModes: [
            { modeId: 'mode:light', name: 'Light' },
            { modeId: 'mode:dark', name: 'Dark' },
            { modeId: 'mode:auto', name: 'Auto' }
          ]
        }
      });

      const result = await tools.reorder_variable_modes({
        collectionId: 'collection:theme',
        modeIds: ['mode:light', 'mode:dark', 'mode:auto']
      });

      expect(result.content[0].text).toContain('Variable modes reordered successfully');
      expect(mockWebSocket.getLastCommand().params.modeIds).toEqual(['mode:light', 'mode:dark', 'mode:auto']);
    });
  });

  describe('Variable Publishing Tools', () => {
    it('should synchronize publish_variable_collection', async () => {
      mockWebSocket.mockPluginResponse('publish_variable_collection', {
        success: true,
        message: 'Variable collection "Design System" published successfully',
        collection: {
          id: 'collection:ds',
          name: 'Design System',
          remote: true
        }
      });

      const result = await tools.publish_variable_collection({
        collectionId: 'collection:ds'
      });

      expect(result.content[0].text).toContain('Variable collection published successfully');
      expect(mockWebSocket.getLastCommand().command).toBe('publish_variable_collection');
    });

    it('should synchronize get_published_variables', async () => {
      mockWebSocket.mockPluginResponse('get_published_variables', {
        success: true,
        publishedVariables: [
          {
            id: 'var:pub1',
            name: 'brand-primary',
            resolvedType: 'COLOR',
            description: 'Primary brand color',
            variableCollectionId: 'collection:brand',
            remote: true
          },
          {
            id: 'var:pub2',
            name: 'brand-secondary',
            resolvedType: 'COLOR',
            description: 'Secondary brand color',
            variableCollectionId: 'collection:brand',
            remote: true
          }
        ],
        total: 2
      });

      const result = await tools.get_published_variables({
        collectionId: 'collection:brand',
        type: 'COLOR'
      });

      expect(result.content[0].text).toContain('Found 2 published variables');
      expect(mockWebSocket.getLastCommand().params.type).toBe('COLOR');
    });
  });

  describe('Error Handling and Validation', () => {
    it('should handle plugin errors gracefully', async () => {
      mockWebSocket.mockPluginError('create_variable', 'Variable collection not found: invalid-id');

      const result = await tools.create_variable({
        name: 'test-var',
        variableCollectionId: 'invalid-id',
        resolvedType: 'COLOR'
      });

      expect(result.content[0].text).toContain('Error creating variable');
      expect(result.content[0].text).toContain('Variable collection not found: invalid-id');
    });

    it('should validate parameters before sending to plugin', async () => {
      const result = await tools.create_variable({
        name: '', // Invalid empty name
        variableCollectionId: 'collection:1',
        resolvedType: 'COLOR'
      });

      expect(result.content[0].text).toContain('Validation failed');
      expect(result.content[0].text).toContain('name');
    });

    it('should handle WebSocket communication errors', async () => {
      mockWebSocket.simulateConnectionError();

      const result = await tools.get_local_variables({});

      expect(result.content[0].text).toContain('Error getting local variables');
      expect(result.content[0].text).toContain('WebSocket connection failed');
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large variable collections efficiently', async () => {
      const largeVariableList = Array.from({ length: 500 }, (_, i) => ({
        id: `var:${i}`,
        name: `variable-${i}`,
        resolvedType: 'FLOAT',
        description: `Variable ${i}`,
        variableCollectionId: 'collection:large',
        remote: false,
        valuesByMode: { 'mode:1': i * 10 }
      }));

      mockWebSocket.mockPluginResponse('get_local_variables', {
        success: true,
        variables: largeVariableList.slice(0, 100), // Paginated response
        pagination: {
          total: 500,
          offset: 0,
          limit: 100,
          hasMore: true
        }
      });

      const startTime = Date.now();
      const result = await tools.get_local_variables({
        limit: 100,
        offset: 0
      });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result.content[0].text).toContain('Found 100 variables');
    });

    it('should use appropriate timeouts for variable operations', async () => {
      // Mock a slow plugin response
      mockWebSocket.mockSlowPluginResponse('create_variable_collection', {
        success: true,
        message: 'Collection created after delay'
      }, 2000);

      const result = await tools.create_variable_collection({
        name: 'Slow Collection'
      });

      expect(result.content[0].text).toContain('Collection created after delay');
    });
  });

  describe('Integration Compatibility', () => {
    it('should maintain compatibility with existing MCP tools', async () => {
      // Test that variable tools don't interfere with existing document tools
      mockWebSocket.mockPluginResponse('get_document_info', {
        name: 'Test Document',
        id: 'doc:123',
        type: 'DOCUMENT'
      });

      // This should still work alongside variable tools
      const documentResult = await tools.get_document_info({});
      expect(documentResult.content[0].text).toContain('Document information');

      // Variable tools should also work
      mockWebSocket.mockPluginResponse('get_local_variables', {
        success: true,
        variables: [],
        pagination: { total: 0, offset: 0, limit: 1000, hasMore: false }
      });

      const variableResult = await tools.get_local_variables({});
      expect(variableResult.content[0].text).toContain('Found 0 variables');
    });
  });
}); 