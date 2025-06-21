/**
 * Paint Binding Validation Utilities for Task 1.15
 * 
 * This module provides specialized validation and helper functions for paint variable binding,
 * addressing the critical issues identified in the emergency fix phase:
 * - Multiple paint layer support
 * - Enhanced error messaging
 * - Paint compatibility validation
 * - Performance optimization for paint operations
 */

import { sendCommandToFigma } from './websocket.js';
import { getVariableOperationTimeout } from './timeout-config.js';

/**
 * Supported paint types for variable binding
 */
export type PaintType = 'fills' | 'strokes';

/**
 * Paint binding validation result
 */
export interface PaintBindingValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  supportedLayers: number;
  recommendedIndex?: number;
}

/**
 * Enhanced paint binding parameters with validation
 */
export interface ValidatedPaintBindingParams {
  nodeId: string;
  paintType: PaintType;
  paintIndex: number;
  variableId: string;
  variableType?: string;
  maxLayers?: number;
  validateLayers?: boolean;
}

/**
 * Validate paint binding compatibility and layer support
 * 
 * CRITICAL FIX: Addresses multiple paint layer support and enhanced validation
 * 
 * @param params - Paint binding parameters to validate
 * @returns Validation result with detailed feedback
 */
export async function validatePaintBinding(
  params: ValidatedPaintBindingParams
): Promise<PaintBindingValidationResult> {
  const result: PaintBindingValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    supportedLayers: 0
  };

  try {
    // CRITICAL FIX 1: Validate basic parameters
    if (!params.nodeId || typeof params.nodeId !== 'string') {
      result.errors.push('Node ID is required and must be a string');
      result.isValid = false;
    }

    if (!params.paintType || !['fills', 'strokes'].includes(params.paintType)) {
      result.errors.push('Paint type must be "fills" or "strokes"');
      result.isValid = false;
    }

    if (params.paintIndex < 0) {
      result.errors.push(`Paint index must be non-negative, got: ${params.paintIndex}`);
      result.isValid = false;
    }

    if (!params.variableId || typeof params.variableId !== 'string') {
      result.errors.push('Variable ID is required and must be a string');
      result.isValid = false;
    }

    // Early return if basic validation fails
    if (!result.isValid) {
      return result;
    }

    // CRITICAL FIX 2: Validate variable type for paint binding
    if (params.variableType && params.variableType !== 'COLOR') {
      result.errors.push(`Only COLOR variables can be bound to paint properties, got: ${params.variableType}`);
      result.isValid = false;
      return result;
    }

    // CRITICAL FIX 3: Validate paint layer support if requested
    if (params.validateLayers !== false) {
      try {
        const nodeInfo = await sendCommandToFigma('get_node_info', { 
          nodeId: params.nodeId 
        }, 3000) as any;

        if (nodeInfo && nodeInfo.node) {
          const node = nodeInfo.node;
          
          // Check if node supports the requested paint type
          const supportsPaint = params.paintType === 'fills' ? 
            ('fills' in node || node.type !== 'GROUP') : 
            ('strokes' in node || node.type !== 'TEXT');

          if (!supportsPaint) {
            result.errors.push(`Node type ${node.type || 'UNKNOWN'} does not support ${params.paintType} properties`);
            result.isValid = false;
            return result;
          }

          // Get current paint layers
          const currentPaints = node[params.paintType] || [];
          result.supportedLayers = Math.max(currentPaints.length, 3); // Support at least 3 layers

          // CRITICAL FIX 4: Validate paint index is within reasonable range
          if (params.paintIndex >= result.supportedLayers) {
            if (currentPaints.length > 0 && params.paintIndex >= currentPaints.length) {
              result.errors.push(
                `Paint index ${params.paintIndex} is out of range for this node. ` +
                `Current ${params.paintType} layers: ${currentPaints.length} (max index: ${currentPaints.length - 1})`
              );
              result.isValid = false;
            } else {
              result.warnings.push(
                `Paint index ${params.paintIndex} will create a new paint layer. ` +
                `Current layers: ${currentPaints.length}`
              );
              result.recommendedIndex = currentPaints.length;
            }
          }

          // CRITICAL FIX 5: Provide recommendations for optimal paint binding
          if (currentPaints.length === 0 && params.paintIndex > 0) {
            result.warnings.push(
              `Recommended to use paint index 0 for the first ${params.paintType} layer`
            );
            result.recommendedIndex = 0;
          }

        } else {
          result.warnings.push('Could not validate paint layer support - node information unavailable');
        }

      } catch (nodeError) {
        result.warnings.push(`Could not validate node paint support: ${nodeError instanceof Error ? nodeError.message : String(nodeError)}`);
      }
    }

  } catch (error) {
    result.errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
    result.isValid = false;
  }

  return result;
}

/**
 * Create enhanced error messages for paint binding failures
 * 
 * CRITICAL FIX: Provides specific, helpful error messages instead of generic ones
 * 
 * @param error - The original error
 * @param params - Paint binding parameters for context
 * @returns Enhanced error message with specific guidance
 */
