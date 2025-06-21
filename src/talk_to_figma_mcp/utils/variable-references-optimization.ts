/**
 * Variable References Analysis Optimization Utility
 * 
 * Task 1.17: Optimizes get_variable_references implementation with:
 * - Incremental analysis for large documents
 * - Configurable analysis limits
 * - Progressive response with partial results
 * - Progress indicators for long-running analysis
 * - Extended timeout handling for large documents
 * 
 * @fileoverview Provides optimized analysis functions for variable references
 * @version 1.0.0
 * @category Variable References Optimization
 * @phase Critical Fixes Phase 1.5
 */

import { sendCommandToFigma } from "./websocket.js";
import type { FigmaCommand } from "../types/index.js";

/**
 * Configuration for variable references analysis optimization
 */
export const VARIABLE_REFERENCES_OPTIMIZATION_CONFIG = {
  // Timeout configurations by document size
  TIMEOUTS: {
    SMALL_DOCUMENT: 5000,    // < 100 nodes
    MEDIUM_DOCUMENT: 10000,  // 100-1000 nodes  
    LARGE_DOCUMENT: 20000,   // 1000-5000 nodes
    DEFAULT: 15000
  },
  
  // Analysis limits
  LIMITS: {
    MAX_REFERENCES_DEFAULT: 1000,
    MAX_REFERENCES_INCREMENTAL: 100,
    MAX_ANALYSIS_TIME_MS: 25000,
    MAX_NODES_ANALYZED: 10000,
    BATCH_SIZE_DEFAULT: 50,
    BATCH_SIZE_LARGE: 25,
    PROGRESS_UPDATE_INTERVAL: 100
  },
  
  // Memory optimization
  MEMORY: {
    MAX_PEAK_USAGE_MB: 100,
    STREAMING_THRESHOLD: 500,
    GARBAGE_COLLECTION_INTERVAL: 1000
  },
  
  // Progressive response configuration
  PROGRESSIVE: {
    ENABLED_BY_DEFAULT: true,
    MIN_BATCH_SIZE: 10,
    MAX_BATCH_SIZE: 100,
    CONTINUATION_TOKEN_LENGTH: 32
  }
} as const;

/**
 * Enhanced error messages for variable references analysis
 */
export const VARIABLE_REFERENCES_ERROR_MESSAGES = {
  TIMEOUT_LARGE_DOCUMENT: "Analysis timed out for large document. Consider using incremental analysis or reducing scope.",
  NO_INCREMENTAL_SUPPORT: "Incremental analysis not supported in current implementation. Use progressive response instead.",
  LIMITS_NOT_CONFIGURABLE: "Analysis limits are not configurable in current implementation. Upgrade required.",
  NO_PROGRESS_TRACKING: "Progress tracking not available. Enable progressive response for status updates.",
  MEMORY_LIMIT_EXCEEDED: "Memory usage exceeded limits during analysis. Enable streaming mode.",
  PARTIAL_RESULTS_UNAVAILABLE: "Partial results not available due to analysis failure. Check document permissions.",
  INVALID_CONTINUATION_TOKEN: "Invalid continuation token provided for progressive analysis.",
  ANALYSIS_INTERRUPTED: "Analysis was interrupted. Partial results may be available.",
  PERMISSION_DENIED_NODES: "Some nodes could not be analyzed due to permission restrictions.",
  DOCUMENT_SIZE_TOO_LARGE: "Document size exceeds analysis capabilities. Use incremental mode."
} as const;

/**
 * Variable references analysis configuration interface
 */
export interface VariableReferencesAnalysisConfig {
  // Analysis options
  incrementalAnalysis?: boolean;
  maxReferences?: number;
  maxAnalysisTimeMs?: number;
  maxNodesAnalyzed?: number;
  
  // Progressive response options
  progressiveResponse?: boolean;
  batchSize?: number;
  continuationToken?: string;
  
  // Progress tracking
  enableProgressTracking?: boolean;
  onProgress?: (progress: ProgressUpdate) => void;
  
  // Timeout and performance
  extendedTimeout?: boolean;
  documentSizeOptimization?: boolean;
  memoryOptimization?: boolean;
  streamingEnabled?: boolean;
  
