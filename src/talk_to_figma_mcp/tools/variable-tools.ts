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
 * @version 1.4.0
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

// Schemas for Task 1.4 - Variable Binding Tools
const NodeIdSchema = z.string()
  .min(1, "Node ID cannot be empty")
  .regex(/^[a-zA-Z0-9_\-:]+$/, "Invalid node ID format");

const NodePropertySchema = z.enum([
  // Layout properties
  "width", "height", "x", "y", "rotation",
  // Visual properties  
  "opacity", "visible", "locked",
  // Text properties
  "characters", "fontSize", "lineHeight", "letterSpacing",
  // Effects and styling
  "cornerRadius", "strokeWeight"
], {
  errorMap: () => ({ message: "Invalid property. Must be a supported node property." })
});

const PaintTypeSchema = z.enum(["fills", "strokes"], {
  errorMap: () => ({ message: "Paint type must be 'fills' or 'strokes'" })
});

const SetBoundVariableInputSchema = z.object({
  nodeId: NodeIdSchema,
  property: NodePropertySchema,
  variableId: VariableIdSchema,
  variableType: VariableDataTypeSchema.optional(),
});

const SetBoundVariableForPaintInputSchema = z.object({
  nodeId: NodeIdSchema,
  paintType: PaintTypeSchema,
  paintIndex: z.number()
    .int("Paint index must be an integer")
    .min(0, "Paint index must be non-negative"),
  variableId: VariableIdSchema,
  variableType: VariableDataTypeSchema.optional(),
});

const RemoveBoundVariableInputSchema = z.object({
  nodeId: NodeIdSchema,
  property: NodePropertySchema.optional(),
  paintType: PaintTypeSchema.optional(),
  paintIndex: z.number()
    .int("Paint index must be an integer")
    .min(0, "Paint index must be non-negative")
    .optional(),
  forceCleanup: z.boolean().optional(),
  removeAllBindings: z.boolean().optional(),
}).refine(
  (data) => {
    // Must specify either property OR paint specification, but not both
    const hasProperty = data.property !== undefined;
    const hasPaint = data.paintType !== undefined || data.paintIndex !== undefined;
    const hasRemoveAll = data.removeAllBindings === true;
    
    return hasRemoveAll || (hasProperty && !hasPaint) || (!hasProperty && hasPaint);
  },
  {
    message: "Must specify either 'property' OR 'paintType/paintIndex' OR 'removeAllBindings', but not multiple options",
    path: ["property"]
  }
);

// Schemas for Task 1.5 - Variable Modification Tools
const UpdateVariableValueInputSchema = z.object({
  variableId: VariableIdSchema,
  value: VariableValueSchema,
  modeId: z.string()
    .min(1, "Mode ID cannot be empty")
    .regex(/^[a-zA-Z0-9_\-:]+$/, "Invalid mode ID format")
    .optional(),
  validateType: z.boolean()
    .optional()
    .default(true)
    .describe("Whether to validate that the value matches the variable's type"),
  description: z.string()
    .max(1000, "Description too long")
    .optional()
    .describe("Optional description for the value update"),
});

const UpdateVariableNameInputSchema = z.object({
  variableId: VariableIdSchema,
  newName: z.string()
    .min(1, "Variable name cannot be empty")
    .max(255, "Variable name too long")
    .regex(/^[a-zA-Z][a-zA-Z0-9_\-\s]*$/, "Variable name must start with a letter and contain only letters, numbers, spaces, hyphens, and underscores"),
  checkDuplicates: z.boolean()
    .optional()
    .default(true)
    .describe("Whether to check for duplicate names within the collection"),
  collectionId: z.string()
    .regex(/^[a-zA-Z0-9_\-:]+$/, "Invalid collection ID format")
    .optional()
    .describe("Collection ID to check for duplicates (optional, auto-detected if not provided)"),
});

const DeleteVariableInputSchema = z.object({
  variableId: VariableIdSchema,
  force: z.boolean()
    .optional()
    .default(false)
    .describe("Force delete even if variable is referenced by other elements"),
  cleanupReferences: z.boolean()
    .optional()
    .default(true)
    .describe("Clean up references to this variable before deletion"),
  replacement: z.object({
    variableId: VariableIdSchema.optional(),
    staticValue: VariableValueSchema.optional(),
  }).optional().describe("Optional replacement for variable references"),
});

const DeleteVariableCollectionInputSchema = z.object({
  collectionId: VariableCollectionIdSchema,
  force: z.boolean()
    .optional()
    .default(false)
    .describe("Force delete even if collection contains referenced variables"),
  cascadeDelete: z.boolean()
    .optional()
    .default(true)
    .describe("Delete all variables in the collection (cascade delete)"),
  cleanupReferences: z.boolean()
    .optional()
    .default(true)
    .describe("Clean up all variable references before deletion"),
  replacement: z.object({
    collectionId: VariableCollectionIdSchema.optional(),
    variableMappings: z.record(z.string(), VariableIdSchema).optional(),
  }).optional().describe("Optional replacement collection and variable mappings"),
});

// Schemas for Task 1.6 - Advanced Variable Management Tools
const GetVariableReferencesInputSchema = z.object({
  variableId: VariableIdSchema,
  includeMetadata: z.boolean()
    .optional()
    .default(true)
    .describe("Include metadata about each reference (node type, property, etc.)"),
  includeNodeDetails: z.boolean()
    .optional()
    .default(false)
    .describe("Include detailed node information for each reference"),
  groupByProperty: z.boolean()
    .optional()
    .default(false)
    .describe("Group references by property type"),
  includeIndirect: z.boolean()
    .optional()
    .default(false)
    .describe("Include indirect references (e.g., through component instances)"),
});

const ModeIdSchema = z.string()
  .min(1, "Mode ID cannot be empty")
  .regex(/^[a-zA-Z0-9_\-:]+$/, "Invalid mode ID format");

const SetVariableModeValueInputSchema = z.object({
  variableId: VariableIdSchema,
  modeId: ModeIdSchema,
  value: VariableValueSchema,
  validateType: z.boolean()
    .optional()
    .default(true)
    .describe("Whether to validate that the value matches the variable's type"),
  overwriteExisting: z.boolean()
    .optional()
    .default(true)
    .describe("Whether to overwrite existing value for this mode"),
});

const CreateVariableModeInputSchema = z.object({
  collectionId: VariableCollectionIdSchema,
  modeName: z.string()
    .min(1, "Mode name cannot be empty")
    .max(255, "Mode name too long")
    .regex(/^[a-zA-Z][a-zA-Z0-9_\-\s]*$/, "Mode name must start with a letter and contain only letters, numbers, spaces, hyphens, and underscores"),
  copyFromModeId: ModeIdSchema.optional()
    .describe("Copy values from existing mode (optional)"),
  setAsDefault: z.boolean()
    .optional()
    .default(false)
    .describe("Set this mode as the collection's default mode"),
  description: z.string()
    .max(1000, "Description too long")
    .optional()
    .describe("Optional description for the mode"),
});

const DeleteVariableModeInputSchema = z.object({
  collectionId: VariableCollectionIdSchema,
  modeId: ModeIdSchema,
  force: z.boolean()
    .optional()
    .default(false)
    .describe("Force delete even if mode is referenced"),
  replacementModeId: ModeIdSchema.optional()
    .describe("Mode to use as replacement for existing references"),
  cleanupReferences: z.boolean()
    .optional()
    .default(true)
    .describe("Clean up references to this mode before deletion"),
});

const ReorderVariableModesInputSchema = z.object({
  collectionId: VariableCollectionIdSchema,
  orderedModeIds: z.array(ModeIdSchema)
    .min(1, "Must provide at least one mode ID")
    .describe("Array of mode IDs in the desired order"),
  preserveValues: z.boolean()
    .optional()
    .default(true)
    .describe("Preserve all existing values during reordering"),
  validateIntegrity: z.boolean()
    .optional()
    .default(true)
    .describe("Validate collection integrity after reordering"),
});

// Schemas for Task 1.7 - Variable Publishing Tools
const PublishVariableCollectionInputSchema = z.object({
  collectionId: VariableCollectionIdSchema,
  description: z.string()
    .max(2000, "Description too long")
    .optional()
    .describe("Optional description for the published collection"),
  validatePermissions: z.boolean()
    .optional()
    .default(true)
    .describe("Validate publishing permissions before attempting to publish"),
  forcePublish: z.boolean()
    .optional()
    .default(false)
    .describe("Force publish even if collection has warnings"),
  includeAllModes: z.boolean()
    .optional()
    .default(true)
    .describe("Include all modes in the published collection"),
  publishingOptions: z.object({
    makePublic: z.boolean().optional().default(false),
    allowEditing: z.boolean().optional().default(false),
    requirePermission: z.boolean().optional().default(true),
  }).optional().describe("Advanced publishing configuration options"),
});

const GetPublishedVariablesInputSchema = z.object({
  libraryKey: z.string()
    .min(1, "Library key cannot be empty")
    .optional()
    .describe("Specific library key to filter published variables"),
  includeMetadata: z.boolean()
    .optional()
    .default(true)
    .describe("Include metadata about published variables"),
  filterByType: z.enum(["BOOLEAN", "FLOAT", "STRING", "COLOR"])
    .optional()
    .describe("Filter variables by their type"),
  filterByCollection: VariableCollectionIdSchema.optional()
    .describe("Filter variables by collection ID"),
  includeUsageStats: z.boolean()
    .optional()
    .default(false)
    .describe("Include usage statistics for published variables"),
  sortBy: z.enum(["name", "datePublished", "usageCount", "type"])
    .optional()
    .default("name")
    .describe("Sort published variables by specified criteria"),
  sortOrder: z.enum(["asc", "desc"])
    .optional()
    .default("asc")
    .describe("Sort order for published variables"),
  limit: z.number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .default(100)
    .describe("Maximum number of published variables to return"),
  offset: z.number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .describe("Offset for pagination of published variables"),
});

