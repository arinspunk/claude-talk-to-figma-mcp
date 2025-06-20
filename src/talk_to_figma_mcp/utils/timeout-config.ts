/**
 * Timeout Configuration for MCP Figma Tools
 * Provides dynamic timeout settings based on operation complexity and tool category
 */

/**
 * Tool categories with different timeout requirements
 */
export enum ToolCategory {
  CREATION = 'creation',
  MODIFICATION = 'modification',
  QUERY = 'query',
  VARIABLE = 'variable',
  STYLE = 'style',
  BOOLEAN = 'boolean',
  LAYOUT = 'layout',
  NAVIGATION = 'navigation',
  STORAGE = 'storage',
  MEDIA = 'media',
  FIGJAM = 'figjam',
  DEV = 'dev'
}

/**
 * Operation complexity levels
 */
export enum OperationComplexity {
  SIMPLE = 'simple',
  MEDIUM = 'medium',
  COMPLEX = 'complex',
  BATCH = 'batch'
}

/**
 * Timeout configuration interface
 */
export interface TimeoutConfig {
  /** Base timeout in milliseconds */
  base: number;
  /** Maximum timeout in milliseconds */
  max: number;
  /** Minimum timeout in milliseconds */
  min: number;
  /** Multiplier for batch operations */
  batchMultiplier: number;
  /** Additional time per item in batch operations */
  perItemMs: number;
}

/**
 * Default timeout configurations by category
 */
export const DEFAULT_TIMEOUTS: Record<ToolCategory, TimeoutConfig> = {
  [ToolCategory.CREATION]: {
    base: 5000,
    max: 15000,
    min: 2000,
    batchMultiplier: 2,
    perItemMs: 500
  },
  [ToolCategory.MODIFICATION]: {
    base: 3000,
    max: 12000,
    min: 1500,
    batchMultiplier: 1.5,
    perItemMs: 300
  },
  [ToolCategory.QUERY]: {
    base: 2000,
    max: 8000,
    min: 1000,
    batchMultiplier: 1.2,
    perItemMs: 100
  },
  [ToolCategory.VARIABLE]: {
    base: 4000,
    max: 20000,
    min: 2000,
    batchMultiplier: 3,
    perItemMs: 800
  },
  [ToolCategory.STYLE]: {
    base: 3500,
    max: 15000,
    min: 1500,
    batchMultiplier: 2.5,
    perItemMs: 600
  },
  [ToolCategory.BOOLEAN]: {
    base: 8000,
    max: 30000,
    min: 3000,
    batchMultiplier: 4,
    perItemMs: 1500
  },
  [ToolCategory.LAYOUT]: {
    base: 6000,
    max: 25000,
    min: 2500,
    batchMultiplier: 3.5,
    perItemMs: 1000
  },
  [ToolCategory.NAVIGATION]: {
    base: 1500,
    max: 5000,
    min: 800,
    batchMultiplier: 1.1,
    perItemMs: 50
  },
  [ToolCategory.STORAGE]: {
    base: 2500,
    max: 10000,
    min: 1200,
    batchMultiplier: 2,
    perItemMs: 200
  },
  [ToolCategory.MEDIA]: {
    base: 15000,
    max: 60000,
    min: 5000,
    batchMultiplier: 5,
    perItemMs: 3000
  },
  [ToolCategory.FIGJAM]: {
    base: 4000,
    max: 18000,
    min: 2000,
    batchMultiplier: 2.5,
    perItemMs: 700
  },
  [ToolCategory.DEV]: {
    base: 10000,
    max: 45000,
    min: 3000,
    batchMultiplier: 4,
    perItemMs: 2000
  }
};

/**
 * Complexity multipliers for different operation types
 */
export const COMPLEXITY_MULTIPLIERS: Record<OperationComplexity, number> = {
  [OperationComplexity.SIMPLE]: 1,
  [OperationComplexity.MEDIUM]: 1.5,
  [OperationComplexity.COMPLEX]: 2.5,
  [OperationComplexity.BATCH]: 3
};

/**
 * Timeout calculator class
 */
export class TimeoutCalculator {
  private config: Record<ToolCategory, TimeoutConfig>;

