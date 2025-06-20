/**
 * Reusable Zod Schemas for MCP Figma Tools
 * Provides common validation schemas used across multiple tools
 */

import { z } from "zod";

/**
 * Basic primitive schemas
 */

// Node ID validation
export const NodeIdSchema = z
  .string()
  .min(1, "Node ID cannot be empty")
  .regex(/^[a-zA-Z0-9:_-]+$/, "Invalid node ID format")
  .describe("Figma node ID");

// Optional Node ID
export const OptionalNodeIdSchema = NodeIdSchema.optional();

// Node name validation
export const NodeNameSchema = z
  .string()
  .min(1, "Node name cannot be empty")
  .max(255, "Node name too long")
  .describe("Node name");

// Optional node name with default
export const OptionalNodeNameSchema = NodeNameSchema.optional();

/**
 * Color schemas
 */

// RGB component (0-1 range)
const RGBComponentSchema = z
  .number()
  .min(0, "Color component must be >= 0")
  .max(1, "Color component must be <= 1");

// Alpha component (0-1 range, optional with default)
const AlphaComponentSchema = z
  .number()
  .min(0, "Alpha must be >= 0")
  .max(1, "Alpha must be <= 1")
  .optional()
  .describe("Alpha transparency (0-1)");

// Basic RGBA color schema
export const ColorSchema = z
  .object({
    r: RGBComponentSchema.describe("Red component (0-1)"),
    g: RGBComponentSchema.describe("Green component (0-1)"),
    b: RGBComponentSchema.describe("Blue component (0-1)"),
    a: AlphaComponentSchema,
  })
  .describe("RGBA color");

// Optional color schema
export const OptionalColorSchema = ColorSchema.optional();

// HSL color schema
export const HSLColorSchema = z
  .object({
    h: z.number().min(0).max(360).describe("Hue (0-360)"),
    s: z.number().min(0).max(100).describe("Saturation (0-100)"),
    l: z.number().min(0).max(100).describe("Lightness (0-100)"),
    a: AlphaComponentSchema,
  })
  .describe("HSLA color");

// Hex color schema
export const HexColorSchema = z
  .string()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/, "Invalid hex color format")
  .describe("Hex color (#RRGGBB or #RRGGBBAA)");

// Union of all color formats
export const AnyColorSchema = z.union([
  ColorSchema,
  HSLColorSchema,
  HexColorSchema,
]);

/**
 * Position and dimension schemas
 */

// 2D position
export const PositionSchema = z
  .object({
    x: z.number().describe("X coordinate"),
    y: z.number().describe("Y coordinate"),
  })
  .describe("2D position");

// Size dimensions
export const SizeSchema = z
  .object({
    width: z.number().positive("Width must be positive"),
    height: z.number().positive("Height must be positive"),
  })
  .describe("Size dimensions");

// Rectangle (position + size)
export const RectangleSchema = z
  .object({
    x: z.number().describe("X coordinate"),
    y: z.number().describe("Y coordinate"),
    width: z.number().positive("Width must be positive"),
    height: z.number().positive("Height must be positive"),
  })
  .describe("Rectangle");

// Vector 2D
export const Vector2DSchema = z
  .object({
    x: z.number(),
    y: z.number(),
  })
  .describe("2D vector");

/**
 * Text and typography schemas
 */

// Font weight
export const FontWeightSchema = z
  .union([
    z.literal(100),
    z.literal(200),
    z.literal(300),
    z.literal(400),
    z.literal(500),
    z.literal(600),
    z.literal(700),
    z.literal(800),
    z.literal(900),
  ])
  .describe("Font weight");

// Font style
export const FontStyleSchema = z
  .enum(["normal", "italic"])
  .describe("Font style");

// Text alignment
export const TextAlignmentSchema = z
  .enum(["LEFT", "CENTER", "RIGHT", "JUSTIFIED"])
  .describe("Text alignment");

// Text decoration
export const TextDecorationSchema = z
  .enum(["NONE", "UNDERLINE", "STRIKETHROUGH"])
  .describe("Text decoration");

// Font size
export const FontSizeSchema = z
  .number()
  .positive("Font size must be positive")
  .max(500, "Font size too large")
  .describe("Font size in pixels");

// Line height
export const LineHeightSchema = z
  .union([
    z.number().positive(),
    z.object({
      value: z.number().positive(),
      unit: z.enum(["PIXELS", "PERCENT"]),
    }),
  ])
  .describe("Line height");