/**
 * Property-Variable Type Compatibility Map
 * Defines which variable types are compatible with which node properties
 */
const PROPERTY_COMPATIBILITY: Record<string, string[]> = {
  // Numeric properties - compatible with FLOAT
  "width": ["FLOAT"],
  "height": ["FLOAT"],
  "x": ["FLOAT"],
  "y": ["FLOAT"],
  "rotation": ["FLOAT"],
  "opacity": ["FLOAT"],
  "fontSize": ["FLOAT"],
  "lineHeight": ["FLOAT"],
  "letterSpacing": ["FLOAT"],
  "cornerRadius": ["FLOAT"],
  "strokeWeight": ["FLOAT"],
  
  // Boolean properties - compatible with BOOLEAN
  "visible": ["BOOLEAN"],
  "locked": ["BOOLEAN"],
  
  // Text properties - compatible with STRING
  "characters": ["STRING"],
};

/**
 * Validate property-variable type compatibility
 * @param property - The node property name
 * @param variableType - The variable data type
 * @returns true if compatible, false otherwise
 */
function validatePropertyCompatibility(property: string, variableType: string): boolean {
  const compatibleTypes = PROPERTY_COMPATIBILITY[property];
  return compatibleTypes ? compatibleTypes.includes(variableType) : false;
}

