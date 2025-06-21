/**
 * Variable Modification Optimization Utilities - Task 1.16
 * 
 * Provides optimizations for variable modification operations:
 * - Timeout optimization for update_variable_value and set_variable_mode_value
 * - Batch operations for remove_bound_variable
 * - WebSocket communication optimization
 * - Enhanced error handling with specific messages
 */

import { logger } from './logger.js';
import { sendCommandToFigma } from './websocket.js';
import { VARIABLE_OPERATION_TIMEOUTS, getVariableOperationTimeout } from './timeout-config.js';

/**
 * Optimized timeout configuration for variable modification operations
 */
export const MODIFICATION_OPERATION_TIMEOUTS = {
  UPDATE_VARIABLE_VALUE: 3000,        // Optimized from 30s generic
  SET_VARIABLE_MODE_VALUE: 3500,      // Mode-specific optimization
  REMOVE_BOUND_VARIABLE: 2500,        // Single removal operation
  REMOVE_BOUND_VARIABLE_BATCH: 4000,  // Batch operation with multiplier
} as const;

/**
 * Batch operation configuration
 */
export const BATCH_CONFIG = {
  MAX_BATCH_SIZE: 50,
  OPTIMAL_BATCH_SIZE: 10,
  BATCH_TIMEOUT_MULTIPLIER: 1.5,
  PER_OPERATION_MS: 200,
} as const;

/**
 * Enhanced error messages for variable modification operations
 */
export const MODIFICATION_ERROR_MESSAGES = {
  VARIABLE_NOT_FOUND: 'Variable not found. The variable ID may not exist or may have been deleted.',
  TYPE_MISMATCH: 'Type mismatch. The value type may not match the variable\'s expected type.',
  MODE_NOT_FOUND: 'Mode not found. The specified mode ID may not exist in this variable\'s collection.',
  VALUE_EXISTS: 'Value already exists. Set overwriteExisting to true to replace the existing value.',
  PERMISSION_DENIED: 'Permission denied. You may not have edit permissions for this variable or collection.',
  VALIDATION_ERROR: 'Validation error. Please check that all required parameters are provided and valid.',
  TIMEOUT_ERROR: 'Operation timed out. Consider breaking large operations into smaller batches.',
  COLLECTION_LOCKED: 'Collection locked. The variable collection may be published or locked for editing.',
  NODE_NOT_FOUND: 'Node not found. The specified node ID may not exist or may have been deleted.',
  PROPERTY_INCOMPATIBLE: 'Property incompatible. The node property may not support variable binding.',
} as const;

/**
 * Interface for batch remove operation
 */
export interface BatchRemoveOperation {
  nodeId: string;
  property?: string;
  paintType?: 'fills' | 'strokes';
  paintIndex?: number;
  forceCleanup?: boolean;
}

/**
 * Interface for batch remove result
 */
export interface BatchRemoveResult {
  success: boolean;
  results: Array<{
    nodeId: string;
    property?: string;
    paintType?: 'fills' | 'strokes';
    paintIndex?: number;
    success: boolean;
    error?: string;
    index: number;
  }>;
  performance: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    batchOptimized: boolean;
    executionTimeMs: number;
    averageTimePerOperation: number;
  };
  errors?: string[];
}

/**
 * Get optimized timeout for variable modification operations
 */
export function getModificationOperationTimeout(
  operation: keyof typeof MODIFICATION_OPERATION_TIMEOUTS,
  options: {
    operationCount?: number;
    isBatch?: boolean;
    isComplex?: boolean;
  } = {}
): number {
  const { operationCount = 1, isBatch = false, isComplex = false } = options;
  
  let baseTimeout = MODIFICATION_OPERATION_TIMEOUTS[operation];
  
  // Apply batch multiplier
  if (isBatch && operationCount > 1) {
    baseTimeout = MODIFICATION_OPERATION_TIMEOUTS.REMOVE_BOUND_VARIABLE_BATCH;
    baseTimeout += (operationCount - 1) * BATCH_CONFIG.PER_OPERATION_MS;
    baseTimeout *= BATCH_CONFIG.BATCH_TIMEOUT_MULTIPLIER;
  }
  
  // Apply complexity multiplier
  if (isComplex) {
    baseTimeout *= 1.3;
  }
  
  // Ensure within reasonable bounds
  const maxTimeout = 15000; // 15 seconds max for modifications
  const minTimeout = 1000;  // 1 second min
  
  return Math.max(minTimeout, Math.min(maxTimeout, baseTimeout));
}