// Letter spacing
export const LetterSpacingSchema = z
  .union([
    z.number(),
    z.object({
      value: z.number(),
      unit: z.enum(["PIXELS", "PERCENT"]),
    }),
  ])
  .describe("Letter spacing");

/**
 * Style and effect schemas
 */

// Blend mode
export const BlendModeSchema = z
  .enum([
    "NORMAL",
    "DARKEN",
    "MULTIPLY",
    "LINEAR_BURN",
    "COLOR_BURN",
    "LIGHTEN",
    "SCREEN",
    "LINEAR_DODGE",
    "COLOR_DODGE",
    "OVERLAY",
    "SOFT_LIGHT",
    "HARD_LIGHT",
    "DIFFERENCE",
    "EXCLUSION",
    "HUE",
    "SATURATION",
    "COLOR",
    "LUMINOSITY",
  ])
  .describe("Blend mode");

// Paint type
export const PaintTypeSchema = z
  .enum(["SOLID", "GRADIENT_LINEAR", "GRADIENT_RADIAL", "GRADIENT_ANGULAR", "IMAGE"])
  .describe("Paint type");

// Stroke alignment
export const StrokeAlignmentSchema = z
  .enum(["INSIDE", "OUTSIDE", "CENTER"])
  .describe("Stroke alignment");

// Stroke cap
export const StrokeCapSchema = z
  .enum(["NONE", "ROUND", "SQUARE", "ARROW_LINES", "ARROW_EQUILATERAL"])
  .describe("Stroke cap style");

// Stroke join
export const StrokeJoinSchema = z
  .enum(["MITER", "BEVEL", "ROUND"])
  .describe("Stroke join style");

// Effect type
export const EffectTypeSchema = z
  .enum(["DROP_SHADOW", "INNER_SHADOW", "LAYER_BLUR", "BACKGROUND_BLUR"])
  .describe("Effect type");

// Constraint type
export const ConstraintTypeSchema = z
  .enum(["MIN", "CENTER", "MAX", "STRETCH", "SCALE"])
  .describe("Constraint type");

/**
 * Layout schemas
 */

// Auto layout direction
export const AutoLayoutDirectionSchema = z
  .enum(["HORIZONTAL", "VERTICAL"])
  .describe("Auto layout direction");

// Auto layout alignment
export const AutoLayoutAlignmentSchema = z
  .enum(["MIN", "CENTER", "MAX", "STRETCH"])
  .describe("Auto layout alignment");

// Auto layout sizing
export const AutoLayoutSizingSchema = z
  .enum(["FIXED", "HUG", "FILL"])
  .describe("Auto layout sizing");

// Constraints
export const ConstraintsSchema = z
  .object({
    horizontal: ConstraintTypeSchema,
    vertical: ConstraintTypeSchema,
  })
  .describe("Layout constraints");

/**
 * Variable schemas
 */

// Variable type
export const VariableTypeSchema = z
  .enum(["BOOLEAN", "FLOAT", "STRING", "COLOR"])
  .describe("Variable type");

// Variable scope
export const VariableScopeSchema = z
  .enum([
    "ALL_SCOPES",
    "ALL_FILLS",
    "FRAME_FILL",
    "SHAPE_FILL",
    "TEXT_FILL",
    "STROKE_COLOR",
    "EFFECT_COLOR",
    "WIDTH_HEIGHT",
    "GAP",
    "CORNER_RADIUS",
    "TEXT_CONTENT",
    "FONT_FAMILY",
    "FONT_SIZE",
    "FONT_WEIGHT",
    "LINE_HEIGHT",
    "LETTER_SPACING",
    "PARAGRAPH_SPACING",
    "PARAGRAPH_INDENT",
    "OPACITY",
    "GRID_LAYOUT_COLUMNS",
    "GRID_LAYOUT_ROWS",
  ])
  .describe("Variable scope");

// Variable mode
export const VariableModeSchema = z
  .object({
    modeId: z.string(),
    name: z.string(),
  })
  .describe("Variable mode");

/**
 * Component and instance schemas
 */

// Component property type
export const ComponentPropertyTypeSchema = z
  .enum(["BOOLEAN", "INSTANCE_SWAP", "TEXT", "VARIANT"])
  .describe("Component property type");

// Boolean property
export const BooleanPropertySchema = z
  .object({
    type: z.literal("BOOLEAN"),
    defaultValue: z.boolean(),
    variantOptions: z.array(z.boolean()).optional(),
  })
  .describe("Boolean component property");

// Text property
export const TextPropertySchema = z
  .object({
    type: z.literal("TEXT"),
    defaultValue: z.string(),
  })
  .describe("Text component property");

