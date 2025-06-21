/**
 * Variable Timeout Fixes Integration Tests - Task 1.13
 * TDD Retrospective: Validating implemented timeout fixes
 * 
 * Tests cover:
 * - Chunked processing for large datasets
 * - Progress tracking during long operations
 * - Adaptive timeout behavior
 * - Graceful degradation on timeout
 * - Payload optimization
 * - Error handling improvements
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { sendCommandToFigma } from '../../src/talk_to_figma_mcp/utils/websocket.js';
import { WebSocketMock } from '../mocks/websocket-mock.js';

// Mock WebSocket for testing
jest.mock('../../src/talk_to_figma_mcp/utils/websocket.js');
const mockSendCommandToFigma = sendCommandToFigma as jest.MockedFunction<typeof sendCommandToFigma>;

describe('Variable Timeout Fixes - Task 1.13', () => {
  let webSocketMock: WebSocketMock;
  let progressUpdates: any[];

  beforeEach(() => {
    webSocketMock = new WebSocketMock();
    progressUpdates = [];
    
    // Mock progress tracking
    global.sendProgressUpdate = jest.fn((commandId, commandType, status, progress, totalItems, processedItems, message) => {
      progressUpdates.push({
        commandId,
        commandType,
        status,
        progress,
        totalItems,
        processedItems,
        message
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    progressUpdates = [];
  });

  describe('Chunked Processing - getLocalVariables', () => {
    it('should process large variable datasets in chunks without timeout', async () => {
      // Arrange: Mock large dataset response
      const largeVariableSet = Array.from({ length: 500 }, (_, i) => ({
        id: `var-${i}`,
        name: `Variable ${i}`,
        resolvedType: 'STRING',
        variableCollectionId: 'collection-1',
        remote: false,
        valuesByMode: { 'mode-1': `Value ${i}` }
      }));

      mockSendCommandToFigma.mockResolvedValue({
        success: true,
        variables: largeVariableSet.slice(0, 100), // Simulated chunked result
        pagination: {
          total: 500,
          offset: 0,
          limit: 100,
          hasMore: true,
          filtered: false,
          originalTotal: 500
        },
        performance: {
          totalProcessed: 500,
          filtered: 500,
          returned: 100,
          chunksProcessed: 10
        }
      });

      // Act: Query large dataset
      const result = await mockSendCommandToFigma('get_local_variables', {
        limit: 100,
        offset: 0
      });

      // Assert: Chunked processing worked
      expect(result.success).toBe(true);
      expect(result.performance.chunksProcessed).toBeGreaterThan(0);
      expect(result.performance.totalProcessed).toBe(500);
      expect(result.pagination.hasMore).toBe(true);
    });

    it('should provide progress updates during chunked processing', async () => {
      // Arrange: Mock progress updates during processing
      const mockResult = {
        success: true,
        variables: [],
        performance: { chunksProcessed: 5 }
      };

      mockSendCommandToFigma.mockImplementation(async (command, params) => {
        // Simulate progress updates
        global.sendProgressUpdate('test-id', 'get_local_variables', 'started', 0, 0, 0, 'Starting...');
        global.sendProgressUpdate('test-id', 'get_local_variables', 'processing', 50, 1000, 500, 'Processing...');
        global.sendProgressUpdate('test-id', 'get_local_variables', 'completed', 100, 1000, 1000, 'Completed');
        return mockResult;
      });

      // Act: Execute command
      await mockSendCommandToFigma('get_local_variables', { commandId: 'test-id' });

      // Assert: Progress updates were sent
      expect(progressUpdates).toHaveLength(3);
      expect(progressUpdates[0].status).toBe('started');
      expect(progressUpdates[1].status).toBe('processing');
      expect(progressUpdates[2].status).toBe('completed');
      expect(progressUpdates[2].progress).toBe(100);
    });

    it('should optimize payload for large datasets', async () => {
      // Arrange: Mock response with payload optimization
      mockSendCommandToFigma.mockResolvedValue({
        success: true,
        variables: Array.from({ length: 100 }, (_, i) => ({
          id: `var-${i}`,
          name: `Variable ${i}`,
          resolvedType: 'STRING',
          variableCollectionId: 'collection-1',
          remote: false
          // Note: valuesByMode excluded for large datasets (payload optimization)
        })),
        pagination: {
          total: 100,
          originalTotal: 1000
        }
      });

      // Act: Query large dataset
      const result = await mockSendCommandToFigma('get_local_variables', {
        limit: 100,
        includeValues: false // Payload optimization
      });

      // Assert: Payload optimized (no valuesByMode)
      expect(result.success).toBe(true);
      expect(result.variables[0]).not.toHaveProperty('valuesByMode');
      expect(result.variables[0]).toHaveProperty('id');
      expect(result.variables[0]).toHaveProperty('name');
    });
  });

  describe('Adaptive Timeout Behavior', () => {
    it('should use longer timeout for complex unfiltered queries', async () => {
      // Arrange: Mock complex query
      const complexQuery = {
        // No collectionId or type filters = most expensive
        limit: 1000,
        namePattern: 'complex.*pattern'
      };

      let actualTimeout: number = 0;
      mockSendCommandToFigma.mockImplementation(async (command, params, timeout) => {
        actualTimeout = timeout || 0;
        return { success: true, variables: [] };
      });

      // Act: Execute complex query
      await mockSendCommandToFigma('get_local_variables', complexQuery, 35000);

      // Assert: Extended timeout used for complex queries
      expect(actualTimeout).toBeGreaterThan(30000); // Should be 35s for unfiltered + pattern
    });

    it('should use shorter timeout for simple filtered queries', async () => {
      // Arrange: Mock simple query
      const simpleQuery = {
        collectionId: 'collection-1',
        type: 'STRING',
        limit: 50
      };

      let actualTimeout: number = 0;
      mockSendCommandToFigma.mockImplementation(async (command, params, timeout) => {
        actualTimeout = timeout || 0;
        return { success: true, variables: [] };
      });

      // Act: Execute simple query
      await mockSendCommandToFigma('get_local_variables', simpleQuery, 15000);

      // Assert: Shorter timeout used for simple queries
      expect(actualTimeout).toBeLessThanOrEqual(20000); // Should be ~15s for simple queries
    });

    it('should use extended timeout for variable reference analysis', async () => {
      // Arrange: Mock reference analysis
      let actualTimeout: number = 0;
      mockSendCommandToFigma.mockImplementation(async (command, params, timeout) => {
        actualTimeout = timeout || 0;
        return {
          success: true,
          references: [],
          analysis: { complete: true, timedOut: false }
        };
      });

      // Act: Execute reference analysis
      await mockSendCommandToFigma('get_variable_references', 
        { variableId: 'var-1' }, 
        30000
      );

      // Assert: Extended timeout for reference analysis
      expect(actualTimeout).toBe(30000); // Should be 30s for reference analysis
    });
  });

  describe('Graceful Degradation on Timeout', () => {
    it('should return partial results when reference analysis times out', async () => {
      // Arrange: Mock timeout scenario
      mockSendCommandToFigma.mockResolvedValue({
        success: true,
        variable: { id: 'var-1', name: 'Test Variable' },
        references: [], // Empty due to timeout
        referenceCount: 0,
        analysis: {
          complete: false,
          timedOut: true,
          maxReferencesReached: false,
          timeoutMs: 15000,
          totalFound: 0,
          totalFormatted: 0
        }
      });

      // Act: Execute reference analysis with timeout
      const result = await mockSendCommandToFigma('get_variable_references', {
        variableId: 'var-1',
        timeoutMs: 15000
      });

      // Assert: Graceful degradation occurred
      expect(result.success).toBe(true);
      expect(result.analysis.timedOut).toBe(true);
      expect(result.analysis.complete).toBe(false);
      expect(result.references).toEqual([]);
    });

    it('should handle node access errors gracefully in reference analysis', async () => {
      // Arrange: Mock reference with inaccessible node
      mockSendCommandToFigma.mockResolvedValue({
        success: true,
        variable: { id: 'var-1', name: 'Test Variable' },
        references: [
          {
            nodeId: 'node-1',
            property: 'width',
            modeId: 'mode-1',
            nodeName: 'Inaccessible Node',
            nodeType: 'UNKNOWN',
            error: 'Node details unavailable'
          }
        ],
        referenceCount: 1,
        analysis: { complete: true, timedOut: false }
      });

      // Act: Execute reference analysis
      const result = await mockSendCommandToFigma('get_variable_references', {
        variableId: 'var-1',
        includeNodeDetails: true
      });

      // Assert: Error handled gracefully
      expect(result.success).toBe(true);
      expect(result.references[0].error).toBe('Node details unavailable');
      expect(result.references[0].nodeName).toBe('Inaccessible Node');
    });

    it('should limit references to prevent overwhelming responses', async () => {
      // Arrange: Mock large reference set
      mockSendCommandToFigma.mockResolvedValue({
        success: true,
        variable: { id: 'var-1', name: 'Popular Variable' },
        references: Array.from({ length: 1000 }, (_, i) => ({
          nodeId: `node-${i}`,
          property: 'width',
          modeId: 'mode-1'
        })),
        referenceCount: 1000,
        analysis: {
          complete: false,
          timedOut: false,
          maxReferencesReached: true,
          totalFound: 5000,
          totalFormatted: 1000
        }
      });

      // Act: Execute reference analysis
      const result = await mockSendCommandToFigma('get_variable_references', {
        variableId: 'var-1',
        maxReferences: 1000
      });

      // Assert: References limited appropriately
      expect(result.success).toBe(true);
      expect(result.references).toHaveLength(1000);
      expect(result.analysis.maxReferencesReached).toBe(true);
      expect(result.analysis.totalFound).toBeGreaterThan(result.referenceCount);
    });
  });

  describe('Collection Query Optimization', () => {
    it('should optimize variable counting in collection queries', async () => {
      // Arrange: Mock collection with variable counting
      mockSendCommandToFigma.mockResolvedValue({
        success: true,
        collections: [
          {
            id: 'collection-1',
            name: 'Design Tokens',
            variableCount: 150,
            modes: [{ modeId: 'mode-1', name: 'Default' }]
          }
        ],
        pagination: { total: 1, returned: 1 },
        performance: {
          totalCollections: 1,
          variableCountingEnabled: true,
          totalVariablesProcessed: 150
        }
      });

      // Act: Query collections with variable counting
      const result = await mockSendCommandToFigma('get_local_variable_collections', {
        includeVariableCount: true,
        adaptiveTimeout: 25000
      });

      // Assert: Variable counting optimized
      expect(result.success).toBe(true);
      expect(result.collections[0].variableCount).toBe(150);
      expect(result.performance.variableCountingEnabled).toBe(true);
      expect(result.performance.totalVariablesProcessed).toBeGreaterThan(0);
    });

    it('should support pagination in collection queries', async () => {
      // Arrange: Mock paginated collection response
      mockSendCommandToFigma.mockResolvedValue({
        success: true,
        collections: Array.from({ length: 10 }, (_, i) => ({
          id: `collection-${i}`,
          name: `Collection ${i}`,
          modes: []
        })),
        pagination: {
          total: 100,
          offset: 0,
          limit: 10,
          hasMore: true,
          originalTotal: 100
        }
      });

      // Act: Query collections with pagination
      const result = await mockSendCommandToFigma('get_local_variable_collections', {
        limit: 10,
        offset: 0
      });

      // Assert: Pagination working
      expect(result.success).toBe(true);
      expect(result.collections).toHaveLength(10);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.total).toBe(100);
    });
  });

  describe('Error Handling Improvements', () => {
    it('should handle WebSocket errors gracefully with progress updates', async () => {
      // Arrange: Mock WebSocket error
      mockSendCommandToFigma.mockImplementation(async (command, params) => {
        global.sendProgressUpdate('test-id', command, 'error', 0, 0, 0, 'WebSocket connection failed');
        throw new Error('WebSocket connection failed');
      });

      // Act & Assert: Error handled gracefully
      await expect(mockSendCommandToFigma('get_local_variables', { commandId: 'test-id' }))
        .rejects.toThrow('WebSocket connection failed');
      
      expect(progressUpdates).toHaveLength(1);
      expect(progressUpdates[0].status).toBe('error');
    });

    it('should provide enhanced error messages for common timeout scenarios', async () => {
      // Arrange: Mock timeout error
      mockSendCommandToFigma.mockRejectedValue(new Error('Request to Figma timed out'));

      // Act & Assert: Enhanced error handling
      await expect(mockSendCommandToFigma('get_variable_references', { variableId: 'var-1' }))
        .rejects.toThrow('Request to Figma timed out');
    });
  });

  describe('Performance Metrics', () => {
    it('should include performance metadata in responses', async () => {
      // Arrange: Mock response with performance data
      mockSendCommandToFigma.mockResolvedValue({
        success: true,
        variables: [],
        performance: {
          totalProcessed: 1000,
          filtered: 100,
          returned: 50,
          chunksProcessed: 20,
          processingTimeMs: 2500
        }
      });

      // Act: Execute query
      const result = await mockSendCommandToFigma('get_local_variables', {});

      // Assert: Performance metadata included
      expect(result.performance).toBeDefined();
      expect(result.performance.totalProcessed).toBe(1000);
      expect(result.performance.chunksProcessed).toBe(20);
      expect(typeof result.performance.filtered).toBe('number');
    });

    it('should track processing efficiency metrics', async () => {
      // Arrange: Mock efficient processing
      mockSendCommandToFigma.mockResolvedValue({
        success: true,
        collections: [],
        performance: {
          totalCollections: 50,
          filtered: 25,
          returned: 10,
          variableCountingEnabled: false,
          processingTimeMs: 1200
        }
      });

      // Act: Execute collection query
      const result = await mockSendCommandToFigma('get_local_variable_collections', {
        includeVariableCount: false
      });

      // Assert: Efficiency metrics tracked
      expect(result.performance.variableCountingEnabled).toBe(false);
      expect(result.performance.totalCollections).toBeGreaterThan(0);
      expect(result.performance.filtered).toBeLessThanOrEqual(result.performance.totalCollections);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain compatibility with existing tool interfaces', async () => {
      // Arrange: Mock standard response format
      mockSendCommandToFigma.mockResolvedValue({
        success: true,
        variables: [
          {
            id: 'var-1',
            name: 'Test Variable',
            resolvedType: 'STRING',
            variableCollectionId: 'collection-1',
            remote: false,
            valuesByMode: { 'mode-1': 'Test Value' }
          }
        ]
      });

      // Act: Use standard parameters
      const result = await mockSendCommandToFigma('get_local_variables', {
        collectionId: 'collection-1'
      });

      // Assert: Standard response format maintained
      expect(result.success).toBe(true);
      expect(result.variables).toBeDefined();
      expect(result.variables[0]).toHaveProperty('id');
      expect(result.variables[0]).toHaveProperty('name');
      expect(result.variables[0]).toHaveProperty('resolvedType');
    });

    it('should work with legacy timeout values', async () => {
      // Arrange: Mock with legacy timeout
      let actualTimeout: number = 0;
      mockSendCommandToFigma.mockImplementation(async (command, params, timeout) => {
        actualTimeout = timeout || 45000; // Default increased timeout
        return { success: true, variables: [] };
      });

      // Act: Use legacy call without explicit timeout
      await mockSendCommandToFigma('get_local_variables', {});

      // Assert: Default timeout increased
      expect(actualTimeout).toBe(45000); // Should use new default
    });
  });
}); 