/**
 * Create enhanced error message for modification operations
 */
export function createModificationErrorMessage(
  operation: string,
  error: Error,
  context: Record<string, any> = {}
): string {
  const baseMessage = `Error in ${operation}`;
  const errorMessage = error.message.toLowerCase();
  
  // Check for specific error patterns
  if (errorMessage.includes('variable') && errorMessage.includes('not found')) {
    return `${baseMessage}: ${MODIFICATION_ERROR_MESSAGES.VARIABLE_NOT_FOUND}`;
  }
  
  if (errorMessage.includes('type') && (errorMessage.includes('mismatch') || errorMessage.includes('incompatible'))) {
    return `${baseMessage}: ${MODIFICATION_ERROR_MESSAGES.TYPE_MISMATCH}`;
  }
  
  if (errorMessage.includes('mode') && errorMessage.includes('not found')) {
    return `${baseMessage}: ${MODIFICATION_ERROR_MESSAGES.MODE_NOT_FOUND}`;
  }
  
  if (errorMessage.includes('value') && errorMessage.includes('exists')) {
    return `${baseMessage}: ${MODIFICATION_ERROR_MESSAGES.VALUE_EXISTS}`;
  }
  
  if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
    return `${baseMessage}: ${MODIFICATION_ERROR_MESSAGES.PERMISSION_DENIED}`;
  }
  
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return `${baseMessage}: ${MODIFICATION_ERROR_MESSAGES.TIMEOUT_ERROR}`;
  }
  
  if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    return `${baseMessage}: ${MODIFICATION_ERROR_MESSAGES.VALIDATION_ERROR}`;
  }
  
  if (errorMessage.includes('locked') || errorMessage.includes('published')) {
    return `${baseMessage}: ${MODIFICATION_ERROR_MESSAGES.COLLECTION_LOCKED}`;
  }
  
  if (errorMessage.includes('node') && errorMessage.includes('not found')) {
    return `${baseMessage}: ${MODIFICATION_ERROR_MESSAGES.NODE_NOT_FOUND}`;
  }
  
  if (errorMessage.includes('property') && errorMessage.includes('incompatible')) {
    return `${baseMessage}: ${MODIFICATION_ERROR_MESSAGES.PROPERTY_INCOMPATIBLE}`;
  }
  
  // Add context information if available
  let contextInfo = '';
  if (context.variableId) {
    contextInfo += ` Variable ID: ${context.variableId}.`;
  }
  if (context.nodeId) {
    contextInfo += ` Node ID: ${context.nodeId}.`;
  }
  if (context.modeId) {
    contextInfo += ` Mode ID: ${context.modeId}.`;
  }
  
  return `${baseMessage}: ${error.message}${contextInfo}`;
}

/**
 * Execute optimized update_variable_value operation
 */
export async function executeOptimizedUpdateVariableValue(
  params: {
    variableId: string;
    value: any;
    modeId?: string;
    validateType?: boolean;
    description?: string;
  }
): Promise<any> {
  const startTime = Date.now();
  
  try {
    // Use optimized timeout
    const timeout = getModificationOperationTimeout('UPDATE_VARIABLE_VALUE');
    
    logger.info(`Executing optimized update_variable_value for ${params.variableId} with ${timeout}ms timeout`);
    
    const result = await sendCommandToFigma('update_variable_value', params, timeout);
    
    const executionTime = Date.now() - startTime;
    
    // Add performance metrics to response
    return {
      ...result,
      performance: {
        ...result.performance,
        executionTimeMs: executionTime,
        timeoutOptimized: true,
        operationTimeout: timeout,
        optimizationVersion: 'v1.16'
      }
    };
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const enhancedMessage = createModificationErrorMessage(
      'update_variable_value',
      error as Error,
      { variableId: params.variableId, modeId: params.modeId }
    );
    
    logger.error(`update_variable_value failed after ${executionTime}ms: ${enhancedMessage}`);
    throw new Error(enhancedMessage);
  }
}

