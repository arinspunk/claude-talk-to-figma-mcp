/**
 * Tool Templates for MCP Figma Tools
 * Provides standardized templates and patterns for creating new tools
 */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma } from "./websocket.js";
import { logger } from "./logger.js";

/**
 * Standard MCP tool response format
 */
export interface ToolResponse {
  content: Array<{
    type: "text";
    text: string;
  }>;
}

/**
 * Tool handler function type
 */
export type ToolHandler<T = any> = (args: T, context?: any) => Promise<ToolResponse>;

/**
 * Tool configuration interface
 */
export interface ToolConfig<T = any> {
  name: string;
  description: string;
  schema: z.ZodType<T>;
  handler: ToolHandler<T>;
  category?: string;
  timeout?: number;
}

/**
 * Base tool template class
 */
export abstract class BaseToolTemplate<T = any> {
  protected readonly name: string;
  protected readonly description: string;
  protected readonly schema: z.ZodType<T>;
  protected readonly category: string;
  protected readonly timeout: number;

  constructor(config: ToolConfig<T>) {
    this.name = config.name;
    this.description = config.description;
    this.schema = config.schema;
    this.category = config.category || 'general';
    this.timeout = config.timeout || 10000;
  }

  /**
   * Register the tool with the MCP server
   */
  public register(server: McpServer): void {
    server.tool(
      this.name,
      this.description,
      this.schema,
      this.createHandler()
    );
    
    logger.info(`Registered tool: ${this.name} [${this.category}]`);
  }

  /**
   * Create the tool handler with error handling and logging
   */
  protected createHandler(): ToolHandler<T> {
    return async (args: T, context?: any): Promise<ToolResponse> => {
      const startTime = Date.now();
      
      try {
        logger.debug(`Executing tool: ${this.name}`, { args });
        
        const result = await this.execute(args, context);
        
        const duration = Date.now() - startTime;
        logger.debug(`Tool ${this.name} completed in ${duration}ms`);
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`Tool ${this.name} failed after ${duration}ms:`, error);
        
        return this.createErrorResponse(error);
      }
    };
  }

  /**
   * Abstract method to be implemented by concrete tools
   */
  protected abstract execute(args: T, context?: any): Promise<ToolResponse>;

  /**
   * Create standardized error response
   */
  protected createErrorResponse(error: unknown): ToolResponse {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      content: [
        {
          type: "text",
          text: `Error in ${this.name}: ${errorMessage}`,
        },
      ],
    };
  }

  /**
   * Create standardized success response
   */
  protected createSuccessResponse(message: string, data?: any): ToolResponse {
    const responseText = data 
      ? `${message}: ${JSON.stringify(data)}`
      : message;
    
    return {
      content: [
        {
          type: "text",
          text: responseText,
        },
      ],
    };
  }
}

/**
 * Template for Figma WebSocket-based tools
 */
export abstract class FigmaToolTemplate<T = any> extends BaseToolTemplate<T> {
  protected readonly command: string;

  constructor(config: ToolConfig<T> & { command: string }) {
    super(config);
    this.command = config.command;
  }

