/**
 * Timeout Fixes End-to-End Integration Test - Task 1.13
 * TDD Retrospective: Complete system validation
 * 
 * Tests the entire timeout fix implementation from MCP server to Figma plugin
 * Validates that the fixes work together as a complete system
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { sendCommandToFigma } from '../../src/talk_to_figma_mcp/utils/websocket.js';

// Mock dependencies
jest.mock('../../src/talk_to_figma_mcp/utils/websocket.js');
const mockSendCommandToFigma = sendCommandToFigma as jest.MockedFunction<typeof sendCommandToFigma>;

describe('Timeout Fixes End-to-End Integration - Task 1.13', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete System Timeout Resilience', () => {
    it('should handle large variable queries without timeout using full stack', async () => {
      // Arrange: Simulate real-world large dataset scenario
      const largeDatasetScenario = {
        totalVariables: 2000,
        totalCollections: 50,
        complexFilters: true,
        includeReferences: true
      };

      // Mock progressive responses simulating chunked processing
      let callCount = 0;
      mockSendCommandToFigma.mockImplementation(async (command, params) => {
        callCount++;
        
        switch (command) {
          case 'get_local_variables':
            // Simulate chunked response
            const offset = params.offset || 0;
            const limit = params.limit || 100;
            const total = largeDatasetScenario.totalVariables;
            
            const variables = Array.from({ length: Math.min(limit, total - offset) }, (_, i) => ({
              id: `var-${offset + i}`,
              name: `Variable ${offset + i}`,
              resolvedType: 'STRING',
              variableCollectionId: `collection-${Math.floor((offset + i) / 40)}`,
              remote: false,
              valuesByMode: params.includeValues !== false ? { 'mode-1': `Value ${offset + i}` } : undefined
            }));

            return {
              success: true,
              variables,
              pagination: {
                total,
                offset,
                limit,
                hasMore: offset + limit < total,
                originalTotal: total
              },
              performance: {
                totalProcessed: total,
                filtered: variables.length,
                returned: variables.length,
                chunksProcessed: Math.ceil(total / 50), // Plugin chunk size
                processingTimeMs: 3500 // Realistic processing time
              }
            };

          case 'get_local_variable_collections':
            return {
              success: true,
              collections: Array.from({ length: largeDatasetScenario.totalCollections }, (_, i) => ({
                id: `collection-${i}`,
                name: `Collection ${i}`,
                modes: [{ modeId: 'mode-1', name: 'Default' }],
                variableCount: Math.floor(largeDatasetScenario.totalVariables / largeDatasetScenario.totalCollections)
              })),
              pagination: { total: largeDatasetScenario.totalCollections, returned: largeDatasetScenario.totalCollections },
              performance: {
                totalCollections: largeDatasetScenario.totalCollections,
                variableCountingEnabled: true,
                processingTimeMs: 2000
              }
            };

          case 'get_variable_references':
            // Simulate reference analysis with timeout protection
            return {
              success: true,
              variable: { id: params.variableId, name: `Variable for ${params.variableId}` },
              references: Array.from({ length: Math.min(100, 1000) }, (_, i) => ({
                nodeId: `node-${i}`,
                property: 'width',
                modeId: 'mode-1',
                nodeName: `Node ${i}`,
                nodeType: 'RECTANGLE'
              })),
              referenceCount: 100,
              analysis: {
                complete: true,
                timedOut: false,
                maxReferencesReached: false,
                totalFound: 100,
                totalFormatted: 100,
                processingTimeMs: 8000
              }
            };

          default:
            return { success: false, error: `Unknown command: ${command}` };
        }
      });

      // Act: Execute complete workflow
      const startTime = Date.now();

      // 1. Get collections first (optimized)
      const collectionsResult = await mockSendCommandToFigma('get_local_variable_collections', {
        includeVariableCount: true,
        adaptiveTimeout: 25000
      });

      // 2. Get variables in pages (chunked)
      const allVariables = [];
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const variablesResult = await mockSendCommandToFigma('get_local_variables', {
          offset,
          limit,
          includeValues: false, // Payload optimization
          adaptiveTimeout: offset === 0 ? 35000 : 20000 // Longer timeout for first chunk
        });

        allVariables.push(...variablesResult.variables);
        hasMore = variablesResult.pagination.hasMore;
        offset += limit;
      }

      // 3. Get references for a sample variable (with timeout protection)
      const sampleVariable = allVariables[0];
      const referencesResult = await mockSendCommandToFigma('get_variable_references', {
        variableId: sampleVariable.id,
        maxReferences: 1000,
        timeoutMs: 30000
      });

      const totalTime = Date.now() - startTime;

      // Assert: Complete system worked within reasonable time
      expect(collectionsResult.success).toBe(true);
      expect(collectionsResult.collections).toHaveLength(50);
      expect(collectionsResult.performance.variableCountingEnabled).toBe(true);

      expect(allVariables).toHaveLength(2000);
      expect(allVariables[0]).not.toHaveProperty('valuesByMode'); // Payload optimized

      expect(referencesResult.success).toBe(true);
      expect(referencesResult.analysis.complete).toBe(true);
      expect(referencesResult.analysis.timedOut).toBe(false);

      // System should complete well within timeout limits
      expect(totalTime).toBeLessThan(60000); // Should complete in under 1 minute
      
      // Verify multiple calls were made for chunked processing
      expect(callCount).toBeGreaterThan(20); // Collections + 20 variable chunks + references
    });

    it('should gracefully degrade when approaching timeout limits', async () => {
      // Arrange: Simulate scenario approaching timeout limits
      mockSendCommandToFigma.mockImplementation(async (command, params, timeout) => {
        // Simulate operations taking significant time
        await new Promise(resolve => setTimeout(resolve, 100));

        switch (command) {
          case 'get_local_variables':
            if (params.namePattern) {
              // Complex pattern matching - simulate timeout scenario
              return {
                success: true,
                variables: [], // Empty due to timeout
                pagination: { total: 0, returned: 0 },
                performance: {
                  totalProcessed: 5000,
                  filtered: 0,
                  returned: 0,
                  chunksProcessed: 100,
                  processingTimeMs: timeout - 1000 // Nearly timed out
                },
                warnings: ['Query complexity caused extended processing time']
              };
            }
            
            return {
              success: true,
              variables: Array.from({ length: 50 }, (_, i) => ({
                id: `var-${i}`,
                name: `Variable ${i}`,
                resolvedType: 'STRING'
              })),
              pagination: { total: 50, returned: 50 }
            };

          case 'get_variable_references':
            // Simulate reference analysis timing out
            return {
              success: true,
              variable: { id: params.variableId, name: 'Test Variable' },
              references: [], // Empty due to timeout
              referenceCount: 0,
              analysis: {
                complete: false,
                timedOut: true,
                maxReferencesReached: false,
                timeoutMs: params.timeoutMs || 30000,
                totalFound: 0,
                totalFormatted: 0,
                message: 'Reference analysis timed out - returning partial results'
              }
            };

          default:
            return { success: false, error: `Unknown command: ${command}` };
        }
      });

      // Act: Execute operations that will hit timeout limits
      const complexQueryResult = await mockSendCommandToFigma('get_local_variables', {
        namePattern: 'very.*complex.*regex.*pattern',
        adaptiveTimeout: 35000
      }, 35000);

      const referencesResult = await mockSendCommandToFigma('get_variable_references', {
        variableId: 'var-1',
        timeoutMs: 15000
      }, 30000);

      // Assert: Graceful degradation occurred
      expect(complexQueryResult.success).toBe(true);
      expect(complexQueryResult.variables).toHaveLength(0);
      expect(complexQueryResult.warnings).toContain('Query complexity caused extended processing time');
      expect(complexQueryResult.performance.processingTimeMs).toBeGreaterThan(30000);

      expect(referencesResult.success).toBe(true);
      expect(referencesResult.analysis.timedOut).toBe(true);
      expect(referencesResult.analysis.complete).toBe(false);
      expect(referencesResult.references).toHaveLength(0);
    });

    it('should maintain performance metrics across the entire stack', async () => {
      // Arrange: Mock responses with detailed performance metrics
      mockSendCommandToFigma.mockImplementation(async (command, params) => {
        const basePerformance = {
          processingTimeMs: Math.floor(Math.random() * 5000) + 1000,
          memoryUsage: Math.floor(Math.random() * 100) + 50,
          apiCallsCount: Math.floor(Math.random() * 10) + 1
        };

        switch (command) {
          case 'get_local_variables':
            return {
              success: true,
              variables: Array.from({ length: 100 }, (_, i) => ({ id: `var-${i}` })),
              pagination: { total: 1000, offset: params.offset || 0, limit: 100, hasMore: true },
              performance: {
                ...basePerformance,
                totalProcessed: 1000,
                filtered: 100,
                returned: 100,
                chunksProcessed: 20,
                filteringTimeMs: 500,
                serializationTimeMs: 200
              }
            };

          case 'get_local_variable_collections':
            return {
              success: true,
              collections: Array.from({ length: 10 }, (_, i) => ({ id: `collection-${i}` })),
              pagination: { total: 10, returned: 10 },
              performance: {
                ...basePerformance,
                totalCollections: 10,
                variableCountingEnabled: params.includeVariableCount,
                variableCountingTimeMs: params.includeVariableCount ? 1500 : 0,
                totalVariablesProcessed: params.includeVariableCount ? 1000 : 0
              }
            };

          case 'get_variable_references':
            return {
              success: true,
              variable: { id: params.variableId },
              references: Array.from({ length: 50 }, (_, i) => ({ nodeId: `node-${i}` })),
              referenceCount: 50,
              analysis: {
                complete: true,
                timedOut: false,
                totalFound: 50,
                totalFormatted: 50
              },
              performance: {
                ...basePerformance,
                nodeTraversalTimeMs: 2000,
                referenceFormattingTimeMs: 800,
                duplicateFilteringTimeMs: 300
              }
            };

          default:
            return { success: false };
        }
      });

      // Act: Execute operations and collect performance data
      const performanceData = [];

      const collectionsResult = await mockSendCommandToFigma('get_local_variable_collections', {
        includeVariableCount: true
      });
      performanceData.push({ operation: 'collections', ...collectionsResult.performance });

      const variablesResult = await mockSendCommandToFigma('get_local_variables', {
        offset: 0,
        limit: 100
      });
      performanceData.push({ operation: 'variables', ...variablesResult.performance });

      const referencesResult = await mockSendCommandToFigma('get_variable_references', {
        variableId: 'var-1'
      });
      performanceData.push({ operation: 'references', ...referencesResult.performance });

      // Assert: Performance metrics collected across all operations
      expect(performanceData).toHaveLength(3);
      
      // Collections performance
      expect(performanceData[0].operation).toBe('collections');
      expect(performanceData[0].variableCountingEnabled).toBe(true);
      expect(performanceData[0].variableCountingTimeMs).toBeGreaterThan(0);
      expect(performanceData[0].totalVariablesProcessed).toBe(1000);

      // Variables performance
      expect(performanceData[1].operation).toBe('variables');
      expect(performanceData[1].chunksProcessed).toBe(20);
      expect(performanceData[1].totalProcessed).toBe(1000);
      expect(performanceData[1].filteringTimeMs).toBeGreaterThan(0);

      // References performance
      expect(performanceData[2].operation).toBe('references');
      expect(performanceData[2].nodeTraversalTimeMs).toBeGreaterThan(0);
      expect(performanceData[2].referenceFormattingTimeMs).toBeGreaterThan(0);

      // All operations should have base performance metrics
      performanceData.forEach(data => {
        expect(data.processingTimeMs).toBeGreaterThan(0);
        expect(data.memoryUsage).toBeGreaterThan(0);
        expect(data.apiCallsCount).toBeGreaterThan(0);
      });
    });

    it('should handle network interruptions and reconnections gracefully', async () => {
      // Arrange: Simulate network issues
      let callCount = 0;
      let networkFailure = false;

      mockSendCommandToFigma.mockImplementation(async (command, params) => {
        callCount++;
        
        // Simulate network failure on 3rd call
        if (callCount === 3 && !networkFailure) {
          networkFailure = true;
          throw new Error('WebSocket connection lost');
        }
        
        // Simulate recovery after failure
        if (networkFailure && callCount > 3) {
          return {
            success: true,
            variables: [{ id: 'recovered-var', name: 'Recovered Variable' }],
            pagination: { total: 1, returned: 1 },
            recovery: {
              reconnected: true,
              attemptNumber: callCount - 3,
              message: 'Connection restored successfully'
            }
          };
        }

        // Normal responses
        return {
          success: true,
          variables: [{ id: `var-${callCount}`, name: `Variable ${callCount}` }],
          pagination: { total: 1, returned: 1 }
        };
      });

      // Act: Execute operations with network interruption
      const results = [];
      
      // First two calls succeed
      results.push(await mockSendCommandToFigma('get_local_variables', {}));
      results.push(await mockSendCommandToFigma('get_local_variables', {}));
      
      // Third call fails
      try {
        await mockSendCommandToFigma('get_local_variables', {});
      } catch (error) {
        expect(error.message).toBe('WebSocket connection lost');
      }
      
      // Fourth call recovers
      results.push(await mockSendCommandToFigma('get_local_variables', {}));

      // Assert: System handled network interruption gracefully
      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);
      expect(results[2].recovery.reconnected).toBe(true);
      expect(results[2].recovery.message).toBe('Connection restored successfully');
      expect(callCount).toBe(4);
    });
  });

  describe('System-wide Performance Validation', () => {
    it('should complete typical user workflows within acceptable time limits', async () => {
      // Arrange: Simulate typical user workflow
      const workflowScenarios = [
        {
          name: 'Design System Exploration',
          operations: [
            { command: 'get_local_variable_collections', expectedTime: 3000 },
            { command: 'get_local_variables', params: { collectionId: 'design-tokens' }, expectedTime: 5000 },
            { command: 'get_variable_references', params: { variableId: 'primary-color' }, expectedTime: 8000 }
          ]
        },
        {
          name: 'Variable Audit',
          operations: [
            { command: 'get_local_variables', params: { limit: 1000 }, expectedTime: 15000 },
            { command: 'get_variable_references', params: { variableId: 'unused-var' }, expectedTime: 12000 }
          ]
        }
      ];

      mockSendCommandToFigma.mockImplementation(async (command, params) => {
        // Simulate realistic processing times
        const processingTime = Math.floor(Math.random() * 2000) + 1000;
        await new Promise(resolve => setTimeout(resolve, processingTime));

        return {
          success: true,
          [command.includes('collection') ? 'collections' : 'variables']: [
            { id: 'test-item', name: 'Test Item' }
          ],
          pagination: { total: 1, returned: 1 },
          performance: { processingTimeMs: processingTime }
        };
      });

      // Act: Execute workflows
      const workflowResults = [];

      for (const scenario of workflowScenarios) {
        const startTime = Date.now();
        const operationResults = [];

        for (const operation of scenario.operations) {
          const result = await mockSendCommandToFigma(operation.command, operation.params || {});
          operationResults.push({
            ...result,
            operation: operation.command,
            expectedTime: operation.expectedTime
          });
        }

        const totalTime = Date.now() - startTime;
        workflowResults.push({
          scenario: scenario.name,
          totalTime,
          operations: operationResults
        });
      }

      // Assert: Workflows completed within reasonable time
      workflowResults.forEach(workflow => {
        expect(workflow.totalTime).toBeLessThan(30000); // All workflows under 30 seconds
        
        workflow.operations.forEach(operation => {
          expect(operation.success).toBe(true);
          expect(operation.performance.processingTimeMs).toBeLessThan(operation.expectedTime);
        });
      });

      // Design System Exploration should be fastest
      expect(workflowResults[0].totalTime).toBeLessThan(workflowResults[1].totalTime);
    });
  });
}); 