/**
 * This module contains all the prompts used by the Figma MCP server.
 * Prompts provide guidance to Claude on how to work with Figma designs effectively.
 * These prompts are available across all MCP clients (Claude Desktop, Claude Code, Cursor, etc.)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Register all prompts with the MCP server
 * @param server - The MCP server instance
 */
export function registerPrompts(server: McpServer): void {
  // ─── Main Guide ───────────────────────────────────────────────────────
  server.prompt(
    "figma_guide",
    "Complete guide to working with Figma — tool categories, core workflows, conventions, and connection setup",
    (extra) => ({
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: FIGMA_GUIDE_CONTENT,
          },
        },
      ],
      description: "Complete guide to working with Figma designs",
    })
  );

  // ─── Design Strategy ──────────────────────────────────────────────────
  server.prompt(
    "design_strategy",
    "Best practices for creating, modifying, and reading Figma designs — layout hierarchy, naming, visual structure",
    (extra) => ({
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: DESIGN_STRATEGY_CONTENT,
          },
        },
      ],
      description: "Best practices for working with Figma designs",
    })
  );

  // ─── Text Replacement Strategy ────────────────────────────────────────
  server.prompt(
    "text_replacement_strategy",
    "Systematic chunked approach for replacing text across complex Figma designs — tables, cards, forms, navigation",
    (extra) => ({
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: TEXT_REPLACEMENT_STRATEGY_CONTENT,
          },
        },
      ],
      description: "Systematic approach for replacing text in Figma designs",
    })
  );

  // ─── Tool Reference ───────────────────────────────────────────────────
  server.prompt(
    "tool_reference",
    "Complete parameter reference for every Figma tool — creation, modification, text, components, images, SVG, variables, FigJam, prototyping",
    (extra) => ({
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: TOOL_REFERENCE_CONTENT,
          },
        },
      ],
      description: "Complete parameter reference for all Figma tools",
    })
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Prompt content — kept as constants for clarity and to avoid deeply nested
// template literals inside the registration calls.
// ═══════════════════════════════════════════════════════════════════════════