  constructor(customConfig?: Partial<Record<ToolCategory, Partial<TimeoutConfig>>>) {
    this.config = { ...DEFAULT_TIMEOUTS };
    
    if (customConfig) {
      this.applyCustomConfig(customConfig);
    }
  }

  /**
   * Apply custom configuration overrides
   */
  private applyCustomConfig(customConfig: Partial<Record<ToolCategory, Partial<TimeoutConfig>>>): void {
    for (const [category, config] of Object.entries(customConfig)) {
      const categoryKey = category as ToolCategory;
      if (this.config[categoryKey] && config) {
        this.config[categoryKey] = {
          ...this.config[categoryKey],
          ...config
        };
      }
    }
  }

  /**
   * Calculate timeout for a specific operation
   */
  calculateTimeout(
    category: ToolCategory,
    complexity: OperationComplexity = OperationComplexity.SIMPLE,
    options: {
      itemCount?: number;
      customMultiplier?: number;
      nodeCount?: number;
      dataSize?: number; // in bytes
    } = {}
  ): number {
    const config = this.config[category];
    const complexityMultiplier = COMPLEXITY_MULTIPLIERS[complexity];
    const { itemCount = 1, customMultiplier = 1, nodeCount = 0, dataSize = 0 } = options;

    let timeout = config.base * complexityMultiplier * customMultiplier;

    // Add time for batch operations
    if (itemCount > 1) {
      timeout *= config.batchMultiplier;
      timeout += (itemCount - 1) * config.perItemMs;
    }

    // Add time based on node count (for layout operations)
    if (nodeCount > 0) {
      timeout += nodeCount * 100; // 100ms per additional node
    }

    // Add time based on data size (for media operations)
    if (dataSize > 0) {
      const sizeInMB = dataSize / (1024 * 1024);
      timeout += sizeInMB * 2000; // 2 seconds per MB
    }

    // Apply min/max constraints
    return Math.max(config.min, Math.min(timeout, config.max));
  }

  /**
   * Get timeout for simple operations
   */
  getSimpleTimeout(category: ToolCategory): number {
    return this.calculateTimeout(category, OperationComplexity.SIMPLE);
  }

  /**
   * Get timeout for batch operations
   */
  getBatchTimeout(category: ToolCategory, itemCount: number): number {
    return this.calculateTimeout(category, OperationComplexity.BATCH, { itemCount });
  }

  /**
   * Get timeout for complex operations
   */
  getComplexTimeout(category: ToolCategory, nodeCount?: number): number {
    return this.calculateTimeout(category, OperationComplexity.COMPLEX, { nodeCount });
  }

  /**
   * Get timeout for media operations
   */
  getMediaTimeout(dataSize: number): number {
    return this.calculateTimeout(ToolCategory.MEDIA, OperationComplexity.MEDIUM, { dataSize });
  }

  /**
   * Get configuration for a category
   */
  getConfig(category: ToolCategory): TimeoutConfig {
    return { ...this.config[category] };
  }

  /**
   * Update configuration for a category
   */
  updateConfig(category: ToolCategory, config: Partial<TimeoutConfig>): void {
    this.config[category] = {
      ...this.config[category],
      ...config
    };
  }
}

/**
 * Default timeout calculator instance
 */
export const defaultTimeoutCalculator = new TimeoutCalculator();

/**
 * Utility functions for common timeout calculations
 */
export class TimeoutUtils {
  /**
   * Get timeout for variable operations
   */
  static getVariableTimeout(
    operation: 'create' | 'update' | 'delete' | 'query' | 'bind',
    itemCount: number = 1
  ): number {
    const complexity = itemCount > 1 ? OperationComplexity.BATCH : OperationComplexity.SIMPLE;
    return defaultTimeoutCalculator.calculateTimeout(ToolCategory.VARIABLE, complexity, { itemCount });
  }

  /**
   * Get timeout for style operations
   */
  static getStyleTimeout(
    operation: 'create' | 'apply' | 'update' | 'delete' | 'query',
    itemCount: number = 1
  ): number {
    const complexity = operation === 'apply' && itemCount > 5 
      ? OperationComplexity.COMPLEX 
      : itemCount > 1 
        ? OperationComplexity.BATCH 
        : OperationComplexity.SIMPLE;
    
    return defaultTimeoutCalculator.calculateTimeout(ToolCategory.STYLE, complexity, { itemCount });
  }

