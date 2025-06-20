import { Color, ColorWithDefaults } from '../types/color.js';

export const FIGMA_DEFAULTS = {
  color: {
    opacity: 1,
  },
  stroke: {
    weight: 1,
  }
} as const;

export function applyDefault<T>(value: T | undefined, defaultValue: T): T {
  return value !== undefined ? value : defaultValue;
}

export function applyColorDefaults(color: Color): ColorWithDefaults {
  return {
    r: color.r,
    g: color.g,
    b: color.b,
    a: applyDefault(color.a, FIGMA_DEFAULTS.color.opacity)
  };
}

/**
 * Performance Metrics Utilities for Variable Operations
 * Added in Task 1.9 for optimized variable tools performance tracking
 */
export interface VariablePerformanceMetrics {
  operationType: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  variableCount: number;
  modeCount?: number;
  referenceCount?: number;
  memoryBefore?: NodeJS.MemoryUsage;
  memoryAfter?: NodeJS.MemoryUsage;
  success: boolean;
  errorType?: string;
}

/**
 * Common variable operation patterns to reduce code duplication
 * Refactored in Task 1.9
 */
export const VARIABLE_OPERATION_PATTERNS = {
  // Common validation messages
  VALIDATION_MESSAGES: {
    EMPTY_NAME: "Variable name cannot be empty",
    INVALID_NAME_FORMAT: "Variable name must start with a letter and contain only letters, numbers, spaces, hyphens, and underscores",
    NAME_TOO_LONG: "Variable name too long (max 255 characters)",
    INVALID_ID_FORMAT: "Invalid ID format",
    INVALID_COLOR_VALUE: "Color values must be between 0 and 1",
    INVALID_VARIABLE_TYPE: "Invalid variable type. Must be BOOLEAN, FLOAT, STRING, or COLOR"
  },

  // Common error types for consistent handling
  ERROR_TYPES: {
    VALIDATION_ERROR: "ValidationError",
    NOT_FOUND_ERROR: "NotFoundError", 
    PERMISSION_ERROR: "PermissionError",
    WEBSOCKET_ERROR: "WebSocketError",
    FIGMA_API_ERROR: "FigmaAPIError",
    TIMEOUT_ERROR: "TimeoutError",
    REFERENCE_ERROR: "ReferenceError"
  },

  // Success message templates
  SUCCESS_MESSAGES: {
    VARIABLE_CREATED: (name: string) => `Variable "${name}" created successfully`,
    COLLECTION_CREATED: (name: string) => `Collection "${name}" created successfully`,
    VARIABLE_UPDATED: (name: string) => `Variable "${name}" updated successfully`,
    VARIABLE_DELETED: (name: string) => `Variable "${name}" deleted successfully`,
    BINDING_SET: (nodeId: string, property: string) => `Variable bound to ${property} on node ${nodeId}`,
    BINDING_REMOVED: (nodeId: string, property: string) => `Variable binding removed from ${property} on node ${nodeId}`,
    COLLECTION_PUBLISHED: (name: string) => `Collection "${name}" published successfully`
  },

  // Common timeout configurations
  TIMEOUT_CONFIGS: {
    SIMPLE_OPERATION: 3000,
    COMPLEX_OPERATION: 8000,
    BATCH_OPERATION: 15000,
    REFERENCE_SCAN: 12000,
    PUBLISHING_OPERATION: 20000
  }
};

/**
 * Utility class for tracking variable operation performance
 */
export class VariablePerformanceTracker {
  private static metrics: VariablePerformanceMetrics[] = [];

  /**
   * Start tracking a variable operation
   */
  static startTracking(operationType: string, variableCount: number = 1, options: {
    modeCount?: number;
    referenceCount?: number;
  } = {}): VariablePerformanceMetrics {
    const metrics: VariablePerformanceMetrics = {
      operationType,
      startTime: Date.now(),
      variableCount,
      modeCount: options.modeCount,
      referenceCount: options.referenceCount,
      memoryBefore: process.memoryUsage(),
      success: false
    };

    this.metrics.push(metrics);
    return metrics;
  }