/**
 * Batch operation schemas
 */

// Batch operation base
export const BatchOperationSchema = z
  .object({
    maxConcurrency: z.number().positive().max(10).optional().describe("Maximum concurrent operations"),
    continueOnError: z.boolean().optional().describe("Continue processing on individual errors"),
    timeout: z.number().positive().optional().describe("Timeout per operation in ms"),
  })
  .describe("Batch operation options");

// Node selection for batch operations
export const NodeSelectionSchema = z
  .object({
    nodeIds: z.array(NodeIdSchema).min(1, "At least one node ID required"),
    filter: z
      .object({
        type: z.string().optional(),
        name: z.string().optional(),
        visible: z.boolean().optional(),
      })
      .optional()
      .describe("Optional filter criteria"),
  })
  .describe("Node selection for batch operations");

/**
 * Export and import schemas
 */

// Export format
export const ExportFormatSchema = z
  .enum(["PNG", "JPG", "SVG", "PDF"])
  .describe("Export format");

// Export settings
export const ExportSettingsSchema = z
  .object({
    format: ExportFormatSchema,
    scale: z.number().positive().max(4).optional().describe("Export scale (1-4)"),
    quality: z.number().min(0).max(1).optional().describe("Quality for JPG (0-1)"),
    includeId: z.boolean().optional().describe("Include node ID in filename"),
    suffix: z.string().optional().describe("Filename suffix"),
  })
  .describe("Export settings");

/**
 * Utility schemas
 */

// Pagination
export const PaginationSchema = z
  .object({
    limit: z.number().positive().max(100).optional().describe("Maximum items to return"),
    offset: z.number().min(0).optional().describe("Number of items to skip"),
  })
  .describe("Pagination options");

// Search criteria
export const SearchCriteriaSchema = z
  .object({
    query: z.string().optional().describe("Search query"),
    type: z.string().optional().describe("Node type filter"),
    exact: z.boolean().optional().describe("Exact match"),
    caseSensitive: z.boolean().optional().describe("Case sensitive search"),
  })
  .describe("Search criteria");

// Sort options
export const SortOptionsSchema = z
  .object({
    field: z.string().describe("Field to sort by"),
    direction: z.enum(["ASC", "DESC"]).optional().describe("Sort direction"),
  })
  .describe("Sort options");

/**
 * Validation utilities
 */

// Transform color to ensure alpha default
export const ColorWithDefaultsSchema = ColorSchema.transform((color) => ({
  ...color,
  a: color.a ?? 1,
}));

// Transform position to ensure integers
export const IntegerPositionSchema = PositionSchema.transform((pos) => ({
  x: Math.round(pos.x),
  y: Math.round(pos.y),
}));

// Validate array of unique node IDs
export const UniqueNodeIdsSchema = z
  .array(NodeIdSchema)
  .min(1, "At least one node ID required")
  .refine((ids) => new Set(ids).size === ids.length, "Duplicate node IDs not allowed");

/**
 * Complex composite schemas
 */

// Complete node creation parameters
export const NodeCreationSchema = z
  .object({
    name: OptionalNodeNameSchema,
    position: PositionSchema,
    size: SizeSchema.optional(),
    parentId: OptionalNodeIdSchema,
    fillColor: OptionalColorSchema,
    strokeColor: OptionalColorSchema,
    strokeWeight: z.number().positive().optional(),
    visible: z.boolean().optional().default(true),
    locked: z.boolean().optional().default(false),
  })
  .describe("Node creation parameters");

// Complete style definition
export const StyleDefinitionSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
    fills: z.array(z.any()).optional(),
    strokes: z.array(z.any()).optional(),
    effects: z.array(z.any()).optional(),
    fontFamily: z.string().optional(),
    fontSize: FontSizeSchema.optional(),
    fontWeight: FontWeightSchema.optional(),
    lineHeight: LineHeightSchema.optional(),
    letterSpacing: LetterSpacingSchema.optional(),
  })
  .describe("Style definition");

/**
 * Schema validation helpers
 */
export class SchemaValidator {
  /**
   * Validate and transform data with detailed error reporting
   */
  static validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
    const result = schema.safeParse(data);
    
    if (!result.success) {
      const errors = result.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));
      
      throw new Error(`Validation failed: ${JSON.stringify(errors, null, 2)}`);
    }
    
    return result.data;
  }

  /**
   * Validate array of items with individual error tracking
   */
  static validateArray<T>(
    schema: z.ZodSchema<T>,
    items: unknown[]
  ): { valid: T[]; errors: Array<{ index: number; error: string }> } {
    const valid: T[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    items.forEach((item, index) => {
      const result = schema.safeParse(item);
      if (result.success) {
        valid.push(result.data);
      } else {
        errors.push({
          index,
          error: result.error.errors.map(e => e.message).join(', '),
        });
      }
    });

    return { valid, errors };
  }
}

