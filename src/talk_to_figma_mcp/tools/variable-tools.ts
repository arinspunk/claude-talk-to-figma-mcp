/**
 * Variable Tools for Figma MCP
 * Provides comprehensive tools for working with Figma Variables API
 * 
 * This module implements Phase 1 Variable Tools following TDD methodology.
 * Includes complete validation, error handling, and WebSocket communication.
 * 
 * @category Variables
 * @phase 1
 * @complexity Medium
 * @version 1.3.0
 */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma } from "../utils/websocket.js";

// Zod Schemas for Variable Tools
const VariableDataTypeSchema = z.enum(["BOOLEAN", "FLOAT", "STRING", "COLOR"], {
  errorMap: () => ({ message: "Invalid variable type. Must be BOOLEAN, FLOAT, STRING, or COLOR" })
});

const ColorValueSchema = z.object({
  r: z.number().min(0, "Red value must be >= 0").max(1, "Red value must be <= 1"),
  g: z.number().min(0, "Green value must be >= 0").max(1, "Green value must be <= 1"),
  b: z.number().min(0, "Blue value must be >= 0").max(1, "Blue value must be <= 1"),
  a: z.number().min(0, "Alpha value must be >= 0").max(1, "Alpha value must be <= 1").optional()
});

const VariableValueSchema = z.union([
  z.boolean(),
  z.number(),
  z.string(),
  ColorValueSchema
]);

const CreateVariableInputSchema = z.object({
  name: z.string()
    .min(1, "Variable name cannot be empty")
    .max(255, "Variable name too long")
    .regex(/^[a-zA-Z][a-zA-Z0-9_\-\s]*$/, "Variable name must start with a letter and contain only letters, numbers, spaces, hyphens, and underscores"),
  variableCollectionId: z.string()
    .min(1, "Variable collection ID cannot be empty")
    .regex(/^[a-zA-Z0-9_\-:]+$/, "Invalid variable collection ID format"),
  resolvedType: VariableDataTypeSchema,
  initialValue: VariableValueSchema.optional(),
  description: z.string().max(1000, "Description too long").optional(),
});

const CreateVariableCollectionInputSchema = z.object({
  name: z.string()
    .min(1, "Collection name cannot be empty")
    .max(255, "Collection name too long")
    .regex(/^[a-zA-Z][a-zA-Z0-9_\-\s]*$/, "Collection name must start with a letter"),
  initialModeNames: z.array(z.string().min(1, "Mode name cannot be empty")).optional(),
});

// Enhanced schemas for Task 1.3 - Query Tools with Filtering and Optimization
const GetLocalVariablesInputSchema = z.object({
  collectionId: z.string()
    .regex(/^[a-zA-Z0-9_\-:]+$/, "Invalid collection ID format")
    .optional(),
  type: VariableDataTypeSchema.optional(),
  namePattern: z.string()
    .min(1, "Name pattern cannot be empty")
    .max(100, "Name pattern too long")
    .optional(),
  limit: z.number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(1000, "Limit cannot exceed 1000")
    .optional(),
  offset: z.number()
    .int("Offset must be an integer")
    .min(0, "Offset must be non-negative")
    .optional(),
});

const SortOrderSchema = z.enum(["asc", "desc"], {
  errorMap: () => ({ message: "Sort order must be 'asc' or 'desc'" })
});

const GetLocalVariableCollectionsInputSchema = z.object({
  includeVariableCount: z.boolean().optional(),
  includeModes: z.boolean().optional(),
  namePattern: z.string()
    .min(1, "Name pattern cannot be empty")
    .max(100, "Name pattern too long")
    .optional(),
  sortBy: z.enum(["name", "createdAt", "updatedAt", "variableCount"], {
    errorMap: () => ({ message: "Sort field must be one of: name, createdAt, updatedAt, variableCount" })
  }).optional(),
  sortOrder: SortOrderSchema.optional(),
});

const VariableIdSchema = z.string()
  .min(1, "Variable ID cannot be empty")
  .regex(/^[a-zA-Z0-9_\-:]+$/, "Invalid variable ID format");

const VariableCollectionIdSchema = z.string()
  .min(1, "Variable collection ID cannot be empty")
  .regex(/^[a-zA-Z0-9_\-:]+$/, "Invalid variable collection ID format");

