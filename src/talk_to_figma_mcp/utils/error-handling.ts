/**
 * Error Handling for MCP Figma Tools
 * Provides specialized error classes and handling utilities
 */

import { logger } from "./logger.js";

/**
 * Base error class for all MCP tool errors
 */
export abstract class MCPToolError extends Error {
  public readonly code: string;
  public readonly category: string;
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    category: string,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.category = category;
    this.timestamp = new Date();
    this.context = context;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Get error details as object
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack
    };
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return this.message;
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    return false;
  }
}

/**
 * WebSocket connection errors
 */
export class WebSocketError extends MCPToolError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'WEBSOCKET_ERROR', 'connection', context);
  }

  getUserMessage(): string {
    return 'Failed to communicate with Figma. Please check your connection and try again.';
  }

  isRetryable(): boolean {
    return true;
  }
}

/**
 * Figma API errors
 */
export class FigmaAPIError extends MCPToolError {
  public readonly figmaCode?: string;

  constructor(
    message: string, 
    figmaCode?: string, 
    context?: Record<string, any>
  ) {
    super(message, 'FIGMA_API_ERROR', 'api', context);
    this.figmaCode = figmaCode;
  }

  getUserMessage(): string {
    if (this.figmaCode) {
      return `Figma API error (${this.figmaCode}): ${this.message}`;
    }
    return `Figma API error: ${this.message}`;
  }

  isRetryable(): boolean {
    // Some Figma errors are retryable (rate limits, temporary issues)
    const retryableCodes = ['RATE_LIMITED', 'TEMPORARY_ERROR', 'TIMEOUT'];
    return this.figmaCode ? retryableCodes.includes(this.figmaCode) : false;
  }
}

/**
 * Validation errors for tool parameters
 */
export class ValidationError extends MCPToolError {
  public readonly field?: string;
  public readonly expectedType?: string;
  public readonly receivedValue?: any;

  constructor(
    message: string,
    field?: string,
    expectedType?: string,
    receivedValue?: any,
    context?: Record<string, any>
  ) {
    super(message, 'VALIDATION_ERROR', 'validation', context);
    this.field = field;
    this.expectedType = expectedType;
    this.receivedValue = receivedValue;
  }

  getUserMessage(): string {
    if (this.field && this.expectedType) {
      return `Invalid value for '${this.field}': expected ${this.expectedType}, got ${typeof this.receivedValue}`;
    }
    return `Validation error: ${this.message}`;
  }
}

/**
 * Node-related errors (not found, invalid type, etc.)
 */
export class NodeError extends MCPToolError {
  public readonly nodeId?: string;
  public readonly nodeType?: string;
  public readonly operation?: string;

  constructor(
    message: string,
    nodeId?: string,
    nodeType?: string,
    operation?: string,
    context?: Record<string, any>
  ) {
    super(message, 'NODE_ERROR', 'node', context);
    this.nodeId = nodeId;
    this.nodeType = nodeType;
    this.operation = operation;
  }

  getUserMessage(): string {
    if (this.nodeId) {
      return `Node error for '${this.nodeId}': ${this.message}`;
    }
    return `Node error: ${this.message}`;
  }
}

/**
 * Permission-related errors
 */
export class PermissionError extends MCPToolError {
  public readonly requiredPermission?: string;
  public readonly resource?: string;

  constructor(
    message: string,
    requiredPermission?: string,
    resource?: string,
    context?: Record<string, any>
  ) {
    super(message, 'PERMISSION_ERROR', 'permission', context);
    this.requiredPermission = requiredPermission;
    this.resource = resource;
  }

