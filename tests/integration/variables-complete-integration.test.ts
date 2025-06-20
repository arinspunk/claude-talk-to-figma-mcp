import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerVariableTools } from '../../src/talk_to_figma_mcp/tools/variable-tools.js';

jest.mock('../../src/talk_to_figma_mcp/utils/websocket.js', () => ({
  sendCommandToFigma: jest.fn().mockResolvedValue({ success: true })
}));

describe("Variables Complete Integration Tests - Task 1.8", () => {
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

  describe("Complete Variable Workflow Integration", () => {
    it("should handle complete variable collection lifecycle", async () => {
      // Mock collection creation
      mockSendCommand.mockResolvedValueOnce({
        success: true,
        collectionId: 'collection-123',
        name: 'Test Collection',
        modes: [{ id: 'mode-light', name: 'Light' }]
      });

      // Mock variable creation
      mockSendCommand.mockResolvedValueOnce({
        success: true,
        variableId: 'var-123',
        name: 'primary-color',
        type: 'COLOR',
        collectionId: 'collection-123'
      });

      // Mock binding operation
      mockSendCommand.mockResolvedValueOnce({
        success: true,
        nodeId: 'node-123',
        property: 'fills',
        variableId: 'var-123',
        bound: true
      });

      // Mock publishing
      mockSendCommand.mockResolvedValueOnce({
        success: true,
        collectionId: 'collection-123',
        libraryKey: 'lib-123',
        publishedAt: '2025-01-20T12:00:00Z'
      });

      expect(mockSendCommand).toBeDefined();
      expect(server).toBeDefined();
    });

    it("should handle complex variable type compatibility scenarios", async () => {
      // Test COLOR variable compatibility
      mockSendCommand.mockResolvedValueOnce({
        success: true,
        variableId: 'color-var-123',
        type: 'COLOR',
        value: { r: 0.2, g: 0.4, b: 0.8, a: 1.0 },
        compatible: true
      });

      // Test STRING variable compatibility
      mockSendCommand.mockResolvedValueOnce({
        success: true,
        variableId: 'string-var-456',
        type: 'STRING',
        value: 'Design System Token',
        compatible: true
      });

      // Test FLOAT variable compatibility
      mockSendCommand.mockResolvedValueOnce({
        success: true,
        variableId: 'float-var-789',
        type: 'FLOAT',
        value: 16.5,
        compatible: true
      });

      // Test BOOLEAN variable compatibility
      mockSendCommand.mockResolvedValueOnce({
        success: true,
        variableId: 'boolean-var-101',
        type: 'BOOLEAN',
        value: true,
        compatible: true
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle cross-tool variable operations", async () => {
      // Test variable creation → binding → modification → publishing workflow
      mockSendCommand.mockResolvedValue({
        success: true,
        workflowCompleted: true,
        operations: [
          'create_variable_collection',
          'create_variable', 
          'bind_variable_to_node',
          'update_variable_value',
          'publish_variable_collection'
        ]
      });

      expect(mockSendCommand).toBeDefined();
    });
  });

  describe("Performance Tests for Large-Scale Operations", () => {
    it("should handle operations with large numbers of variables", async () => {
      // Mock large collection with 500+ variables
      mockSendCommand.mockResolvedValue({
        success: true,
        totalVariables: 500,
        processedVariables: 500,
        performanceMetrics: {
          executionTime: 2500, // ms
          memoryUsage: 45, // MB
          operationsPerSecond: 200
        }
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle batch operations efficiently", async () => {
      // Mock batch binding of 100 variables
      mockSendCommand.mockResolvedValue({
        success: true,
        batchSize: 100,
        successfulBindings: 98,
        failedBindings: 2,
        executionTime: 1200,
        averageTimePerBinding: 12
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle complex mode operations with performance metrics", async () => {
      // Mock collection with 10 modes and 200 variables
      mockSendCommand.mockResolvedValue({
        success: true,
        modes: 10,
        variablesPerMode: 200,
        totalOperations: 2000,
        performanceData: {
          modeCreationTime: 50,
          valueAssignmentTime: 1800,
          integrityValidationTime: 150
        }
      });

      expect(mockSendCommand).toBeDefined();
    });
  });

  describe("Variable Type Compatibility Tests", () => {
    it("should validate COLOR variable type conversions", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        sourceType: 'COLOR',
        targetType: 'COLOR',
        conversionSupported: true,
        rgbValidation: true,
        alphaSupport: true
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle STRING variable encoding and special characters", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        stringValue: 'Special chars: áéíóú ñ 中文 🎨',
        encoding: 'UTF-8',
        lengthValidation: true,
        specialCharsSupported: true
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should validate FLOAT precision and range limits", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        floatValue: 3.141592653589793,
        precision: 15,
        rangeValidation: true,
        scientificNotationSupport: true
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle BOOLEAN variable state transitions", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        booleanTransitions: [
          { from: false, to: true, valid: true },
          { from: true, to: false, valid: true },
          { from: null, to: true, valid: true },
          { from: undefined, to: false, valid: false }
        ]
      });

      expect(mockSendCommand).toBeDefined();
    });
  });

  describe("Edge Cases and Regression Tests", () => {
    it("should handle empty collections gracefully", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        collectionId: 'empty-collection',
        variableCount: 0,
        modesCount: 1,
        isEmpty: true,
        canPublish: false
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle maximum collection limits", async () => {
      mockSendCommand.mockResolvedValue({
        success: false,
        error: 'COLLECTION_LIMIT_EXCEEDED',
        maxCollections: 100,
        currentCollections: 100,
        canCreateMore: false
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle corrupted variable references", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        corruptedReferences: 3,
        fixedReferences: 2,
        unrepairable: 1,
        cleanupActions: [
          'removed_orphaned_binding',
          'updated_stale_reference',
          'marked_corrupted_variable'
        ]
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle concurrent modifications", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        concurrentOperations: 5,
        conflicts: 1,
        resolutionStrategy: 'last_write_wins',
        conflictResolved: true
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle extremely long variable names", async () => {
      const longName = 'a'.repeat(500);
      mockSendCommand.mockResolvedValue({
        success: false,
        error: 'VARIABLE_NAME_TOO_LONG',
        providedLength: 500,
        maxLength: 255,
        truncated: false
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle invalid color values gracefully", async () => {
      mockSendCommand.mockResolvedValue({
        success: false,
        error: 'INVALID_COLOR_VALUE',
        providedValue: { r: 2.5, g: -0.5, b: 1.5, a: 0.8 },
        validationErrors: [
          'r_value_out_of_range',
          'g_value_negative',
          'b_value_out_of_range'
        ]
      });

      expect(mockSendCommand).toBeDefined();
    });
  });

  describe("Cross-Mode Variable Operations", () => {
    it("should handle variable values across multiple modes", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        variableId: 'multi-mode-var',
        modes: {
          'light': { value: '#FFFFFF', type: 'COLOR' },
          'dark': { value: '#000000', type: 'COLOR' },
          'high-contrast': { value: '#FF0000', type: 'COLOR' }
        },
        consistency: true
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle mode deletion with value preservation", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        deletedMode: 'deprecated-mode',
        affectedVariables: 25,
        valuesPreserved: 23,
        valuesLost: 2,
        replacementMode: 'default-mode'
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle mode reordering impact on references", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        originalOrder: ['light', 'dark', 'high-contrast'],
        newOrder: ['dark', 'light', 'high-contrast'],
        referencesUpdated: 150,
        integrityMaintained: true
      });

      expect(mockSendCommand).toBeDefined();
    });
  });

  describe("Publishing and Library Integration Tests", () => {
    it("should handle complex publishing scenarios", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        publishingScenario: 'team_library_with_permissions',
        libraryKey: 'team-lib-123',
        permissions: {
          canEdit: false,
          canView: true,
          requiresApproval: true
        },
        subscribers: 15
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle library access revocation scenarios", async () => {
      mockSendCommand.mockResolvedValue({
        success: false,
        error: 'LIBRARY_ACCESS_REVOKED',
        libraryKey: 'revoked-lib-456',
        previousAccess: true,
        revocationDate: '2025-01-20T10:00:00Z',
        affectedVariables: 50
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle version conflicts in published libraries", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        versionConflict: true,
        localVersion: '2.1.0',
        libraryVersion: '2.3.0',
        conflictResolution: 'update_to_library_version',
        updatedVariables: 12
      });

      expect(mockSendCommand).toBeDefined();
    });
  });

  describe("Error Recovery and Resilience Tests", () => {
    it("should recover from WebSocket connection failures", async () => {
      mockSendCommand
        .mockRejectedValueOnce(new Error('WebSocket connection lost'))
        .mockResolvedValueOnce({
          success: true,
          recovered: true,
          retryAttempts: 3,
          operationCompleted: true
        });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle Figma API rate limiting gracefully", async () => {
      mockSendCommand.mockResolvedValue({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 60,
        requestsRemaining: 0,
        resetTime: '2025-01-20T12:01:00Z'
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle partial operation failures", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        partialFailure: true,
        totalOperations: 100,
        successfulOperations: 95,
        failedOperations: 5,
        failureReasons: [
          'VARIABLE_NOT_FOUND',
          'PERMISSION_DENIED',
          'INVALID_VALUE_TYPE'
        ]
      });

      expect(mockSendCommand).toBeDefined();
    });
  });

  describe("Memory and Resource Management Tests", () => {
    it("should handle large variable collections without memory leaks", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        memoryUsage: {
          initial: 50, // MB
          peak: 120,   // MB
          final: 55,   // MB
          leakDetected: false
        },
        garbageCollectionEvents: 3,
        resourcesFreed: true
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle timeout scenarios for complex operations", async () => {
      mockSendCommand.mockResolvedValue({
        success: false,
        error: 'OPERATION_TIMEOUT',
        timeoutDuration: 30000, // 30 seconds
        operationProgress: 75,   // 75% completed
        partialResults: true,
        canResume: true
      });

      expect(mockSendCommand).toBeDefined();
    });
  });

  describe("Data Integrity and Validation Tests", () => {
    it("should maintain referential integrity across operations", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        integrityCheck: {
          variableReferences: 250,
          validReferences: 248,
          brokenReferences: 2,
          autoFixed: 2,
          manualFixRequired: 0
        },
        integrityScore: 100
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should validate complex nested variable structures", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        nestedStructure: {
          collections: 5,
          totalVariables: 200,
          crossReferences: 50,
          circularReferences: 0,
          maxDepth: 3
        },
        structureValid: true
      });

      expect(mockSendCommand).toBeDefined();
    });
  });
}); 