/**
 * Register variable-related tools to the MCP server
 * 
 * This function registers all Phase 1 Variable Tools with complete TDD validation.
 * Implements robust error handling, filtering, and WebSocket communication.
 * 
 * @param server - The MCP server instance
 * @since 1.3.0
 * @see https://www.figma.com/plugin-docs/api/figma-variables/
 */
export function registerVariableTools(server: McpServer): void {
  /**
   * Create a new variable in a variable collection
   * 
   * Creates a variable with the specified name, type, and initial value in the given collection.
   * Supports all Figma variable types: BOOLEAN, FLOAT, STRING, and COLOR.
   * 
   * @category Variables
   * @phase 1
   * @complexity Medium
   * @figmaApi figma.variables.createVariable()
   * 
   * @param name - Variable name (1-255 chars, must start with letter)
   * @param variableCollectionId - ID of the target variable collection
   * @param resolvedType - Variable data type (BOOLEAN, FLOAT, STRING, COLOR)
   * @param initialValue - Initial value for the variable (optional)
   * @param description - Variable description (optional, max 1000 chars)
   * 
   * @returns Success message with variable details or error message
   * 
   * @example
   * ```typescript
   * // Create a string variable
   * const result = await create_variable({
   *   name: "primary-text",
   *   variableCollectionId: "collection-123",
   *   resolvedType: "STRING",
   *   initialValue: "Hello World",
   *   description: "Primary text content"
   * });
   * 
   * // Create a color variable
   * const colorResult = await create_variable({
   *   name: "primary-color",
   *   variableCollectionId: "collection-123",
   *   resolvedType: "COLOR",
   *   initialValue: { r: 0.2, g: 0.4, b: 0.8, a: 1.0 }
   * });
   * ```
   * 
   * @throws {ValidationError} When input parameters are invalid
   * @throws {WebSocketError} When communication with Figma fails
   * @throws {FigmaAPIError} When Figma API returns an error
   */
  server.tool(
    "create_variable",
    "Create a new variable in a variable collection with comprehensive validation",
    {
      name: z.string().min(1).describe("Variable name (1-255 chars, must start with letter)"),
      variableCollectionId: z.string().min(1).describe("Variable collection ID"),
      resolvedType: VariableDataTypeSchema.describe("Variable data type"),
      initialValue: VariableValueSchema.optional().describe("Initial value for the variable"),
      description: z.string().optional().describe("Variable description (max 1000 chars)"),
    },
    async (args) => {
      try {
        // Validate input with enhanced Zod schema
        const validatedArgs = CreateVariableInputSchema.parse(args);
        
        // Additional business logic validation
        if (validatedArgs.resolvedType === 'COLOR' && validatedArgs.initialValue) {
          const colorValue = validatedArgs.initialValue as any;
          if (typeof colorValue === 'object' && colorValue !== null) {
            if (!('r' in colorValue) || !('g' in colorValue) || !('b' in colorValue)) {
              throw new Error('COLOR variables require r, g, b values');
            }
          }
        }
        
        // Execute Figma command
        const result = await sendCommandToFigma("create_variable", {
          name: validatedArgs.name,
          variableCollectionId: validatedArgs.variableCollectionId,
          resolvedType: validatedArgs.resolvedType,
          initialValue: validatedArgs.initialValue,
          description: validatedArgs.description || "",
        });

        return {
          content: [
            {
              type: "text",
              text: `Variable "${validatedArgs.name}" created successfully: ${JSON.stringify(result)}`,
            },
          ],
        };
      } catch (error) {
        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
          const validationErrors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
          return {
            content: [
              {
                type: "text",
                text: `Error creating variable - Validation failed: ${validationErrors}`,
              },
            ],
          };
        }
        
        // Handle other errors
        return {
          content: [
            {
              type: "text",
              text: `Error creating variable: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  /**
   * Create a new variable collection
   * 
   * Creates a new variable collection with the specified name and initial mode names.
   * Collections organize variables and support multiple modes (themes).
   * 
   * @category Variables
   * @phase 1
   * @complexity Low
   * @figmaApi figma.variables.createVariableCollection()
   * 
   * @param name - Collection name (1-255 chars, must start with letter)
   * @param initialModeNames - Array of initial mode names (optional, defaults to ["Mode 1"])
   * 
   * @returns Success message with collection details or error message
   * 
   * @example
   * ```typescript
   * // Create a collection with default mode
   * const result = await create_variable_collection({
   *   name: "Design Tokens"
   * });
   * 
   * // Create a collection with custom modes
   * const themeResult = await create_variable_collection({
   *   name: "Theme Tokens",
   *   initialModeNames: ["Light", "Dark", "High Contrast"]
   * });
   * ```
   * 
   * @throws {ValidationError} When input parameters are invalid
   * @throws {WebSocketError} When communication with Figma fails
   * @throws {FigmaAPIError} When Figma API returns an error
   */
  server.tool(
    "create_variable_collection",
    "Create a new variable collection with mode support",
    {
      name: z.string().min(1).describe("Collection name (1-255 chars, must start with letter)"),
      initialModeNames: z.array(z.string()).optional().describe("Initial mode names (optional)"),
    },
    async (args) => {
      try {
        // Validate input with enhanced Zod schema
        const validatedArgs = CreateVariableCollectionInputSchema.parse(args);
        
        // Set default mode names if not provided
        const modeNames = validatedArgs.initialModeNames || ["Mode 1"];
        
        // Execute Figma command
        const result = await sendCommandToFigma("create_variable_collection", {
          name: validatedArgs.name,
          initialModeNames: modeNames,
        });

        return {
          content: [
            {
              type: "text",
              text: `Variable collection "${validatedArgs.name}" created successfully: ${JSON.stringify(result)}`,
            },
          ],
        };
      } catch (error) {
        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
          const validationErrors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
          return {
            content: [
              {
                type: "text",
                text: `Error creating variable collection - Validation failed: ${validationErrors}`,
              },
            ],
          };
        }
        
        // Handle other errors
        return {
          content: [
            {
              type: "text",
              text: `Error creating variable collection: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  /**
   * Get local variables with advanced filtering and pagination
   * 
   * Retrieves variables from the document with optional filtering by collection, type, and name pattern.
   * Supports pagination for efficient handling of large datasets and optimized responses.
   * 
   * @category Variables
   * @phase 1
   * @complexity Medium
   * @figmaApi figma.variables.getLocalVariables()
   * 
   * @param collectionId - Filter by specific collection ID (optional)
   * @param type - Filter by variable type (optional)
   * @param namePattern - Filter by name pattern (optional)
   * @param limit - Maximum number of results (1-1000, optional)
   * @param offset - Number of results to skip (optional)
   * 
   * @returns Array of variables with metadata or error message
   * 
   * @example
   * ```typescript
   * // Get all variables
   * const allVars = await get_local_variables({});
   * 
   * // Get color variables from specific collection
   * const colorVars = await get_local_variables({
   *   collectionId: "collection-123",
   *   type: "COLOR"
   * });
   * 
   * // Get variables with pagination
   * const pagedVars = await get_local_variables({
   *   limit: 50,
   *   offset: 100
   * });
   * 
   * // Filter by name pattern
   * const primaryVars = await get_local_variables({
   *   namePattern: "primary"
   * });
   * ```
   * 
   * @throws {ValidationError} When filter parameters are invalid
   * @throws {WebSocketError} When communication with Figma fails
   * @throws {FigmaAPIError} When Figma API returns an error
   */
  server.tool(
    "get_local_variables",
    "Get local variables with advanced filtering and pagination support",
    {
      collectionId: z.string().optional().describe("Filter by collection ID"),
      type: VariableDataTypeSchema.optional().describe("Filter by variable type"),
      namePattern: z.string().optional().describe("Filter by name pattern (regex supported)"),
      limit: z.number().optional().describe("Maximum results (1-1000)"),
      offset: z.number().optional().describe("Results to skip (pagination)"),
    },
    async (args) => {
      try {
        // Validate input with enhanced schema
        const validatedArgs = GetLocalVariablesInputSchema.parse(args);
        
        // Build query parameters for Figma
        const queryParams: any = {};
        
        if (validatedArgs.collectionId) queryParams.collectionId = validatedArgs.collectionId;
        if (validatedArgs.type) queryParams.type = validatedArgs.type;
        if (validatedArgs.namePattern) queryParams.namePattern = validatedArgs.namePattern;
        if (validatedArgs.limit) queryParams.limit = validatedArgs.limit;
        if (validatedArgs.offset) queryParams.offset = validatedArgs.offset;
        
        // Execute Figma command
        const result = await sendCommandToFigma("get_local_variables", queryParams);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
          const validationErrors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
          return {
            content: [
              {
                type: "text",
                text: `Error getting local variables - Validation failed: ${validationErrors}`,
              },
            ],
          };
        }
        
        // Handle other errors
        return {
          content: [
            {
              type: "text",
              text: `Error getting local variables: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  /**
   * Get local variable collections with complete metadata
   * 
   * Retrieves all variable collections with comprehensive metadata including mode information,
   * variable counts, creation/update timestamps, and sorting capabilities.
   * 
   * @category Variables
   * @phase 1
   * @complexity Medium
   * @figmaApi figma.variables.getLocalVariableCollections()
   * 
   * @param includeVariableCount - Include variable count in each collection (optional)
   * @param includeModes - Include detailed mode information (optional)
   * @param namePattern - Filter collections by name pattern (optional)
   * @param sortBy - Sort field (name, createdAt, updatedAt, variableCount)
   * @param sortOrder - Sort direction (asc, desc)
   * 
   * @returns Array of collections with complete metadata or error message
   * 
   * @example
   * ```typescript
   * // Get all collections with metadata
   * const collections = await get_local_variable_collections({});
   * 
   * // Get collections with variable counts and modes
   * const detailed = await get_local_variable_collections({
   *   includeVariableCount: true,
   *   includeModes: true
   * });
   * 
   * // Get collections sorted by name
   * const sorted = await get_local_variable_collections({
   *   sortBy: "name",
   *   sortOrder: "asc"
   * });
   * 
   * // Filter collections by name pattern
   * const filtered = await get_local_variable_collections({
   *   namePattern: "Design"
   * });
   * ```
   * 
   * @throws {ValidationError} When parameters are invalid
   * @throws {WebSocketError} When communication with Figma fails
   * @throws {FigmaAPIError} When Figma API returns an error
   */
  server.tool(
    "get_local_variable_collections",
    "Get local variable collections with complete metadata and sorting",
    {
      includeVariableCount: z.boolean().optional().describe("Include variable count per collection"),
      includeModes: z.boolean().optional().describe("Include detailed mode information"),
      namePattern: z.string().optional().describe("Filter by collection name pattern"),
      sortBy: z.enum(["name", "createdAt", "updatedAt", "variableCount"]).optional().describe("Sort field"),
      sortOrder: SortOrderSchema.optional().describe("Sort direction (asc/desc)"),
    },
    async (args) => {
      try {
        // Validate input with enhanced schema
        const validatedArgs = GetLocalVariableCollectionsInputSchema.parse(args);
        
        // Build query parameters for Figma
        const queryParams: any = {
          includeMetadata: true  // Always include metadata for task 1.3
        };
        
        if (validatedArgs.includeVariableCount) queryParams.includeVariableCount = validatedArgs.includeVariableCount;
        if (validatedArgs.includeModes) queryParams.includeModes = validatedArgs.includeModes;
        if (validatedArgs.namePattern) queryParams.namePattern = validatedArgs.namePattern;
        if (validatedArgs.sortBy) queryParams.sortBy = validatedArgs.sortBy;
        if (validatedArgs.sortOrder) queryParams.sortOrder = validatedArgs.sortOrder;
        
        // Execute Figma command
        const result = await sendCommandToFigma("get_local_variable_collections", queryParams);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
          const validationErrors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
          return {
            content: [
              {
                type: "text",
                text: `Error getting local variable collections - Validation failed: ${validationErrors}`,
              },
            ],
          };
        }
        
        // Handle other errors
        return {
          content: [
            {
              type: "text",
              text: `Error getting local variable collections: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  /**
   * Get a variable by its ID with enhanced error handling
   * 
   * Retrieves a specific variable by ID with robust error handling for non-existent IDs,
   * deleted variables, and invalid ID formats.
   * 
   * @category Variables
   * @phase 1
   * @complexity Low
   * @figmaApi figma.variables.getVariableById()
   * 
   * @param variableId - The unique variable ID (format validated)
   * 
   * @returns Variable details or descriptive error message
   * 
   * @example
   * ```typescript
   * // Get variable by valid ID
   * const variable = await get_variable_by_id({
   *   variableId: "I123:456"
   * });
   * ```
   * 
   * @throws {ValidationError} When variable ID format is invalid
   * @throws {NotFoundError} When variable ID does not exist
   * @throws {WebSocketError} When communication with Figma fails
   * @throws {FigmaAPIError} When Figma API returns an error
   */
  server.tool(
    "get_variable_by_id",
    "Get a variable by ID with enhanced error handling for non-existent IDs",
    {
      variableId: VariableIdSchema.describe("Variable ID (validated format)"),
    },
    async (args) => {
      try {
        // Validate variable ID format
        const validatedArgs = { variableId: VariableIdSchema.parse(args.variableId) };
        
        // Execute Figma command
        const result = await sendCommandToFigma("get_variable_by_id", validatedArgs);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
          const validationErrors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
          return {
            content: [
              {
                type: "text",
                text: `Error getting variable by ID - Invalid ID format: ${validationErrors}`,
              },
            ],
          };
        }
        
        // Enhanced error handling for specific cases
        const errorMessage = error instanceof Error ? error.message : String(error);
        let enhancedMessage = `Error getting variable by ID: ${errorMessage}`;
        
        // Provide more helpful messages for common errors
        if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
          enhancedMessage += '. This variable may have been deleted or the ID is incorrect.';
        } else if (errorMessage.includes('invalid') || errorMessage.includes('malformed')) {
          enhancedMessage += '. Please check the variable ID format (expected: alphanumeric with colons/hyphens).';
        } else if (errorMessage.includes('permission') || errorMessage.includes('access')) {
          enhancedMessage += '. You may not have permission to access this variable.';
        }
        
        return {
          content: [
            {
              type: "text",
              text: enhancedMessage,
            },
          ],
        };
      }
    }
  );

  /**
   * Get a variable collection by its ID with enhanced error handling
   * 
   * Retrieves a specific variable collection by ID with robust error handling for non-existent IDs,
   * deleted collections, and invalid ID formats.
   * 
   * @category Variables
   * @phase 1
   * @complexity Low
   * @figmaApi figma.variables.getVariableCollectionById()
   * 
   * @param variableCollectionId - The unique collection ID (format validated)
   * 
   * @returns Collection details with metadata or descriptive error message
   * 
   * @example
   * ```typescript
   * // Get collection by valid ID
   * const collection = await get_variable_collection_by_id({
   *   variableCollectionId: "VariableCollectionId:123:456"
   * });
   * ```
   * 
   * @throws {ValidationError} When collection ID format is invalid
   * @throws {NotFoundError} When collection ID does not exist
   * @throws {WebSocketError} When communication with Figma fails
   * @throws {FigmaAPIError} When Figma API returns an error
   */
  server.tool(
    "get_variable_collection_by_id",
    "Get a variable collection by ID with enhanced error handling for non-existent IDs",
    {
      variableCollectionId: VariableCollectionIdSchema.describe("Variable collection ID (validated format)"),
    },
    async (args) => {
      try {
        // Validate collection ID format
        const validatedArgs = { variableCollectionId: VariableCollectionIdSchema.parse(args.variableCollectionId) };
        
        // Execute Figma command
        const result = await sendCommandToFigma("get_variable_collection_by_id", validatedArgs);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
          const validationErrors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
          return {
            content: [
              {
                type: "text",
                text: `Error getting variable collection by ID - Invalid ID format: ${validationErrors}`,
              },
            ],
          };
        }
        
        // Enhanced error handling for specific cases
        const errorMessage = error instanceof Error ? error.message : String(error);
        let enhancedMessage = `Error getting variable collection by ID: ${errorMessage}`;
        
        // Provide more helpful messages for common errors
        if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
          enhancedMessage += '. This collection may have been deleted or the ID is incorrect.';
        } else if (errorMessage.includes('invalid') || errorMessage.includes('malformed')) {
          enhancedMessage += '. Please check the collection ID format (expected: alphanumeric with colons/hyphens).';
        } else if (errorMessage.includes('permission') || errorMessage.includes('access')) {
          enhancedMessage += '. You may not have permission to access this collection.';
        }
        
        return {
          content: [
            {
              type: "text",
              text: enhancedMessage,
            },
          ],
        };
      }
    }
  );
} 