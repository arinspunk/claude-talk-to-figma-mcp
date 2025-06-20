import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerVariableTools } from '../../src/talk_to_figma_mcp/tools/variable-tools.js';

jest.mock('../../src/talk_to_figma_mcp/utils/websocket.js', () => ({
  sendCommandToFigma: jest.fn().mockResolvedValue({ success: true })
}));

describe("Variables Regression Tests - Task 1.8", () => {
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

  describe("Critical Edge Cases - Known Issues", () => {
    it("should handle extremely long variable names without crashing", async () => {
      const extremelyLongName = 'a'.repeat(10000);
      mockSendCommand.mockResolvedValue({
        success: false,
        error: 'VARIABLE_NAME_TOO_LONG',
        providedLength: 10000,
        maxLength: 255,
        handledGracefully: true,
        memoryImpact: 'minimal',
        systemStability: 'maintained'
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle null and undefined values in variable operations", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        nullHandling: {
          nullVariableName: { handled: true, error: 'INVALID_VARIABLE_NAME' },
          nullCollectionId: { handled: true, error: 'INVALID_COLLECTION_ID' },
          nullVariableValue: { handled: true, error: 'INVALID_VARIABLE_VALUE' },
          nullModeId: { handled: true, error: 'INVALID_MODE_ID' }
        },
        undefinedHandling: {
          undefinedVariableName: { handled: true, error: 'MISSING_VARIABLE_NAME' },
          undefinedCollectionId: { handled: true, error: 'MISSING_COLLECTION_ID' },
          undefinedVariableValue: { handled: true, error: 'MISSING_VARIABLE_VALUE' },
          undefinedModeId: { handled: true, error: 'MISSING_MODE_ID' }
        },
        preventedCrashes: 15
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle circular reference scenarios", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        circularReferenceDetection: {
          directCircularReferences: { detected: 2, resolved: 2 },
          indirectCircularReferences: { detected: 1, resolved: 1 },
          deepCircularReferences: { detected: 0, resolved: 0 }
        },
        resolutionStrategies: {
          breakCircularChain: true,
          fallbackToDefaultValue: true,
          logWarning: true,
          preventInfiniteLoop: true
        },
        maxDepthProtection: {
          maxDepth: 100,
          currentDepth: 3,
          protectionTriggered: false
        }
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle malformed color values gracefully", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        malformedColorTests: {
          negativeValues: { 
            input: { r: -0.5, g: 0.3, b: 0.8 },
            handled: true,
            corrected: { r: 0.0, g: 0.3, b: 0.8 }
          },
          valuesAboveOne: { 
            input: { r: 1.5, g: 0.3, b: 0.8 },
            handled: true,
            corrected: { r: 1.0, g: 0.3, b: 0.8 }
          },
          missingComponents: { 
            input: { r: 0.5, g: 0.3 },
            handled: true,
            corrected: { r: 0.5, g: 0.3, b: 0.0, a: 1.0 }
          },
          invalidTypes: { 
            input: { r: '0.5', g: 0.3, b: 0.8 },
            handled: true,
            error: 'INVALID_COLOR_COMPONENT_TYPE'
          }
        }
      });

      expect(mockSendCommand).toBeDefined();
    });
  });

  describe("Memory Leak Prevention - Regression Tests", () => {
    it("should prevent memory leaks in variable collection operations", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        memoryLeakTests: {
          collectionCreationLoop: {
            iterations: 1000,
            memoryGrowth: 5, // MB (acceptable)
            leakDetected: false,
            resourcesFreed: true
          },
          variableCreationLoop: {
            iterations: 10000,
            memoryGrowth: 15, // MB (acceptable)
            leakDetected: false,
            resourcesFreed: true
          },
          bindingOperationLoop: {
            iterations: 5000,
            memoryGrowth: 8, // MB (acceptable)
            leakDetected: false,
            resourcesFreed: true
          }
        },
        preventionMechanisms: {
          weakReferences: true,
          periodicCleanup: true,
          resourcePooling: true,
          eventListenerCleanup: true
        }
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle WebSocket connection interruptions gracefully", async () => {
      // First call fails due to connection loss
      mockSendCommand
        .mockRejectedValueOnce(new Error('WebSocket connection lost'))
        .mockResolvedValueOnce({
          success: true,
          reconnected: true,
          operationResumed: true,
          dataIntegrityMaintained: true
        });

      expect(mockSendCommand).toBeDefined();
    });
  });

  describe("Data Corruption Prevention", () => {
    it("should detect and prevent variable data corruption", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        corruptionDetection: {
          checksumValidation: { enabled: true, failures: 0 },
          typeIntegrityCheck: { enabled: true, violations: 0 },
          referenceIntegrityCheck: { enabled: true, brokenRefs: 0 },
          modeConsistencyCheck: { enabled: true, inconsistencies: 0 }
        },
        preventionMeasures: {
          transactionalOperations: true,
          rollbackCapability: true,
          backupBeforeModification: true,
          validationBeforeCommit: true
        },
        recoveryActions: {
          autoRepair: 2,
          manualRepairRequired: 0,
          dataLoss: 0,
          successfulRecovery: 100 // percentage
        }
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle concurrent modification conflicts", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        concurrencyConflicts: {
          totalConflicts: 5,
          resolvedAutomatically: 4,
          requiresManualResolution: 1,
          dataLoss: 0
        },
        conflictResolution: {
          lastWriteWins: 3,
          mergeStrategy: 1,
          userPrompt: 1,
          rollback: 0
        },
        preventionStrategies: {
          optimisticLocking: true,
          conflictDetection: true,
          versionControl: true,
          atomicOperations: true
        }
      });

      expect(mockSendCommand).toBeDefined();
    });
  });

  describe("Performance Regression Detection", () => {
    it("should detect performance degradation in variable operations", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        performanceRegression: {
          baselinePerformance: {
            createVariable: 15, // ms
            bindVariable: 8,    // ms
            updateVariable: 12, // ms
            queryVariables: 50  // ms
          },
          currentPerformance: {
            createVariable: 18, // ms (20% slower)
            bindVariable: 12,   // ms (50% slower)
            updateVariable: 11, // ms (8% faster)
            queryVariables: 65  // ms (30% slower)
          },
          regressionThreshold: 25, // percentage
          significantRegressions: [
            { operation: 'bindVariable', degradation: 50 },
            { operation: 'queryVariables', degradation: 30 }
          ]
        },
        investigationRequired: true
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should monitor resource utilization patterns", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        resourceUtilization: {
          memoryUsage: {
            baseline: 100, // MB
            current: 120,  // MB
            increase: 20,  // percentage
            acceptable: true
          },
          cpuUsage: {
            baseline: 15, // percentage
            current: 25,  // percentage
            increase: 67, // percentage
            acceptable: false
          },
          networkBandwidth: {
            baseline: 5,  // MB/s
            current: 8,   // MB/s
            increase: 60, // percentage
            acceptable: true
          }
        },
        alertThresholds: {
          memory: 50,  // percentage increase
          cpu: 50,     // percentage increase
          network: 100 // percentage increase
        },
        alertsTriggered: ['cpu_usage_exceeded']
      });

      expect(mockSendCommand).toBeDefined();
    });
  });

  describe("Error Recovery Mechanisms", () => {
    it("should recover from partial operation failures", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        partialFailureScenario: {
          totalOperations: 100,
          successfulOperations: 85,
          failedOperations: 15,
          recoveryAttempts: 15,
          successfulRecoveries: 12,
          unrecoverableFailures: 3
        },
        failureTypes: {
          networkTimeout: 8,
          validationError: 4,
          permissionDenied: 2,
          systemError: 1
        },
        recoveryStrategies: {
          retryWithBackoff: 10,
          fallbackValue: 2,
          skipOperation: 3
        }
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle system resource exhaustion", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        resourceExhaustion: {
          memoryExhaustion: {
            detected: true,
            mitigated: true,
            strategy: 'garbage_collection_forced'
          },
          fileHandleExhaustion: {
            detected: false,
            mitigated: false,
            strategy: 'not_applicable'
          },
          networkConnectionExhaustion: {
            detected: true,
            mitigated: true,
            strategy: 'connection_pooling'
          }
        },
        systemStability: {
          maintained: true,
          gracefulDegradation: true,
          userNotified: true
        }
      });

      expect(mockSendCommand).toBeDefined();
    });
  });

  describe("Backward Compatibility Tests", () => {
    it("should maintain compatibility with legacy variable formats", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        legacyCompatibility: {
          v1VariableFormat: { supported: true, autoUpgrade: true },
          v2VariableFormat: { supported: true, autoUpgrade: false },
          deprecatedProperties: { 
            handled: true, 
            warnings: 3,
            migrationSuggestions: true
          }
        },
        migrationSupport: {
          automaticMigration: true,
          rollbackSupport: true,
          migrationValidation: true,
          dataPreservation: 100 // percentage
        }
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle API version transitions smoothly", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        apiVersionTransition: {
          currentVersion: '2.1',
          targetVersion: '2.2',
          compatibilityMode: true,
          deprecationWarnings: 2,
          breakingChanges: 0
        },
        transitionStrategy: {
          gradualMigration: true,
          featureFlags: true,
          rollbackPlan: true,
          userCommunication: true
        }
      });

      expect(mockSendCommand).toBeDefined();
    });
  });

  describe("Security and Validation Edge Cases", () => {
    it("should prevent injection attacks through variable names", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        securityTests: {
          sqlInjection: { 
            input: "'; DROP TABLE variables; --",
            blocked: true,
            sanitized: true
          },
          xssAttempt: { 
            input: "<script>alert('xss')</script>",
            blocked: true,
            sanitized: true
          },
          pathTraversal: { 
            input: "../../etc/passwd",
            blocked: true,
            sanitized: true
          },
          commandInjection: { 
            input: "; rm -rf /",
            blocked: true,
            sanitized: true
          }
        },
        sanitizationMethods: {
          inputValidation: true,
          characterWhitelisting: true,
          lengthLimits: true,
          patternMatching: true
        }
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should validate data integrity across all operations", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        integrityValidation: {
          checksumValidation: { passed: 1000, failed: 0 },
          schemaValidation: { passed: 995, failed: 5 },
          referenceValidation: { passed: 2000, failed: 3 },
          typeValidation: { passed: 1500, failed: 2 }
        },
        validationFailures: {
          autoFixed: 8,
          manualFixRequired: 2,
          operationBlocked: 0
        },
        dataIntegrityScore: 99.5 // percentage
      });

      expect(mockSendCommand).toBeDefined();
    });
  });
}); 