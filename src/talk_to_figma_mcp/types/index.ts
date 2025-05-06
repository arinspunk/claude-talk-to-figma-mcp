// Define TypeScript interfaces for Figma responses
export interface FigmaResponse {
  id: string;
  result?: any;
  error?: string;
}

// Define interface for command progress updates
export interface CommandProgressUpdate {
  type: 'command_progress';
  commandId: string;
  commandType: string;
  status: 'started' | 'in_progress' | 'completed' | 'error';
  progress: number;
  totalItems: number;
  processedItems: number;
  currentChunk?: number;
  totalChunks?: number;
  chunkSize?: number;
  message: string;
  payload?: any;
  timestamp: number;
}

// Define TypeScript interfaces for tracking WebSocket requests
export interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
  lastActivity: number;
}

// Define WebSocket message structures
export interface ProgressMessage {
  message: FigmaResponse | any;
  type?: string;
  id?: string;
  [key: string]: any; // Allow any other properties
}

// Define possible command types for Figma
export type FigmaCommand =
  | "get_document_info"
  | "get_selection"
  | "get_node_info"
  | "create_rectangle"
  | "create_frame"
  | "create_text"
  | "create_ellipse"
  | "create_polygon"
  | "create_star"
  | "create_vector"
  | "create_line"
  | "set_fill_color"
  | "set_stroke_color"
  | "move_node"
  | "resize_node"
  | "delete_node"
  | "get_styles"
  | "get_local_components"
  | "get_team_components"
  | "create_component_instance"
  | "export_node_as_image"
  | "join"
  | "set_corner_radius"
  | "clone_node"
  | "set_text_content"
  | "scan_text_nodes"
  | "set_multiple_text_contents"
  | "set_auto_layout"
  | "set_font_name"
  | "set_font_size"
  | "set_font_weight"
  | "set_letter_spacing"
  | "set_line_height"
  | "set_paragraph_spacing"
  | "set_text_case"
  | "set_text_decoration"
  | "get_styled_text_segments"
  | "load_font_async"
  | "get_remote_components"
  | "set_effects"
  | "set_effect_style_id"
  | "group_nodes"
  | "ungroup_nodes"
  | "flatten_node"
  | "insert_child"
  // Visual properties tools
  | "set_opacity"
  | "set_rotation"
  | "set_blend_mode"
  | "set_clips_content"
  // Stroke tools
  | "set_stroke_align"
  | "set_stroke_properties"
  | "set_stroke_weights"
  | "set_dash_pattern"
  // Layout tools
  | "set_layout_sizing"
  | "set_layout_positioning"
  | "set_size_constraints"
  | "set_constraints"
  // Component advanced tools
  | "get_component_properties"
  | "edit_component_property"
  | "set_component_property_definitions";

// Define enums and interfaces for new tool parameters

// Visual Properties Tools

export interface OpacityParams {
  nodeId: string;
  opacity: number; // Value between 0-1
}

export interface RotationParams {
  nodeId: string;
  rotation: number; // Degrees
}

// Blend modes supported by Figma
export enum BlendMode {
  NORMAL = "NORMAL",
  DARKEN = "DARKEN",
  MULTIPLY = "MULTIPLY",
  COLOR_BURN = "COLOR_BURN",
  LIGHTEN = "LIGHTEN",
  SCREEN = "SCREEN",
  COLOR_DODGE = "COLOR_DODGE",
  OVERLAY = "OVERLAY",
  SOFT_LIGHT = "SOFT_LIGHT",
  HARD_LIGHT = "HARD_LIGHT",
  DIFFERENCE = "DIFFERENCE",
  EXCLUSION = "EXCLUSION",
  HUE = "HUE",
  SATURATION = "SATURATION",
  COLOR = "COLOR",
  LUMINOSITY = "LUMINOSITY",
}

export interface BlendModeParams {
  nodeId: string;
  blendMode: BlendMode;
}

export interface ClipsContentParams {
  nodeId: string;
  clipsContent: boolean;
}

// Stroke Tools

export enum StrokeAlign {
  INSIDE = "INSIDE",
  CENTER = "CENTER",
  OUTSIDE = "OUTSIDE",
}

export interface StrokeAlignParams {
  nodeId: string;
  strokeAlign: StrokeAlign;
}

export enum StrokeCap {
  NONE = "NONE",
  ROUND = "ROUND",
  SQUARE = "SQUARE",
  ARROW_LINES = "ARROW_LINES",
  ARROW_EQUILATERAL = "ARROW_EQUILATERAL",
}

export enum StrokeJoin {
  MITER = "MITER",
  BEVEL = "BEVEL",
  ROUND = "ROUND",
}

export interface StrokePropertiesParams {
  nodeId: string;
  strokeCap?: StrokeCap;
  strokeJoin?: StrokeJoin;
}

export interface StrokeWeightsParams {
  nodeId: string;
  strokeTopWeight?: number;
  strokeRightWeight?: number;
  strokeBottomWeight?: number;
  strokeLeftWeight?: number;
}

export interface DashPatternParams {
  nodeId: string;
  dashPattern: number[];
}

// Layout Tools

export enum LayoutSizing {
  FIXED = "FIXED",
  HUG = "HUG",
  FILL = "FILL",
}

export interface LayoutSizingParams {
  nodeId: string;
  layoutSizingHorizontal?: LayoutSizing;
  layoutSizingVertical?: LayoutSizing;
}

export enum LayoutAlign {
  MIN = "MIN",
  CENTER = "CENTER",
  MAX = "MAX",
  STRETCH = "STRETCH",
}

export interface LayoutPositioningParams {
  nodeId: string;
  layoutGrow?: number;
  layoutAlign?: LayoutAlign;
}

export interface SizeConstraintsParams {
  nodeId: string;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export enum ConstraintType {
  LEFT = "LEFT",
  RIGHT = "RIGHT",
  CENTER = "CENTER",
  TOP = "TOP",
  BOTTOM = "BOTTOM",
  SCALE = "SCALE",
  STRETCH = "STRETCH",
}

export interface ConstraintsParams {
  nodeId: string;
  horizontal?: ConstraintType;
  vertical?: ConstraintType;
}

// Component Advanced Tools

export interface ComponentPropertiesParams {
  nodeId: string;
}

export interface EditComponentPropertyParams {
  nodeId: string;
  propertyName: string;
  propertyValue: any;
}

export interface ComponentPropertyDefinitionsParams {
  nodeId: string;
  propertyDefinitions: {
    [key: string]: {
      type: "BOOLEAN" | "TEXT" | "NUMBER" | "INSTANCE_SWAP" | "VARIANT";
      defaultValue?: any;
      variantOptions?: string[];
      instanceOptions?: string[];
    };
  };
}