  getUserMessage(): string {
    if (this.requiredPermission) {
      return `Permission denied: ${this.requiredPermission} required for ${this.resource || 'this operation'}`;
    }
    return `Permission denied: ${this.message}`;
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends MCPToolError {
  public readonly timeoutMs: number;
  public readonly operation?: string;

  constructor(
    message: string,
    timeoutMs: number,
    operation?: string,
    context?: Record<string, any>
  ) {
    super(message, 'TIMEOUT_ERROR', 'timeout', context);
    this.timeoutMs = timeoutMs;
    this.operation = operation;
  }

  getUserMessage(): string {
    const operationText = this.operation ? ` for ${this.operation}` : '';
    return `Operation timed out after ${this.timeoutMs}ms${operationText}. Please try again.`;
  }

  isRetryable(): boolean {
    return true;
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends MCPToolError {
  public readonly configKey?: string;

  constructor(
    message: string,
    configKey?: string,
    context?: Record<string, any>
  ) {
    super(message, 'CONFIGURATION_ERROR', 'configuration', context);
    this.configKey = configKey;
  }

  getUserMessage(): string {
    if (this.configKey) {
      return `Configuration error for '${this.configKey}': ${this.message}`;
    }
    return `Configuration error: ${this.message}`;
  }
}

/**
 * Resource errors (file not found, insufficient memory, etc.)
 */
export class ResourceError extends MCPToolError {
  public readonly resourceType?: string;
  public readonly resourceId?: string;

  constructor(
    message: string,
    resourceType?: string,
    resourceId?: string,
    context?: Record<string, any>
  ) {
    super(message, 'RESOURCE_ERROR', 'resource', context);
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }

  getUserMessage(): string {
    if (this.resourceType && this.resourceId) {
      return `${this.resourceType} '${this.resourceId}' error: ${this.message}`;
    } else if (this.resourceType) {
      return `${this.resourceType} error: ${this.message}`;
    }
    return `Resource error: ${this.message}`;
  }
}

/**
 * Error handler utility class
 */
export class ErrorHandler {
  /**
   * Convert unknown error to MCPToolError
   */
  static normalize(error: unknown, context?: Record<string, any>): MCPToolError {
    if (error instanceof MCPToolError) {
      return error;
    }

    if (error instanceof Error) {
      // Try to categorize based on error message
      const message = error.message.toLowerCase();
      
      if (message.includes('timeout') || message.includes('timed out')) {
        return new TimeoutError(error.message, 30000, undefined, context);
      }
      
      if (message.includes('websocket') || message.includes('connection')) {
        return new WebSocketError(error.message, context);
      }
      
      if (message.includes('permission') || message.includes('unauthorized')) {
        return new PermissionError(error.message, undefined, undefined, context);
      }
      
      if (message.includes('node') && message.includes('not found')) {
        return new NodeError(error.message, undefined, undefined, undefined, context);
      }
      
      if (message.includes('validation') || message.includes('invalid')) {
        return new ValidationError(error.message, undefined, undefined, undefined, context);
      }
      
      // Default to FigmaAPIError for other errors
      return new FigmaAPIError(error.message, undefined, context);
    }

    // Handle string errors
    if (typeof error === 'string') {
      return new FigmaAPIError(error, undefined, context);
    }

    // Handle unknown error types
    return new FigmaAPIError(
      'An unknown error occurred',
      'UNKNOWN_ERROR',
      { originalError: error, ...context }
    );
  }

  /**
   * Log error with appropriate level
   */
  static log(error: MCPToolError, toolName?: string): void {
    const logContext = {
      tool: toolName,
      code: error.code,
      category: error.category,
      context: error.context
    };

    switch (error.category) {
      case 'validation':
        logger.warn(`Validation error in ${toolName}: ${error.message}`, logContext);
        break;
      case 'permission':
        logger.warn(`Permission error in ${toolName}: ${error.message}`, logContext);
        break;
      case 'timeout':
        logger.error(`Timeout error in ${toolName}: ${error.message}`, logContext);
        break;
      case 'connection':
        logger.error(`Connection error in ${toolName}: ${error.message}`, logContext);
        break;
      default:
        logger.error(`Error in ${toolName}: ${error.message}`, logContext);
    }
  }

  /**
   * Handle error and return appropriate response
   */
  static handleToolError(
    error: unknown,
    toolName: string,
    context?: Record<string, any>
  ): { content: Array<{ type: "text"; text: string }> } {
    const normalizedError = this.normalize(error, context);
    this.log(normalizedError, toolName);

    return {
      content: [
        {
          type: "text",
          text: normalizedError.getUserMessage(),
        },
      ],
    };
  }

  /**
   * Retry logic for retryable errors
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000,
    context?: Record<string, any>
  ): Promise<T> {
    let lastError: MCPToolError | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = this.normalize(error, { ...context, attempt });

        if (!lastError.isRetryable() || attempt === maxRetries) {
          throw lastError;
        }

        logger.warn(`Retrying operation (attempt ${attempt}/${maxRetries}): ${lastError.message}`);
        
        // Exponential backoff
        const delay = delayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}

/**
 * Error factory for common error types
 */
export class ErrorFactory {
  /**
   * Create node not found error
   */
  static nodeNotFound(nodeId: string): NodeError {
    return new NodeError(
      `Node with ID '${nodeId}' not found`,
      nodeId,
      undefined,
      'find'
    );
  }

  /**
   * Create invalid node type error
   */
  static invalidNodeType(nodeId: string, expectedType: string, actualType: string): NodeError {
    return new NodeError(
      `Node '${nodeId}' is of type '${actualType}', expected '${expectedType}'`,
      nodeId,
      actualType,
      'type_check'
    );
  }

  /**
   * Create validation error for required field
   */
  static requiredField(fieldName: string): ValidationError {
    return new ValidationError(
      `Field '${fieldName}' is required`,
      fieldName,
      'required'
    );
  }

  /**
   * Create validation error for invalid type
   */
  static invalidType(
    fieldName: string,
    expectedType: string,
    receivedValue: any
  ): ValidationError {
    return new ValidationError(
      `Invalid type for field '${fieldName}'`,
      fieldName,
      expectedType,
      receivedValue
    );
  }

  /**
   * Create timeout error for operation
   */
  static operationTimeout(operation: string, timeoutMs: number): TimeoutError {
    return new TimeoutError(
      `Operation '${operation}' timed out`,
      timeoutMs,
      operation
    );
  }

  /**
   * Create WebSocket connection error
   */
  static websocketConnection(details?: string): WebSocketError {
    const message = details 
      ? `WebSocket connection failed: ${details}`
      : 'WebSocket connection failed';
    
    return new WebSocketError(message);
  }

  /**
   * Create permission denied error
   */
  static permissionDenied(resource: string, permission: string): PermissionError {
    return new PermissionError(
      `Permission denied for ${resource}`,
      permission,
      resource
    );
  }
}

/**
 * Error middleware for tool execution
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  toolName: string
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      return ErrorHandler.handleToolError(error, toolName, { args });
    }
  }) as T;
}

/**
 * Error boundary for batch operations
 */
export class BatchErrorHandler {
  private errors: Array<{ index: number; error: MCPToolError }> = [];
  private results: any[] = [];

  /**
   * Execute operation with error isolation
   */
  async executeWithIsolation<T>(
    index: number,
    operation: () => Promise<T>
  ): Promise<T | null> {
    try {
      const result = await operation();
      this.results[index] = result;
      return result;
    } catch (error) {
      const normalizedError = ErrorHandler.normalize(error, { batchIndex: index });
      this.errors.push({ index, error: normalizedError });
      return null;
    }
  }

  /**
   * Get batch execution summary
   */
  getSummary(): {
    totalOperations: number;
    successCount: number;
    errorCount: number;
    errors: Array<{ index: number; error: MCPToolError }>;
    results: any[];
  } {
    return {
      totalOperations: this.results.length + this.errors.length,
      successCount: this.results.filter(r => r !== undefined).length,
      errorCount: this.errors.length,
      errors: this.errors,
      results: this.results
    };
  }

  /**
   * Check if batch operation should continue
   */
  shouldContinue(maxErrorRate: number = 0.5): boolean {
    const total = this.results.length + this.errors.length;
    if (total === 0) return true;
    
    const errorRate = this.errors.length / total;
    return errorRate <= maxErrorRate;
  }
} 