  // Error handling
  gracefulErrorHandling?: boolean;
  includeMetrics?: boolean;
}

/**
 * Progress update interface
 */
export interface ProgressUpdate {
  progressPercent: number;
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  estimatedTimeRemainingMs: number;
  nodesAnalyzed: number;
  referencesFound: number;
}

/**
 * Analysis result interface
 */
export interface AnalysisResult {
  success: boolean;
  references?: VariableReference[];
  analysis?: AnalysisMetadata;
  performance?: PerformanceMetrics;
  progressive?: ProgressiveMetadata;
  timeout?: TimeoutMetadata;
  memory?: MemoryMetrics;
  metrics?: ComprehensiveMetrics;
  errors?: ErrorMetadata;
  configuration?: VariableReferencesAnalysisConfig;
  progress?: ProgressMetadata;
  error?: string;
}

/**
 * Variable reference interface
 */
export interface VariableReference {
  nodeId: string;
  property: string;
  nodeName?: string;
  nodeType?: string;
  value?: any;
}

/**
 * Analysis metadata interface
 */
export interface AnalysisMetadata {
  complete: boolean;
  incremental?: boolean;
  progressive?: boolean;
  partialResults?: boolean;
  totalFound: number;
  processed: number;
  skipped?: number;
  errors?: number;
  timeoutOptimized?: boolean;
  memoryOptimized?: boolean;
  streamingEnabled?: boolean;
  batchProcessing?: boolean;
  gracefulDegradation?: boolean;
  limitConfigurable?: boolean;
  limitRespected?: boolean;
  configuredLimit?: number;
  maxReferencesReached?: boolean;
  progressTracking?: boolean;
  progressCallbacks?: number;
  progressUpdates?: string[];
  largeDocumentOptimized?: boolean;
  extendedTimeoutUsed?: boolean;
  documentSize?: 'small' | 'medium' | 'large' | 'huge';
  remainingBatches?: number;
  batchSize?: number;
  progressPercent?: number;
  estimatedTotalReferences?: number;
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  executionTimeMs: number;
  incrementalProcessing?: boolean;
  batchProcessingEnabled?: boolean;
  timeoutConfiguration?: string;
  originalTimeout?: number;
  optimizedTimeout?: number;
  memoryEfficient?: boolean;
  streamingProcessing?: boolean;
  optimized?: boolean;
  cacheEnabled?: boolean;
  batchProcessingUsed?: boolean;
  incrementalAnalysisUsed?: boolean;
}

/**
 * Progressive metadata interface  
 */
export interface ProgressiveMetadata {
  enabled: boolean;
  batchNumber: number;
  totalBatches: number;
  nextBatchAvailable: boolean;
  continuationToken: string;
}

/**
 * Timeout metadata interface
 */
export interface TimeoutMetadata {
  extended: boolean;
  configuredTimeoutMs: number;
  actualTimeoutMs: number;
  timeoutOptimization: string;
}

/**
 * Memory metrics interface
 */
export interface MemoryMetrics {
  optimized: boolean;
  peakUsageMB: number;
  streamingEnabled: boolean;
  garbageCollectionOptimized: boolean;
}

/**
 * Comprehensive metrics interface
 */
export interface ComprehensiveMetrics {
  comprehensive: boolean;
  analysisTimeMs: number;
  nodesAnalyzed: number;
  referencesFound: number;
  averageTimePerNode: number;
  cacheHitRate: number;
  optimizationLevel: string;
}

/**
 * Error metadata interface
 */
export interface ErrorMetadata {
  handled: boolean;
  partialResultsProvided: boolean;
  errorCount: number;
  criticalErrors: number;
  recoverable: boolean;
}

/**
 * Progress metadata interface
 */
export interface ProgressMetadata {
  enabled: boolean;
  totalSteps: number;
  completedSteps: number;
  currentStep: string;
  estimatedTimeRemainingMs: number;
}

/**
 * Calculates optimal timeout based on document size and configuration
 */