/**
 * Execute optimized set_variable_mode_value operation
 */
export async function executeOptimizedSetVariableModeValue(
  params: {
    variableId: string;
    modeId: string;
    value: any;
    validateType?: boolean;
    overwriteExisting?: boolean;
  }
): Promise<any> {
  const startTime = Date.now();
  
  try {
    // Use mode-specific optimized timeout
    const timeout = getModificationOperationTimeout('SET_VARIABLE_MODE_VALUE');
    
    logger.info(`Executing optimized set_variable_mode_value for ${params.variableId}:${params.modeId} with ${timeout}ms timeout`);
    
    const result = await sendCommandToFigma('set_variable_mode_value', params, timeout);
    
    const executionTime = Date.now() - startTime;
    
    // Add performance metrics to response
    return {
      ...result,
      performance: {
        ...result.performance,
        executionTimeMs: executionTime,
        timeoutOptimized: true,
        operationTimeout: timeout,
        modeSpecificOptimization: true,
        optimizationVersion: 'v1.16'
      }
    };
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const enhancedMessage = createModificationErrorMessage(
      'set_variable_mode_value',
      error as Error,
      { variableId: params.variableId, modeId: params.modeId }
    );
    
    logger.error(`set_variable_mode_value failed after ${executionTime}ms: ${enhancedMessage}`);
    throw new Error(enhancedMessage);
  }
}

/**
 * Execute batch remove_bound_variable operations
 */
export async function executeBatchRemoveBoundVariable(
  operations: BatchRemoveOperation[]
): Promise<BatchRemoveResult> {
  const startTime = Date.now();
  
  if (operations.length === 0) {
    throw new Error('Batch operations array cannot be empty');
  }
  
  if (operations.length > BATCH_CONFIG.MAX_BATCH_SIZE) {
    throw new Error(`Batch size ${operations.length} exceeds maximum ${BATCH_CONFIG.MAX_BATCH_SIZE}`);
  }
  
  try {
    // Use batch-optimized timeout
    const timeout = getModificationOperationTimeout('REMOVE_BOUND_VARIABLE_BATCH', {
      operationCount: operations.length,
      isBatch: true
    });
    
    logger.info(`Executing batch remove_bound_variable for ${operations.length} operations with ${timeout}ms timeout`);
    
    // Execute batch operation
    const result = await sendCommandToFigma('remove_bound_variable_batch', {
      operations
    }, timeout);
    
    const executionTime = Date.now() - startTime;
    const averageTimePerOperation = executionTime / operations.length;
    
    // Process results
    const successfulOperations = result.results?.filter((r: any) => r.success).length || 0;
    const failedOperations = operations.length - successfulOperations;
    
    return {
      success: result.success,
      results: result.results || [],
      performance: {
        totalOperations: operations.length,
        successfulOperations,
        failedOperations,
        batchOptimized: true,
        executionTimeMs: executionTime,
        averageTimePerOperation
      },
      errors: result.errors || []
    };
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const enhancedMessage = createModificationErrorMessage(
      'remove_bound_variable_batch',
      error as Error,
      { operationCount: operations.length }
    );
    
    logger.error(`Batch remove_bound_variable failed after ${executionTime}ms: ${enhancedMessage}`);
    throw new Error(enhancedMessage);
  }
}

/**
 * Execute single remove_bound_variable operation with optimization
 */