  /**
   * Execute Figma command via WebSocket
   */
  protected async execute(args: T, context?: any): Promise<ToolResponse> {
    const payload = this.preparePayload(args);
    
    try {
      const result = await sendCommandToFigma(this.command, payload);
      return this.processResult(result, args);
    } catch (error) {
      throw new Error(`Figma command '${this.command}' failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Prepare payload for Figma command
   * Override this method to customize payload preparation
   */
  protected preparePayload(args: T): any {
    return args;
  }

  /**
   * Process the result from Figma
   * Override this method to customize result processing
   */
  protected processResult(result: any, originalArgs: T): ToolResponse {
    if (result && typeof result === 'object' && 'name' in result) {
      return this.createSuccessResponse(
        `${this.getActionDescription()} "${result.name}"`,
        { id: result.id, name: result.name }
      );
    }
    
    return this.createSuccessResponse(
      `${this.getActionDescription()} completed`,
      result
    );
  }

  /**
   * Get action description for success messages
   */
  protected abstract getActionDescription(): string;
}

/**
 * Template for creation tools
 */
export abstract class CreationToolTemplate<T = any> extends FigmaToolTemplate<T> {
  protected getActionDescription(): string {
    return `Created ${this.getElementType()}`;
  }

  protected abstract getElementType(): string;
}

/**
 * Template for modification tools
 */
export abstract class ModificationToolTemplate<T = any> extends FigmaToolTemplate<T> {
  protected getActionDescription(): string {
    return `Modified ${this.getElementType()}`;
  }

  protected abstract getElementType(): string;
}

/**
 * Template for query tools
 */
export abstract class QueryToolTemplate<T = any> extends FigmaToolTemplate<T> {
  protected getActionDescription(): string {
    return `Retrieved ${this.getElementType()}`;
  }

  protected processResult(result: any, originalArgs: T): ToolResponse {
    if (Array.isArray(result)) {
      return this.createSuccessResponse(
        `Found ${result.length} ${this.getElementType()}(s)`,
        result
      );
    }
    
    return super.processResult(result, originalArgs);
  }

  protected abstract getElementType(): string;
}

/**
 * Utility functions for tool creation
 */
export class ToolUtils {
  /**
   * Create a simple Figma tool with minimal configuration
   */
  static createSimpleFigmaTool<T>(
    name: string,
    description: string,
    schema: z.ZodType<T>,
    command: string,
    elementType: string,
    category?: string
  ): FigmaToolTemplate<T> {
    return new (class extends FigmaToolTemplate<T> {
      protected getActionDescription(): string {
        return `Processed ${elementType}`;
      }
    })({
      name,
      description,
      schema,
      command,
      category: category || 'general'
    });
  }

  /**
   * Create a creation tool with standard patterns
   */
  static createCreationTool<T>(
    name: string,
    description: string,
    schema: z.ZodType<T>,
    command: string,
    elementType: string,
    category?: string
  ): CreationToolTemplate<T> {
    return new (class extends CreationToolTemplate<T> {
      protected getElementType(): string {
        return elementType;
      }
    })({
      name,
      description,
      schema,
      command,
      category: category || 'creation'
    });
  }

  /**
   * Create a modification tool with standard patterns
   */
  static createModificationTool<T>(
    name: string,
    description: string,
    schema: z.ZodType<T>,
    command: string,
    elementType: string,
    category?: string
  ): ModificationToolTemplate<T> {
    return new (class extends ModificationToolTemplate<T> {
      protected getElementType(): string {
        return elementType;
      }
    })({
      name,
      description,
      schema,
      command,
      category: category || 'modification'
    });
  }

  /**
   * Create a query tool with standard patterns
   */
  static createQueryTool<T>(
    name: string,
    description: string,
    schema: z.ZodType<T>,
    command: string,
    elementType: string,
    category?: string
  ): QueryToolTemplate<T> {
    return new (class extends QueryToolTemplate<T> {
      protected getElementType(): string {
        return elementType;
      }
    })({
      name,
      description,
      schema,
      command,
      category: category || 'query'
    });
  }
}

/**
 * Tool registry for managing multiple tools
 */
export class ToolRegistry {
  private tools: Map<string, BaseToolTemplate> = new Map();

  /**
   * Add a tool to the registry
   */
  add(tool: BaseToolTemplate): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool '${tool.name}' is already registered`);
    }
    
    this.tools.set(tool.name, tool);
  }

  /**
   * Register all tools with the MCP server
   */
  registerAll(server: McpServer): void {
    for (const tool of this.tools.values()) {
      tool.register(server);
    }
    
    logger.info(`Registered ${this.tools.size} tools with MCP server`);
  }

  /**
   * Get tool by name
   */
  get(name: string): BaseToolTemplate | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all tool names
   */
  getNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get tools by category
   */
  getByCategory(category: string): BaseToolTemplate[] {
    return Array.from(this.tools.values()).filter(
      tool => (tool as any).category === category
    );
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
  }

  /**
   * Get total number of registered tools
   */
  size(): number {
    return this.tools.size;
  }
}

/**
 * Default tool registry instance
 */
export const defaultToolRegistry = new ToolRegistry();

/**
 * Batch tool registration helper
 */
export function registerTools(server: McpServer, tools: BaseToolTemplate[]): void {
  const registry = new ToolRegistry();
  
  for (const tool of tools) {
    registry.add(tool);
  }
  
  registry.registerAll(server);
} 