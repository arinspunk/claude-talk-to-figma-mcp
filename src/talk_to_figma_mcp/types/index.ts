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

/**
 * Variable API Types
 * TypeScript interfaces for Figma Variables API
 */

// Variable data types
export type VariableDataType = 'BOOLEAN' | 'FLOAT' | 'STRING' | 'COLOR';

// Variable scope types  
export type VariableScope = 
  | 'ALL_SCOPES'
  | 'ALL_FILLS'
  | 'FRAME_FILL'
  | 'SHAPE_FILL'
  | 'TEXT_FILL'
  | 'STROKE_COLOR'
  | 'EFFECT_COLOR'
  | 'WIDTH_HEIGHT'
  | 'GAP'
  | 'CORNER_RADIUS'
  | 'TEXT_CONTENT'
  | 'FONT_FAMILY'
  | 'FONT_SIZE'
  | 'FONT_WEIGHT'
  | 'LINE_HEIGHT'
  | 'LETTER_SPACING'
  | 'PARAGRAPH_SPACING'
  | 'PARAGRAPH_INDENT'
  | 'OPACITY'
  | 'GRID_LAYOUT_COLUMNS'
  | 'GRID_LAYOUT_ROWS';

// Variable value types
export type VariableValue = boolean | number | string | { r: number; g: number; b: number; a: number };

// Variable interface
export interface FigmaVariable {
  id: string;
  name: string;
  key: string;
  variableCollectionId: string;
  resolvedType: VariableDataType;
  valuesByMode: Record<string, VariableValue>;
  remote: boolean;
  description: string;
  hiddenFromPublishing: boolean;
  scopes: VariableScope[];
  codeSyntax: Record<string, string>;
}

// Variable collection interface
export interface FigmaVariableCollection {
  id: string;
  name: string;
  key: string;
  modes: Array<{
    modeId: string;
    name: string;
  }>;
  defaultModeId: string;
  remote: boolean;
  hiddenFromPublishing: boolean;
  variableIds: string[];
}

// Variable reference interface
export interface VariableReference {
  type: 'VARIABLE_ALIAS';
  id: string;
}

// Variable binding interfaces
export interface VariableBinding {
  nodeId: string;
  property: string;
  variableId: string;
}

// Variable creation parameters
export interface CreateVariableParams {
  name: string;
  variableCollectionId: string;
  resolvedType: VariableDataType;
  initialValue?: VariableValue;
  description?: string;
  scopes?: VariableScope[];
}

// Variable collection creation parameters
export interface CreateVariableCollectionParams {
  name: string;
  initialModeNames?: string[];
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
  // Variable commands
  | "create_variable"
  | "create_variable_collection"
  | "get_local_variables"
  | "get_local_variable_collections"
  | "get_variable_by_id"
  | "get_variable_collection_by_id"
  | "set_bound_variable"
  | "set_bound_variable_for_paint"
  | "remove_bound_variable"
  | "update_variable_value"
  | "update_variable_name"
  | "delete_variable"
  | "delete_variable_collection"
  | "get_variable_references"
  | "set_variable_mode_value"
  | "create_variable_mode"
  | "delete_variable_mode"
  | "reorder_variable_modes"
  | "publish_variable_collection"
  | "get_published_variables";