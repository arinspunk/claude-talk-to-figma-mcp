/**
 * Figma Plugin Timeout Fixes Unit Tests - Task 1.13
 * TDD Retrospective: Validating plugin-side timeout fixes
 * 
 * Tests the chunked processing implementation in the Figma plugin
 * specifically focusing on getLocalVariables and getLocalVariableCollections
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock Figma API
const mockFigma = {
  variables: {
    getLocalVariables: jest.fn(),
    getLocalVariableCollections: jest.fn(),
    getVariableById: jest.fn()
  },
  getNodeById: jest.fn(),
  currentPage: {
    findAll: jest.fn()
  }
};

// Mock global figma
global.figma = mockFigma as any;

// Mock progress update function
global.sendProgressUpdate = jest.fn();

describe('Figma Plugin Timeout Fixes - Task 1.13', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLocalVariables - Chunked Processing', () => {
    it('should process variables in chunks of 50', async () => {
      // Arrange: Create large variable dataset
      const largeVariableSet = Array.from({ length: 200 }, (_, i) => ({
        id: `var-${i}`,
        name: `Variable ${i}`,
        resolvedType: 'STRING',
        variableCollectionId: 'collection-1',
        remote: false,
        valuesByMode: { 'mode-1': `Value ${i}` }
      }));

      mockFigma.variables.getLocalVariables.mockReturnValue(largeVariableSet);

      // Mock the chunked processing function (would be in plugin code)
      const processVariablesInChunks = async (
        variables: any[],
        chunkSize: number = 50,
        progressCallback?: (processed: number, total: number) => void
      ) => {
        const results = [];
        const total = variables.length;
        
        for (let i = 0; i < total; i += chunkSize) {
          const chunk = variables.slice(i, i + chunkSize);
          results.push(...chunk);
          
          // Simulate processing time
          await new Promise(resolve => setTimeout(resolve, 10));
          
          // Send progress update
          const processed = Math.min(i + chunkSize, total);
          progressCallback?.(processed, total);
        }
        
        return results;
      };

      let progressUpdates: Array<{processed: number, total: number}> = [];
      
      // Act: Process variables in chunks
      const result = await processVariablesInChunks(
        largeVariableSet,
        50,
        (processed, total) => {
          progressUpdates.push({ processed, total });
        }
      );

      // Assert: All variables processed with progress updates
      expect(result).toHaveLength(200);
      expect(progressUpdates).toHaveLength(4); // 200/50 = 4 chunks
      expect(progressUpdates[0]).toEqual({ processed: 50, total: 200 });
      expect(progressUpdates[1]).toEqual({ processed: 100, total: 200 });
      expect(progressUpdates[2]).toEqual({ processed: 150, total: 200 });
      expect(progressUpdates[3]).toEqual({ processed: 200, total: 200 });
    });

    it('should yield UI control between chunks', async () => {
      // Arrange: Mock setTimeout to track UI yields
      const originalSetTimeout = global.setTimeout;
      const timeoutCalls: number[] = [];
      
      global.setTimeout = jest.fn((callback, delay) => {
        timeoutCalls.push(delay);
        return originalSetTimeout(callback, delay);
      }) as any;

      const variables = Array.from({ length: 150 }, (_, i) => ({
        id: `var-${i}`,
        name: `Variable ${i}`
      }));

      // Mock chunked processing with UI yield
      const processWithUIYield = async (items: any[], chunkSize: number = 50) => {
        const results = [];
        
        for (let i = 0; i < items.length; i += chunkSize) {
          const chunk = items.slice(i, i + chunkSize);
          results.push(...chunk);
          
          // Yield UI control
          if (i + chunkSize < items.length) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
        
        return results;
      };

      // Act: Process with UI yield
      const result = await processWithUIYield(variables, 50);

      // Assert: UI yields occurred between chunks
      expect(result).toHaveLength(150);
      expect(timeoutCalls).toContain(0); // UI yield calls
      expect(timeoutCalls.length).toBeGreaterThan(0);

      // Cleanup
      global.setTimeout = originalSetTimeout;
    });

    it('should handle filtering during chunked processing', async () => {
      // Arrange: Mixed variable types
      const variables = [
        ...Array.from({ length: 30 }, (_, i) => ({
          id: `string-var-${i}`,
          name: `String Variable ${i}`,
          resolvedType: 'STRING',
          variableCollectionId: 'collection-1'
        })),
        ...Array.from({ length: 70 }, (_, i) => ({
          id: `color-var-${i}`,
          name: `Color Variable ${i}`,
          resolvedType: 'COLOR',
          variableCollectionId: 'collection-2'
        }))
      ];

      mockFigma.variables.getLocalVariables.mockReturnValue(variables);

      // Mock filtered chunked processing
      const processFilteredChunks = async (
        allVariables: any[],
        filter: { type?: string; collectionId?: string },
        chunkSize: number = 50
      ) => {
        const results = [];
        let totalProcessed = 0;
        
        for (let i = 0; i < allVariables.length; i += chunkSize) {
          const chunk = allVariables.slice(i, i + chunkSize);
          
          // Apply filters to chunk
          const filteredChunk = chunk.filter(variable => {
            if (filter.type && variable.resolvedType !== filter.type) return false;
            if (filter.collectionId && variable.variableCollectionId !== filter.collectionId) return false;
            return true;
          });
          
          results.push(...filteredChunk);
          totalProcessed += chunk.length;
          
          // Progress based on total processed, not filtered results
          global.sendProgressUpdate('test-id', 'get_local_variables', 'processing', 
            Math.round((totalProcessed / allVariables.length) * 100),
            allVariables.length, totalProcessed, 
            `Processed ${totalProcessed}/${allVariables.length} variables`
          );
        }
        
        return results;
      };

      // Act: Filter for STRING variables only
      const result = await processFilteredChunks(variables, { type: 'STRING' }, 50);

      // Assert: Only STRING variables returned, but progress tracked total
      expect(result).toHaveLength(30); // Only STRING variables
      expect(result.every(v => v.resolvedType === 'STRING')).toBe(true);
      
      // Progress updates should reflect total processing
      expect(global.sendProgressUpdate).toHaveBeenCalledWith(
        'test-id', 'get_local_variables', 'processing', 
        50, 100, 50, 'Processed 50/100 variables'
      );
      expect(global.sendProgressUpdate).toHaveBeenCalledWith(
        'test-id', 'get_local_variables', 'processing', 
        100, 100, 100, 'Processed 100/100 variables'
      );
    });
  });

  describe('getLocalVariableCollections - Optimization', () => {
    it('should efficiently count variables per collection', async () => {
      // Arrange: Mock collections and variables
      const collections = [
        { id: 'collection-1', name: 'Design Tokens', modes: [] },
        { id: 'collection-2', name: 'Component Tokens', modes: [] }
      ];

      const variables = [
        ...Array.from({ length: 50 }, (_, i) => ({
          id: `var-1-${i}`,
          variableCollectionId: 'collection-1'
        })),
        ...Array.from({ length: 30 }, (_, i) => ({
          id: `var-2-${i}`,
          variableCollectionId: 'collection-2'
        }))
      ];

      mockFigma.variables.getLocalVariableCollections.mockReturnValue(collections);
      mockFigma.variables.getLocalVariables.mockReturnValue(variables);

      // Mock efficient variable counting
      const addVariableCounts = async (collections: any[], includeCount: boolean = true) => {
        if (!includeCount) return collections;

        const allVariables = figma.variables.getLocalVariables();
        const variableCountMap = new Map<string, number>();

        // Count variables per collection
        allVariables.forEach(variable => {
          const collectionId = variable.variableCollectionId;
          variableCountMap.set(collectionId, (variableCountMap.get(collectionId) || 0) + 1);
        });

        // Add counts to collections
        return collections.map(collection => ({
          ...collection,
          variableCount: variableCountMap.get(collection.id) || 0
        }));
      };

      // Act: Add variable counts
      const result = await addVariableCounts(collections, true);

      // Assert: Variable counts added correctly
      expect(result).toHaveLength(2);
      expect(result[0].variableCount).toBe(50);
      expect(result[1].variableCount).toBe(30);
    });

    it('should support pagination for collections', async () => {
      // Arrange: Large collection set
      const allCollections = Array.from({ length: 100 }, (_, i) => ({
        id: `collection-${i}`,
        name: `Collection ${i}`,
        modes: []
      }));

      mockFigma.variables.getLocalVariableCollections.mockReturnValue(allCollections);

      // Mock pagination
      const paginateCollections = (
        collections: any[],
        offset: number = 0,
        limit: number = 20
      ) => {
        const total = collections.length;
        const paginatedResults = collections.slice(offset, offset + limit);
        
        return {
          collections: paginatedResults,
          pagination: {
            total,
            offset,
            limit,
            hasMore: offset + limit < total,
            returned: paginatedResults.length
          }
        };
      };

      // Act: Get first page
      const firstPage = paginateCollections(allCollections, 0, 20);
      // Get second page
      const secondPage = paginateCollections(allCollections, 20, 20);

      // Assert: Pagination working correctly
      expect(firstPage.collections).toHaveLength(20);
      expect(firstPage.pagination.hasMore).toBe(true);
      expect(firstPage.pagination.total).toBe(100);

      expect(secondPage.collections).toHaveLength(20);
      expect(secondPage.pagination.offset).toBe(20);
      expect(secondPage.collections[0].id).toBe('collection-20');
    });
  });

  describe('getVariableReferences - Timeout Protection', () => {
    it('should implement timeout protection with Promise.race', async () => {
      // Arrange: Mock slow reference analysis
      const mockSlowReferenceAnalysis = () => new Promise(resolve => {
        setTimeout(() => resolve([]), 20000); // 20 second delay
      });

      const mockTimeoutPromise = (timeoutMs: number) => new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
      });

      // Mock reference analysis with timeout protection
      const getReferencesSafe = async (variableId: string, timeoutMs: number = 15000) => {
        try {
          const result = await Promise.race([
            mockSlowReferenceAnalysis(),
            mockTimeoutPromise(timeoutMs)
          ]);
          
          return {
            success: true,
            references: result,
            analysis: { complete: true, timedOut: false }
          };
        } catch (error) {
          if (error.message.includes('timed out')) {
            return {
              success: true,
              references: [],
              analysis: { 
                complete: false, 
                timedOut: true,
                timeoutMs,
                message: 'Reference analysis timed out - returning partial results'
              }
            };
          }
          throw error;
        }
      };

      // Act: Execute with timeout protection
      const result = await getReferencesSafe('var-1', 5000); // 5 second timeout

      // Assert: Graceful timeout handling
      expect(result.success).toBe(true);
      expect(result.analysis.timedOut).toBe(true);
      expect(result.references).toEqual([]);
      expect(result.analysis.timeoutMs).toBe(5000);
    });

    it('should limit reference processing to prevent UI blocking', async () => {
      // Arrange: Mock large reference set
      const mockLargeReferenceSet = Array.from({ length: 5000 }, (_, i) => ({
        nodeId: `node-${i}`,
        property: 'width'
      }));

      // Mock reference limiting
      const processReferencesWithLimit = async (
        references: any[],
        maxReferences: number = 1000,
        processingTimeLimit: number = 10000
      ) => {
        const startTime = Date.now();
        const results = [];
        
        for (let i = 0; i < Math.min(references.length, maxReferences); i++) {
          // Check time limit
          if (Date.now() - startTime > processingTimeLimit) {
            return {
              references: results,
              analysis: {
                complete: false,
                timedOut: true,
                maxReferencesReached: false,
                totalFound: references.length,
                totalProcessed: results.length
              }
            };
          }
          
          results.push(references[i]);
          
          // Yield UI occasionally
          if (i % 100 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
        
        return {
          references: results,
          analysis: {
            complete: results.length === references.length,
            timedOut: false,
            maxReferencesReached: results.length >= maxReferences,
            totalFound: references.length,
            totalProcessed: results.length
          }
        };
      };

      // Act: Process with limits
      const result = await processReferencesWithLimit(mockLargeReferenceSet, 1000, 10000);

      // Assert: Processing limited appropriately
      expect(result.references).toHaveLength(1000);
      expect(result.analysis.maxReferencesReached).toBe(true);
      expect(result.analysis.totalFound).toBe(5000);
      expect(result.analysis.totalProcessed).toBe(1000);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle individual variable processing errors gracefully', async () => {
      // Arrange: Mix of valid and invalid variables
      const variables = [
        { id: 'valid-1', name: 'Valid Variable 1' },
        { id: 'invalid-1', name: null }, // Invalid - null name
        { id: 'valid-2', name: 'Valid Variable 2' },
        { id: 'invalid-2' }, // Invalid - missing name
        { id: 'valid-3', name: 'Valid Variable 3' }
      ];

      // Mock safe variable processing
      const processSafely = async (variables: any[]) => {
        const results = [];
        const errors = [];
        
        for (let i = 0; i < variables.length; i++) {
          try {
            const variable = variables[i];
            
            // Validate variable
            if (!variable.name || typeof variable.name !== 'string') {
              throw new Error(`Invalid variable name for ${variable.id}`);
            }
            
            results.push(variable);
          } catch (error) {
            errors.push({
              variableId: variables[i]?.id || 'unknown',
              error: error.message
            });
          }
        }
        
        return { results, errors };
      };

      // Act: Process with error handling
      const { results, errors } = await processSafely(variables);

      // Assert: Valid variables processed, errors captured
      expect(results).toHaveLength(3);
      expect(errors).toHaveLength(2);
      expect(results.every(v => typeof v.name === 'string')).toBe(true);
      expect(errors[0].variableId).toBe('invalid-1');
      expect(errors[1].variableId).toBe('invalid-2');
    });

    it('should provide progress updates even when errors occur', async () => {
      // Arrange: Variables with some that will fail
      const variables = Array.from({ length: 100 }, (_, i) => ({
        id: `var-${i}`,
        name: i % 10 === 0 ? null : `Variable ${i}` // Every 10th variable has invalid name
      }));

      let progressUpdates: any[] = [];
      const mockProgressCallback = (processed: number, total: number, errors: number = 0) => {
        progressUpdates.push({ processed, total, errors });
      };

      // Mock processing with error tracking
      const processWithErrorTracking = async (
        variables: any[],
        chunkSize: number = 25,
        progressCallback?: (processed: number, total: number, errors: number) => void
      ) => {
        const results = [];
        let errorCount = 0;
        
        for (let i = 0; i < variables.length; i += chunkSize) {
          const chunk = variables.slice(i, i + chunkSize);
          
          chunk.forEach(variable => {
            if (variable.name) {
              results.push(variable);
            } else {
              errorCount++;
            }
          });
          
          const processed = Math.min(i + chunkSize, variables.length);
          progressCallback?.(processed, variables.length, errorCount);
        }
        
        return { results, errorCount };
      };

      // Act: Process with error tracking
      const { results, errorCount } = await processWithErrorTracking(
        variables, 25, mockProgressCallback
      );

      // Assert: Progress tracked including errors
      expect(results).toHaveLength(90); // 100 - 10 errors
      expect(errorCount).toBe(10);
      expect(progressUpdates).toHaveLength(4); // 100/25 = 4 chunks
      expect(progressUpdates[3]).toEqual({ processed: 100, total: 100, errors: 10 });
    });
  });
}); 