export function createEnhancedPaintErrorMessage(
  error: Error | string,
  params: Partial<ValidatedPaintBindingParams>
): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  let enhancedMessage = `Paint binding failed: ${errorMessage}`;

  // CRITICAL FIX 6: Specific error message enhancements
  if (errorMessage.includes('out of range') || errorMessage.includes('index')) {
    enhancedMessage += `. Paint index ${params.paintIndex || 'unknown'} may be out of range for this node's ${params.paintType || 'paint'} layers.`;
    enhancedMessage += ` Try using a lower index (0-2) or check the node's current paint configuration.`;
  } else if (errorMessage.includes('not support') || errorMessage.includes('incompatible')) {
    enhancedMessage += `. This node type may not support ${params.paintType || 'paint'} binding.`;
    enhancedMessage += ` Only shapes, frames, and components typically support paint variable binding.`;
  } else if (errorMessage.includes('COLOR variable') || errorMessage.includes('type')) {
    enhancedMessage += ` Only COLOR variables can be bound to paint properties.`;
    enhancedMessage += ` Make sure you're using a COLOR variable, not STRING, FLOAT, or BOOLEAN.`;
  } else if (errorMessage.includes('timed out')) {
    enhancedMessage += ` The operation timed out, which may indicate network issues or a complex node structure.`;
    enhancedMessage += ` Try again or simplify the node if possible.`;
  } else if (errorMessage.includes('not found')) {
    if (errorMessage.includes('node')) {
      enhancedMessage += ` The specified node ID "${params.nodeId || 'unknown'}" was not found in the current document.`;
    } else if (errorMessage.includes('variable')) {
      enhancedMessage += ` The specified variable ID "${params.variableId || 'unknown'}" was not found.`;
    }
  }

  return enhancedMessage;
}

/**
 * Execute paint binding with retry logic and enhanced error handling
 * 
 * CRITICAL FIX: Provides retry logic for paint binding operations
 * 
 * @param params - Paint binding parameters
 * @param options - Execution options
 * @returns Promise resolving to binding result
 */
export async function executePaintBindingWithRetry(
  params: ValidatedPaintBindingParams,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    validateFirst?: boolean;
  } = {}
): Promise<any> {
  const {
    maxRetries = 2,
    retryDelay = 1000,
    validateFirst = true
  } = options;

  // CRITICAL FIX 7: Pre-validation to catch issues early
  if (validateFirst) {
    const validation = await validatePaintBinding(params);
    if (!validation.isValid) {
      throw new Error(`Paint binding validation failed: ${validation.errors.join(', ')}`);
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn('Paint binding warnings:', validation.warnings.join(', '));
    }
  }

  let lastError: Error | null = null;
  const startTime = Date.now();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // CRITICAL FIX 8: Use optimized timeout for paint operations
      const timeout = getVariableOperationTimeout('SET_BOUND_PAINT', {
        isComplex: attempt > 0 // Increase timeout for retries
      });

      const result = await sendCommandToFigma('set_bound_variable_for_paint', {
        ...params,
        _startTime: startTime,
        _attempt: attempt + 1
      }, timeout);

      // Success - return result with performance metrics
      return {
        ...(typeof result === 'object' && result !== null ? result : {}),
        performance: {
          executionTimeMs: Date.now() - startTime,
          attempts: attempt + 1,
          timeoutOptimized: true
        }
      };

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry for certain types of errors
      if (
        lastError.message.includes('not found') ||
        lastError.message.includes('COLOR variable required') ||
        lastError.message.includes('not support')
      ) {
        break; // These are not transient errors
      }

      // Wait before retry (except on last attempt)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }

  // All retries failed - throw enhanced error
  throw new Error(createEnhancedPaintErrorMessage(lastError!, params));
}

/**
 * Get paint binding recommendations for optimal performance
 * 
 * @param nodeId - Target node ID
 * @param paintType - Type of paint to bind
 * @returns Recommendations for paint binding
 */
export async function getPaintBindingRecommendations(
  nodeId: string,
  paintType: PaintType
): Promise<{
  recommendedIndex: number;
  maxSupportedLayers: number;
  currentLayers: number;
  tips: string[];
}> {
  const tips: string[] = [];
  
  try {
    const nodeInfo = await sendCommandToFigma('get_node_info', { nodeId }, 3000) as any;
    const node = nodeInfo?.node;
    
    if (!node) {
      return {
        recommendedIndex: 0,
        maxSupportedLayers: 1,
        currentLayers: 0,
        tips: ['Could not retrieve node information']
      };
    }

    const currentPaints = node[paintType] || [];
    const currentLayers = currentPaints.length;
    const maxSupportedLayers = Math.max(currentLayers, 3); // Support at least 3 layers

    let recommendedIndex = currentLayers; // Add to end by default

    // CRITICAL FIX 9: Provide intelligent recommendations
    if (currentLayers === 0) {
      recommendedIndex = 0;
      tips.push('Start with index 0 for the first paint layer');
    } else if (currentLayers < 3) {
      tips.push(`You can add up to ${3 - currentLayers} more ${paintType} layers`);
    } else {
      tips.push(`Node has ${currentLayers} ${paintType} layers - consider optimizing for performance`);
    }

    // Node-specific tips
    if (node.type === 'FRAME' || node.type === 'COMPONENT') {
      tips.push('Frames and components support multiple paint layers efficiently');
    } else if (node.type === 'TEXT' && paintType === 'strokes') {
      tips.push('Text nodes have limited stroke support - consider using fills instead');
    }

    return {
      recommendedIndex,
      maxSupportedLayers,
      currentLayers,
      tips
    };

  } catch (error) {
    return {
      recommendedIndex: 0,
      maxSupportedLayers: 1,
      currentLayers: 0,
      tips: [`Could not get recommendations: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
} 