const FIGMA_GUIDE_CONTENT = `# Figma Design Orchestration Guide

## Prerequisites

The ClaudeTalkToFigma MCP server must be configured. The Figma plugin must be open in Figma Desktop with a channel ID visible. The MCP server automatically starts an embedded WebSocket server on port 3055 — no separate socket process is needed. If multiple Claude sessions are active, only the first instance hosts the server; the rest connect to it automatically.

### Connection Workflow

1. Call auto_join_session — if exactly one Figma session is active, it joins automatically
2. If multiple sessions are found, show the list and ask the user which to join
3. If no sessions are found, ask the user for their channel ID and call join_channel
4. Verify with get_document_info to confirm connectivity

## Tool Categories

### Document & Navigation
Read document structure, manage pages, inspect nodes.
- list_sessions / auto_join_session — Discover and connect to active Figma plugin sessions
- get_document_info — Document metadata overview
- get_selection — Current user selection
- get_node_info / get_nodes_info — Inspect specific nodes (batch with get_nodes_info for efficiency)
- scan_text_nodes — Find all text in a subtree
- get_pages / set_current_page / create_page / create_slide / delete_page / rename_page / duplicate_page
- export_node_as_image — Visual export (PNG/JPG/SVG/PDF)
- get_styles — Document styles

### Creation
Create shapes, frames, text, and structural elements.
- create_frame — Containers (use as parent for layouts)
- create_rectangle / create_ellipse / create_polygon / create_star
- create_text — Text nodes with font/color/alignment options
- clone_node — Duplicate existing nodes
- group_nodes / ungroup_nodes — Group management
- insert_child — Reparent nodes
- flatten_node / boolean_operation — Shape operations (UNION/SUBTRACT/INTERSECT/EXCLUDE)

### Modification
Transform, style, and configure existing nodes.
- move_node / resize_node / rotate_node — Spatial transforms (coordinates are local to parent)
- set_fill_color / set_stroke_color / set_selection_colors — Colors (RGBA 0-1 range)
- set_gradient — Linear/radial/angular/diamond gradients
- set_corner_radius — Border radius with per-corner control
- set_auto_layout — Flexbox-like layout (HORIZONTAL/VERTICAL)
- set_effects / set_effect_style_id — Shadows, blurs
- set_node_properties — Visibility, opacity, lock, layout sizing
- reorder_node — Z-order (layer order)
- convert_to_frame — Convert groups to frames
- delete_node / rename_node
- set_grid / get_grid — Layout grids
- set_guide / get_guide — Page guides
- set_annotation / get_annotation — Design annotations
- set_image — Base64 image fill

### Text
Modify text content and typography.
- set_text_content / set_multiple_text_contents — Update text (batch for efficiency)
- set_font_name / set_font_size / set_font_weight — Typography
- set_letter_spacing / set_line_height / set_paragraph_spacing
- set_text_case / set_text_decoration / set_text_align
- set_text_style_id / get_styled_text_segments
- load_font_async — Pre-load fonts before use
- fix_fonts — Batch fix misnamed fonts from auto-capture

### Components
Work with reusable design components.
- get_local_components / get_remote_components — List available components
- create_component_from_node / create_component_set — Create components/variants
- create_component_instance — Instantiate by component key
- get_component_properties / set_component_property / add_component_property
- link_component_property — Bind property to child text node
- set_instance_variant — Switch variant without recreating

### Images
Manage image fills and transforms.
- set_image_fill — Apply image from URL or base64
- replace_image_fill — Swap images (preserves transform)
- get_image_from_node — Extract image metadata
- apply_image_transform — Pan/zoom/rotate image within node
- set_image_filters — Exposure, contrast, saturation, temperature, etc.

### SVG
Import and export vector graphics.
- set_svg — Import SVG string as vector node (max 500KB)
- get_svg — Export node as SVG markup

### Variables (Design Tokens)
Manage design tokens and variable collections.
- get_variables — List all collections and variables
- set_variable — Create/update variables (COLOR/FLOAT/STRING/BOOLEAN)
- apply_variable_to_node — Bind variable to node property
- delete_variable / delete_variable_collection
- switch_variable_mode — Switch between variable modes

### FigJam
Work with FigJam whiteboard elements.
- get_figjam_elements — Read stickies, connectors, shapes, sections
- create_sticky / set_sticky_text — Sticky notes (10 colors available)
- create_shape_with_text — Flowchart shapes (SQUARE/ELLIPSE/DIAMOND/etc.)
- create_connector — Arrows between nodes (ELBOWED/STRAIGHT/CURVED)
- create_section — Grouping sections

### Prototyping
Create interactive prototype flows.
- get_reactions / add_reaction / add_back_reaction / add_url_reaction / remove_reactions
- get_flow_starting_points / set_flow_starting_point
- set_prototype_device / set_prototype_start_node

## Core Workflows

### Reading a Design
1. Call get_selection to see what the user has selected
2. If no selection, ask the user to select nodes in Figma
3. Call get_nodes_info with the selected node IDs for batch inspection
4. Use export_node_as_image to get a visual snapshot when needed

### Creating a Design
1. Start with get_document_info to understand the document
2. Create the main container frame first with create_frame
3. Build the hierarchy top-down: parent frames first, then child elements
4. Use the returned node ID as parentId for child elements
5. Apply styling after creation (colors, effects, auto-layout)
6. Verify with get_node_info or export_node_as_image

### Text Replacement
For complex text replacement across designs, use the text_replacement_strategy prompt. Key principles:
1. Scan with scan_text_nodes first to understand structure
2. Clone the node with clone_node as a safe copy
3. Replace in logical chunks using set_multiple_text_contents
4. Verify each chunk with export_node_as_image

### Component Workflow
1. List available components with get_local_components or get_remote_components
2. Create instances with create_component_instance using the component key
3. Inspect properties with get_component_properties
4. Customize instances with set_component_property or set_instance_variant

## Key Conventions

- Colors: Always RGBA with values 0-1 (not 0-255). Example: {r: 0.2, g: 0.4, b: 1.0, a: 1.0}
- Coordinates: Local to parent (not absolute canvas). Use get_node_info to see both localPosition and absoluteBoundingBox
- Node IDs: Returned by creation tools. Store and reuse them for subsequent operations
- Batch operations: Prefer get_nodes_info over multiple get_node_info calls. Prefer set_multiple_text_contents over multiple set_text_content calls
- Font loading: Call load_font_async before changing font properties if needed

## Additional Prompts

For detailed guidance on specific topics:
- design_strategy — Best practices for creating and structuring Figma designs
- text_replacement_strategy — Systematic chunked text replacement approach
- tool_reference — Complete parameter reference for every tool`;