export async function executeOptimizedRemoveBoundVariable(
  params: {
    nodeId: string;
    property?: string;
    paintType?: 'fills' | 'strokes';
    paintIndex?: number;
    forceCleanup?: boolean;
    removeAllBindings?: boolean;
  }
): Promise<any> {
  const startTime = Date.now();
  
  try {
    // Use optimized timeout for single operation
    const timeout = getModificationOperationTimeout('REMOVE_BOUND_VARIABLE');
    
    logger.info(`Executing optimized remove_bound_variable for ${params.nodeId} with ${timeout}ms timeout`);
    
    const result = await sendCommandToFigma('remove_bound_variable', params, timeout);
    
    const executionTime = Date.now() - startTime;
    
    // Add performance metrics to response
    return {
      ...result,
      performance: {
        ...result.performance,
        executionTimeMs: executionTime,
        timeoutOptimized: true,
        operationTimeout: timeout,
        optimizationVersion: 'v1.16'
      }
    };
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const enhancedMessage = createModificationErrorMessage(
      'remove_bound_variable',
      error as Error,
      { nodeId: params.nodeId, property: params.property }
    );
    
    logger.error(`remove_bound_variable failed after ${executionTime}ms: ${enhancedMessage}`);
    throw new Error(enhancedMessage);
  }
}

/**
 * Optimize batch size for remove operations
 */
export function optimizeBatchSize(totalOperations: number): number[] {
  if (totalOperations <= BATCH_CONFIG.OPTIMAL_BATCH_SIZE) {
    return [totalOperations];
  }
  
  const batches: number[] = [];
  let remaining = totalOperations;
  
  while (remaining > 0) {
    const batchSize = Math.min(remaining, BATCH_CONFIG.OPTIMAL_BATCH_SIZE);
    batches.push(batchSize);
    remaining -= batchSize;
  }
  
  return batches;
}

/**
 * Execute multiple batches of remove operations
 */
export async function executeMultipleBatchRemoveOperations(
  operations: BatchRemoveOperation[]
): Promise<BatchRemoveResult> {
  if (operations.length <= BATCH_CONFIG.OPTIMAL_BATCH_SIZE) {
    return executeBatchRemoveBoundVariable(operations);
  }
  
  const batchSizes = optimizeBatchSize(operations.length);
  const allResults: any[] = [];
  let totalExecutionTime = 0;
  let totalSuccessful = 0;
  let totalFailed = 0;
  const allErrors: string[] = [];
  
  let operationIndex = 0;
  
  for (const batchSize of batchSizes) {
    const batchOperations = operations.slice(operationIndex, operationIndex + batchSize);
    
    try {
      const batchResult = await executeBatchRemoveBoundVariable(batchOperations);
      
      allResults.push(...batchResult.results);
      totalExecutionTime += batchResult.performance.executionTimeMs;
      totalSuccessful += batchResult.performance.successfulOperations;
      totalFailed += batchResult.performance.failedOperations;
      
      if (batchResult.errors) {
        allErrors.push(...batchResult.errors);
      }
      
    } catch (error) {
      // Handle batch failure
      const failedResults = batchOperations.map((op, index) => ({
        nodeId: op.nodeId,
        property: op.property,
        paintType: op.paintType,
        paintIndex: op.paintIndex,
        success: false,
        error: (error as Error).message,
        index: operationIndex + index
      }));
      
      allResults.push(...failedResults);
      totalFailed += batchOperations.length;
      allErrors.push((error as Error).message);
    }
    
    operationIndex += batchSize;
  }
  
  return {
    success: totalFailed === 0,
    results: allResults,
    performance: {
      totalOperations: operations.length,
      successfulOperations: totalSuccessful,
      failedOperations: totalFailed,
      batchOptimized: true,
      executionTimeMs: totalExecutionTime,
      averageTimePerOperation: totalExecutionTime / operations.length
    },
    errors: allErrors.length > 0 ? allErrors : undefined
  };
} 