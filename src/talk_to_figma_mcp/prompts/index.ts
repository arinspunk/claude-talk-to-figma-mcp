/**
 * This module contains all the prompts used by the Figma MCP server.
 * Prompts provide guidance to Claude on how to work with Figma designs effectively.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Register all prompts with the MCP server
 * @param server - The MCP server instance
 */
export function registerPrompts(server: McpServer): void {
  // Design Strategy Prompt
  server.prompt(
    "design_strategy",
    "Best practices for working with Figma designs",
    (extra) => {
      return {
        messages: [
          {
            role: "assistant",
            content: {
              type: "text",
              text: `When working with Figma designs, follow these best practices:

1. Start with Document Structure:
   - First use get_document_info() to understand the current document
   - Plan your layout hierarchy before creating elements
   - Create a main container frame for each screen/section

2. Naming Conventions:
   - Use descriptive, semantic names for all elements
   - Follow a consistent naming pattern (e.g., "Login Screen", "Logo Container", "Email Input")
   - Group related elements with meaningful names

3. Layout Hierarchy:
   - Create parent frames first, then add child elements
   - For forms/login screens:
     * Start with the main screen container frame
     * Create a logo container at the top
     * Group input fields in their own containers
     * Place action buttons (login, submit) after inputs
     * Add secondary elements (forgot password, signup links) last

4. Input Fields Structure:
   - Create a container frame for each input field
   - Include a label text above or inside the input
   - Group related inputs (e.g., username/password) together

5. Element Creation:
   - Use create_frame() for containers and input fields
   - Use create_text() for labels, buttons text, and links
   - Set appropriate colors and styles:
     * Use fillColor for backgrounds
     * Use strokeColor for borders
     * Set proper fontWeight for different text elements

6. Mofifying existing elements:
  - use set_text_content() to modify text content.

7. Visual Hierarchy:
   - Position elements in logical reading order (top to bottom)
   - Maintain consistent spacing between elements
   - Use appropriate font sizes for different text types:
     * Larger for headings/welcome text
     * Medium for input labels
     * Standard for button text
     * Smaller for helper text/links

8. Best Practices:
   - Verify each creation with get_node_info()
   - Use parentId to maintain proper hierarchy
   - Group related elements together in frames
   - Keep consistent spacing and alignment

Example Login Screen Structure:
- Login Screen (main frame)
  - Logo Container (frame)
    - Logo (image/text)
  - Welcome Text (text)
  - Input Container (frame)
    - Email Input (frame)
      - Email Label (text)
      - Email Field (frame)
    - Password Input (frame)
      - Password Label (text)
      - Password Field (frame)
  - Login Button (frame)
    - Button Text (text)
  - Helper Links (frame)
    - Forgot Password (text)
    - Don't have account (text)`,
            },
          },
        ],
        description: "Best practices for working with Figma designs",
      };
    }
  );

  // Read Design Strategy Prompt
  server.prompt(
    "read_design_strategy",
    "Best practices for reading Figma designs",
    (extra) => {
      return {
        messages: [
          {
            role: "assistant",
            content: {
              type: "text",
              text: `When reading Figma designs, follow these best practices:

1. Start with selection:
   - First use get_selection() to understand the current selection
   - If no selection ask user to select single or multiple nodes

2. Get node infos of the selected nodes:
   - Use get_nodes_info() to get the information of the selected nodes
   - If no selection ask user to select single or multiple nodes
`,
            },
          },
        ],
        description: "Best practices for reading Figma designs",
      };
    }
  );

  // Design System Strategy Prompt
  server.prompt(
    "design_system_strategy",
    "Workflow for building designs with a remote library / design system",
    (extra) => {
      return {
        messages: [
          {
            role: "assistant",
            content: {
              type: "text",
              text: `# Design System One-Shot Workflow

Follow this workflow when building screens or components using a remote library design system.

## Step 1 – Discover available libraries
\`\`\`
get_available_libraries()
\`\`\`
This returns each library name together with its component count and variable-collection count.
Pick the library that matches the design system you want to use.

## Step 2 – Browse components in that library
\`\`\`
// Get all components from the chosen library (use the exact name returned by Step 1)
get_remote_components({ libraryName: "<library name from Step 1>" })

// Narrow down to a specific component type
get_remote_components({ libraryName: "<library name from Step 1>", nameFilter: "Button" })
\`\`\`
Each returned component has a **key** (used to instantiate it), a **name**, and a **libraryName**.

## Step 3 – Fetch design tokens / variables (optional but recommended)
\`\`\`
get_variables()
\`\`\`
Use the returned variable IDs to bind colors, spacing, and typography to the correct tokens.

## Step 4 – Build the layout skeleton first
Create all container frames before placing components inside them.
\`\`\`
// Top-level screen
create_frame({ name: "Home Screen", x: 0, y: 0, width: 375, height: 812 })

// Section inside the screen
create_frame({ name: "Hero Section", parentId: "<screen-id>", x: 0, y: 0, width: 375, height: 300 })
\`\`\`

## Step 5 – Place component instances directly into containers
Always pass **parentId** so the instance lands in the right frame without a separate insert_child call.
\`\`\`
create_component_instance({
  componentKey: "<key from step 2>",
  x: 16,
  y: 24,
  parentId: "<section-id>"
})
\`\`\`

## Step 6 – Adjust variants as needed
\`\`\`
set_instance_variant({ nodeId: "<instance-id>", properties: { "State": "Hover", "Size": "Large" } })
\`\`\`

## Step 7 – Bind design tokens to instances
\`\`\`
apply_variable_to_node({ nodeId: "<instance-id>", variableId: "<color-token-id>", field: "fills/0/color" })
\`\`\`

## Step 8 – Verify visually
\`\`\`
export_node_as_image({ nodeId: "<screen-id>", format: "PNG", scale: 0.5 })
\`\`\`

---

## Key rules
- **Always call get_available_libraries first** – do not guess library names.
- **Filter by nameFilter** when looking for a specific component type to avoid fetching thousands of components.
- **Always pass parentId to create_component_instance** – this eliminates the extra insert_child step.
- **Match variant property names exactly** – retrieve the component name from get_remote_components and infer likely variants; verify with set_instance_variant.
- **Use design tokens** (variables) instead of hard-coded colors/sizes whenever the library exposes them.
- **Export at reduced scale** (0.5 or lower) for quick visual checks mid-flow to keep context usage low.`,
            },
          },
        ],
        description: "Workflow for building designs with a remote library / design system",
      };
    }
  );


  // Text Replacement Strategy Prompt
  server.prompt(
    "text_replacement_strategy",
    "Systematic approach for replacing text in Figma designs",
    (extra) => {
      return {
        messages: [
          {
            role: "assistant",
            content: {
              type: "text",
              text: `# Intelligent Text Replacement Strategy

## 1. Analyze Design & Identify Structure
- Scan text nodes to understand the overall structure of the design
- Use AI pattern recognition to identify logical groupings:
  * Tables (rows, columns, headers, cells)
  * Lists (items, headers, nested lists)
  * Card groups (similar cards with recurring text fields)
  * Forms (labels, input fields, validation text)
  * Navigation (menu items, breadcrumbs)
\`\`\`
scan_text_nodes(nodeId: "node-id")
get_node_info(nodeId: "node-id")  // optional
\`\`\`

## 2. Strategic Chunking for Complex Designs
- Divide replacement tasks into logical content chunks based on design structure
- Use one of these chunking strategies that best fits the design:
  * **Structural Chunking**: Table rows/columns, list sections, card groups
  * **Spatial Chunking**: Top-to-bottom, left-to-right in screen areas
  * **Semantic Chunking**: Content related to the same topic or functionality
  * **Component-Based Chunking**: Process similar component instances together

## 3. Progressive Replacement with Verification
- Create a safe copy of the node for text replacement
- Replace text chunk by chunk with continuous progress updates
- After each chunk is processed:
  * Export that section as a small, manageable image
  * Verify text fits properly and maintain design integrity
  * Fix issues before proceeding to the next chunk

\`\`\`
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
\`\`\`

## 4. Intelligent Handling for Table Data
- For tabular content:
  * Process one row or column at a time
  * Maintain alignment and spacing between cells
  * Consider conditional formatting based on cell content
  * Preserve header/data relationships

## 5. Smart Text Adaptation
- Adaptively handle text based on container constraints:
  * Auto-detect space constraints and adjust text length
  * Apply line breaks at appropriate linguistic points
  * Maintain text hierarchy and emphasis
  * Consider font scaling for critical content that must fit

## 6. Progressive Feedback Loop
- Establish a continuous feedback loop during replacement:
  * Real-time progress updates (0-100%)
  * Small image exports after each chunk for verification
  * Issues identified early and resolved incrementally
  * Quick adjustments applied to subsequent chunks

## 7. Final Verification & Context-Aware QA
- After all chunks are processed:
  * Export the entire design at reduced scale for final verification
  * Check for cross-chunk consistency issues
  * Verify proper text flow between different sections
  * Ensure design harmony across the full composition

## 8. Chunk-Specific Export Scale Guidelines
- Scale exports appropriately based on chunk size:
  * Small chunks (1-5 elements): scale 1.0
  * Medium chunks (6-20 elements): scale 0.7
  * Large chunks (21-50 elements): scale 0.5
  * Very large chunks (50+ elements): scale 0.3
  * Full design verification: scale 0.2

## Sample Chunking Strategy for Common Design Types

### Tables
- Process by logical rows (5-10 rows per chunk)
- Alternative: Process by column for columnar analysis
- Tip: Always include header row in first chunk for reference

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
- **Preserve Design Intent**: Always prioritize design integrity
- **Structural Consistency**: Maintain alignment, spacing, and hierarchy
- **Visual Feedback**: Verify each chunk visually before proceeding
- **Incremental Improvement**: Learn from each chunk to improve subsequent ones
- **Balance Automation & Control**: Let AI handle repetitive replacements but maintain oversight
- **Respect Content Relationships**: Keep related content consistent across chunks

Remember that text is never just text—it's a core design element that must work harmoniously with the overall composition. This chunk-based strategy allows you to methodically transform text while maintaining design integrity.`,
            },
          },
        ],
        description: "Systematic approach for replacing text in Figma designs",
      };
    }
  );
}