const DESIGN_STRATEGY_CONTENT = `# Design Strategy

Best practices for creating and modifying Figma designs.

## Document Structure

1. Start with get_document_info() to understand the current document
2. Plan the layout hierarchy before creating elements
3. Create a main container frame for each screen/section

## Naming Conventions

- Use descriptive, semantic names for all elements
- Follow a consistent naming pattern (e.g., "Login Screen", "Logo Container", "Email Input")
- Group related elements with meaningful names

## Layout Hierarchy

Create parent frames first, then add child elements. For forms/login screens:
1. Start with the main screen container frame
2. Create a logo container at the top
3. Group input fields in their own containers
4. Place action buttons (login, submit) after inputs
5. Add secondary elements (forgot password, signup links) last

## Input Fields Structure

- Create a container frame for each input field
- Include a label text above or inside the input
- Group related inputs (e.g., username/password) together

## Element Creation

- Use create_frame() for containers and input fields
- Use create_text() for labels, buttons text, and links
- Set appropriate colors and styles:
  - Use fillColor for backgrounds
  - Use strokeColor for borders
  - Set proper fontWeight for different text elements

## Modifying Existing Elements

- Use set_text_content() to modify text content
- Use set_fill_color() and set_stroke_color() for color changes
- Use set_auto_layout() to configure flex-like layouts

## Visual Hierarchy

Position elements in logical reading order (top to bottom). Maintain consistent spacing. Use appropriate font sizes:
- Larger for headings/welcome text
- Medium for input labels
- Standard for button text
- Smaller for helper text/links

## Best Practices

- Verify each creation with get_node_info()
- Use parentId to maintain proper hierarchy
- Group related elements together in frames
- Keep consistent spacing and alignment
- Use auto-layout for responsive designs

## Example Login Screen Structure

Login Screen (main frame)
  Logo Container (frame)
    Logo (image/text)
  Welcome Text (text)
  Input Container (frame)
    Email Input (frame)
      Email Label (text)
      Email Field (frame)
    Password Input (frame)
      Password Label (text)
      Password Field (frame)
  Login Button (frame)
    Button Text (text)
  Helper Links (frame)
    Forgot Password (text)
    Don't have account (text)

## Reading Design Strategy

When reading Figma designs:

1. Start with get_selection() to understand the current selection
2. If no selection, ask the user to select nodes
3. Use get_nodes_info() for batch inspection of selected nodes
4. Use export_node_as_image() for visual verification`;