/**
 * Variable schemas
 */

// Variable data types
export const VariableDataTypeSchema = z
  .enum(['BOOLEAN', 'FLOAT', 'STRING', 'COLOR'])
  .describe("Variable data type");

// Variable value
export const VariableValueSchema = z
  .union([
    z.boolean(),
    z.number(),
    z.string(),
    ColorSchema
  ])
  .describe("Variable value");

// Variable ID
export const VariableIdSchema = z
  .string()
  .min(1, "Variable ID cannot be empty")
  .describe("Variable ID");

// Variable collection ID
export const VariableCollectionIdSchema = z
  .string()
  .min(1, "Variable collection ID cannot be empty")
  .describe("Variable collection ID");

// Mode ID
export const ModeIdSchema = z
  .string()
  .min(1, "Mode ID cannot be empty")
  .describe("Mode ID");

// Variable name
export const VariableNameSchema = z
  .string()
  .min(1, "Variable name cannot be empty")
  .max(255, "Variable name too long")
  .describe("Variable name");

// Variable collection name
export const VariableCollectionNameSchema = z
  .string()
  .min(1, "Variable collection name cannot be empty")
  .max(255, "Variable collection name too long")
  .describe("Variable collection name");

// Create variable schema
export const CreateVariableSchema = z
  .object({
    name: VariableNameSchema,
    variableCollectionId: VariableCollectionIdSchema,
    resolvedType: VariableDataTypeSchema,
    initialValue: VariableValueSchema.optional(),
    description: z.string().optional(),
    scopes: z.array(VariableScopeSchema).optional(),
  })
  .describe("Create variable parameters");

// Create variable collection schema
export const CreateVariableCollectionSchema = z
  .object({
    name: VariableCollectionNameSchema,
    initialModeNames: z.array(z.string()).optional().default([]),
  })
  .describe("Create variable collection parameters");

// Set bound variable schema
export const SetBoundVariableSchema = z
  .object({
    nodeId: NodeIdSchema,
    property: z.string().min(1, "Property name required"),
    variableId: VariableIdSchema,
  })
  .describe("Set bound variable parameters");

// Update variable value schema
export const UpdateVariableValueSchema = z
  .object({
    variableId: VariableIdSchema,
    modeId: ModeIdSchema,
    value: VariableValueSchema,
  })
  .describe("Update variable value parameters");

// Filter variables schema
export const FilterVariablesSchema = z
  .object({
    collectionId: VariableCollectionIdSchema.optional(),
    type: VariableDataTypeSchema.optional(),
    name: z.string().optional(),
    remote: z.boolean().optional(),
  })
  .describe("Filter variables parameters");

/**
 * Export commonly used schema combinations
 */
export const CommonSchemas = {
  // Position with size
  PositionAndSize: PositionSchema.merge(SizeSchema),
  
  // Color with required alpha
  ColorWithAlpha: ColorSchema.required({ a: true }),
  
  // Node with basic properties
  BasicNode: z.object({
    id: NodeIdSchema,
    name: NodeNameSchema,
    type: z.string(),
    position: PositionSchema.optional(),
    size: SizeSchema.optional(),
  }),
  
  // Text node properties
  TextNode: z.object({
    characters: z.string(),
    fontSize: FontSizeSchema.optional(),
    fontWeight: FontWeightSchema.optional(),
    fontFamily: z.string().optional(),
    textAlign: TextAlignmentSchema.optional(),
    color: OptionalColorSchema,
  }),
  
  // Frame properties
  Frame: z.object({
    backgroundColor: OptionalColorSchema,
    cornerRadius: z.number().min(0).optional(),
    padding: z.number().min(0).optional(),
    autoLayout: z.boolean().optional(),
  }),

  // Variable schemas
  Variable: z.object({
    id: VariableIdSchema,
    name: VariableNameSchema,
    collectionId: VariableCollectionIdSchema,
    type: VariableDataTypeSchema,
    value: VariableValueSchema.optional(),
  }),

  VariableCollection: z.object({
    id: VariableCollectionIdSchema,
    name: VariableCollectionNameSchema,
    modes: z.array(z.object({
      modeId: ModeIdSchema,
      name: z.string(),
    })),
  }),
} as const; 