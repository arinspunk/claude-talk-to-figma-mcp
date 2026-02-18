import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma } from "../utils/websocket";
import { applyColorDefaults, applyDefault, FIGMA_DEFAULTS } from "../utils/defaults";
import { Color } from "../types/color";

/**
 * Register modification tools to the MCP server
 * This module contains tools for modifying existing elements in Figma
 * @param server - The MCP server instance
 */
export function registerModificationTools(server: McpServer): void {
  // Set Fill Color Tool
  server.tool(
    "set_fill_color",
    "Set the fill color of a node in Figma. Alpha component defaults to 1 (fully opaque) if not specified. Use alpha 0 for fully transparent.",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      r: z.number().min(0).max(1).describe("Red component (0-1)"),
      g: z.number().min(0).max(1).describe("Green component (0-1)"),
      b: z.number().min(0).max(1).describe("Blue component (0-1)"),
      a: z.number().min(0).max(1).optional().describe("Alpha component (0-1, defaults to 1 if not specified)"),
    },
    async ({ nodeId, r, g, b, a }) => {
      try {
        // Additional validation: Ensure RGB values are provided (they should not be undefined)
        if (r === undefined || g === undefined || b === undefined) {
          throw new Error("RGB components (r, g, b) are required and cannot be undefined");
        }
        
        // Apply default values safely - preserves opacity 0 for transparency
        const colorInput: Color = { r, g, b, a };
        const colorWithDefaults = applyColorDefaults(colorInput);
        
        const result = await sendCommandToFigma("set_fill_color", {
          nodeId,
          color: colorWithDefaults,
        });
        const typedResult = result as { name: string };
        return {
          content: [
            {
              type: "text",
              text: `Set fill color of node "${typedResult.name}" to RGBA(${r}, ${g}, ${b}, ${colorWithDefaults.a})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting fill color: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Stroke Color Tool
  server.tool(
    "set_stroke_color",
    "Set the stroke color of a node in Figma (defaults: opacity 1, weight 1)",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      r: z.number().min(0).max(1).describe("Red component (0-1)"),
      g: z.number().min(0).max(1).describe("Green component (0-1)"),
      b: z.number().min(0).max(1).describe("Blue component (0-1)"),
      a: z.number().min(0).max(1).optional().describe("Alpha component (0-1)"),
      strokeWeight: z.number().min(0).optional().describe("Stroke weight >= 0)"),
    },
    async ({ nodeId, r, g, b, a, strokeWeight }) => {
      try {

        if (r === undefined || g === undefined || b === undefined) {
          throw new Error("RGB components (r, g, b) are required and cannot be undefined");
        }
        
        const colorInput: Color = { r, g, b, a };
        const colorWithDefaults = applyColorDefaults(colorInput);
        
        const strokeWeightWithDefault = applyDefault(strokeWeight, FIGMA_DEFAULTS.stroke.weight);
        
        const result = await sendCommandToFigma("set_stroke_color", {
          nodeId,
          color: colorWithDefaults,
          strokeWeight: strokeWeightWithDefault,
        });
        const typedResult = result as { name: string };
        return {
          content: [
            {
              type: "text",
              text: `Set stroke color of node "${typedResult.name}" to RGBA(${r}, ${g}, ${b}, ${colorWithDefaults.a}) with weight ${strokeWeightWithDefault}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting stroke color: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Selection Colors Tool - recursively change all descendant stroke/fill colors
  server.tool(
    "set_selection_colors",
    "Recursively change all stroke and fill colors of a node and all its descendants. Works like Figma's 'Selection colors' feature - perfect for recoloring icon instances.",
    {
      nodeId: z.string().describe("The ID of the node to modify (typically an icon instance)"),
      r: z.number().min(0).max(1).describe("Red component (0-1)"),
      g: z.number().min(0).max(1).describe("Green component (0-1)"),
      b: z.number().min(0).max(1).describe("Blue component (0-1)"),
      a: z.number().min(0).max(1).optional().describe("Alpha component (0-1, defaults to 1)"),
    },
    async ({ nodeId, r, g, b, a }) => {
      try {
        if (r === undefined || g === undefined || b === undefined) {
          throw new Error("RGB components (r, g, b) are required");
        }

        const colorWithDefaults = applyColorDefaults({ r, g, b, a } as Color);

        const result = await sendCommandToFigma("set_selection_colors", {
          nodeId,
          r: colorWithDefaults.r,
          g: colorWithDefaults.g,
          b: colorWithDefaults.b,
          a: colorWithDefaults.a,
        });
        const typedResult = result as { name: string; nodesChanged: number };
        return {
          content: [
            {
              type: "text",
              text: `Changed selection colors of "${typedResult.name}" and descendants (${typedResult.nodesChanged} paint(s) updated) to RGBA(${r}, ${g}, ${b}, ${colorWithDefaults.a})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting selection colors: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Move Node Tool
  server.tool(
    "move_node",
    "Move a node to a new position in Figma",
    {
      nodeId: z.string().describe("The ID of the node to move"),
      x: z.number().describe("New X position"),
      y: z.number().describe("New Y position"),
    },
    async ({ nodeId, x, y }) => {
      try {
        const result = await sendCommandToFigma("move_node", { nodeId, x, y });
        const typedResult = result as { name: string };
        return {
          content: [
            {
              type: "text",
              text: `Moved node "${typedResult.name}" to position (${x}, ${y})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error moving node: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Resize Node Tool
  server.tool(
    "resize_node",
    "Resize a node in Figma",
    {
      nodeId: z.string().describe("The ID of the node to resize"),
      width: z.number().positive().describe("New width"),
      height: z.number().positive().describe("New height"),
    },
    async ({ nodeId, width, height }) => {
      try {
        const result = await sendCommandToFigma("resize_node", {
          nodeId,
          width,
          height,
        });
        const typedResult = result as { name: string };
        return {
          content: [
            {
              type: "text",
              text: `Resized node "${typedResult.name}" to width ${width} and height ${height}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error resizing node: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Delete Node Tool
  server.tool(
    "delete_node",
    "Delete a node from Figma",
    {
      nodeId: z.string().describe("The ID of the node to delete"),
    },
    async ({ nodeId }) => {
      try {
        await sendCommandToFigma("delete_node", { nodeId });
        return {
          content: [
            {
              type: "text",
              text: `Deleted node with ID: ${nodeId}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error deleting node: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Corner Radius Tool
  server.tool(
    "set_corner_radius",
    "Set the corner radius of a node in Figma",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      radius: z.number().min(0).describe("Corner radius value"),
      corners: z
        .array(z.boolean())
        .length(4)
        .optional()
        .describe(
          "Optional array of 4 booleans to specify which corners to round [topLeft, topRight, bottomRight, bottomLeft]"
        ),
    },
    async ({ nodeId, radius, corners }) => {
      try {
        const result = await sendCommandToFigma("set_corner_radius", {
          nodeId,
          radius,
          corners: corners || [true, true, true, true],
        });
        const typedResult = result as { name: string };
        return {
          content: [
            {
              type: "text",
              text: `Set corner radius of node "${typedResult.name}" to ${radius}px`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting corner radius: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Auto Layout Tool
  server.tool(
    "set_auto_layout",
    "Configure auto layout properties for a node in Figma",
    {
      nodeId: z.string().describe("The ID of the node to configure auto layout"),
      layoutMode: z.enum(["HORIZONTAL", "VERTICAL", "NONE"]).describe("Layout direction"),
      paddingTop: z.number().optional().describe("Top padding in pixels"),
      paddingBottom: z.number().optional().describe("Bottom padding in pixels"),
      paddingLeft: z.number().optional().describe("Left padding in pixels"),
      paddingRight: z.number().optional().describe("Right padding in pixels"),
      itemSpacing: z.number().optional().describe("Spacing between items in pixels"),
      primaryAxisAlignItems: z.enum(["MIN", "CENTER", "MAX", "SPACE_BETWEEN"]).optional().describe("Alignment along primary axis"),
      counterAxisAlignItems: z.enum(["MIN", "CENTER", "MAX"]).optional().describe("Alignment along counter axis"),
      layoutWrap: z.enum(["WRAP", "NO_WRAP"]).optional().describe("Whether items wrap to new lines"),
      strokesIncludedInLayout: z.boolean().optional().describe("Whether strokes are included in layout calculations")
    },
    async ({ nodeId, layoutMode, paddingTop, paddingBottom, paddingLeft, paddingRight, 
             itemSpacing, primaryAxisAlignItems, counterAxisAlignItems, layoutWrap, strokesIncludedInLayout }) => {
      try {
        const result = await sendCommandToFigma("set_auto_layout", { 
          nodeId, 
          layoutMode, 
          paddingTop, 
          paddingBottom, 
          paddingLeft, 
          paddingRight, 
          itemSpacing, 
          primaryAxisAlignItems, 
          counterAxisAlignItems, 
          layoutWrap, 
          strokesIncludedInLayout 
        });
        
        const typedResult = result as { name: string };
        return {
          content: [
            {
              type: "text",
              text: `Applied auto layout to node "${typedResult.name}" with mode: ${layoutMode}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting auto layout: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Set Effects Tool
  server.tool(
    "set_effects",
    "Set the visual effects of a node in Figma",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      effects: z.array(
        z.object({
          type: z.enum(["DROP_SHADOW", "INNER_SHADOW", "LAYER_BLUR", "BACKGROUND_BLUR"]).describe("Effect type"),
          color: z.object({
            r: z.number().min(0).max(1).describe("Red (0-1)"),
            g: z.number().min(0).max(1).describe("Green (0-1)"),
            b: z.number().min(0).max(1).describe("Blue (0-1)"),
            a: z.number().min(0).max(1).describe("Alpha (0-1)")
          }).optional().describe("Effect color (for shadows)"),
          offset: z.object({
            x: z.number().describe("X offset"),
            y: z.number().describe("Y offset")
          }).optional().describe("Offset (for shadows)"),
          radius: z.number().optional().describe("Effect radius"),
          spread: z.number().optional().describe("Shadow spread (for shadows)"),
          visible: z.boolean().optional().describe("Whether the effect is visible"),
          blendMode: z.string().optional().describe("Blend mode")
        })
      ).describe("Array of effects to apply")
    },
    async ({ nodeId, effects }) => {
      try {
        const result = await sendCommandToFigma("set_effects", {
          nodeId,
          effects
        });
        
        const typedResult = result as { name: string, effects: any[] };
        
        return {
          content: [
            {
              type: "text",
              text: `Successfully applied ${effects.length} effect(s) to node "${typedResult.name}"`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting effects: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Set Effect Style ID Tool
  server.tool(
    "set_effect_style_id",
    "Apply an effect style to a node in Figma",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      effectStyleId: z.string().describe("The ID of the effect style to apply")
    },
    async ({ nodeId, effectStyleId }) => {
      try {
        const result = await sendCommandToFigma("set_effect_style_id", {
          nodeId,
          effectStyleId
        });
        
        const typedResult = result as { name: string, effectStyleId: string };
        
        return {
          content: [
            {
              type: "text",
              text: `Successfully applied effect style to node "${typedResult.name}"`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting effect style: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Rotate Node Tool
  server.tool(
    "rotate_node",
    "Rotate a node in Figma by a specified angle in degrees (clockwise). Use relative=true to add to the current rotation instead of setting an absolute value.",
    {
      nodeId: z.string().describe("The ID of the node to rotate"),
      angle: z.number().describe("Rotation angle in degrees (clockwise)"),
      relative: z.boolean().optional().describe("If true, add angle to current rotation instead of setting absolute value (default: false)"),
    },
    async ({ nodeId, angle, relative }) => {
      try {
        const result = await sendCommandToFigma("rotate_node", {
          nodeId,
          angle,
          relative: relative || false,
        });
        const typedResult = result as { name: string; rotation: number };
  // Set Node Properties Tool (visibility, lock, opacity)
  server.tool(
    "set_node_properties",
    "Set visibility, lock state, and/or opacity of a node in Figma. Only provided properties are changed; omitted properties remain unchanged.",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      visible: z.boolean().optional().describe("Set node visibility (true = visible, false = hidden)"),
      locked: z.boolean().optional().describe("Set node lock state (true = locked, false = unlocked)"),
      opacity: z.number().min(0).max(1).optional().describe("Set node opacity (0 = fully transparent, 1 = fully opaque)"),
    },
    async ({ nodeId, visible, locked, opacity }) => {
      try {
        const result = await sendCommandToFigma("set_node_properties", {
          nodeId,
          visible,
          locked,
          opacity,
        });
        const typedResult = result as { name: string; visible: boolean; locked: boolean; opacity: number };
        const changes: string[] = [];
        if (visible !== undefined) changes.push(`visible=${typedResult.visible}`);
        if (locked !== undefined) changes.push(`locked=${typedResult.locked}`);
        if (opacity !== undefined) changes.push(`opacity=${typedResult.opacity}`);
  // Reorder Node Tool (z-order within same parent)
  server.tool(
    "reorder_node",
    "Change the z-order (layer order) of a node within its parent. Distinct from insert_child which re-parents a node — reorder_node changes position within the same parent.",
    {
      nodeId: z.string().describe("The ID of the node to reorder"),
      position: z.enum(["front", "back", "forward", "backward"]).optional().describe("Move to front/back or one step forward/backward"),
      index: z.number().optional().describe("Direct index position within parent's children (0 = bottom). Overrides position if both provided."),
    },
    async ({ nodeId, position, index }) => {
      try {
        const result = await sendCommandToFigma("reorder_node", {
          nodeId,
          position,
          index,
        });
        const typedResult = result as { name: string; newIndex: number; parentChildCount: number };
  // Convert to Frame Tool
  server.tool(
    "convert_to_frame",
    "Convert a group or shape node into a frame in Figma. Preserves position, size, visual properties, and children. Useful for converting groups into auto-layout-capable frames.",
    {
      nodeId: z.string().describe("The ID of the node to convert to a frame"),
    },
    async ({ nodeId }) => {
      try {
        const result = await sendCommandToFigma("convert_to_frame", { nodeId });
        const typedResult = result as { id: string; name: string; originalType: string; childCount: number };
  // Set Gradient Fill Tool
  server.tool(
    "set_gradient",
    "Set a gradient fill on a node in Figma. Supports linear, radial, angular, and diamond gradients. Replaces all existing fills (same behavior as set_fill_color).",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      type: z.enum(["GRADIENT_LINEAR", "GRADIENT_RADIAL", "GRADIENT_ANGULAR", "GRADIENT_DIAMOND"]).describe("Gradient type"),
      stops: z.array(z.object({
        position: z.number().min(0).max(1).describe("Stop position (0-1, where 0 is start and 1 is end)"),
        color: z.object({
          r: z.number().min(0).max(1).describe("Red (0-1)"),
          g: z.number().min(0).max(1).describe("Green (0-1)"),
          b: z.number().min(0).max(1).describe("Blue (0-1)"),
          a: z.number().min(0).max(1).optional().describe("Alpha (0-1, defaults to 1)"),
        }),
      })).min(2).describe("Array of gradient color stops (minimum 2)"),
      gradientTransform: z.array(z.array(z.number())).optional().describe("2x3 affine transform matrix [[a,b,tx],[c,d,ty]]. Defaults to left-to-right linear: [[1,0,0],[0,1,0]]"),
    },
    async ({ nodeId, type, stops, gradientTransform }) => {
      try {
        const result = await sendCommandToFigma("set_gradient", {
          nodeId,
          type,
          stops: stops.map(s => ({
            position: s.position,
            color: { r: s.color.r, g: s.color.g, b: s.color.b, a: s.color.a ?? 1 },
          })),
          gradientTransform: gradientTransform || [[1, 0, 0], [0, 1, 0]],
        });
        const typedResult = result as { name: string };
  // Set Image Fill Tool
  server.tool(
    "set_image",
    "Set an image fill on a node from base64-encoded image data. Supports PNG, JPEG, GIF, WebP. Max ~5MB after decode.",
    {
      nodeId: z.string().describe("The ID of the node to apply the image fill to"),
      imageData: z.string().max(7_000_000).describe("Base64-encoded image data (PNG, JPEG, GIF, or WebP). Max ~5MB after decode."),
      scaleMode: z.enum(["FILL", "FIT", "CROP", "TILE"]).optional().describe("How the image is scaled within the node (default: FILL)"),
    },
    async ({ nodeId, imageData, scaleMode }) => {
      try {
        const result = await sendCommandToFigma("set_image", {
          nodeId,
          imageData,
          scaleMode: scaleMode || "FILL",
        });
        const typedResult = result as { name: string; imageHash: string };
  // Set Layout Grid Tool
  server.tool(
    "set_grid",
    "Apply layout grids to a frame node in Figma. Supports columns, rows, and grid patterns.",
    {
      nodeId: z.string().describe("The ID of the frame node to apply grids to"),
      grids: z.array(
        z.object({
          pattern: z.enum(["COLUMNS", "ROWS", "GRID"]).describe("Grid pattern type"),
          count: z.number().optional().describe("Number of columns/rows (ignored for GRID)"),
          sectionSize: z.number().optional().describe("Size of each section in pixels"),
          gutterSize: z.number().optional().describe("Gutter size between sections in pixels"),
          offset: z.number().optional().describe("Offset from the edge in pixels"),
          alignment: z.enum(["MIN", "CENTER", "MAX", "STRETCH"]).optional().describe("Grid alignment"),
          visible: z.boolean().optional().describe("Whether the grid is visible (default: true)"),
          color: z.object({
            r: z.number().min(0).max(1).describe("Red (0-1)"),
            g: z.number().min(0).max(1).describe("Green (0-1)"),
            b: z.number().min(0).max(1).describe("Blue (0-1)"),
            a: z.number().min(0).max(1).describe("Alpha (0-1)")
          }).optional().describe("Grid color")
        })
      ).describe("Array of layout grids to apply")
    },
    async ({ nodeId, grids }) => {
      try {
        const result = await sendCommandToFigma("set_grid", { nodeId, grids });
        const typedResult = result as { name: string; gridCount: number };
  // Set Annotation Tool
  server.tool(
    "set_annotation",
    "Add an annotation label to a node in Figma. Uses the proposed Annotations API — requires Figma Desktop with enableProposedApi.",
    {
      nodeId: z.string().describe("The ID of the node to annotate"),
      label: z.string().describe("The annotation label text"),
    },
    async ({ nodeId, label }) => {
      try {
        const result = await sendCommandToFigma("set_annotation", { nodeId, label });
        const typedResult = result as { name: string; annotationCount: number };
        return {
          content: [
            {
              type: "text",
              text: `Added annotation "${label}" to node "${typedResult.name}" (${typedResult.annotationCount} total annotations)`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting annotation: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Get Annotation Tool
  server.tool(
    "get_annotation",
    "Read annotations from a node in Figma. Uses the proposed Annotations API.",
    {
      nodeId: z.string().describe("The ID of the node to read annotations from"),
    },
    async ({ nodeId }) => {
      try {
        const result = await sendCommandToFigma("get_annotation", { nodeId });
        const typedResult = result as { name: string; annotations: any[] };
        return {
          content: [
            {
              type: "text",
              text: `Rotated node "${typedResult.name}" to ${typedResult.rotation}°`,
              text: `Updated node "${typedResult.name}": ${changes.join(", ")}`,
              text: `Reordered node "${typedResult.name}" to index ${typedResult.newIndex} of ${typedResult.parentChildCount} siblings`,
              text: `Converted ${typedResult.originalType} "${typedResult.name}" to FRAME with ID: ${typedResult.id} (${typedResult.childCount} children preserved)`,
              text: `Applied ${type} gradient with ${stops.length} stops to node "${typedResult.name}"`,
              text: `Set image fill on node "${typedResult.name}" with scale mode ${scaleMode || "FILL"} (hash: ${typedResult.imageHash})`,
              text: `Applied ${typedResult.gridCount} layout grid(s) to frame "${typedResult.name}"`,
              text: JSON.stringify({ name: typedResult.name, annotations: typedResult.annotations }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error rotating node: ${error instanceof Error ? error.message : String(error)}`,
              text: `Error setting node properties: ${error instanceof Error ? error.message : String(error)}`,
              text: `Error reordering node: ${error instanceof Error ? error.message : String(error)}`,
              text: `Error converting to frame: ${error instanceof Error ? error.message : String(error)}`,
              text: `Error setting gradient: ${error instanceof Error ? error.message : String(error)}`,
              text: `Error setting image fill: ${error instanceof Error ? error.message : String(error)}`,
              text: `Error setting layout grids: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Get Layout Grid Tool
  server.tool(
    "get_grid",
    "Read layout grids from a frame node in Figma",
    {
      nodeId: z.string().describe("The ID of the frame node to read grids from"),
    },
    async ({ nodeId }) => {
      try {
        const result = await sendCommandToFigma("get_grid", { nodeId });
        const typedResult = result as { name: string; grids: any[] };
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ name: typedResult.name, grids: typedResult.grids }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting layout grids: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Guide Tool
  server.tool(
    "set_guide",
    "Set guides on a page in Figma. Replaces all existing guides on the page.",
    {
      pageId: z.string().describe("The ID of the page to add guides to"),
      guides: z.array(
        z.object({
          axis: z.enum(["X", "Y"]).describe("Guide axis: X for vertical, Y for horizontal"),
          offset: z.number().describe("Offset position of the guide in pixels")
        })
      ).describe("Array of guides to set on the page")
    },
    async ({ pageId, guides }) => {
      try {
        const result = await sendCommandToFigma("set_guide", { pageId, guides });
        const typedResult = result as { name: string; guideCount: number };
        return {
          content: [
            {
              type: "text",
              text: `Set ${typedResult.guideCount} guide(s) on page "${typedResult.name}"`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting guides: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Get Guide Tool
  server.tool(
    "get_guide",
    "Read guides from a page in Figma",
    {
      pageId: z.string().describe("The ID of the page to read guides from"),
    },
    async ({ pageId }) => {
      try {
        const result = await sendCommandToFigma("get_guide", { pageId });
        const typedResult = result as { name: string; guides: any[] };
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ name: typedResult.name, guides: typedResult.guides }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting guides: ${error instanceof Error ? error.message : String(error)}`,
              text: `Error getting annotations: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Rename Node Tool
  server.tool(
    "rename_node",
    "Rename a node (frame, component, group, etc.) in Figma",
    {
      nodeId: z.string().describe("The ID of the node to rename"),
      name: z.string().describe("The new name for the node"),
    },
    async ({ nodeId, name }) => {
      try {
        const result = await sendCommandToFigma("rename_node", {
          nodeId,
          name,
        });
        const typedResult = result as { id: string; name: string; oldName: string; type: string };
        return {
          content: [
            {
              type: "text",
              text: `Renamed ${typedResult.type} from "${typedResult.oldName}" to "${typedResult.name}"`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error renaming node: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}