const TEXT_REPLACEMENT_STRATEGY_CONTENT = `# Intelligent Text Replacement Strategy

Systematic approach for replacing text content across Figma designs.

## 1. Analyze Design & Identify Structure

Scan text nodes to understand the overall structure. Use AI pattern recognition to identify logical groupings:
- Tables (rows, columns, headers, cells)
- Lists (items, headers, nested lists)
- Card groups (similar cards with recurring text fields)
- Forms (labels, input fields, validation text)
- Navigation (menu items, breadcrumbs)

  scan_text_nodes(nodeId: "node-id")
  get_node_info(nodeId: "node-id")  // optional for deeper inspection

## 2. Strategic Chunking for Complex Designs

Divide replacement tasks into logical content chunks based on design structure. Choose the chunking strategy that best fits:

- Structural Chunking: Table rows/columns, list sections, card groups
- Spatial Chunking: Top-to-bottom, left-to-right in screen areas
- Semantic Chunking: Content related to the same topic or functionality
- Component-Based Chunking: Process similar component instances together

## 3. Progressive Replacement with Verification

1. Create a safe copy of the node for text replacement
2. Replace text chunk by chunk with continuous progress updates
3. After each chunk, verify:
   - Export that section as a manageable image
   - Verify text fits properly and maintains design integrity
   - Fix issues before proceeding to the next chunk

  // Clone the node to create a safe copy
  clone_node(nodeId: "selected-node-id", x: [new-x], y: [new-y])

  // Replace text chunk by chunk
  set_multiple_text_contents(
    nodeId: "parent-node-id",
    text: [
      { nodeId: "node-id-1", text: "New text 1" },
      // More nodes in this chunk...
    ]
  )

  // Verify chunk with small, targeted image exports
  export_node_as_image(nodeId: "chunk-node-id", format: "PNG", scale: 0.5)

## 4. Intelligent Handling for Table Data

For tabular content:
- Process one row or column at a time
- Maintain alignment and spacing between cells
- Consider conditional formatting based on cell content
- Preserve header/data relationships

## 5. Smart Text Adaptation

Adaptively handle text based on container constraints:
- Auto-detect space constraints and adjust text length
- Apply line breaks at appropriate linguistic points
- Maintain text hierarchy and emphasis
- Consider font scaling for critical content that must fit

## 6. Progressive Feedback Loop

Establish a continuous feedback loop during replacement:
- Real-time progress updates (0-100%)
- Small image exports after each chunk for verification
- Issues identified early and resolved incrementally
- Quick adjustments applied to subsequent chunks

## 7. Final Verification & Context-Aware QA

After all chunks are processed:
- Export the entire design at reduced scale for final verification
- Check for cross-chunk consistency issues
- Verify proper text flow between different sections
- Ensure design harmony across the full composition

## 8. Chunk-Specific Export Scale Guidelines

Scale exports appropriately based on chunk size:
- Small chunks (1-5 elements): scale 1.0
- Medium chunks (6-20 elements): scale 0.7
- Large chunks (21-50 elements): scale 0.5
- Very large chunks (50+ elements): scale 0.3
- Full design verification: scale 0.2

## Chunking Strategies for Common Design Types

### Tables
- Process by logical rows (5-10 rows per chunk)
- Alternative: Process by column for columnar analysis
- Always include header row in first chunk for reference

### Card Lists
- Group 3-5 similar cards per chunk
- Process entire cards to maintain internal consistency
- Verify text-to-image ratio within cards after each chunk

### Forms
- Group related fields (e.g., "Personal Information", "Payment Details")
- Process labels and input fields together
- Ensure validation messages and hints are updated with their fields

### Navigation & Menus
- Process hierarchical levels together (main menu, submenu)
- Respect information architecture relationships
- Verify menu fit and alignment after replacement

## Best Practices

- Preserve Design Intent: Always prioritize design integrity
- Structural Consistency: Maintain alignment, spacing, and hierarchy
- Visual Feedback: Verify each chunk visually before proceeding
- Incremental Improvement: Learn from each chunk to improve subsequent ones
- Balance Automation & Control: Let AI handle repetitive replacements but maintain oversight
- Respect Content Relationships: Keep related content consistent across chunks`;