  /**
   * Get timeout for boolean operations
   */
  static getBooleanTimeout(nodeCount: number = 2): number {
    const complexity = nodeCount > 10 
      ? OperationComplexity.COMPLEX 
      : nodeCount > 5 
        ? OperationComplexity.MEDIUM 
        : OperationComplexity.SIMPLE;
    
    return defaultTimeoutCalculator.calculateTimeout(ToolCategory.BOOLEAN, complexity, { nodeCount });
  }

  /**
   * Get timeout for layout operations
   */
  static getLayoutTimeout(
    operation: 'group' | 'align' | 'distribute' | 'autolayout' | 'constraints',
    nodeCount: number = 1
  ): number {
    let complexity = OperationComplexity.SIMPLE;
    
    if (operation === 'autolayout' || operation === 'constraints') {
      complexity = OperationComplexity.MEDIUM;
    }
    
    if (nodeCount > 20) {
      complexity = OperationComplexity.COMPLEX;
    } else if (nodeCount > 5) {
      complexity = OperationComplexity.MEDIUM;
    }
    
    return defaultTimeoutCalculator.calculateTimeout(ToolCategory.LAYOUT, complexity, { nodeCount });
  }

  /**
   * Get timeout for media operations
   */
  static getMediaTimeout(
    operation: 'import' | 'export' | 'optimize' | 'convert',
    dataSize: number = 0,
    itemCount: number = 1
  ): number {
    let complexity = OperationComplexity.MEDIUM;
    
    if (operation === 'export' && itemCount > 1) {
      complexity = OperationComplexity.BATCH;
    } else if (operation === 'convert' || operation === 'optimize') {
      complexity = OperationComplexity.COMPLEX;
    }
    
    return defaultTimeoutCalculator.calculateTimeout(ToolCategory.MEDIA, complexity, { 
      dataSize, 
      itemCount 
    });
  }

  /**
   * Get timeout based on operation name pattern
   */
  static getTimeoutByName(toolName: string, itemCount: number = 1, nodeCount: number = 0): number {
    // Determine category from tool name
    let category = ToolCategory.QUERY;
    
    if (toolName.includes('variable')) {
      category = ToolCategory.VARIABLE;
    } else if (toolName.includes('style')) {
      category = ToolCategory.STYLE;
    } else if (toolName.includes('boolean') || toolName.includes('union') || toolName.includes('subtract')) {
      category = ToolCategory.BOOLEAN;
    } else if (toolName.includes('layout') || toolName.includes('group') || toolName.includes('align')) {
      category = ToolCategory.LAYOUT;
    } else if (toolName.includes('create')) {
      category = ToolCategory.CREATION;
    } else if (toolName.includes('set') || toolName.includes('update') || toolName.includes('modify')) {
      category = ToolCategory.MODIFICATION;
    } else if (toolName.includes('media') || toolName.includes('image') || toolName.includes('export')) {
      category = ToolCategory.MEDIA;
    } else if (toolName.includes('figjam')) {
      category = ToolCategory.FIGJAM;
    } else if (toolName.includes('dev') || toolName.includes('code')) {
      category = ToolCategory.DEV;
    }

    // Determine complexity
    let complexity = OperationComplexity.SIMPLE;
    if (toolName.includes('batch') || itemCount > 1) {
      complexity = OperationComplexity.BATCH;
    } else if (toolName.includes('complex') || nodeCount > 10) {
      complexity = OperationComplexity.COMPLEX;
    } else if (nodeCount > 5 || toolName.includes('advanced')) {
      complexity = OperationComplexity.MEDIUM;
    }

    return defaultTimeoutCalculator.calculateTimeout(category, complexity, { itemCount, nodeCount });
  }
}

/**
 * Environment-specific timeout adjustments
 */
export class EnvironmentTimeouts {
  /**
   * Get timeout multiplier based on environment
   */
  static getEnvironmentMultiplier(): number {
    const env = process.env.NODE_ENV || 'development';
    
    switch (env) {
      case 'test':
        return 0.5; // Faster timeouts for tests
      case 'development':
        return 1.5; // Longer timeouts for development
      case 'production':
        return 1; // Standard timeouts for production
      default:
        return 1;
    }
  }