  /**
   * End tracking a variable operation
   */
  static endTracking(metrics: VariablePerformanceMetrics, success: boolean, errorType?: string): void {
    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;
    metrics.memoryAfter = process.memoryUsage();
    metrics.success = success;
    metrics.errorType = errorType;

    // Keep only last 1000 metrics to prevent memory bloat
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Get performance statistics for variable operations
   */
  static getStats(): {
    totalOperations: number;
    successRate: number;
    averageDuration: number;
    slowestOperations: Array<{operation: string; duration: number}>;
    memoryUsagePattern: {
      averageIncrease: number;
      peakIncrease: number;
    };
    operationBreakdown: Record<string, {
      count: number;
      averageDuration: number;
      successRate: number;
    }>;
  } {
    const total = this.metrics.length;
    if (total === 0) {
      return {
        totalOperations: 0,
        successRate: 0,
        averageDuration: 0,
        slowestOperations: [],
        memoryUsagePattern: { averageIncrease: 0, peakIncrease: 0 },
        operationBreakdown: {}
      };
    }

    const successful = this.metrics.filter(m => m.success).length;
    const durations = this.metrics.filter(m => m.duration).map(m => m.duration!);
    const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

    // Find slowest operations
    const slowestOperations = this.metrics
      .filter(m => m.duration)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 5)
      .map(m => ({ operation: m.operationType, duration: m.duration! }));

    // Calculate memory usage patterns
    const memoryDeltas = this.metrics
      .filter(m => m.memoryBefore && m.memoryAfter)
      .map(m => m.memoryAfter!.heapUsed - m.memoryBefore!.heapUsed);
    
    const averageIncrease = memoryDeltas.length > 0 ? 
      memoryDeltas.reduce((a, b) => a + b, 0) / memoryDeltas.length : 0;
    const peakIncrease = memoryDeltas.length > 0 ? Math.max(...memoryDeltas) : 0;

    // Operation breakdown
    const operationBreakdown: Record<string, {count: number; averageDuration: number; successRate: number}> = {};
    
    this.metrics.forEach(m => {
      if (!operationBreakdown[m.operationType]) {
        operationBreakdown[m.operationType] = { count: 0, averageDuration: 0, successRate: 0 };
      }
      operationBreakdown[m.operationType].count++;
    });

    Object.keys(operationBreakdown).forEach(opType => {
      const opsOfType = this.metrics.filter(m => m.operationType === opType);
      const durations = opsOfType.filter(m => m.duration).map(m => m.duration!);
      const successful = opsOfType.filter(m => m.success).length;
      
      operationBreakdown[opType].averageDuration = durations.length > 0 ? 
        durations.reduce((a, b) => a + b, 0) / durations.length : 0;
      operationBreakdown[opType].successRate = successful / opsOfType.length;
    });

    return {
      totalOperations: total,
      successRate: successful / total,
      averageDuration,
      slowestOperations,
      memoryUsagePattern: { averageIncrease, peakIncrease },
      operationBreakdown
    };
  }

  /**
   * Clear all metrics (useful for testing)
   */
  static clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Get metrics for a specific operation type
   */
  static getMetricsForOperation(operationType: string): VariablePerformanceMetrics[] {
    return this.metrics.filter(m => m.operationType === operationType);
  }
}

/**
 * Common utility functions for variable operations
 * Refactored in Task 1.9 to reduce code duplication
 */
export class VariableOperationUtils {
  /**
   * Create standardized success response
   */
  static createSuccessResponse(message: string, data?: any): { content: Array<{ type: "text"; text: string }> } {
    const responseText = data ? `${message}. Details: ${JSON.stringify(data, null, 2)}` : message;
    return {
      content: [{ type: "text", text: responseText }]
    };
  }

  /**
   * Create standardized error response with enhanced error messages
   */
  static createErrorResponse(baseMessage: string, error: any, context?: string): { content: Array<{ type: "text"; text: string }> } {
    let errorMessage = error instanceof Error ? error.message : String(error);
    
    // Add context if provided
    if (context) {
      errorMessage = `${baseMessage} (${context}): ${errorMessage}`;
    } else {
      errorMessage = `${baseMessage}: ${errorMessage}`;
    }

    // Add helpful suggestions for common errors
    if (errorMessage.includes('PERMISSION_DENIED')) {
      errorMessage += '. Check if you have edit permissions for this file.';
    } else if (errorMessage.includes('NOT_FOUND')) {
      errorMessage += '. The resource may have been deleted or moved.';
    } else if (errorMessage.includes('VALIDATION')) {
      errorMessage += '. Please check the input parameters.';
    } else if (errorMessage.includes('TIMEOUT')) {
      errorMessage += '. The operation took too long. Try reducing the scope or check your connection.';
    }

    return {
      content: [{ type: "text", text: errorMessage }]
    };
  }

  /**
   * Validate common variable parameters
   */
  static validateVariableName(name: string): { valid: boolean; error?: string } {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: VARIABLE_OPERATION_PATTERNS.VALIDATION_MESSAGES.EMPTY_NAME };
    }
    if (name.length > 255) {
      return { valid: false, error: VARIABLE_OPERATION_PATTERNS.VALIDATION_MESSAGES.NAME_TOO_LONG };
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_\-\s]*$/.test(name)) {
      return { valid: false, error: VARIABLE_OPERATION_PATTERNS.VALIDATION_MESSAGES.INVALID_NAME_FORMAT };
    }
    return { valid: true };
  }

  /**
   * Validate color value
   */
  static validateColorValue(color: any): { valid: boolean; error?: string } {
    if (!color || typeof color !== 'object') {
      return { valid: false, error: "Color must be an object with r, g, b properties" };
    }

    const { r, g, b, a } = color;
    
    if (typeof r !== 'number' || typeof g !== 'number' || typeof b !== 'number') {
      return { valid: false, error: "Color r, g, b values must be numbers" };
    }

    if (r < 0 || r > 1 || g < 0 || g > 1 || b < 0 || b > 1) {
      return { valid: false, error: VARIABLE_OPERATION_PATTERNS.VALIDATION_MESSAGES.INVALID_COLOR_VALUE };
    }

    if (a !== undefined && (typeof a !== 'number' || a < 0 || a > 1)) {
      return { valid: false, error: "Color alpha value must be a number between 0 and 1" };
    }

    return { valid: true };
  }

  /**
   * Format duration for human-readable output
   */
  static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  /**
   * Format memory usage for human-readable output
   */
  static formatMemory(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)}${units[unitIndex]}`;
  }
}