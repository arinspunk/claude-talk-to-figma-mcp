# Available commands

📖 [**Commands**](COMMANDS.md) | 🚀 [**Installation**](INSTALLATION.md) | 🛠️ [**Contributing**](CONTRIBUTING.md) | 🆘 [**Troubleshooting**](TROUBLESHOOTING.md) | 📜 [**Changelog**](CHANGELOG.md)

Complete reference of the tools Claude can use to interact with Figma.

## Document and page tools

| Command | Purpose | Usage example |
|---------|---------|---------------|
| `get_document_info` | Document analysis | Get project overview |
| `get_selection` | Current selection | What is currently selected |
| `get_node_info` | Element details | Inspect a specific component |
| `get_nodes_info` | Multiple elements info | Batch inspection |
| `scan_text_nodes` | Find all text nodes | Text audit and update |
| `get_styles` | Document styles | Color and text style audit |
| `join_channel` | Connect to Figma | Establish communication |
| `export_node_as_image` | Export assets | Generate design assets |
| `get_pages` | List pages | View all document pages |
| `create_page` | Create page | Add a new page to the document |
| `delete_page` | Delete page | Remove a specific page |
| `rename_page` | Rename page | Change a page's name |
| `set_current_page` | Switch page | Go to a specific page |

## Image tools

| Command | Purpose | Usage example |
|---------|---------|---------------|
| `set_image_fill` | Apply image to node | Set product photos, avatars |
| `get_image_from_node` | Extract image metadata | Audit images in design |
| `replace_image_fill` | Swap images | Update assets, placeholders |
| `apply_image_transform` | Adjust image position/scale/rotation | Pan, zoom, rotate image inside node |
| `set_image_filters` | Apply color/light adjustments | Brightness, contrast, saturation, etc. |

**⚠️ Known Limitations:**
- **URL images**: Must be whitelisted in `manifest.json` (`allowedDomains`). Use base64 (`sourceType: "base64"`) for no restrictions.
- **Data URIs not supported**: `data:image/...` format unsupported
- **Rotation**: 90° increments only (0, 90, 180, 270)

## Creation tools

| Command | Purpose | Usage example |
|---------|---------|---------------|
| `create_rectangle` | Basic shapes | Buttons, backgrounds |
| `create_frame` | Layout containers | Page sections, cards |
| `create_text` | Text elements | Headings, labels |
| `create_ellipse` | Circles/ovals | Profile pictures, icons |
| `create_polygon` | Polygon shapes | Custom geometric elements |
| `create_star` | Stars | Decorative elements |
| `clone_node` | Duplicate elements | Copy existing designs |
| `group_nodes` | Organize elements | Component grouping |
| `ungroup_nodes` | Separate groups | Decompose components |
| `insert_child` | Nest elements | Hierarchical structure |
| `flatten_node` | Vector operations | Boolean operations |

## Modification tools

| Command | Purpose | Usage example |
|---------|---------|---------------|
| `set_fill_color` | Element colors | Apply brand colors |
| `set_stroke_color` | Border colors | Outline styles |
| `set_selection_colors` | Bulk recolor | Recolor icons and child groups |
| `move_node` | Positioning | Layout adjustments |
| `resize_node` | Size changes | Responsive scaling |
| `rename_node` | Rename node | Organize layers and components |
| `delete_node` | Delete elements | Clean up designs |
| `set_corner_radius` | Rounded corners | Modern UI styles |
| `set_auto_layout` | Flexbox-like layout | Component spacing |
| `set_effects` | Shadows/blurs | Visual finishing |
| `set_effect_style_id` | Apply effect styles | Consistent shadows |

## Text tools

| Command | Purpose | Usage example |
|---------|---------|---------------|
| `set_text_content` | Update text | Copy changes |
| `set_multiple_text_contents` | Batch update | Multi-element editing |
| `set_text_align` | H/V alignment | Align text or fix RTL languages |
| `set_font_name` | Typography | Apply brand font |
| `set_font_size` | Text size | Create hierarchy |
| `set_font_weight` | Text weight | Bold/light variations |
| `set_text_style_id` | Apply text style | Use corporate typography |
| `set_letter_spacing` | Character spacing | Typography fine-tuning |
| `set_line_height` | Vertical spacing | Text readability |
| `set_paragraph_spacing` | Paragraph spacing | Content structure |
| `set_text_case` | Case transformation | UPPERCASE/lowercase/Title |
| `set_text_decoration` | Text styles | Underline/strikethrough |
| `get_styled_text_segments` | Text analysis | Rich text inspection |
| `load_font_async` | Font loading | Custom font access |

## Component tools

| Command | Purpose | Usage example |
|---------|---------|---------------|
| `get_local_components` | Project components | Design system audit |
| `get_remote_components` | Team libraries | Access shared components |
| `create_component_instance` | Use components | Consistent UI elements |
| `set_instance_variant` | Change variant properties | Switch button states |

## FigJam tools

| Command | Purpose | Usage example |
|---------|---------|---------------|
| `get_figjam_elements` | Read board contents | Inspect stickies, connectors, shapes, sections, stamps |
| `create_sticky` | Create sticky note | Add ideas, comments, or labels to a board |
| `set_sticky_text` | Update sticky text | Edit existing sticky content |
| `create_shape_with_text` | Create labeled shape | Flowchart nodes, process boxes, decision diamonds |
| `create_connector` | Draw connector arrow | Link stickies or shapes with flow arrows |
| `create_section` | Create section region | Group and organise content areas on the board |

## Understanding coordinate systems

Figma uses two coordinate systems:

- **Global coordinates** (`absoluteBoundingBox`): Position relative to canvas origin (0,0)
- **Local coordinates** (`localPosition`): Position relative to parent node

**When to use which:**
- `get_node_info` returns both `absoluteBoundingBox` (global) and `localPosition` (local)
- `move_node` expects local coordinates (same as create operations)
- To move a node to its current position, use `localPosition.x` and `localPosition.y`

**Example:**
```
Frame at (100, 50)
  └─ Rectangle
     - absoluteBoundingBox: {x: 150, y: 80}  ← Global position
     - localPosition: {x: 50, y: 30}         ← Use for move_node
```

## Effective prompt examples

```
✅ Good: "Create a dashboard with side navigation, a header with user 
profile, and a main area with metric cards"

✅ Good: "Redesign this button component with hover states and 
better contrast ratios"

✅ Good: "Analyze the accessibility of this screen and fix the 
contrast issues"

❌ Avoid: "Make it pretty" (too vague)

❌ Avoid: "Improve the design" (no specific criteria)
```

## Usage tips

1. **Be specific:** The more detailed the instruction, the better the result
2. **Use references:** "Like the button in the previous section" helps maintain consistency
3. **Break down complex tasks:** It's better to make several small changes than one very large one
4. **Check selection:** Make sure the correct element is selected before requesting modifications