/**
 * Register variable-related tools to the MCP server
 * 
 * This function registers all Phase 1 Variable Tools with complete TDD validation.
 * Implements robust error handling, filtering, and WebSocket communication.
 * 
 * @param server - The MCP server instance
 * @since 1.4.0
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

  /**
   * Bind a variable to a node property with compatibility validation
   * 
   * Binds a variable to a specific property of a node with comprehensive validation
   * of property-variable type compatibility. Supports all bindable node properties.
   * 
   * @category Variables
   * @phase 1
   * @complexity Medium
   * @figmaApi figma.variables.setBoundVariable()
   * 
   * @param nodeId - The target node ID (format validated)
   * @param property - The node property to bind to (validated against supported properties)
   * @param variableId - The variable ID to bind (format validated)
   * @param variableType - The variable type for compatibility validation (optional)
   * 
   * @returns Success message with binding details or error message
   * 
   * @example
   * ```typescript
   * // Bind a FLOAT variable to width property
   * const result = await set_bound_variable({
   *   nodeId: "node-123",
   *   property: "width",
   *   variableId: "var-456",
   *   variableType: "FLOAT"
   * });
   * 
   * // Bind a STRING variable to text content
   * const textResult = await set_bound_variable({
   *   nodeId: "text-node-123",
   *   property: "characters",
   *   variableId: "text-var-456",
   *   variableType: "STRING"
   * });
   * 
   * // Bind a BOOLEAN variable to visibility
   * const visibilityResult = await set_bound_variable({
   *   nodeId: "node-123",
   *   property: "visible",
   *   variableId: "visibility-var-456",
   *   variableType: "BOOLEAN"
   * });
   * ```
   * 
   * @throws {ValidationError} When input parameters are invalid
   * @throws {CompatibilityError} When property and variable types are incompatible
   * @throws {NotFoundError} When node or variable ID does not exist
   * @throws {WebSocketError} When communication with Figma fails
   * @throws {FigmaAPIError} When Figma API returns an error
   */
  server.tool(
    "set_bound_variable",
    "Bind a variable to a node property with compatibility validation",
    {
      nodeId: NodeIdSchema.describe("Target node ID (validated format)"),
      property: NodePropertySchema.describe("Node property to bind to"),
      variableId: VariableIdSchema.describe("Variable ID to bind (validated format)"),
      variableType: VariableDataTypeSchema.optional().describe("Variable type for compatibility validation"),
    },
    async (args) => {
      try {
        // Validate input with enhanced Zod schema
        const validatedArgs = SetBoundVariableInputSchema.parse(args);
        
        // Validate property-variable type compatibility if type is provided
        if (validatedArgs.variableType) {
          const isCompatible = validatePropertyCompatibility(
            validatedArgs.property,
            validatedArgs.variableType
          );
          
          if (!isCompatible) {
            const compatibleTypes = PROPERTY_COMPATIBILITY[validatedArgs.property] || [];
            throw new Error(
              `Property '${validatedArgs.property}' is incompatible with variable type '${validatedArgs.variableType}'. ` +
              `Compatible types: ${compatibleTypes.join(', ')}`
            );
          }
        }
        
        // Execute Figma command
        const result = await sendCommandToFigma("set_bound_variable", validatedArgs);

        return {
          content: [
            {
              type: "text",
              text: `Variable "${validatedArgs.variableId}" bound successfully to property "${validatedArgs.property}" of node "${validatedArgs.nodeId}": ${JSON.stringify(result)}`,
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
                text: `Error binding variable - Validation failed: ${validationErrors}`,
              },
            ],
          };
        }
        
        // Handle other errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        let enhancedMessage = `Error binding variable: ${errorMessage}`;
        
        // Provide more helpful messages for common errors
        if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
          enhancedMessage += '. Please verify that both the node and variable exist.';
        } else if (errorMessage.includes('permission') || errorMessage.includes('access')) {
          enhancedMessage += '. You may not have permission to modify this node or variable.';
        } else if (errorMessage.includes('incompatible')) {
          enhancedMessage += '. Check the property-variable type compatibility.';
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
   * Bind a COLOR variable to paint properties (fills/strokes)
   * 
   * Specialized tool for binding COLOR variables to paint properties with paint-specific
   * validation and support for multiple paint layers.
   * 
   * @category Variables
   * @phase 1
   * @complexity Medium
   * @figmaApi figma.variables.setBoundVariableForPaint()
   * 
   * @param nodeId - The target node ID (format validated)
   * @param paintType - Type of paint to bind to ("fills" or "strokes")
   * @param paintIndex - Index of the paint layer (0-based, non-negative)
   * @param variableId - The COLOR variable ID to bind (format validated)
   * @param variableType - Must be "COLOR" for paint binding (optional validation)
   * 
   * @returns Success message with paint binding details or error message
   * 
   * @example
   * ```typescript
   * // Bind a color variable to the first fill
   * const result = await set_bound_variable_for_paint({
   *   nodeId: "shape-123",
   *   paintType: "fills",
   *   paintIndex: 0,
   *   variableId: "primary-color-var-456",
   *   variableType: "COLOR"
   * });
   * 
   * // Bind a color variable to the stroke
   * const strokeResult = await set_bound_variable_for_paint({
   *   nodeId: "shape-123",
   *   paintType: "strokes",
   *   paintIndex: 0,
   *   variableId: "border-color-var-456"
   * });
   * 
   * // Bind to a specific fill layer (third layer)
   * const layerResult = await set_bound_variable_for_paint({
   *   nodeId: "complex-shape-123",
   *   paintType: "fills",
   *   paintIndex: 2,
   *   variableId: "accent-color-var-456"
   * });
   * ```
   * 
   * @throws {ValidationError} When input parameters are invalid
   * @throws {TypeError} When non-COLOR variable is used for paint binding
   * @throws {RangeError} When paint index is out of range
   * @throws {NotFoundError} When node or variable ID does not exist
   * @throws {WebSocketError} When communication with Figma fails
   * @throws {FigmaAPIError} When Figma API returns an error
   */
  server.tool(
    "set_bound_variable_for_paint",
    "Bind a COLOR variable to paint properties (fills/strokes) with paint-specific validation",
    {
      nodeId: NodeIdSchema.describe("Target node ID (validated format)"),
      paintType: PaintTypeSchema.describe("Type of paint ('fills' or 'strokes')"),
      paintIndex: z.number().min(0).describe("Paint layer index (0-based, non-negative)"),
      variableId: VariableIdSchema.describe("COLOR variable ID to bind (validated format)"),
      variableType: VariableDataTypeSchema.optional().describe("Variable type (must be COLOR for paint binding)"),
    },
    async (args) => {
      try {
        // Validate input with enhanced Zod schema
        const validatedArgs = SetBoundVariableForPaintInputSchema.parse(args);
        
        // Validate that variable type is COLOR if provided
        if (validatedArgs.variableType && validatedArgs.variableType !== 'COLOR') {
          throw new Error(
            `COLOR variable required for paint binding. Received: ${validatedArgs.variableType}`
          );
        }
        
        // Execute Figma command
        const result = await sendCommandToFigma("set_bound_variable_for_paint", validatedArgs);

        return {
          content: [
            {
              type: "text",
              text: `COLOR variable "${validatedArgs.variableId}" bound successfully to ${validatedArgs.paintType}[${validatedArgs.paintIndex}] of node "${validatedArgs.nodeId}": ${JSON.stringify(result)}`,
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
                text: `Error binding variable to paint - Validation failed: ${validationErrors}`,
              },
            ],
          };
        }
        
        // Handle other errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        let enhancedMessage = `Error binding variable to paint: ${errorMessage}`;
        
        // Provide more helpful messages for common errors
        if (errorMessage.includes('out of range') || errorMessage.includes('index')) {
          enhancedMessage += '. The paint index may be out of range for this node.';
        } else if (errorMessage.includes('not support') || errorMessage.includes('incompatible')) {
          enhancedMessage += '. This node type may not support paint binding.';
        } else if (errorMessage.includes('COLOR variable required')) {
          enhancedMessage += '. Only COLOR variables can be bound to paint properties.';
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
   * Remove variable binding from node properties with reference cleanup
   * 
   * Removes variable bindings from node properties or paint with comprehensive cleanup
   * of references. Supports selective unbinding and batch operations.
   * 
   * @category Variables
   * @phase 1
   * @complexity Medium
   * @figmaApi figma.variables.removeBoundVariable()
   * 
   * @param nodeId - The target node ID (format validated)
   * @param property - The node property to unbind (optional, for property binding)
   * @param paintType - Type of paint to unbind ("fills" or "strokes", optional for paint binding)
   * @param paintIndex - Index of the paint layer (optional, for paint binding)
   * @param forceCleanup - Force cleanup of all references (optional)
   * @param removeAllBindings - Remove all bindings from the node (optional)
   * 
   * @returns Success message with unbinding details and cleanup info or error message
   * 
   * @example
   * ```typescript
   * // Remove binding from a specific property
   * const result = await remove_bound_variable({
   *   nodeId: "node-123",
   *   property: "width"
   * });
   * 
   * // Remove binding from paint property
   * const paintResult = await remove_bound_variable({
   *   nodeId: "shape-123",
   *   paintType: "fills",
   *   paintIndex: 0
   * });
   * 
   * // Remove all bindings from a node
   * const allResult = await remove_bound_variable({
   *   nodeId: "node-123",
   *   removeAllBindings: true
   * });
   * 
   * // Force cleanup of references
   * const cleanupResult = await remove_bound_variable({
   *   nodeId: "node-123",
   *   property: "opacity",
   *   forceCleanup: true
   * });
   * ```
   * 
   * @throws {ValidationError} When input parameters are invalid
   * @throws {ArgumentError} When conflicting parameters are provided
   * @throws {NotFoundError} When node ID or binding does not exist
   * @throws {WebSocketError} When communication with Figma fails
   * @throws {FigmaAPIError} When Figma API returns an error
   */
  server.tool(
    "remove_bound_variable",
    "Remove variable binding from node properties with reference cleanup",
    {
      nodeId: NodeIdSchema.describe("Target node ID (validated format)"),
      property: NodePropertySchema.optional().describe("Node property to unbind (for property binding)"),
      paintType: PaintTypeSchema.optional().describe("Paint type to unbind (for paint binding)"),
      paintIndex: z.number().min(0).optional().describe("Paint layer index (for paint binding)"),
      forceCleanup: z.boolean().optional().describe("Force cleanup of all references"),
      removeAllBindings: z.boolean().optional().describe("Remove all bindings from the node"),
    },
    async (args) => {
      try {
        // Validate input with enhanced Zod schema
        const validatedArgs = RemoveBoundVariableInputSchema.parse(args);
        
        // Execute Figma command
        const result = await sendCommandToFigma("remove_bound_variable", validatedArgs);

        // Build success message based on operation type
        let successMessage = '';
        if (validatedArgs.removeAllBindings) {
          successMessage = `All variable bindings removed successfully from node "${validatedArgs.nodeId}"`;
        } else if (validatedArgs.property) {
          successMessage = `Variable binding removed successfully from property "${validatedArgs.property}" of node "${validatedArgs.nodeId}"`;
        } else if (validatedArgs.paintType) {
          successMessage = `Variable binding removed successfully from ${validatedArgs.paintType}[${validatedArgs.paintIndex}] of node "${validatedArgs.nodeId}"`;
        }

        return {
          content: [
            {
              type: "text",
              text: `${successMessage}: ${JSON.stringify(result)}`,
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
                text: `Error removing variable binding - Validation failed: ${validationErrors}`,
              },
            ],
          };
        }
        
        // Handle other errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        let enhancedMessage = `Error removing variable binding: ${errorMessage}`;
        
        // Provide more helpful messages for common errors
        if (errorMessage.includes('No binding found') || errorMessage.includes('not bound')) {
          enhancedMessage += '. The specified property or paint may not have a variable binding.';
        } else if (errorMessage.includes('cleanup') || errorMessage.includes('references')) {
          enhancedMessage += '. There may be issues with cleaning up variable references.';
        } else if (errorMessage.includes('permission') || errorMessage.includes('access')) {
          enhancedMessage += '. You may not have permission to modify bindings on this node.';
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
   * Update the value of an existing variable with type validation
   * 
   * Updates the value of a variable in the specified mode with comprehensive type validation.
   * Supports all variable types (BOOLEAN, FLOAT, STRING, COLOR) and ensures type compatibility.
   * 
   * @category Variables
   * @phase 1
   * @complexity Medium
   * @figmaApi figma.variables.setValueForVariable()
   * 
   * @param variableId - The unique variable ID (format validated)
   * @param value - New value for the variable (type validated)
   * @param modeId - Mode ID for the value (optional, defaults to default mode)
   * @param validateType - Whether to validate value type compatibility (optional, default true)
   * @param description - Optional description for the update operation
   * 
   * @returns Success message with update details or error message
   * 
   * @example
   * ```typescript
   * // Update a string variable
   * const result = await update_variable_value({
   *   variableId: "var-123",
   *   value: "New text content"
   * });
   * 
   * // Update a color variable
   * const colorResult = await update_variable_value({
   *   variableId: "color-var-456",
   *   value: { r: 0.8, g: 0.2, b: 0.4, a: 1.0 }
   * });
   * 
   * // Update with specific mode and validation
   * const modeResult = await update_variable_value({
   *   variableId: "theme-var-789",
   *   value: true,
   *   modeId: "dark-mode",
   *   validateType: true,
   *   description: "Updated for dark theme"
   * });
   * ```
   * 
   * @throws {ValidationError} When input parameters are invalid
   * @throws {TypeError} When value type doesn't match variable type
   * @throws {NotFoundError} When variable or mode ID does not exist
   * @throws {WebSocketError} When communication with Figma fails
   * @throws {FigmaAPIError} When Figma API returns an error
   */
  server.tool(
    "update_variable_value",
    "Update variable value with comprehensive type validation",
    {
      variableId: VariableIdSchema.describe("Unique variable ID (format validated)"),
      value: VariableValueSchema.describe("New value for the variable (type validated)"),
      modeId: z.string().optional().describe("Mode ID for the value (optional)"),
      validateType: z.boolean().optional().describe("Validate value type compatibility (default: true)"),
      description: z.string().optional().describe("Optional description for the update"),
    },
    async (args) => {
      try {
        // Validate input with enhanced Zod schema
        const validatedArgs = UpdateVariableValueInputSchema.parse(args);
        
        // Additional business logic validation for value types
        if (validatedArgs.validateType !== false) {
          // Validate COLOR values have required properties
          if (typeof validatedArgs.value === 'object' && validatedArgs.value !== null && 'r' in validatedArgs.value) {
            const colorValue = validatedArgs.value as any;
            if (typeof colorValue.r !== 'number' || typeof colorValue.g !== 'number' || typeof colorValue.b !== 'number') {
              throw new Error('COLOR values must have numeric r, g, b properties');
            }
            if (colorValue.r < 0 || colorValue.r > 1 || colorValue.g < 0 || colorValue.g > 1 || colorValue.b < 0 || colorValue.b > 1) {
              throw new Error('COLOR values must be in range 0-1 for r, g, b components');
            }
          }
        }
        
        // Execute Figma command
        const result = await sendCommandToFigma("update_variable_value", {
          variableId: validatedArgs.variableId,
          value: validatedArgs.value,
          modeId: validatedArgs.modeId,
          validateType: validatedArgs.validateType,
          description: validatedArgs.description || "",
        });

        return {
          content: [
            {
              type: "text",
              text: `Variable "${validatedArgs.variableId}" value updated successfully: ${JSON.stringify(result)}`,
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
                text: `Error updating variable value - Validation failed: ${validationErrors}`,
              },
            ],
          };
        }
        
        // Handle other errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        let enhancedMessage = `Error updating variable value: ${errorMessage}`;
        
        // Provide more helpful messages for common errors
        if (errorMessage.includes('type mismatch') || errorMessage.includes('incompatible type')) {
          enhancedMessage += '. The value type may not match the variable\'s expected type.';
        } else if (errorMessage.includes('MODE_NOT_FOUND') || errorMessage.includes('mode')) {
          enhancedMessage += '. The specified mode ID may not exist in this variable\'s collection.';
        } else if (errorMessage.includes('VARIABLE_NOT_FOUND') || errorMessage.includes('not found')) {
          enhancedMessage += '. The variable ID may not exist or may have been deleted.';
        } else if (errorMessage.includes('COLOR values')) {
          enhancedMessage += '. Please ensure COLOR values use proper format: {r: 0-1, g: 0-1, b: 0-1, a?: 0-1}.';
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
   * Update the name of an existing variable with duplicate checking
   * 
   * Updates the name of a variable with optional duplicate checking within the collection.
   * Ensures name uniqueness and follows Figma naming conventions.
   * 
   * @category Variables
   * @phase 1
   * @complexity Medium
   * @figmaApi figma.variables.setNameForVariable()
   * 
   * @param variableId - The unique variable ID (format validated)
   * @param newName - New name for the variable (1-255 chars, naming conventions validated)
   * @param checkDuplicates - Whether to check for duplicate names (optional, default true)
   * @param collectionId - Collection ID for duplicate checking (optional, auto-detected)
   * 
   * @returns Success message with rename details or error message
   * 
   * @example
   * ```typescript
   * // Simple rename
   * const result = await update_variable_name({
   *   variableId: "var-123",
   *   newName: "updated-variable-name"
   * });
   * 
   * // Rename with duplicate checking disabled
   * const noCheckResult = await update_variable_name({
   *   variableId: "var-456",
   *   newName: "new-name",
   *   checkDuplicates: false
   * });
   * 
   * // Rename with explicit collection
   * const explicitResult = await update_variable_name({
   *   variableId: "var-789",
   *   newName: "collection-specific-name",
   *   checkDuplicates: true,
   *   collectionId: "collection-123"
   * });
   * ```
   * 
   * @throws {ValidationError} When input parameters are invalid
   * @throws {DuplicateNameError} When name already exists in collection
   * @throws {NotFoundError} When variable or collection ID does not exist
   * @throws {WebSocketError} When communication with Figma fails
   * @throws {FigmaAPIError} When Figma API returns an error
   */
  server.tool(
    "update_variable_name",
    "Update variable name with duplicate checking and validation",
    {
      variableId: VariableIdSchema.describe("Unique variable ID (format validated)"),
      newName: z.string().min(1).describe("New variable name (1-255 chars, naming conventions)"),
      checkDuplicates: z.boolean().optional().describe("Check for duplicate names (default: true)"),
      collectionId: z.string().optional().describe("Collection ID for duplicate checking (auto-detected)"),
    },
    async (args) => {
      try {
        // Validate input with enhanced Zod schema
        const validatedArgs = UpdateVariableNameInputSchema.parse(args);
        
        // Execute Figma command
        const result = await sendCommandToFigma("update_variable_name", {
          variableId: validatedArgs.variableId,
          newName: validatedArgs.newName,
          checkDuplicates: validatedArgs.checkDuplicates,
          collectionId: validatedArgs.collectionId,
        });

        return {
          content: [
            {
              type: "text",
              text: `Variable "${validatedArgs.variableId}" renamed to "${validatedArgs.newName}" successfully: ${JSON.stringify(result)}`,
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
                text: `Error updating variable name - Validation failed: ${validationErrors}`,
              },
            ],
          };
        }
        
        // Handle other errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        let enhancedMessage = `Error updating variable name: ${errorMessage}`;
        
        // Provide more helpful messages for common errors
        if (errorMessage.includes('DUPLICATE_NAME') || errorMessage.includes('already exists')) {
          enhancedMessage += '. A variable with this name already exists in the collection.';
        } else if (errorMessage.includes('INVALID_NAME') || errorMessage.includes('name format')) {
          enhancedMessage += '. The name must start with a letter and contain only letters, numbers, spaces, hyphens, and underscores.';
        } else if (errorMessage.includes('VARIABLE_NOT_FOUND') || errorMessage.includes('not found')) {
          enhancedMessage += '. The variable ID may not exist or may have been deleted.';
        } else if (errorMessage.includes('COLLECTION_NOT_FOUND')) {
          enhancedMessage += '. The specified collection ID may not exist.';
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
   * Delete a variable with reference management and cleanup
   * 
   * Deletes a variable with comprehensive reference management, cleanup options,
   * and optional replacement strategies to maintain design system integrity.
   * 
   * @category Variables
   * @phase 1
   * @complexity High
   * @figmaApi figma.variables.deleteVariable()
   * 
   * @param variableId - The unique variable ID to delete (format validated)
   * @param force - Force deletion even if variable is referenced (optional, default false)
   * @param cleanupReferences - Clean up references before deletion (optional, default true)
   * @param replacement - Optional replacement variable or static value for references
   * 
   * @returns Success message with deletion details and cleanup info or error message
   * 
   * @example
   * ```typescript
   * // Safe deletion with reference cleanup
   * const result = await delete_variable({
   *   variableId: "var-123"
   * });
   * 
   * // Force deletion of referenced variable
   * const forceResult = await delete_variable({
   *   variableId: "var-456",
   *   force: true,
   *   cleanupReferences: true
   * });
   * 
   * // Delete with replacement variable
   * const replaceResult = await delete_variable({
   *   variableId: "old-var-789",
   *   replacement: {
   *     variableId: "new-var-101"
   *   }
   * });
   * 
   * // Delete with static value replacement
   * const staticResult = await delete_variable({
   *   variableId: "temp-var-111",
   *   replacement: {
   *     staticValue: "#FF0000"
   *   }
   * });
   * ```
   * 
   * @throws {ValidationError} When input parameters are invalid
   * @throws {ReferenceError} When variable is referenced and force is false
   * @throws {NotFoundError} When variable ID does not exist
   * @throws {WebSocketError} When communication with Figma fails
   * @throws {FigmaAPIError} When Figma API returns an error
   */
  server.tool(
    "delete_variable",
    "Delete variable with comprehensive reference management and cleanup",
    {
      variableId: VariableIdSchema.describe("Unique variable ID to delete (format validated)"),
      force: z.boolean().optional().describe("Force deletion even if referenced (default: false)"),
      cleanupReferences: z.boolean().optional().describe("Clean up references before deletion (default: true)"),
      replacement: z.object({
        variableId: VariableIdSchema.optional(),
        staticValue: VariableValueSchema.optional(),
      }).optional().describe("Optional replacement for variable references"),
    },
    async (args) => {
      try {
        // Validate input with enhanced Zod schema
        const validatedArgs = DeleteVariableInputSchema.parse(args);
        
        // Validate replacement if provided
        if (validatedArgs.replacement) {
          const hasVariableId = validatedArgs.replacement.variableId !== undefined;
          const hasStaticValue = validatedArgs.replacement.staticValue !== undefined;
          
          if (hasVariableId && hasStaticValue) {
            throw new Error('Cannot specify both replacement variableId and staticValue. Choose one.');
          }
          
          if (!hasVariableId && !hasStaticValue) {
            throw new Error('Replacement must specify either variableId or staticValue.');
          }
        }
        
        // Execute Figma command
        const result = await sendCommandToFigma("delete_variable", {
          variableId: validatedArgs.variableId,
          force: validatedArgs.force,
          cleanupReferences: validatedArgs.cleanupReferences,
          replacement: validatedArgs.replacement,
        });

        // Build success message with cleanup details
        const cleanupInfo = (result as any).referencesCleanedUp ? ` (${(result as any).referencesCleanedUp} references cleaned up)` : '';
        const replacementInfo = validatedArgs.replacement ? ' with replacement applied' : '';
        
        return {
          content: [
            {
              type: "text",
              text: `Variable "${validatedArgs.variableId}" deleted successfully${replacementInfo}${cleanupInfo}: ${JSON.stringify(result)}`,
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
                text: `Error deleting variable - Validation failed: ${validationErrors}`,
              },
            ],
          };
        }
        
        // Handle other errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        let enhancedMessage = `Error deleting variable: ${errorMessage}`;
        
        // Provide more helpful messages for common errors
        if (errorMessage.includes('VARIABLE_IN_USE') || errorMessage.includes('referenced')) {
          enhancedMessage += '. The variable is still referenced by other elements. Use force=true to delete anyway or provide a replacement.';
        } else if (errorMessage.includes('VARIABLE_NOT_FOUND') || errorMessage.includes('not found')) {
          enhancedMessage += '. The variable ID may not exist or may have already been deleted.';
        } else if (errorMessage.includes('replacement') || errorMessage.includes('both replacement')) {
          enhancedMessage += '. Check replacement configuration - use either variableId OR staticValue, not both.';
        } else if (errorMessage.includes('cleanup') || errorMessage.includes('references')) {
          enhancedMessage += '. There may be issues with cleaning up variable references.';
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
   * Delete a variable collection with cascade delete and reference management
   * 
   * Deletes an entire variable collection with all its variables, comprehensive
   * reference cleanup, and optional replacement strategies for maintaining design integrity.
   * 
   * @category Variables
   * @phase 1
   * @complexity High
   * @figmaApi figma.variables.deleteVariableCollection()
   * 
   * @param collectionId - The unique collection ID to delete (format validated)
   * @param force - Force deletion even if variables are referenced (optional, default false)
   * @param cascadeDelete - Delete all variables in collection (optional, default true)
   * @param cleanupReferences - Clean up all variable references (optional, default true)
   * @param replacement - Optional replacement collection and variable mappings
   * 
   * @returns Success message with deletion details and cleanup statistics or error message
   * 
   * @example
   * ```typescript
   * // Safe collection deletion
   * const result = await delete_variable_collection({
   *   collectionId: "collection-123"
   * });
   * 
   * // Force deletion of collection with referenced variables
   * const forceResult = await delete_variable_collection({
   *   collectionId: "collection-456",
   *   force: true,
   *   cascadeDelete: true,
   *   cleanupReferences: true
   * });
   * 
   * // Delete with replacement collection
   * const replaceResult = await delete_variable_collection({
   *   collectionId: "old-collection-789",
   *   replacement: {
   *     collectionId: "new-collection-101",
   *     variableMappings: {
   *       "old-var-1": "new-var-1",
   *       "old-var-2": "new-var-2"
   *     }
   *   }
   * });
   * ```
   * 
   * @throws {ValidationError} When input parameters are invalid
   * @throws {ReferenceError} When collection variables are referenced and force is false
   * @throws {NotFoundError} When collection ID does not exist
   * @throws {WebSocketError} When communication with Figma fails
   * @throws {FigmaAPIError} When Figma API returns an error
   */
  server.tool(
    "delete_variable_collection",
    "Delete variable collection with cascade delete and comprehensive reference management",
    {
      collectionId: VariableCollectionIdSchema.describe("Unique collection ID to delete (format validated)"),
      force: z.boolean().optional().describe("Force deletion even if variables are referenced (default: false)"),
      cascadeDelete: z.boolean().optional().describe("Delete all variables in collection (default: true)"),
      cleanupReferences: z.boolean().optional().describe("Clean up all variable references (default: true)"),
      replacement: z.object({
        collectionId: VariableCollectionIdSchema.optional(),
        variableMappings: z.record(z.string(), VariableIdSchema).optional(),
      }).optional().describe("Optional replacement collection and variable mappings"),
    },
    async (args) => {
      try {
        // Validate input with enhanced Zod schema
        const validatedArgs = DeleteVariableCollectionInputSchema.parse(args);
        
        // Validate replacement if provided
        if (validatedArgs.replacement) {
          const hasCollectionId = validatedArgs.replacement.collectionId !== undefined;
          const hasMappings = validatedArgs.replacement.variableMappings !== undefined;
          
          if (hasMappings && !hasCollectionId) {
            throw new Error('Variable mappings require a replacement collection ID.');
          }
        }
        
        // Execute Figma command
        const result = await sendCommandToFigma("delete_variable_collection", {
          collectionId: validatedArgs.collectionId,
          force: validatedArgs.force,
          cascadeDelete: validatedArgs.cascadeDelete,
          cleanupReferences: validatedArgs.cleanupReferences,
          replacement: validatedArgs.replacement,
        });

        // Build success message with statistics
        const variableCount = (result as any).variablesDeleted || 0;
        const referencesCount = (result as any).referencesCleanedUp || 0;
        const replacementInfo = validatedArgs.replacement ? ' with replacement applied' : '';
        
        return {
          content: [
            {
              type: "text",
              text: `Variable collection "${validatedArgs.collectionId}" deleted successfully${replacementInfo}. Variables deleted: ${variableCount}, References cleaned: ${referencesCount}. Details: ${JSON.stringify(result)}`,
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
                text: `Error deleting variable collection - Validation failed: ${validationErrors}`,
              },
            ],
          };
        }
        
        // Handle other errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        let enhancedMessage = `Error deleting variable collection: ${errorMessage}`;
        
        // Provide more helpful messages for common errors
        if (errorMessage.includes('VARIABLES_IN_USE') || errorMessage.includes('referenced')) {
          enhancedMessage += '. Some variables in the collection are still referenced. Use force=true to delete anyway or provide replacement mappings.';
        } else if (errorMessage.includes('COLLECTION_NOT_FOUND') || errorMessage.includes('not found')) {
          enhancedMessage += '. The collection ID may not exist or may have already been deleted.';
        } else if (errorMessage.includes('Variable mappings require') || errorMessage.includes('replacement collection')) {
          enhancedMessage += '. Variable mappings can only be used with a replacement collection ID.';
        } else if (errorMessage.includes('cascade') || errorMessage.includes('cleanup')) {
          enhancedMessage += '. There may be issues with the cascade delete or reference cleanup process.';
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
   * Get comprehensive references analysis for a variable
   * 
   * Analyzes where a variable is used throughout the document, providing detailed
   * reference information including node types, properties, and usage context.
   * 
   * @category Variables
   * @phase 1
   * @complexity High
   * @figmaApi figma.variables.getVariableReferences()
   * 
   * @param variableId - The unique variable ID to analyze (format validated)
   * @param includeMetadata - Include metadata about each reference (optional, default true)
   * @param includeNodeDetails - Include detailed node information (optional, default false)
   * @param groupByProperty - Group references by property type (optional, default false)
   * @param includeIndirect - Include indirect references through components (optional, default false)
   * 
   * @returns Comprehensive reference analysis or error message
   * 
   * @example
   * ```typescript
   * // Basic reference analysis
   * const result = await get_variable_references({
   *   variableId: "var-123"
   * });
   * 
   * // Detailed analysis with node information
   * const detailed = await get_variable_references({
   *   variableId: "var-123",
   *   includeMetadata: true,
   *   includeNodeDetails: true,
   *   groupByProperty: true
   * });
   * 
   * // Complete analysis including indirect references
   * const complete = await get_variable_references({
   *   variableId: "var-123",
   *   includeMetadata: true,
   *   includeNodeDetails: true,
   *   groupByProperty: true,
   *   includeIndirect: true
   * });
   * ```
   * 
   * @throws {ValidationError} When input parameters are invalid
   * @throws {NotFoundError} When variable ID does not exist
   * @throws {WebSocketError} When communication with Figma fails
   * @throws {FigmaAPIError} When Figma API returns an error
   */
  server.tool(
    "get_variable_references",
    "Get comprehensive references analysis for a variable with detailed usage information",
    {
      variableId: VariableIdSchema.describe("Unique variable ID to analyze (format validated)"),
      includeMetadata: z.boolean().optional().describe("Include metadata about each reference (default: true)"),
      includeNodeDetails: z.boolean().optional().describe("Include detailed node information (default: false)"),
      groupByProperty: z.boolean().optional().describe("Group references by property type (default: false)"),
      includeIndirect: z.boolean().optional().describe("Include indirect references through components (default: false)"),
    },
    async (args) => {
      try {
        // Validate input with enhanced Zod schema
        const validatedArgs = GetVariableReferencesInputSchema.parse(args);
        
        // Execute Figma command
        const result = await sendCommandToFigma("get_variable_references", {
          variableId: validatedArgs.variableId,
          includeMetadata: validatedArgs.includeMetadata,
          includeNodeDetails: validatedArgs.includeNodeDetails,
          groupByProperty: validatedArgs.groupByProperty,
          includeIndirect: validatedArgs.includeIndirect,
        });

        // Build success message with reference statistics
        const referenceCount = (result as any).totalReferences || 0;
        const directCount = (result as any).directReferences || 0;
        const indirectCount = (result as any).indirectReferences || 0;
        
        return {
          content: [
            {
              type: "text",
              text: `Variable "${validatedArgs.variableId}" references analyzed successfully. Total: ${referenceCount} (Direct: ${directCount}, Indirect: ${indirectCount}). Details: ${JSON.stringify(result, null, 2)}`,
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
                text: `Error analyzing variable references - Validation failed: ${validationErrors}`,
              },
            ],
          };
        }
        
        // Handle other errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        let enhancedMessage = `Error analyzing variable references: ${errorMessage}`;
        
        // Provide more helpful messages for common errors
        if (errorMessage.includes('VARIABLE_NOT_FOUND') || errorMessage.includes('not found')) {
          enhancedMessage += '. The variable ID may not exist or may have been deleted.';
        } else if (errorMessage.includes('timeout') || errorMessage.includes('large document')) {
          enhancedMessage += '. The document may be too large for comprehensive analysis. Try reducing scope.';
        } else if (errorMessage.includes('permission') || errorMessage.includes('access')) {
          enhancedMessage += '. You may not have permission to analyze references in this document.';
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
   * Set variable value for a specific mode with comprehensive validation
   * 
   * Sets the value of a variable for a specific mode with type validation and
   * existing value handling. Supports all variable types and mode-specific configurations.
   * 
   * @category Variables
   * @phase 1
   * @complexity Medium
   * @figmaApi figma.variables.setValueForVariableInMode()
   * 
   * @param variableId - The unique variable ID (format validated)
   * @param modeId - The mode ID to set the value for (format validated)
   * @param value - The value to set for this mode (type validated)
   * @param validateType - Whether to validate value type compatibility (optional, default true)
   * @param overwriteExisting - Whether to overwrite existing value (optional, default true)
   * 
   * @returns Success message with mode value details or error message
   * 
   * @example
   * ```typescript
   * // Set string value for specific mode
   * const result = await set_variable_mode_value({
   *   variableId: "var-123",
   *   modeId: "dark-mode",
   *   value: "Dark theme text"
   * });
   * 
   * // Set color value with validation disabled
   * const colorResult = await set_variable_mode_value({
   *   variableId: "color-var-456",
   *   modeId: "high-contrast",
   *   value: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
   *   validateType: false
   * });
   * 
   * // Set value without overwriting existing
   * const preserveResult = await set_variable_mode_value({
   *   variableId: "var-789",
   *   modeId: "new-mode",
   *   value: 42.5,
   *   overwriteExisting: false
   * });
   * ```
   * 
   * @throws {ValidationError} When input parameters are invalid
   * @throws {TypeError} When value type doesn't match variable type
   * @throws {ConflictError} When value exists and overwriteExisting is false
   * @throws {NotFoundError} When variable or mode ID does not exist
   * @throws {WebSocketError} When communication with Figma fails
   * @throws {FigmaAPIError} When Figma API returns an error
   */
  server.tool(
    "set_variable_mode_value",
    "Set variable value for a specific mode with comprehensive validation",
    {
      variableId: VariableIdSchema.describe("Unique variable ID (format validated)"),
      modeId: ModeIdSchema.describe("Mode ID to set the value for (format validated)"),
      value: VariableValueSchema.describe("Value to set for this mode (type validated)"),
      validateType: z.boolean().optional().describe("Validate value type compatibility (default: true)"),
      overwriteExisting: z.boolean().optional().describe("Overwrite existing value (default: true)"),
    },
    async (args) => {
      try {
        // Validate input with enhanced Zod schema
        const validatedArgs = SetVariableModeValueInputSchema.parse(args);
        
        // Additional business logic validation for value types
        if (validatedArgs.validateType !== false) {
          // Validate COLOR values have required properties
          if (typeof validatedArgs.value === 'object' && validatedArgs.value !== null && 'r' in validatedArgs.value) {
            const colorValue = validatedArgs.value as any;
            if (typeof colorValue.r !== 'number' || typeof colorValue.g !== 'number' || typeof colorValue.b !== 'number') {
              throw new Error('COLOR values must have numeric r, g, b properties');
            }
            if (colorValue.r < 0 || colorValue.r > 1 || colorValue.g < 0 || colorValue.g > 1 || colorValue.b < 0 || colorValue.b > 1) {
              throw new Error('COLOR values must be in range 0-1 for r, g, b components');
            }
          }
        }
        
        // Execute Figma command
        const result = await sendCommandToFigma("set_variable_mode_value", {
          variableId: validatedArgs.variableId,
          modeId: validatedArgs.modeId,
          value: validatedArgs.value,
          validateType: validatedArgs.validateType,
          overwriteExisting: validatedArgs.overwriteExisting,
        });

        return {
          content: [
            {
              type: "text",
              text: `Variable "${validatedArgs.variableId}" value set successfully for mode "${validatedArgs.modeId}": ${JSON.stringify(result)}`,
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
                text: `Error setting variable mode value - Validation failed: ${validationErrors}`,
              },
            ],
          };
        }
        
        // Handle other errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        let enhancedMessage = `Error setting variable mode value: ${errorMessage}`;
        
        // Provide more helpful messages for common errors
        if (errorMessage.includes('VALUE_EXISTS') || errorMessage.includes('already has a value')) {
          enhancedMessage += '. The mode already has a value. Set overwriteExisting to true to replace it.';
        } else if (errorMessage.includes('MODE_NOT_FOUND') || errorMessage.includes('mode')) {
          enhancedMessage += '. The specified mode ID may not exist in this variable\'s collection.';
        } else if (errorMessage.includes('VARIABLE_NOT_FOUND') || errorMessage.includes('variable not found')) {
          enhancedMessage += '. The variable ID may not exist or may have been deleted.';
        } else if (errorMessage.includes('type mismatch') || errorMessage.includes('incompatible type')) {
          enhancedMessage += '. The value type may not match the variable\'s expected type.';
        } else if (errorMessage.includes('COLOR values')) {
          enhancedMessage += '. Please ensure COLOR values use proper format: {r: 0-1, g: 0-1, b: 0-1, a?: 0-1}.';
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
   * Create a new mode in a variable collection with value copying
   * 
   * Creates a new mode in the specified variable collection with optional value
   * copying from existing modes and comprehensive validation of collection integrity.
   * 
   * @category Variables
   * @phase 1
   * @complexity Medium
   * @figmaApi figma.variables.createVariableMode()
   * 
   * @param collectionId - The unique collection ID (format validated)
   * @param modeName - Name for the new mode (naming conventions validated)
   * @param copyFromModeId - Mode ID to copy values from (optional)
   * @param setAsDefault - Set this mode as the collection's default (optional, default false)
   * @param description - Optional description for the mode
   * 
   * @returns Success message with new mode details or error message
   * 
   * @example
   * ```typescript
   * // Create basic mode
   * const result = await create_variable_mode({
   *   collectionId: "collection-123",
   *   modeName: "Dark Mode"
   * });
   * 
   * // Create mode by copying from existing
   * const copyResult = await create_variable_mode({
   *   collectionId: "collection-123",
   *   modeName: "High Contrast",
   *   copyFromModeId: "dark-mode-id",
   *   description: "High contrast theme for accessibility"
   * });
   * 
   * // Create mode and set as default
   * const defaultResult = await create_variable_mode({
   *   collectionId: "collection-123",
   *   modeName: "New Default",
   *   setAsDefault: true
   * });
   * ```
   * 
   * @throws {ValidationError} When input parameters are invalid
   * @throws {DuplicateNameError} When mode name already exists in collection
   * @throws {NotFoundError} When collection or source mode ID does not exist
   * @throws {WebSocketError} When communication with Figma fails
   * @throws {FigmaAPIError} When Figma API returns an error
   */
  server.tool(
    "create_variable_mode",
    "Create a new mode in a variable collection with value copying and validation",
    {
      collectionId: VariableCollectionIdSchema.describe("Unique collection ID (format validated)"),
      modeName: z.string().min(1).describe("Name for the new mode (naming conventions validated)"),
      copyFromModeId: ModeIdSchema.optional().describe("Mode ID to copy values from (optional)"),
      setAsDefault: z.boolean().optional().describe("Set this mode as collection's default (default: false)"),
      description: z.string().optional().describe("Optional description for the mode"),
    },
    async (args) => {
      try {
        // Validate input with enhanced Zod schema
        const validatedArgs = CreateVariableModeInputSchema.parse(args);
        
        // Execute Figma command
        const result = await sendCommandToFigma("create_variable_mode", {
          collectionId: validatedArgs.collectionId,
          modeName: validatedArgs.modeName,
          copyFromModeId: validatedArgs.copyFromModeId,
          setAsDefault: validatedArgs.setAsDefault,
          description: validatedArgs.description || "",
        });

        // Build success message with mode details
        const copyInfo = validatedArgs.copyFromModeId ? ` (copied from mode "${validatedArgs.copyFromModeId}")` : '';
        const defaultInfo = validatedArgs.setAsDefault ? ' and set as default' : '';
        
        return {
          content: [
            {
              type: "text",
              text: `Mode "${validatedArgs.modeName}" created successfully in collection "${validatedArgs.collectionId}"${copyInfo}${defaultInfo}: ${JSON.stringify(result)}`,
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
                text: `Error creating variable mode - Validation failed: ${validationErrors}`,
              },
            ],
          };
        }
        
        // Handle other errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        let enhancedMessage = `Error creating variable mode: ${errorMessage}`;
        
        // Provide more helpful messages for common errors
        if (errorMessage.includes('DUPLICATE_MODE_NAME') || errorMessage.includes('already exists')) {
          enhancedMessage += '. A mode with this name already exists in the collection.';
        } else if (errorMessage.includes('COLLECTION_NOT_FOUND') || errorMessage.includes('collection not found')) {
          enhancedMessage += '. The collection ID may not exist or may have been deleted.';
        } else if (errorMessage.includes('SOURCE_MODE_NOT_FOUND') || errorMessage.includes('copy from')) {
          enhancedMessage += '. The source mode ID to copy from may not exist in this collection.';
        } else if (errorMessage.includes('INVALID_MODE_NAME') || errorMessage.includes('name format')) {
          enhancedMessage += '. The mode name must start with a letter and contain only letters, numbers, spaces, hyphens, and underscores.';
        } else if (errorMessage.includes('MODE_LIMIT') || errorMessage.includes('too many modes')) {
          enhancedMessage += '. The collection may have reached the maximum number of modes allowed.';
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
   * Delete a mode from a variable collection with reference management
   * 
   * Deletes a mode from the variable collection with comprehensive reference cleanup,
   * replacement strategies, and integrity validation to maintain collection consistency.
   * 
   * @category Variables
   * @phase 1
   * @complexity High
   * @figmaApi figma.variables.deleteVariableMode()
   * 
   * @param collectionId - The unique collection ID (format validated)
   * @param modeId - The mode ID to delete (format validated)
   * @param force - Force deletion even if mode is referenced (optional, default false)
   * @param replacementModeId - Mode to use as replacement for references (optional)
   * @param cleanupReferences - Clean up references to this mode (optional, default true)
   * 
   * @returns Success message with deletion details and cleanup info or error message
   * 
   * @example
   * ```typescript
   * // Safe mode deletion
   * const result = await delete_variable_mode({
   *   collectionId: "collection-123",
   *   modeId: "old-mode"
   * });
   * 
   * // Force delete with replacement
   * const forceResult = await delete_variable_mode({
   *   collectionId: "collection-123",
   *   modeId: "deprecated-mode",
   *   force: true,
   *   replacementModeId: "new-mode",
   *   cleanupReferences: true
   * });
   * ```
   * 
   * @throws {ValidationError} When input parameters are invalid
   * @throws {ReferenceError} When mode is referenced and force is false
   * @throws {IntegrityError} When deletion would leave collection in invalid state
   * @throws {NotFoundError} When collection or mode ID does not exist
   * @throws {WebSocketError} When communication with Figma fails
   * @throws {FigmaAPIError} When Figma API returns an error
   */
  server.tool(
    "delete_variable_mode",
    "Delete a mode from variable collection with reference management and cleanup",
    {
      collectionId: VariableCollectionIdSchema.describe("Unique collection ID (format validated)"),
      modeId: ModeIdSchema.describe("Mode ID to delete (format validated)"),
      force: z.boolean().optional().describe("Force deletion even if referenced (default: false)"),
      replacementModeId: ModeIdSchema.optional().describe("Mode to use as replacement for references"),
      cleanupReferences: z.boolean().optional().describe("Clean up references to this mode (default: true)"),
    },
    async (args) => {
      try {
        // Validate input with enhanced Zod schema
        const validatedArgs = DeleteVariableModeInputSchema.parse(args);
        
        // Execute Figma command
        const result = await sendCommandToFigma("delete_variable_mode", {
          collectionId: validatedArgs.collectionId,
          modeId: validatedArgs.modeId,
          force: validatedArgs.force,
          replacementModeId: validatedArgs.replacementModeId,
          cleanupReferences: validatedArgs.cleanupReferences,
        });

        // Build success message with cleanup details
        const referencesCleanedUp = (result as any).referencesCleanedUp || 0;
        const variablesAffected = (result as any).variablesAffected || 0;
        const replacementInfo = validatedArgs.replacementModeId ? ` (replaced with mode "${validatedArgs.replacementModeId}")` : '';
        
        return {
          content: [
            {
              type: "text",
              text: `Mode "${validatedArgs.modeId}" deleted successfully from collection "${validatedArgs.collectionId}"${replacementInfo}. Variables affected: ${variablesAffected}, References cleaned: ${referencesCleanedUp}. Details: ${JSON.stringify(result)}`,
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
                text: `Error deleting variable mode - Validation failed: ${validationErrors}`,
              },
            ],
          };
        }
        
        // Handle other errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        let enhancedMessage = `Error deleting variable mode: ${errorMessage}`;
        
        // Provide more helpful messages for common errors
        if (errorMessage.includes('MODE_IN_USE') || errorMessage.includes('referenced')) {
          enhancedMessage += '. The mode is still referenced. Use force=true to delete anyway or provide a replacement mode.';
        } else if (errorMessage.includes('LAST_MODE') || errorMessage.includes('cannot delete last mode')) {
          enhancedMessage += '. Cannot delete the last mode in a collection. Create another mode first.';
        } else if (errorMessage.includes('DEFAULT_MODE') || errorMessage.includes('default mode')) {
          enhancedMessage += '. Cannot delete the default mode. Set another mode as default first.';
        } else if (errorMessage.includes('MODE_NOT_FOUND') || errorMessage.includes('mode not found')) {
          enhancedMessage += '. The mode ID may not exist in this collection.';
        } else if (errorMessage.includes('COLLECTION_NOT_FOUND') || errorMessage.includes('collection not found')) {
          enhancedMessage += '. The collection ID may not exist or may have been deleted.';
        } else if (errorMessage.includes('REPLACEMENT_NOT_FOUND') || errorMessage.includes('replacement mode')) {
          enhancedMessage += '. The replacement mode ID may not exist in this collection.';
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
   * Reorder modes in a variable collection with value preservation
   * 
   * Reorders the modes in a variable collection while preserving all variable values
   * and maintaining collection integrity. Validates the complete mode list.
   * 
   * @category Variables
   * @phase 1
   * @complexity Medium
   * @figmaApi figma.variables.reorderVariableModes()
   * 
   * @param collectionId - The unique collection ID (format validated)
   * @param orderedModeIds - Array of mode IDs in the desired order (validated)
   * @param preserveValues - Preserve all existing values during reordering (optional, default true)
   * @param validateIntegrity - Validate collection integrity after reordering (optional, default true)
   * 
   * @returns Success message with reordering details or error message
   * 
   * @example
   * ```typescript
   * // Basic mode reordering
   * const result = await reorder_variable_modes({
   *   collectionId: "collection-123",
   *   orderedModeIds: ["light-mode", "dark-mode", "high-contrast"]
   * });
   * 
   * // Reorder without integrity validation (faster)
   * const fastResult = await reorder_variable_modes({
   *   collectionId: "collection-123",
   *   orderedModeIds: ["mode-1", "mode-2", "mode-3", "mode-4"],
   *   validateIntegrity: false
   * });
   * ```
   * 
   * @throws {ValidationError} When input parameters are invalid
   * @throws {IntegrityError} When mode list is incomplete or contains duplicates
   * @throws {NotFoundError} When collection or mode IDs do not exist
   * @throws {WebSocketError} When communication with Figma fails
   * @throws {FigmaAPIError} When Figma API returns an error
   */
  server.tool(
    "reorder_variable_modes",
    "Reorder modes in a variable collection with value preservation and validation",
    {
      collectionId: VariableCollectionIdSchema.describe("Unique collection ID (format validated)"),
      orderedModeIds: z.array(ModeIdSchema).min(1).describe("Array of mode IDs in desired order (validated)"),
      preserveValues: z.boolean().optional().describe("Preserve all existing values (default: true)"),
      validateIntegrity: z.boolean().optional().describe("Validate collection integrity (default: true)"),
    },
    async (args) => {
      try {
        // Validate input with enhanced Zod schema
        const validatedArgs = ReorderVariableModesInputSchema.parse(args);
        
        // Additional validation for duplicate mode IDs
        const uniqueModeIds = new Set(validatedArgs.orderedModeIds);
        if (uniqueModeIds.size !== validatedArgs.orderedModeIds.length) {
          throw new Error('Duplicate mode IDs found in the ordered list. Each mode ID must be unique.');
        }
        
        // Execute Figma command
        const result = await sendCommandToFigma("reorder_variable_modes", {
          collectionId: validatedArgs.collectionId,
          orderedModeIds: validatedArgs.orderedModeIds,
          preserveValues: validatedArgs.preserveValues,
          validateIntegrity: validatedArgs.validateIntegrity,
        });

        // Build success message with reordering details
        const modeCount = validatedArgs.orderedModeIds.length;
        const preservedInfo = validatedArgs.preserveValues ? ' with values preserved' : '';
        const validatedInfo = validatedArgs.validateIntegrity ? ' and integrity validated' : '';
        
        return {
          content: [
            {
              type: "text",
              text: `${modeCount} modes reordered successfully in collection "${validatedArgs.collectionId}"${preservedInfo}${validatedInfo}. New order: [${validatedArgs.orderedModeIds.join(', ')}]. Details: ${JSON.stringify(result)}`,
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
                text: `Error reordering variable modes - Validation failed: ${validationErrors}`,
              },
            ],
          };
        }
        
        // Handle other errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        let enhancedMessage = `Error reordering variable modes: ${errorMessage}`;
        
        // Provide more helpful messages for common errors
        if (errorMessage.includes('INCOMPLETE_MODE_LIST') || errorMessage.includes('missing modes')) {
          enhancedMessage += '. The ordered list must include all existing modes in the collection.';
        } else if (errorMessage.includes('INVALID_MODE_ID') || errorMessage.includes('mode does not exist')) {
          enhancedMessage += '. One or more mode IDs in the list do not exist in this collection.';
        } else if (errorMessage.includes('COLLECTION_NOT_FOUND') || errorMessage.includes('collection not found')) {
          enhancedMessage += '. The collection ID may not exist or may have been deleted.';
        } else if (errorMessage.includes('Duplicate mode IDs') || errorMessage.includes('duplicate')) {
          enhancedMessage += '. Each mode ID must appear only once in the ordered list.';
        } else if (errorMessage.includes('INTEGRITY_VIOLATION') || errorMessage.includes('integrity')) {
          enhancedMessage += '. The reordering would violate collection integrity. Check mode dependencies.';
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
   * Publish a variable collection to make it available as a library
   * 
   * Publishes a variable collection with comprehensive permission validation,
   * publishing options configuration, and error handling for publishing-specific issues.
   * 
   * @category Variables
   * @phase 1
   * @complexity High
   * @figmaApi figma.variables.publishVariableCollection()
   * 
   * @param collectionId - The unique collection ID to publish (format validated)
   * @param description - Optional description for the published collection
   * @param validatePermissions - Validate publishing permissions before attempting (optional, default true)
   * @param forcePublish - Force publish even if collection has warnings (optional, default false)
   * @param includeAllModes - Include all modes in the published collection (optional, default true)
   * @param publishingOptions - Advanced publishing configuration options
   * 
   * @returns Success message with publishing details or error message
   * 
   * @example
   * ```typescript
   * // Basic collection publishing
   * const result = await publish_variable_collection({
   *   collectionId: "collection-123",
   *   description: "Design system color tokens"
   * });
   * 
   * // Advanced publishing with custom options
   * const advancedResult = await publish_variable_collection({
   *   collectionId: "collection-456",
   *   description: "Typography scale variables",
   *   validatePermissions: true,
   *   includeAllModes: true,
   *   publishingOptions: {
   *     makePublic: false,
   *     allowEditing: false,
   *     requirePermission: true
   *   }
   * });
   * 
   * // Force publish with warnings
   * const forceResult = await publish_variable_collection({
   *   collectionId: "collection-789",
   *   forcePublish: true,
   *   description: "Experimental variables collection"
   * });
   * ```
   * 
   * @throws {ValidationError} When input parameters are invalid
   * @throws {PermissionError} When user lacks publishing permissions
   * @throws {PublishingError} When collection has validation errors
   * @throws {NotFoundError} When collection ID does not exist
   * @throws {WebSocketError} When communication with Figma fails
   * @throws {FigmaAPIError} When Figma API returns an error
   */
  server.tool(
    "publish_variable_collection",
    "Publish a variable collection to make it available as a library with permission validation",
    {
      collectionId: VariableCollectionIdSchema.describe("Unique collection ID to publish (format validated)"),
      description: z.string().optional().describe("Optional description for the published collection"),
      validatePermissions: z.boolean().optional().describe("Validate publishing permissions before attempting (default: true)"),
      forcePublish: z.boolean().optional().describe("Force publish even if collection has warnings (default: false)"),
      includeAllModes: z.boolean().optional().describe("Include all modes in the published collection (default: true)"),
      publishingOptions: z.object({
        makePublic: z.boolean().optional(),
        allowEditing: z.boolean().optional(),
        requirePermission: z.boolean().optional(),
      }).optional().describe("Advanced publishing configuration options"),
    },
    async (args) => {
      try {
        // Validate input with enhanced Zod schema
        const validatedArgs = PublishVariableCollectionInputSchema.parse(args);
        
        // Execute Figma command
        const result = await sendCommandToFigma("publish_variable_collection", {
          collectionId: validatedArgs.collectionId,
          description: validatedArgs.description || "",
          validatePermissions: validatedArgs.validatePermissions,
          forcePublish: validatedArgs.forcePublish,
          includeAllModes: validatedArgs.includeAllModes,
          publishingOptions: validatedArgs.publishingOptions || {
            makePublic: false,
            allowEditing: false,
            requirePermission: true,
          },
        });

        // Build success message with publishing details
        const publishedInfo = (result as any).publishedAt ? ` at ${(result as any).publishedAt}` : '';
        const modesInfo = validatedArgs.includeAllModes ? ' (all modes included)' : ' (selected modes only)';
        const libraryKey = (result as any).libraryKey || 'unknown';
        
        return {
          content: [
            {
              type: "text",
              text: `Collection "${validatedArgs.collectionId}" published successfully${publishedInfo}${modesInfo}. Library key: ${libraryKey}. Details: ${JSON.stringify(result)}`,
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
                text: `Error publishing variable collection - Validation failed: ${validationErrors}`,
              },
            ],
          };
        }
        
        // Handle other errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        let enhancedMessage = `Error publishing variable collection: ${errorMessage}`;
        
        // Provide more helpful messages for common publishing errors
        if (errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('insufficient permissions')) {
          enhancedMessage += '. You may not have permission to publish collections in this team or organization.';
        } else if (errorMessage.includes('COLLECTION_NOT_FOUND') || errorMessage.includes('collection not found')) {
          enhancedMessage += '. The collection ID may not exist or may have been deleted.';
        } else if (errorMessage.includes('VALIDATION_ERRORS') || errorMessage.includes('collection has errors')) {
          enhancedMessage += '. The collection has validation errors. Use forcePublish=true to override, or fix the errors first.';
        } else if (errorMessage.includes('ALREADY_PUBLISHED') || errorMessage.includes('already published')) {
          enhancedMessage += '. The collection is already published. You may need to update the existing publication.';
        } else if (errorMessage.includes('EMPTY_COLLECTION') || errorMessage.includes('no variables')) {
          enhancedMessage += '. The collection is empty or has no variables to publish.';
        } else if (errorMessage.includes('TEAM_LIBRARY_LIMIT') || errorMessage.includes('library limit')) {
          enhancedMessage += '. Your team has reached the maximum number of published libraries.';
        } else if (errorMessage.includes('INVALID_MODES') || errorMessage.includes('mode')) {
          enhancedMessage += '. Some modes in the collection may be invalid or incomplete.';
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
   * Get published variables from libraries with comprehensive filtering
   * 
   * Retrieves published variables from team libraries with advanced filtering,
   * sorting, pagination, and metadata options for comprehensive library management.
   * 
   * @category Variables
   * @phase 1
   * @complexity Medium
   * @figmaApi figma.variables.getPublishedVariables()
   * 
   * @param libraryKey - Specific library key to filter published variables (optional)
   * @param includeMetadata - Include metadata about published variables (optional, default true)
   * @param filterByType - Filter variables by their type (optional)
   * @param filterByCollection - Filter variables by collection ID (optional)
   * @param includeUsageStats - Include usage statistics for published variables (optional, default false)
   * @param sortBy - Sort published variables by specified criteria (optional, default "name")
   * @param sortOrder - Sort order for published variables (optional, default "asc")
   * @param limit - Maximum number of published variables to return (optional, default 100)
   * @param offset - Offset for pagination of published variables (optional, default 0)
   * 
   * @returns List of published variables with filtering and metadata or error message
   * 
   * @example
   * ```typescript
   * // Get all published variables
   * const result = await get_published_variables({});
   * 
   * // Get variables from specific library
   * const libraryResult = await get_published_variables({
   *   libraryKey: "lib-abc123",
   *   includeMetadata: true
   * });
   * 
   * // Get COLOR variables with usage stats
   * const colorResult = await get_published_variables({
   *   filterByType: "COLOR",
   *   includeUsageStats: true,
   *   sortBy: "usageCount",
   *   sortOrder: "desc"
   * });
   * 
   * // Paginated results for large libraries
   * const paginatedResult = await get_published_variables({
   *   limit: 50,
   *   offset: 100,
   *   sortBy: "datePublished",
   *   sortOrder: "desc"
   * });
   * 
   * // Filter by collection with metadata
   * const collectionResult = await get_published_variables({
   *   filterByCollection: "collection-456",
   *   includeMetadata: true,
   *   includeUsageStats: true
   * });
   * ```
   * 
   * @throws {ValidationError} When input parameters are invalid
   * @throws {AccessError} When user lacks access to specified libraries
   * @throws {NotFoundError} When library key or collection ID does not exist
   * @throws {WebSocketError} When communication with Figma fails
   * @throws {FigmaAPIError} When Figma API returns an error
   */
  server.tool(
    "get_published_variables",
    "Get published variables from libraries with comprehensive filtering and metadata",
    {
      libraryKey: z.string().optional().describe("Specific library key to filter published variables"),
      includeMetadata: z.boolean().optional().describe("Include metadata about published variables (default: true)"),
      filterByType: z.enum(["BOOLEAN", "FLOAT", "STRING", "COLOR"]).optional().describe("Filter variables by their type"),
      filterByCollection: VariableCollectionIdSchema.optional().describe("Filter variables by collection ID"),
      includeUsageStats: z.boolean().optional().describe("Include usage statistics (default: false)"),
      sortBy: z.enum(["name", "datePublished", "usageCount", "type"]).optional().describe("Sort criteria (default: name)"),
      sortOrder: z.enum(["asc", "desc"]).optional().describe("Sort order (default: asc)"),
      limit: z.number().optional().describe("Maximum number to return (default: 100, max: 1000)"),
      offset: z.number().optional().describe("Offset for pagination (default: 0)"),
    },
    async (args) => {
      try {
        // Validate input with enhanced Zod schema
        const validatedArgs = GetPublishedVariablesInputSchema.parse(args);
        
        // Execute Figma command
        const result = await sendCommandToFigma("get_published_variables", {
          libraryKey: validatedArgs.libraryKey,
          includeMetadata: validatedArgs.includeMetadata,
          filterByType: validatedArgs.filterByType,
          filterByCollection: validatedArgs.filterByCollection,
          includeUsageStats: validatedArgs.includeUsageStats,
          sortBy: validatedArgs.sortBy,
          sortOrder: validatedArgs.sortOrder,
          limit: validatedArgs.limit,
          offset: validatedArgs.offset,
        });

        // Build success message with result statistics
        const totalCount = (result as any).totalCount || 0;
        const returnedCount = (result as any).variables?.length || 0;
        const libraryInfo = validatedArgs.libraryKey ? ` from library "${validatedArgs.libraryKey}"` : ' from all accessible libraries';
        const filterInfo = validatedArgs.filterByType ? ` (filtered by type: ${validatedArgs.filterByType})` : '';
        const paginationInfo = validatedArgs.offset > 0 ? ` (offset: ${validatedArgs.offset})` : '';
        
        return {
          content: [
            {
              type: "text",
              text: `Retrieved ${returnedCount} published variables${libraryInfo}${filterInfo}${paginationInfo}. Total available: ${totalCount}. Details: ${JSON.stringify(result, null, 2)}`,
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
                text: `Error getting published variables - Validation failed: ${validationErrors}`,
              },
            ],
          };
        }
        
        // Handle other errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        let enhancedMessage = `Error getting published variables: ${errorMessage}`;
        
        // Provide more helpful messages for common errors
        if (errorMessage.includes('LIBRARY_NOT_FOUND') || errorMessage.includes('library not found')) {
          enhancedMessage += '. The specified library key may not exist or may not be accessible.';
        } else if (errorMessage.includes('ACCESS_DENIED') || errorMessage.includes('no access')) {
          enhancedMessage += '. You may not have access to the specified library or team libraries.';
        } else if (errorMessage.includes('COLLECTION_NOT_FOUND') || errorMessage.includes('collection not found')) {
          enhancedMessage += '. The specified collection ID may not exist in the accessible libraries.';
        } else if (errorMessage.includes('INVALID_FILTER') || errorMessage.includes('filter')) {
          enhancedMessage += '. The specified filter parameters may be invalid or not supported.';
        } else if (errorMessage.includes('PAGINATION_ERROR') || errorMessage.includes('offset')) {
          enhancedMessage += '. The pagination parameters may be out of range or invalid.';
        } else if (errorMessage.includes('NO_PUBLISHED_VARIABLES') || errorMessage.includes('no variables')) {
          enhancedMessage += '. No published variables found matching the specified criteria.';
        } else if (errorMessage.includes('RATE_LIMIT') || errorMessage.includes('too many requests')) {
          enhancedMessage += '. Rate limit exceeded. Please wait before making more requests.';
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