const TOOL_REFERENCE_CONTENT = `# ClaudeTalkToFigma Tool Reference

Complete parameter reference for all tools.

## Document & Navigation Tools

join_channel — Connect to a Figma document via the WebSocket bridge.
  channel (string, required) — Channel name from the Figma plugin UI

list_sessions — List active Figma plugin sessions. Returns channel IDs, document names, and page names. No parameters.

auto_join_session — Automatically connect to a Figma session. If one session is active, joins directly. If multiple, returns the list. No parameters.

get_document_info — Get document metadata. No parameters.

get_selection — Get current selection in Figma. No parameters.

get_node_info — Get detailed info about a specific node.
  nodeId (string, required) — Node ID
  Returns: Node properties, absoluteBoundingBox (global coords), localPosition (parent-relative, use for move_node)

get_nodes_info — Batch fetch node details.
  nodeIds (string[], required) — Array of node IDs

scan_text_nodes — Scan all text nodes in a subtree.
  nodeId (string, required) — Root node ID to scan

get_styles — Get all document styles. No parameters.

get_local_components — Get all local components. No parameters.

get_remote_components — Get remote library components in use. No parameters.

get_pages — List all pages. No parameters.

set_current_page — Switch to a page.
  pageId (string, required) — Page ID

create_page — Create a new page.
  name (string, required) — Page name

create_slide — Create a new slide (Figma Slides only).
  name (string, optional) — Slide name
  Returns: id, contentsId (use as parentId for content), backgroundsId, dimensions

delete_page
  pageId (string, required)

rename_page
  pageId (string, required)
  name (string, required) — New name

duplicate_page
  pageId (string, required)
  name (string, optional) — Name for copy

export_node_as_image — Export a node as image.
  nodeId (string, required)
  format (enum: PNG/JPG/SVG/PDF, optional, default: PNG)
  scale (number > 0, optional, default: 1)

## Creation Tools

create_rectangle
  x, y (number, required) — Position relative to parent
  width, height (number, required)
  name (string, optional)
  parentId (string, optional) — Parent node ID

create_frame
  x, y (number, required) — Position relative to parent
  width, height (number, required)
  name (string, optional)
  parentId (string, optional)
  fillColor ({r, g, b, a?}, optional) — RGBA 0-1, defaults white
  strokeColor ({r, g, b, a?}, optional)
  strokeWeight (number, optional)

create_text
  x, y (number, required)
  text (string, required) — Text content
  fontSize (number, optional, default: 14)
  fontWeight (number, optional, default: 400) — 100-900
  fontColor ({r, g, b, a?}, optional) — Defaults black
  name (string, optional)
  parentId (string, optional)
  textAlignHorizontal (enum: LEFT/CENTER/RIGHT/JUSTIFIED, optional) — Use RIGHT for RTL
  textAutoResize (enum: WIDTH_AND_HEIGHT/HEIGHT/NONE/TRUNCATE, optional)
  width (number, optional) — Fixed width for wrapping (use with textAutoResize: HEIGHT)

create_ellipse
  x, y, width, height (number, required)
  name (string, optional)
  parentId (string, optional)
  fillColor, strokeColor ({r,g,b,a?}, optional)
  strokeWeight (number, optional)

create_polygon
  x, y, width, height (number, required)
  sides (number >= 3, optional, default: 6)
  name, parentId, fillColor, strokeColor, strokeWeight (same as ellipse)

create_star
  x, y, width, height (number, required)
  points (number >= 3, optional, default: 5)
  innerRadius (0.01-0.99, optional, default: 0.5)
  name, parentId, fillColor, strokeColor, strokeWeight (same as ellipse)

clone_node
  nodeId (string, required) — Node to clone
  x, y (number, optional) — New position for clone

group_nodes
  nodeIds (string[], required) — IDs of nodes to group
  name (string, optional)

ungroup_nodes
  nodeId (string, required) — Group/frame to ungroup

insert_child — Reparent a node into a new parent.
  parentId (string, required)
  childId (string, required)
  index (number, optional) — Position in children

flatten_node — Convert to path.
  nodeId (string, required)

boolean_operation — Combine shapes. All nodes must share the same parent.
  nodeIds (string[], min 2, required) — Order matters for SUBTRACT
  operation (enum: UNION/SUBTRACT/INTERSECT/EXCLUDE, required)
  name (string, optional)

## Modification Tools

set_fill_color
  nodeId (string, required)
  r, g, b (number 0-1, required)
  a (number 0-1, optional, default: 1)

set_stroke_color
  nodeId (string, required)
  r, g, b (number 0-1, required)
  a (number 0-1, optional, default: 1)
  strokeWeight (number >= 0, optional, default: 1)

set_selection_colors — Recursively change all stroke/fill colors of a node and descendants. Like Figma's "Selection colors" feature.
  nodeId (string, required)
  r, g, b (number 0-1, required)
  a (number 0-1, optional, default: 1)

move_node
  nodeId (string, required)
  x, y (number, required) — Local coordinates relative to parent

resize_node
  nodeId (string, required)
  width, height (number > 0, required)

rotate_node
  nodeId (string, required)
  angle (number, required) — Degrees clockwise
  relative (boolean, optional, default: false) — Add to current rotation vs absolute

delete_node
  nodeId (string, required)

rename_node
  nodeId (string, required)
  name (string, required)

set_corner_radius
  nodeId (string, required)
  radius (number >= 0, required)
  corners (boolean[4], optional) — [topLeft, topRight, bottomRight, bottomLeft]

set_auto_layout
  nodeId (string, required)
  layoutMode (enum: HORIZONTAL/VERTICAL/NONE, required)
  paddingTop, paddingBottom, paddingLeft, paddingRight (number, optional)
  itemSpacing (number, optional)
  primaryAxisAlignItems (enum: MIN/CENTER/MAX/SPACE_BETWEEN, optional)
  counterAxisAlignItems (enum: MIN/CENTER/MAX, optional)
  layoutWrap (enum: WRAP/NO_WRAP, optional)
  strokesIncludedInLayout (boolean, optional)

set_effects
  nodeId (string, required)
  effects (array, required) — Each effect:
    type (enum: DROP_SHADOW/INNER_SHADOW/LAYER_BLUR/BACKGROUND_BLUR)
    color ({r,g,b,a}, optional) — For shadows
    offset ({x,y}, optional) — For shadows
    radius (number, optional)
    spread (number, optional) — For shadows
    visible (boolean, optional)
    blendMode (string, optional)

set_effect_style_id
  nodeId (string, required)
  effectStyleId (string, required)

set_node_properties — Set visibility, lock, opacity, layout sizing. Only provided properties change.
  nodeId (string, required)
  visible (boolean, optional)
  locked (boolean, optional)
  opacity (number 0-1, optional)
  layoutSizingHorizontal (enum: FIXED/HUG/FILL, optional)
  layoutSizingVertical (enum: FIXED/HUG/FILL, optional)

reorder_node — Change z-order within same parent.
  nodeId (string, required)
  position (enum: front/back/forward/backward, optional)
  index (number, optional) — Direct index (0 = bottom). Overrides position.

convert_to_frame
  nodeId (string, required) — Converts group/shape to frame

set_gradient
  nodeId (string, required)
  type (enum: GRADIENT_LINEAR/GRADIENT_RADIAL/GRADIENT_ANGULAR/GRADIENT_DIAMOND, required)
  stops (array, min 2, required) — Each: {position: 0-1, color: {r,g,b,a?}}
  gradientTransform (2x3 matrix, optional) — Default: left-to-right [[1,0,0],[0,1,0]]

set_image — Set image fill from base64 data.
  nodeId (string, required)
  imageData (string, required) — Base64 encoded (PNG/JPEG/GIF/WebP, max ~5MB)
  scaleMode (enum: FILL/FIT/CROP/TILE, optional, default: FILL)

set_grid — Apply layout grids to a frame.
  nodeId (string, required)
  grids (array, required) — Each:
    pattern (enum: COLUMNS/ROWS/GRID)
    count, sectionSize, gutterSize, offset (number, optional)
    alignment (enum: MIN/CENTER/MAX/STRETCH, optional)
    visible (boolean, optional)
    color ({r,g,b,a}, optional)

get_grid
  nodeId (string, required)

set_guide — Set page guides (replaces all existing).
  pageId (string, required)
  guides (array, required) — Each: {axis: "X"|"Y", offset: number}

get_guide
  pageId (string, required)

set_annotation
  nodeId (string, required)
  label (string, required)

get_annotation
  nodeId (string, required)

## Text Tools

set_text_content
  nodeId (string, required)
  text (string, required)

set_multiple_text_contents — Batch text replacement.
  nodeId (string, required) — Parent node containing text nodes
  text (array, required) — Each: {nodeId: string, text: string}

set_font_name
  nodeId (string, required)
  family (string, required)
  style (string, optional) — e.g., "Regular", "Bold", "Italic"

fix_fonts — Batch fix misnamed fonts in a subtree.
  nodeId (string, required) — Root node to fix

set_font_size
  nodeId (string, required)
  fontSize (number > 0, required)

set_font_weight
  nodeId (string, required)
  weight (number, required) — 100/200/300/400/500/600/700/800/900

set_letter_spacing
  nodeId (string, required)
  letterSpacing (number, required)
  unit (enum: PIXELS/PERCENT, optional, default: PIXELS)

set_line_height
  nodeId (string, required)
  lineHeight (number, required)
  unit (enum: PIXELS/PERCENT/AUTO, optional, default: PIXELS)

set_paragraph_spacing
  nodeId (string, required)
  paragraphSpacing (number, required) — Pixels

set_text_case
  nodeId (string, required)
  textCase (enum: ORIGINAL/UPPER/LOWER/TITLE, required)

set_text_decoration
  nodeId (string, required)
  textDecoration (enum: NONE/UNDERLINE/STRIKETHROUGH, required)

set_text_align
  nodeId (string, required)
  textAlignHorizontal (enum: LEFT/CENTER/RIGHT/JUSTIFIED, optional) — RIGHT for RTL
  textAlignVertical (enum: TOP/CENTER/BOTTOM, optional)

get_styled_text_segments — Get segments with specific styling.
  nodeId (string, required)
  property (enum: fillStyleId/fontName/fontSize/textCase/textDecoration/textStyleId/fills/letterSpacing/lineHeight/fontWeight, required)

set_text_style_id
  nodeId (string, required)
  textStyleId (string, required)

load_font_async — Pre-load a font before modifying text.
  family (string, required)
  style (string, optional, default: "Regular")

## Component Tools

create_component_instance
  componentKey (string, required) — Component key (from get_local_components)
  x, y (number, required)

create_component_from_node
  nodeId (string, required) — Node to convert
  name (string, optional)
  Returns: id, name, key (use key for instances)

create_component_set — Create variants from components.
  componentIds (string[], required) — Component node IDs
  name (string, optional)

add_component_property
  nodeId (string, required) — Component node
  propertyName (string, required) — Display name
  type (enum: TEXT/BOOLEAN/INSTANCE_SWAP/VARIANT, required)
  defaultValue (string | boolean, optional)
  Returns: propertyKey (use with set_component_property)

get_component_properties
  nodeId (string, required) — Component or instance

set_component_property
  nodeId (string, required) — Instance node
  properties (Record<string, string|boolean>, required) — Key-value pairs from get_component_properties

link_component_property — Bind a component property to a child text node.
  nodeId (string, required) — Component node
  textNodeId (string, required) — Child text node
  propertyKey (string, required) — From add_component_property

set_instance_variant — Change variant without recreating (preserves overrides).
  nodeId (string, required) — Instance node
  properties (Record<string, string>, required) — e.g., {"State": "Hover", "Size": "Large"}

## Image Tools

set_image_fill
  nodeId (string, required)
  imageSource (string, required) — URL or base64 data
  sourceType (enum: url/base64, required)
  scaleMode (enum: FILL/FIT/CROP/TILE, optional, default: FILL)

get_image_from_node
  nodeId (string, required)
  Returns: hasImage, imageHash, scaleMode, imageSize, rotation, filters

replace_image_fill
  nodeId (string, required)
  newImageSource (string, required)
  sourceType (enum: url/base64, required)
  preserveTransform (boolean, optional, default: true)

apply_image_transform
  nodeId (string, required)
  scaleMode (enum: FILL/FIT/CROP/TILE, optional)
  rotation (0/90/180/270, optional) — Rotates image inside node
  translateX, translateY (number, optional)
  scale (number > 0, optional) — 1 = 100%

set_image_filters
  nodeId (string, required)
  exposure (-1 to 1, optional)
  contrast (-1 to 1, optional)
  saturation (-1 to 1, optional) — -1 = grayscale
  temperature (-1 to 1, optional)
  tint (-1 to 1, optional)
  highlights (-1 to 1, optional)
  shadows (-1 to 1, optional)

## SVG Tools

set_svg — Import SVG as vector node.
  svgString (string, required, max 500KB) — Valid SVG markup
  x, y (number, optional, default: 0)
  name (string, optional)
  parentId (string, optional)

get_svg — Export node as SVG.
  nodeId (string, required)

## Variable Tools

get_variables — List all variable collections. No parameters.

set_variable — Create or update a variable.
  collectionId (string, optional) — Existing collection
  collectionName (string, optional) — Creates new if collectionId not provided
  name (string, required)
  resolvedType (enum: COLOR/FLOAT/STRING/BOOLEAN, required)
  value (any, required) — COLOR: {r,g,b,a} 0-1. FLOAT: number. STRING: string. BOOLEAN: boolean.
  modeId (string, optional) — Uses default mode if omitted

apply_variable_to_node — Bind a variable to a node property. Call once per field.
  nodeId (string, required)
  variableId (string, required)
  field (string, required) — e.g., "fills/0/color", "opacity", "width", "height"

delete_variable
  variableId (string, required) — e.g., "VariableID:34:4353"

delete_variable_collection
  collectionId (string, required)

switch_variable_mode
  nodeId (string, required)
  collectionId (string, required)
  modeId (string, required)

## FigJam Tools

get_figjam_elements — Get all FigJam elements on current page. No parameters.

create_sticky
  x, y (number, required)
  text (string, required)
  color (enum: yellow/pink/green/blue/purple/red/orange/teal/gray/white, optional, default: yellow)
  isWide (boolean, optional, default: false)
  name (string, optional)
  parentId (string, optional)

set_sticky_text
  nodeId (string, required)
  text (string, required)

create_shape_with_text
  x, y (number, required)
  width, height (number, optional, default: 200)
  shapeType (enum: SQUARE/ELLIPSE/ROUNDED_RECTANGLE/DIAMOND/TRIANGLE_UP/TRIANGLE_DOWN/PARALLELOGRAM_RIGHT/PARALLELOGRAM_LEFT, optional, default: ROUNDED_RECTANGLE)
  text (string, optional)
  fillColor ({r,g,b,a?}, optional)
  name (string, optional)
  parentId (string, optional)

create_connector
  startNodeId (string, optional) — Start node (or use startX/startY)
  startX, startY (number, optional)
  endNodeId (string, optional) — End node (or use endX/endY)
  endX, endY (number, optional)
  connectorLineType (enum: ELBOWED/STRAIGHT/CURVED, optional, default: ELBOWED)
  startStrokeCap (enum: NONE/ARROW/ARROW_EQUILATERAL/CIRCLE_FILLED/DIAMOND_FILLED, optional, default: NONE)
  endStrokeCap (enum: NONE/ARROW/ARROW_EQUILATERAL/CIRCLE_FILLED/DIAMOND_FILLED, optional, default: ARROW)
  strokeColor ({r,g,b,a?}, optional)
  strokeWeight (number, optional)
  name (string, optional)

create_section
  x, y (number, required)
  width, height (number, optional, default: 800x600)
  name (string, optional, default: "Section")
  fillColor ({r,g,b,a?}, optional)

## Prototyping Tools

get_reactions
  nodeId (string, required)

add_reaction
  nodeId (string, required) — Trigger node
  trigger (enum: ON_CLICK/ON_DRAG/ON_HOVER/ON_PRESS/MOUSE_ENTER/MOUSE_LEAVE/MOUSE_UP/MOUSE_DOWN/AFTER_TIMEOUT, required)
  triggerTimeout (number, optional) — For AFTER_TIMEOUT only
  navigationType (enum: NAVIGATE/OVERLAY/SWAP/SCROLL_TO/CHANGE_TO, required)
  destinationId (string, optional)
  transition (optional):
    type (enum: DISSOLVE/SMART_ANIMATE/MOVE_IN/MOVE_OUT/PUSH/SLIDE_IN/SLIDE_OUT)
    duration (number, optional, default: 300ms)
    easing (enum: LINEAR/EASE_IN/EASE_OUT/EASE_IN_AND_OUT/EASE_IN_BACK/EASE_OUT_BACK/EASE_IN_AND_OUT_BACK/CUSTOM_BEZIER)
  overlayRelativePosition ({x, y}, optional) — For OVERLAY type
  resetScrollPosition, resetInteractions, resetVideoPosition (boolean, optional)

add_back_reaction
  nodeId (string, required)
  trigger (same enum as add_reaction)
  actionType (enum: BACK/CLOSE, required)
  transition (optional, same as add_reaction)

add_url_reaction
  nodeId (string, required)
  trigger (same enum as add_reaction)
  url (string, required)

remove_reactions
  nodeId (string, required)
  reactionIndex (number, optional) — Specific reaction index, omit to remove all

get_flow_starting_points — No parameters.

set_flow_starting_point
  nodeId (string, required) — Must be a top-level frame
  name (string, optional) — Omit/empty to remove

set_prototype_device
  deviceType (enum: NONE/PRESET, required)
  presetIdentifier (string, optional) — e.g., "APPLE_IPHONE_16", "ANDROID_SMALL". Required for PRESET.
  rotation (enum: NONE/CCW_90, optional)

set_prototype_start_node
  nodeId (string, optional) — Omit to clear`;