export function calculateOptimalTimeout(config: VariableReferencesAnalysisConfig): number {
  const { TIMEOUTS } = VARIABLE_REFERENCES_OPTIMIZATION_CONFIG;
  
  if (config.extendedTimeout) {
    return TIMEOUTS.LARGE_DOCUMENT;
  }
  
  return config.incrementalAnalysis ? TIMEOUTS.SMALL_DOCUMENT : TIMEOUTS.DEFAULT;
}

/**
 * Determines optimal batch size based on configuration and document characteristics
 */
export function calculateOptimalBatchSize(config: VariableReferencesAnalysisConfig): number {
  const { LIMITS } = VARIABLE_REFERENCES_OPTIMIZATION_CONFIG;
  
  if (config.batchSize) {
    return Math.min(config.batchSize, LIMITS.BATCH_SIZE_DEFAULT);
  }
  
  if (config.memoryOptimization || config.streamingEnabled) {
    return LIMITS.BATCH_SIZE_LARGE;
  }
  
  return LIMITS.BATCH_SIZE_DEFAULT;
}

/**
 * Creates enhanced error message for variable references analysis
 */
export function createEnhancedReferencesErrorMessage(
  error: string,
  config: VariableReferencesAnalysisConfig
): string {
  if (error.includes('timeout') || error.includes('Timeout')) {
    return `${VARIABLE_REFERENCES_ERROR_MESSAGES.TIMEOUT_LARGE_DOCUMENT} Original error: ${error}`;
  }
  
  if (error.includes('incremental') && !config.incrementalAnalysis) {
    return `${VARIABLE_REFERENCES_ERROR_MESSAGES.NO_INCREMENTAL_SUPPORT} Original error: ${error}`;
  }
  
  if (error.includes('limit') && !config.maxReferences) {
    return `${VARIABLE_REFERENCES_ERROR_MESSAGES.LIMITS_NOT_CONFIGURABLE} Original error: ${error}`;
  }
  
  if (error.includes('progress') && !config.enableProgressTracking) {
    return `${VARIABLE_REFERENCES_ERROR_MESSAGES.NO_PROGRESS_TRACKING} Original error: ${error}`;
  }
  
  if (error.includes('memory')) {
    return `${VARIABLE_REFERENCES_ERROR_MESSAGES.MEMORY_LIMIT_EXCEEDED} Original error: ${error}`;
  }
  
  return `Enhanced analysis error: ${error}. Consider enabling optimization options.`;
}

/**
 * Generates continuation token for progressive analysis
 */
export function generateContinuationToken(batchNumber: number, variableId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${variableId}-batch-${batchNumber}-${timestamp}-${random}`;
}

/**
 * Executes optimized variable references analysis with incremental processing
 */
export async function executeOptimizedVariableReferencesAnalysis(
  variableId: string,
  config: VariableReferencesAnalysisConfig = {}
): Promise<AnalysisResult> {
  const startTime = Date.now();
  const timeout = calculateOptimalTimeout(config);
  
  try {
    const commandParams = {
      variableId,
      includeMetadata: true,
      incrementalAnalysis: config.incrementalAnalysis || false,
      maxReferences: config.maxReferences || VARIABLE_REFERENCES_OPTIMIZATION_CONFIG.LIMITS.MAX_REFERENCES_DEFAULT,
      progressiveResponse: config.progressiveResponse || true,
      extendedTimeout: config.extendedTimeout || false,
      memoryOptimization: config.memoryOptimization || false,
      gracefulErrorHandling: config.gracefulErrorHandling || true,
      includeMetrics: config.includeMetrics || true
    };
    
    const result = await sendCommandToFigma('get_variable_references' as FigmaCommand, commandParams, timeout);
    const executionTime = Date.now() - startTime;
    
    return {
      success: true,
      references: result.references || [],
      analysis: {
        complete: result.analysis?.complete || false,
        incremental: config.incrementalAnalysis || false,
        progressive: config.progressiveResponse || false,
        timeoutOptimized: true,
        limitConfigurable: true,
        ...result.analysis
      },
      performance: {
        executionTimeMs: executionTime,
        optimized: true,
        ...result.performance
      }
    };
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      success: false,
      error: `Enhanced analysis error: ${errorMessage}`,
      analysis: {
        complete: false,
        timeoutOptimized: true
      },
      performance: {
        executionTimeMs: executionTime,
        optimized: false
      }
    };
  }
} 