  /**
   * Adjust timeout based on system performance
   */
  static adjustForPerformance(baseTimeout: number): number {
    const envMultiplier = this.getEnvironmentMultiplier();
    
    // Check if we're running in a CI environment
    if (process.env.CI) {
      return baseTimeout * 2; // Double timeouts in CI
    }
    
    // Check available memory (simplified)
    if (process.memoryUsage().heapUsed > 100 * 1024 * 1024) { // > 100MB
      return baseTimeout * 1.3; // Increase timeout if memory usage is high
    }
    
    return baseTimeout * envMultiplier;
  }
}

/**
 * Timeout decorator for async functions
 */
export function withTimeout<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  timeoutMs: number,
  errorMessage?: string
): T {
  return (async (...args: any[]) => {
    const adjustedTimeout = EnvironmentTimeouts.adjustForPerformance(timeoutMs);
    
    return Promise.race([
      fn(...args),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(errorMessage || `Operation timed out after ${adjustedTimeout}ms`));
        }, adjustedTimeout);
      })
    ]);
  }) as T;
}

/**
 * Specialized timeout configurations for Variable operations
 * Optimized for complex variable operations in Task 1.9
 */
export const VARIABLE_OPERATION_TIMEOUTS = {
  // Basic operations
  CREATE_VARIABLE: 4000,
  CREATE_COLLECTION: 3000, 
  GET_VARIABLES: 2500,
  GET_COLLECTIONS: 2000,
  GET_BY_ID: 1500,

  // Binding operations (more complex due to node interactions)
  SET_BOUND_VARIABLE: 5000,
  SET_BOUND_PAINT: 4500,
  REMOVE_BOUND_VARIABLE: 3500,

  // Modification operations
  UPDATE_VALUE: 3000,
  UPDATE_NAME: 2500,
  DELETE_VARIABLE: 4000,
  DELETE_COLLECTION: 8000, // Cascade operations

  // Advanced operations (most complex)
  GET_REFERENCES: 12000, // Can be very expensive
  SET_MODE_VALUE: 3500,
  CREATE_MODE: 4000,
  DELETE_MODE: 6000, // Cleanup operations
  REORDER_MODES: 3000,

  // Publishing operations (network dependent)
  PUBLISH_COLLECTION: 15000,
  GET_PUBLISHED: 8000,

  // Batch operation multipliers
  BATCH_MULTIPLIER: 2.5,
  PER_VARIABLE_MS: 300,
  PER_MODE_MS: 500,
  PER_REFERENCE_MS: 100,
};

/**
 * Calculate optimized timeout for variable operations
 * Enhanced for Task 1.9 with specific variable operation handling
 */
export function getVariableOperationTimeout(
  operation: keyof typeof VARIABLE_OPERATION_TIMEOUTS,
  options: {
    variableCount?: number;
    modeCount?: number;
    referenceCount?: number;
    isBatch?: boolean;
    isComplex?: boolean;
  } = {}
): number {
  const {
    variableCount = 1,
    modeCount = 1,
    referenceCount = 0,
    isBatch = false,
    isComplex = false
  } = options;

  let baseTimeout = VARIABLE_OPERATION_TIMEOUTS[operation];
  
  // Apply complexity multiplier
  if (isComplex) {
    baseTimeout *= 1.8;
  }

  // Apply batch multiplier
  if (isBatch || variableCount > 1) {
    baseTimeout *= VARIABLE_OPERATION_TIMEOUTS.BATCH_MULTIPLIER;
    baseTimeout += (variableCount - 1) * VARIABLE_OPERATION_TIMEOUTS.PER_VARIABLE_MS;
  }

  // Add time for modes
  if (modeCount > 1) {
    baseTimeout += (modeCount - 1) * VARIABLE_OPERATION_TIMEOUTS.PER_MODE_MS;
  }

  // Add time for references (expensive operations)
  if (referenceCount > 0) {
    baseTimeout += referenceCount * VARIABLE_OPERATION_TIMEOUTS.PER_REFERENCE_MS;
  }

  // Ensure within reasonable bounds
  const maxTimeout = 45000; // 45 seconds max
  const minTimeout = 1000;  // 1 second min

  return Math.max(minTimeout, Math.min(maxTimeout, baseTimeout));
} 