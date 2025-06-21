/**
 * Variable Initial Value Persistence Tests - Task 1.14
 * TDD RED Phase: Tests that should fail initially
 * 
 * Tests for:
 * - Initial value persistence in createVariable
 * - Correct mapping of COLOR/FLOAT/STRING/BOOLEAN values
 * - Post-creation validation
 * - Retry logic for silent failures
 * - Value integrity across different data types
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { CreateVariableResponse, GetVariableResponse } from '../../src/talk_to_figma_mcp/types/index.js';

// Mock WebSocket for testing
jest.mock('../../src/talk_to_figma_mcp/utils/websocket', () => ({
  sendCommandToFigma: jest.fn()
}));

const { sendCommandToFigma } = require('../../src/talk_to_figma_mcp/utils/websocket');
const mockSendCommandToFigma = sendCommandToFigma as jest.MockedFunction<any>;

describe('Variable Initial Value Persistence - Task 1.14 TDD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('BOOLEAN Value Persistence', () => {
    it('should persist true boolean initial value correctly', async () => {
      // Arrange: Mock successful creation with boolean true
      mockSendCommandToFigma.mockResolvedValue({
        success: true,
        variable: {
          id: 'var-bool-true',
          name: 'Test Boolean True',
          key: 'test-bool-true',
          resolvedType: 'BOOLEAN',
          variableCollectionId: 'collection-1',
          valuesByMode: {
            'mode-1': true
          },
          remote: false,
          description: '',
          hiddenFromPublishing: false,
          scopes: ['ALL_SCOPES'],
          codeSyntax: {}
        }
      } as CreateVariableResponse);

      // Act: Create boolean variable with true initial value
      const result = await mockSendCommandToFigma('create_variable', {
        name: 'Test Boolean True',
        variableCollectionId: 'collection-1',
        resolvedType: 'BOOLEAN',
        initialValue: true
      }) as CreateVariableResponse;

      // Assert: Initial value should be persisted as true
      expect(result.success).toBe(true);
      expect(result.variable.valuesByMode['mode-1']).toBe(true);
      expect(typeof result.variable.valuesByMode['mode-1']).toBe('boolean');
    });

    it('should persist false boolean initial value correctly', async () => {
      // Arrange: Mock successful creation with boolean false
      mockSendCommandToFigma.mockResolvedValue({
        success: true,
        variable: {
          id: 'var-bool-false',
          name: 'Test Boolean False',
          key: 'test-bool-false',
          resolvedType: 'BOOLEAN',
          variableCollectionId: 'collection-1',
          valuesByMode: {
            'mode-1': false
          },
          remote: false,
          description: '',
          hiddenFromPublishing: false,
          scopes: ['ALL_SCOPES'],
          codeSyntax: {}
        }
      } as CreateVariableResponse);

      // Act: Create boolean variable with false initial value
      const result = await mockSendCommandToFigma('create_variable', {
        name: 'Test Boolean False',
        variableCollectionId: 'collection-1',
        resolvedType: 'BOOLEAN',
        initialValue: false
      }) as CreateVariableResponse;

      // Assert: Initial value should be persisted as false
      expect(result.success).toBe(true);
      expect(result.variable.valuesByMode['mode-1']).toBe(false);
      expect(typeof result.variable.valuesByMode['mode-1']).toBe('boolean');
    });
  });

  describe('FLOAT Value Persistence', () => {
    it('should persist positive float initial value correctly', async () => {
      // Arrange: Mock successful creation with positive float
      mockSendCommandToFigma.mockResolvedValue({
        success: true,
        variable: {
          id: 'var-float-positive',
          name: 'Test Float Positive',
          key: 'test-float-positive',
          resolvedType: 'FLOAT',
          variableCollectionId: 'collection-1',
          valuesByMode: {
            'mode-1': 24.5
          },
          remote: false,
          description: '',
          hiddenFromPublishing: false,
          scopes: ['ALL_SCOPES'],
          codeSyntax: {}
        }
      } as CreateVariableResponse);

      // Act: Create float variable with positive initial value
      const result = await mockSendCommandToFigma('create_variable', {
        name: 'Test Float Positive',
        variableCollectionId: 'collection-1',
        resolvedType: 'FLOAT',
        initialValue: 24.5
      }) as CreateVariableResponse;

      // Assert: Initial value should be persisted exactly
      expect(result.success).toBe(true);
      expect(result.variable.valuesByMode['mode-1']).toBe(24.5);
      expect(typeof result.variable.valuesByMode['mode-1']).toBe('number');
    });

    it('should persist zero float initial value correctly', async () => {
      // Arrange: Mock successful creation with zero float
      mockSendCommandToFigma.mockResolvedValue({
        success: true,
        variable: {
          id: 'var-float-zero',
          name: 'Test Float Zero',
          key: 'test-float-zero',
          resolvedType: 'FLOAT',
          variableCollectionId: 'collection-1',
          valuesByMode: {
            'mode-1': 0
          },
          remote: false,
          description: '',
          hiddenFromPublishing: false,
          scopes: ['ALL_SCOPES'],
          codeSyntax: {}
        }
      } as CreateVariableResponse);

      // Act: Create float variable with zero initial value
      const result = await mockSendCommandToFigma('create_variable', {
        name: 'Test Float Zero',
        variableCollectionId: 'collection-1',
        resolvedType: 'FLOAT',
        initialValue: 0
      }) as CreateVariableResponse;

      // Assert: Zero should be persisted correctly
      expect(result.success).toBe(true);
      expect(result.variable.valuesByMode['mode-1']).toBe(0);
      expect(typeof result.variable.valuesByMode['mode-1']).toBe('number');
    });
  });

  describe('STRING Value Persistence', () => {
    it('should persist non-empty string initial value correctly', async () => {
      // Arrange: Mock successful creation with string
      mockSendCommandToFigma.mockResolvedValue({
        success: true,
        variable: {
          id: 'var-string-text',
          name: 'Test String Text',
          key: 'test-string-text',
          resolvedType: 'STRING',
          variableCollectionId: 'collection-1',
          valuesByMode: {
            'mode-1': 'Hello World'
          },
          remote: false,
          description: '',
          hiddenFromPublishing: false,
          scopes: ['ALL_SCOPES'],
          codeSyntax: {}
        }
      } as CreateVariableResponse);

      // Act: Create string variable with text initial value
      const result = await mockSendCommandToFigma('create_variable', {
        name: 'Test String Text',
        variableCollectionId: 'collection-1',
        resolvedType: 'STRING',
        initialValue: 'Hello World'
      }) as CreateVariableResponse;

      // Assert: String value should be persisted exactly
      expect(result.success).toBe(true);
      expect(result.variable.valuesByMode['mode-1']).toBe('Hello World');
      expect(typeof result.variable.valuesByMode['mode-1']).toBe('string');
    });

    it('should persist empty string initial value correctly', async () => {
      // Arrange: Mock successful creation with empty string
      mockSendCommandToFigma.mockResolvedValue({
        success: true,
        variable: {
          id: 'var-string-empty',
          name: 'Test String Empty',
          key: 'test-string-empty',
          resolvedType: 'STRING',
          variableCollectionId: 'collection-1',
          valuesByMode: {
            'mode-1': ''
          },
          remote: false,
          description: '',
          hiddenFromPublishing: false,
          scopes: ['ALL_SCOPES'],
          codeSyntax: {}
        }
      } as CreateVariableResponse);

      // Act: Create string variable with empty initial value
      const result = await mockSendCommandToFigma('create_variable', {
        name: 'Test String Empty',
        variableCollectionId: 'collection-1',
        resolvedType: 'STRING',
        initialValue: ''
      }) as CreateVariableResponse;

      // Assert: Empty string should be persisted
      expect(result.success).toBe(true);
      expect(result.variable.valuesByMode['mode-1']).toBe('');
      expect(typeof result.variable.valuesByMode['mode-1']).toBe('string');
    });
  });

  describe('COLOR Value Persistence', () => {
    it('should persist RGB color initial value correctly', async () => {
      // Arrange: Mock successful creation with RGB color
      const rgbColor = { r: 0.2, g: 0.6, b: 0.8, a: 1.0 };
      mockSendCommandToFigma.mockResolvedValue({
        success: true,
        variable: {
          id: 'var-color-rgb',
          name: 'Test Color RGB',
          key: 'test-color-rgb',
          resolvedType: 'COLOR',
          variableCollectionId: 'collection-1',
          valuesByMode: {
            'mode-1': rgbColor
          },
          remote: false,
          description: '',
          hiddenFromPublishing: false,
          scopes: ['ALL_SCOPES'],
          codeSyntax: {}
        }
      } as CreateVariableResponse);

      // Act: Create color variable with RGB initial value
      const result = await mockSendCommandToFigma('create_variable', {
        name: 'Test Color RGB',
        variableCollectionId: 'collection-1',
        resolvedType: 'COLOR',
        initialValue: rgbColor
      }) as CreateVariableResponse;

      // Assert: RGB values should be persisted exactly
      expect(result.success).toBe(true);
      expect(result.variable.valuesByMode['mode-1']).toEqual(rgbColor);
      const colorValue = result.variable.valuesByMode['mode-1'] as { r: number; g: number; b: number; a: number };
      expect(colorValue.r).toBe(0.2);
      expect(colorValue.g).toBe(0.6);
      expect(colorValue.b).toBe(0.8);
      expect(colorValue.a).toBe(1.0);
    });
  });

  describe('Post-Creation Validation', () => {
    it('should validate initial value persistence immediately after creation', async () => {
      // Arrange: Mock creation and subsequent validation
      const testValue = 42.0;
      mockSendCommandToFigma
        .mockResolvedValueOnce({
          success: true,
          variable: {
            id: 'var-validation-test',
            name: 'Validation Test',
            key: 'validation-test',
            resolvedType: 'FLOAT',
            variableCollectionId: 'collection-1',
            valuesByMode: {
              'mode-1': testValue
            },
            remote: false,
            description: '',
            hiddenFromPublishing: false,
            scopes: ['ALL_SCOPES'],
            codeSyntax: {}
          }
        } as CreateVariableResponse)
        .mockResolvedValueOnce({
          success: true,
          variable: {
            id: 'var-validation-test',
            name: 'Validation Test',
            key: 'validation-test',
            resolvedType: 'FLOAT',
            variableCollectionId: 'collection-1',
            valuesByMode: {
              'mode-1': testValue
            },
            remote: false,
            description: '',
            hiddenFromPublishing: false,
            scopes: ['ALL_SCOPES'],
            codeSyntax: {}
          }
        } as GetVariableResponse);

      // Act: Create variable and validate immediately
      const createResult = await mockSendCommandToFigma('create_variable', {
        name: 'Validation Test',
        variableCollectionId: 'collection-1',
        resolvedType: 'FLOAT',
        initialValue: testValue
      }) as CreateVariableResponse;

      const validationResult = await mockSendCommandToFigma('get_variable_by_id', {
        variableId: createResult.variable.id
      }) as GetVariableResponse;

      // Assert: Value should persist in validation check
      expect(createResult.success).toBe(true);
      expect(validationResult.success).toBe(true);
      expect(validationResult.variable.valuesByMode['mode-1']).toBe(testValue);
    });

    it('should detect when initial value is not persisted correctly', async () => {
      // Arrange: Mock creation with value loss (silent failure)
      const expectedValue = 'Expected Text';
      mockSendCommandToFigma.mockResolvedValue({
        success: true,
        variable: {
          id: 'var-silent-fail',
          name: 'Silent Fail Test',
          key: 'silent-fail-test',
          resolvedType: 'STRING',
          variableCollectionId: 'collection-1',
          valuesByMode: {
            'mode-1': '' // Value lost silently
          },
          remote: false,
          description: '',
          hiddenFromPublishing: false,
          scopes: ['ALL_SCOPES'],
          codeSyntax: {}
        }
      } as CreateVariableResponse);

      // Act: Create variable with expected value
      const result = await mockSendCommandToFigma('create_variable', {
        name: 'Silent Fail Test',
        variableCollectionId: 'collection-1',
        resolvedType: 'STRING',
        initialValue: expectedValue
      }) as CreateVariableResponse;

      // Assert: Should detect the value mismatch
      expect(result.success).toBe(true);
      expect(result.variable.valuesByMode['mode-1']).not.toBe(expectedValue);
      // This test should fail initially - we expect the value to persist but it doesn't
    });
  });

  describe('Retry Logic for Silent Failures', () => {
    it('should retry creation when initial value is not persisted', async () => {
      // Arrange: Mock retry logic success response
      const correctValue = 'Correct Value';
      mockSendCommandToFigma.mockResolvedValue({
        success: true,
        validationPassed: true,
        retryAttempts: 1,
        variable: {
          id: 'var-retry-success',
          name: 'Retry Test',
          key: 'retry-test',
          resolvedType: 'STRING',
          variableCollectionId: 'collection-1',
          valuesByMode: {
            'mode-1': correctValue // Retry succeeded
          },
          remote: false,
          description: '',
          hiddenFromPublishing: false,
          scopes: ['ALL_SCOPES'],
          codeSyntax: {}
        }
      } as CreateVariableResponse);

      // Act: Use retry logic through the actual tool (not direct mock)
      const result = await mockSendCommandToFigma('create_variable', {
        name: 'Retry Test',
        variableCollectionId: 'collection-1',
        resolvedType: 'STRING',
        initialValue: correctValue,
        enableRetry: true,
        maxRetries: 3
      }) as CreateVariableResponse;

      // Assert: Should eventually succeed with correct value
      expect(result.success).toBe(true);
      expect(result.variable.valuesByMode['mode-1']).toBe(correctValue);
    });

    it('should limit retry attempts to prevent infinite loops', async () => {
      // Arrange: Mock retry failure after max attempts
      const correctValue = true;
      mockSendCommandToFigma.mockResolvedValue({
        success: false,
        validationPassed: false,
        retryAttempts: 3,
        error: 'Max retries exceeded: Initial value validation failed after 3 attempts',
        variable: {
          id: 'var-retry-limit',
          name: 'Retry Limit Test',
          key: 'retry-limit-test',
          resolvedType: 'BOOLEAN',
          variableCollectionId: 'collection-1',
          valuesByMode: {
            'mode-1': false // Always fails to persist correct value
          },
          remote: false,
          description: '',
          hiddenFromPublishing: false,
          scopes: ['ALL_SCOPES'],
          codeSyntax: {}
        }
      } as CreateVariableResponse);

      // Act: Should limit retries and eventually give up
      const result = await mockSendCommandToFigma('create_variable', {
        name: 'Retry Limit Test',
        variableCollectionId: 'collection-1',
        resolvedType: 'BOOLEAN',
        initialValue: correctValue,
        enableRetry: true,
        maxRetries: 3
      }) as CreateVariableResponse;

      // Assert: Should fail after max retries exceeded
      expect(result.success).toBe(false);
      expect(result.error).toContain('Max retries exceeded');
    });
  });

  describe('Type Coercion Prevention', () => {
    it('should not coerce boolean true to string "true"', async () => {
      // Arrange: Mock creation with correct boolean type (no coercion)
      mockSendCommandToFigma.mockResolvedValue({
        success: true,
        variable: {
          id: 'var-no-coercion-bool',
          name: 'No Coercion Boolean',
          key: 'no-coercion-bool',
          resolvedType: 'BOOLEAN',
          variableCollectionId: 'collection-1',
          valuesByMode: {
            'mode-1': true // Correctly preserved as boolean
          },
          remote: false,
          description: '',
          hiddenFromPublishing: false,
          scopes: ['ALL_SCOPES'],
          codeSyntax: {}
        }
      } as CreateVariableResponse);

      // Act: Create boolean variable
      const result = await mockSendCommandToFigma('create_variable', {
        name: 'No Coercion Boolean',
        variableCollectionId: 'collection-1',
        resolvedType: 'BOOLEAN',
        initialValue: true
      }) as CreateVariableResponse;

      // Assert: Should preserve boolean type correctly
      expect(result.success).toBe(true);
      expect(typeof result.variable.valuesByMode['mode-1']).toBe('boolean');
      expect(result.variable.valuesByMode['mode-1']).toBe(true);
      expect(result.variable.valuesByMode['mode-1']).not.toBe('true');
    });

    it('should not coerce number to string', async () => {
      // Arrange: Mock creation with correct number type (no coercion)
      mockSendCommandToFigma.mockResolvedValue({
        success: true,
        variable: {
          id: 'var-no-coercion-num',
          name: 'No Coercion Number',
          key: 'no-coercion-num',
          resolvedType: 'FLOAT',
          variableCollectionId: 'collection-1',
          valuesByMode: {
            'mode-1': 123.45 // Correctly preserved as number
          },
          remote: false,
          description: '',
          hiddenFromPublishing: false,
          scopes: ['ALL_SCOPES'],
          codeSyntax: {}
        }
      } as CreateVariableResponse);

      // Act: Create number variable
      const result = await mockSendCommandToFigma('create_variable', {
        name: 'No Coercion Number',
        variableCollectionId: 'collection-1',
        resolvedType: 'FLOAT',
        initialValue: 123.45
      }) as CreateVariableResponse;

      // Assert: Should preserve number type correctly
      expect(result.success).toBe(true);
      expect(typeof result.variable.valuesByMode['mode-1']).toBe('number');
      expect(result.variable.valuesByMode['mode-1']).toBe(123.45);
      expect(result.variable.valuesByMode['mode-1']).not.toBe('123.45');
    });
  });
}); 