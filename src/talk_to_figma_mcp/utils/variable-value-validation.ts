/**
 * Variable Value Validation Utilities - Task 1.14
 * 
 * Utilities for:
 * - Initial value persistence validation
 * - Type coercion prevention
 * - Retry logic for silent failures
 * - Post-creation validation
 * 
 * @since 1.14.0
 * @category Variables
 * @phase 1
 */

import { VariableDataType, VariableValue, CreateVariableParams } from '../types/index.js';
import { sendCommandToFigma } from './websocket.js';
import { logger } from './logger.js';

// Constants for validation
const FLOAT_PRECISION = 0.001;
const DEFAULT_MAX_RETRIES = 3;
const RETRY_BACKOFF_BASE = 100; // milliseconds

/**
 * Validates that a variable value matches the expected type
 * 
 * @param value - The value to validate
 * @param expectedType - The expected variable data type
 * @returns True if the value matches the expected type
 */
export function validateValueType(value: VariableValue, expectedType: VariableDataType): boolean {
  switch (expectedType) {
    case 'BOOLEAN':
      return typeof value === 'boolean';
    case 'FLOAT':
      return typeof value === 'number' && !isNaN(value);
    case 'STRING':
      return typeof value === 'string';
    case 'COLOR':
      return (
        typeof value === 'object' &&
        value !== null &&
        'r' in value &&
        'g' in value &&
        'b' in value &&
        'a' in value &&
        typeof value.r === 'number' &&
        typeof value.g === 'number' &&
        typeof value.b === 'number' &&
        typeof value.a === 'number'
      );
    default:
      return false;
  }
}

/**
 * Validates that the initial value was persisted correctly after variable creation
 * 
 * @param expectedValue - The expected initial value
 * @param actualValue - The actual value found in the variable
 * @param variableType - The variable's data type
 * @returns Validation result with success status and optional error message
 */
export function validateInitialValuePersistence(
  expectedValue: VariableValue | undefined,
  actualValue: VariableValue,
  variableType: VariableDataType
): { isValid: boolean; error?: string } {
  // If no initial value was provided, use type defaults
  if (expectedValue === undefined || expectedValue === null) {
    const defaultValue = getDefaultValueForType(variableType);
    return {
      isValid: valuesEqual(actualValue, defaultValue, variableType),
      error: valuesEqual(actualValue, defaultValue, variableType) 
        ? undefined 
        : `Expected default value ${JSON.stringify(defaultValue)} but got ${JSON.stringify(actualValue)}`
    };
  }

  // Check if values match exactly
  if (!valuesEqual(actualValue, expectedValue, variableType)) {
    return {
      isValid: false,
      error: `Initial value not persisted. Expected: ${JSON.stringify(expectedValue)}, Got: ${JSON.stringify(actualValue)}`
    };
  }

  // Check for type coercion
  if (!validateValueType(actualValue, variableType)) {
    return {
      isValid: false,
      error: `Type coercion detected. Expected type: ${variableType}, Got: ${typeof actualValue} (${JSON.stringify(actualValue)})`
    };
  }

  return { isValid: true };
}

/**
 * Compares two variable values for equality, considering type-specific rules
 * 
 * @param value1 - First value to compare
 * @param value2 - Second value to compare
 * @param type - The variable data type for comparison rules
 * @returns True if values are considered equal for the given type
 */
function valuesEqual(value1: VariableValue, value2: VariableValue, type: VariableDataType): boolean {
  if (type === 'COLOR') {
    if (typeof value1 !== 'object' || typeof value2 !== 'object' || 
        value1 === null || value2 === null) {
      return false;
    }
    const color1 = value1 as { r: number; g: number; b: number; a: number };
    const color2 = value2 as { r: number; g: number; b: number; a: number };
    return (
      Math.abs(color1.r - color2.r) < FLOAT_PRECISION &&
      Math.abs(color1.g - color2.g) < FLOAT_PRECISION &&
      Math.abs(color1.b - color2.b) < FLOAT_PRECISION &&
      Math.abs(color1.a - color2.a) < FLOAT_PRECISION
    );
  }

  if (type === 'FLOAT' && typeof value1 === 'number' && typeof value2 === 'number') {
    return Math.abs(value1 - value2) < FLOAT_PRECISION;
  }

  return value1 === value2;
}

/**
 * Gets the default value for a variable type
 * 
 * @param type - The variable data type
 * @returns The default value for the specified type
 * @throws Error if the type is unknown
 */
function getDefaultValueForType(type: VariableDataType): VariableValue {
  switch (type) {
    case 'BOOLEAN':
      return false;
    case 'FLOAT':
      return 0;
    case 'STRING':
      return '';
    case 'COLOR':
      return { r: 0, g: 0, b: 0, a: 1 };
    default:
      throw new Error(`Unknown variable type: ${type}`);
  }
}

