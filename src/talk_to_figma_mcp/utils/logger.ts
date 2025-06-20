/**
 * Enhanced Logger for MCP Figma Tools
 * Provides structured logging with variable operation debugging support
 * Enhanced in Task 1.9 for better debugging capabilities
 */

export interface LogContext {
  [key: string]: any;
}

export interface VariableOperationContext {
  operation: string;
  toolName: string;
  variableId?: string;
  collectionId?: string;
  nodeId?: string;
  duration?: number;
  itemCount?: number;
  success?: boolean;
  error?: string;
}

export interface PerformanceMetrics {
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  success: boolean;
  errorType?: string;
}

class EnhancedLogger {
  private performanceMetrics: PerformanceMetrics[] = [];
  private debugMode: boolean = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';

  /**
   * Log info message with optional context
   */
  info(message: string, context?: LogContext): void {
    this.writeLog('INFO', message, context);
  }

  /**
   * Log debug message (only in debug mode)
   */
  debug(message: string, context?: LogContext): void {
    if (this.debugMode) {
      this.writeLog('DEBUG', message, context);
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.writeLog('WARN', message, context);
  }

  /**
   * Log error message
   */
  error(message: string, context?: LogContext): void {
    this.writeLog('ERROR', message, context);
  }

  /**
   * General log method (backward compatibility)
   */
  log(message: string, context?: LogContext): void {
    this.writeLog('LOG', message, context);
  }

  /**
   * Log variable operation with structured context
   * Specific enhancement for Task 1.9
   */
  variableOperation(context: VariableOperationContext): void {
    const message = `Variable ${context.operation}: ${context.toolName}`;
    const logContext = {
      category: 'variable_operation',
      operation: context.operation,
      toolName: context.toolName,
      variableId: context.variableId,
      collectionId: context.collectionId,
      nodeId: context.nodeId,
      duration: context.duration,
      itemCount: context.itemCount,
      success: context.success,
      error: context.error,
      timestamp: new Date().toISOString()
    };

    if (context.success) {
      this.info(message, logContext);
    } else {
      this.error(message, logContext);
    }
  }

  /**
   * Start performance tracking for an operation
   */
  startPerformanceTracking(operationName: string): PerformanceMetrics {
    const metrics: PerformanceMetrics = {
      operationName,
      startTime: Date.now(),
      memoryUsage: process.memoryUsage(),
      success: false
    };

    this.performanceMetrics.push(metrics);
    
    if (this.debugMode) {
      this.debug(`Started performance tracking: ${operationName}`, {
        startTime: metrics.startTime,
        memoryUsage: metrics.memoryUsage
      });
    }

    return metrics;
  }

  /**
   * End performance tracking for an operation
   */
  endPerformanceTracking(metrics: PerformanceMetrics, success: boolean = true, errorType?: string): void {
    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;
    metrics.success = success;
    metrics.errorType = errorType;

    const finalMemoryUsage = process.memoryUsage();
    const memoryDelta = {
      heapUsed: finalMemoryUsage.heapUsed - (metrics.memoryUsage?.heapUsed || 0),
      heapTotal: finalMemoryUsage.heapTotal - (metrics.memoryUsage?.heapTotal || 0),
      external: finalMemoryUsage.external - (metrics.memoryUsage?.external || 0)
    };

    const logContext = {
      category: 'performance',
      operationName: metrics.operationName,
      duration: metrics.duration,
      success: metrics.success,
      errorType: metrics.errorType,
      memoryDelta,
      timestamp: new Date().toISOString()
    };

    if (success) {
      this.info(`Performance: ${metrics.operationName} completed in ${metrics.duration}ms`, logContext);
    } else {
      this.warn(`Performance: ${metrics.operationName} failed after ${metrics.duration}ms`, logContext);
    }

    // Clean up old metrics (keep last 100)
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics = this.performanceMetrics.slice(-100);
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    totalOperations: number;
    successRate: number;
    averageDuration: number;
    operationCounts: Record<string, number>;
  } {
    const total = this.performanceMetrics.length;
    const successful = this.performanceMetrics.filter(m => m.success).length;
    const durations = this.performanceMetrics.filter(m => m.duration).map(m => m.duration!);
    const averageDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    const operationCounts: Record<string, number> = {};
    this.performanceMetrics.forEach(m => {
      operationCounts[m.operationName] = (operationCounts[m.operationName] || 0) + 1;
    });

    return {
      totalOperations: total,
      successRate: total > 0 ? successful / total : 0,
      averageDuration,
      operationCounts
    };
  }

  /**
   * Log variable binding operation with detailed context
   */
  variableBinding(action: 'set' | 'remove', nodeId: string, property: string, variableId?: string, success: boolean = true, error?: string): void {
    this.variableOperation({
      operation: `${action}_binding`,
      toolName: action === 'set' ? 'set_bound_variable' : 'remove_bound_variable',
      nodeId,
      variableId,
      success,
      error,
      itemCount: 1
    });
  }

  /**
   * Log variable modification with change tracking
   */
  variableModification(action: 'create' | 'update' | 'delete', variableId: string, collectionId?: string, success: boolean = true, error?: string): void {
    this.variableOperation({
      operation: action,
      toolName: `${action}_variable`,
      variableId,
      collectionId,
      success,
      error,
      itemCount: 1
    });
  }

  /**
   * Log batch operations with item counts
   */
  batchOperation(operationType: string, itemCount: number, successCount: number, duration?: number): void {
    const success = successCount === itemCount;
    this.variableOperation({
      operation: 'batch',
      toolName: operationType,
      itemCount,
      duration,
      success,
      error: success ? undefined : `${itemCount - successCount} items failed`
    });
  }

  /**
   * Write formatted log message to stderr
   */
  private writeLog(level: string, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [${level}] ${message}`;

    if (context && Object.keys(context).length > 0) {
      logMessage += ` | Context: ${JSON.stringify(context)}`;
    }

    process.stderr.write(logMessage + '\n');
  }
}

// Export singleton instance and backward compatibility
export const logger = new EnhancedLogger();

// Backward compatibility exports
export const info = logger.info.bind(logger);
export const debug = logger.debug.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger);
export const log = logger.log.bind(logger);