/**
 * Creates a variable with retry logic for initial value persistence
 * 
 * This function implements robust variable creation with automatic retry
 * when initial values are not persisted correctly. It includes validation,
 * exponential backoff, and cleanup of failed attempts.
 * 
 * @param params - Variable creation parameters with retry options
 * @returns Promise resolving to creation result with validation info
 */
export async function createVariableWithRetry(params: CreateVariableParams): Promise<any> {
  const maxRetries = params.maxRetries || DEFAULT_MAX_RETRIES;
  const enableRetry = params.enableRetry || false;
  
  let lastError: string | undefined;
  let retryCount = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Creating variable "${params.name}" (attempt ${attempt + 1}/${maxRetries + 1})`);
      
      // Create the variable
      const result = await sendCommandToFigma('create_variable', {
        name: params.name,
        variableCollectionId: params.variableCollectionId,
        resolvedType: params.resolvedType,
        initialValue: params.initialValue,
        description: params.description,
        scopes: params.scopes
      });

      if (!result || !(result as any).success) {
        lastError = (result as any)?.error || 'Unknown error during variable creation';
        if (!enableRetry || attempt === maxRetries) {
          throw new Error(lastError);
        }
        retryCount++;
        logger.warn(`Variable creation failed (attempt ${attempt + 1}): ${lastError}`);
        continue;
      }

      // Validate initial value persistence
      const variable = (result as any).variable;
      if (!variable || !variable.valuesByMode) {
        lastError = 'Variable created but no valuesByMode found';
        if (!enableRetry || attempt === maxRetries) {
          throw new Error(lastError);
        }
        retryCount++;
        logger.warn(`Value persistence validation failed (attempt ${attempt + 1}): ${lastError}`);
        continue;
      }

      // Get the first mode value for validation
      const modeIds = Object.keys(variable.valuesByMode);
      if (modeIds.length === 0) {
        lastError = 'Variable created but no mode values found';
        if (!enableRetry || attempt === maxRetries) {
          throw new Error(lastError);
        }
        retryCount++;
        logger.warn(`No mode values found (attempt ${attempt + 1}): ${lastError}`);
        continue;
      }

      const actualValue = variable.valuesByMode[modeIds[0]];
      const validation = validateInitialValuePersistence(
        params.initialValue,
        actualValue,
        params.resolvedType
      );

      if (!validation.isValid) {
        lastError = validation.error || 'Initial value validation failed';
        if (!enableRetry || attempt === maxRetries) {
          // For the last attempt, return the result but mark validation as failed
          return {
            ...result,
            validationPassed: false,
            retryAttempts: retryCount,
            error: lastError
          };
        }
        retryCount++;
        logger.warn(`Initial value validation failed (attempt ${attempt + 1}): ${lastError}`);
        
        // Delete the failed variable before retrying
        try {
          await sendCommandToFigma('delete_variable', { variableId: variable.id });
        } catch (deleteError) {
          logger.warn(`Failed to delete invalid variable: ${deleteError}`);
        }
        continue;
      }

      // Success!
      logger.info(`Variable "${params.name}" created successfully with correct initial value`);
      return {
        ...result,
        validationPassed: true,
        retryAttempts: retryCount
      };

    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (!enableRetry || attempt === maxRetries) {
        break;
      }
      retryCount++;
      logger.warn(`Variable creation error (attempt ${attempt + 1}): ${lastError}`);
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * RETRY_BACKOFF_BASE));
    }
  }

  // All attempts failed
  return {
    success: false,
    error: `Max retries exceeded: ${lastError}`,
    retryAttempts: retryCount,
    validationPassed: false
  };
}

/**
 * Post-creation validation by re-fetching the variable
 * 
 * This function validates that a variable's initial value was properly
 * persisted by re-fetching it from Figma and comparing values.
 * 
 * @param variableId - The ID of the variable to validate
 * @param expectedValue - The expected initial value
 * @param variableType - The variable's data type
 * @returns Promise resolving to validation result
 */
export async function validateVariablePostCreation(
  variableId: string, 
  expectedValue: VariableValue | undefined, 
  variableType: VariableDataType
): Promise<{ isValid: boolean; error?: string }> {
  try {
    const result = await sendCommandToFigma('get_variable_by_id', { variableId });
    
    if (!result || !(result as any).success || !(result as any).variable) {
      return {
        isValid: false,
        error: 'Failed to fetch variable for post-creation validation'
      };
    }

    const variable = (result as any).variable;
    const modeIds = Object.keys(variable.valuesByMode);
    if (modeIds.length === 0) {
      return {
        isValid: false,
        error: 'No mode values found in post-creation validation'
      };
    }

    const actualValue = variable.valuesByMode[modeIds[0]];
    return validateInitialValuePersistence(expectedValue, actualValue, variableType);
    
  } catch (error) {
    return {
      isValid: false,
      error: `Post-creation validation error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
} 