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

  // Set Gradient Fill Tool
  server.tool(
    "set_gradient_fill",
    "Set a gradient fill on a node in Figma. Supports linear, radial, angular, and diamond gradients.",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      gradientType: z.enum(["LINEAR", "RADIAL", "ANGULAR", "DIAMOND"]).describe("Type of gradient"),
      stops: z.array(
        z.object({
          position: z.number().min(0).max(1).describe("Position of the color stop (0-1)"),
          color: z.object({
            r: z.number().min(0).max(1).describe("Red component (0-1)"),
            g: z.number().min(0).max(1).describe("Green component (0-1)"),
            b: z.number().min(0).max(1).describe("Blue component (0-1)"),
            a: z.number().min(0).max(1).describe("Alpha component (0-1)")
          }).describe("Color at this stop")
        })
      ).min(2).describe("Array of gradient color stops (minimum 2 required)"),
      angle: z.number().optional().describe("Rotation angle in degrees for linear gradients (0-360, defaults to 0 for left-to-right)"),
      opacity: z.number().min(0).max(1).optional().describe("Overall gradient opacity (0-1, defaults to 1)")
    },
    async ({ nodeId, gradientType, stops, angle, opacity }) => {
      try {
        const result = await sendCommandToFigma("set_gradient_fill", {
          nodeId,
          gradientType,
          stops,
          angle: angle ?? 0,
          opacity: opacity ?? 1
        });

        const typedResult = result as { name: string };

        return {
          content: [
            {
              type: "text",
              text: `Successfully applied ${gradientType.toLowerCase()} gradient with ${stops.length} color stops to node "${typedResult.name}"`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting gradient fill: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Set Opacity Tool
  server.tool(
    "set_opacity",
    "Set the opacity of a node in Figma",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      opacity: z.number().min(0).max(1).describe("Opacity value (0-1, where 0 is transparent and 1 is opaque)")
    },
    async ({ nodeId, opacity }) => {
      try {
        const result = await sendCommandToFigma("set_opacity", {
          nodeId,
          opacity
        });

        const typedResult = result as { name: string };

        return {
          content: [
            {
              type: "text",
              text: `Successfully set opacity of node "${typedResult.name}" to ${opacity}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting opacity: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Set Blend Mode Tool
  server.tool(
    "set_blend_mode",
    "Set the blend mode of a node in Figma",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      blendMode: z.enum([
        "NORMAL", "DARKEN", "MULTIPLY", "COLOR_BURN", "LIGHTEN", "SCREEN",
        "COLOR_DODGE", "OVERLAY", "SOFT_LIGHT", "HARD_LIGHT", "DIFFERENCE",
        "EXCLUSION", "HUE", "SATURATION", "COLOR", "LUMINOSITY", "LINEAR_BURN",
        "LINEAR_DODGE", "PASS_THROUGH"
      ]).describe("Blend mode to apply")
    },
    async ({ nodeId, blendMode }) => {
      try {
        const result = await sendCommandToFigma("set_blend_mode", {
          nodeId,
          blendMode
        });

        const typedResult = result as { name: string };

        return {
          content: [
            {
              type: "text",
              text: `Successfully set blend mode of node "${typedResult.name}" to ${blendMode}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting blend mode: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Set Constraints Tool
  server.tool(
    "set_constraints",
    "Set responsive constraints for a node in Figma (how it resizes relative to its parent)",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      horizontal: z.enum(["MIN", "MAX", "CENTER", "STRETCH", "SCALE"]).optional().describe("Horizontal constraint"),
      vertical: z.enum(["MIN", "MAX", "CENTER", "STRETCH", "SCALE"]).optional().describe("Vertical constraint")
    },
    async ({ nodeId, horizontal, vertical }) => {
      try {
        const result = await sendCommandToFigma("set_constraints", {
          nodeId,
          horizontal,
          vertical
        });

        const typedResult = result as { name: string; constraints: any };

        return {
          content: [
            {
              type: "text",
              text: `Successfully set constraints for node "${typedResult.name}"`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting constraints: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Set Layout Sizing Tool
  server.tool(
    "set_layout_sizing",
    "Set layout sizing mode for a node in an auto layout (Fixed, Hug, Fill)",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      horizontal: z.enum(["FIXED", "HUG", "FILL"]).optional().describe("Horizontal sizing mode"),
      vertical: z.enum(["FIXED", "HUG", "FILL"]).optional().describe("Vertical sizing mode")
    },
    async ({ nodeId, horizontal, vertical }) => {
      try {
        const result = await sendCommandToFigma("set_layout_sizing", {
          nodeId,
          horizontal,
          vertical
        });

        const typedResult = result as { name: string };

        return {
          content: [
            {
              type: "text",
              text: `Successfully set layout sizing for node "${typedResult.name}"`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting layout sizing: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Rotate Node Tool
  server.tool(
    "rotate_node",
    "Rotate a node by a specific angle in degrees",
    {
      nodeId: z.string().describe("The ID of the node to rotate"),
      angle: z.number().describe("Rotation angle in degrees (0-360)")
    },
    async ({ nodeId, angle }) => {
      try {
        const result = await sendCommandToFigma("rotate_node", {
          nodeId,
          angle
        });

        const typedResult = result as { name: string; rotation: number };

        return {
          content: [
            {
              type: "text",
              text: `Successfully rotated node "${typedResult.name}" to ${angle} degrees`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error rotating node: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Flip Horizontal Tool
  server.tool(
    "flip_horizontal",
    "Flip a node horizontally",
    {
      nodeId: z.string().describe("The ID of the node to flip")
    },
    async ({ nodeId }) => {
      try {
        const result = await sendCommandToFigma("flip_horizontal", {
          nodeId
        });

        const typedResult = result as { name: string };

        return {
          content: [
            {
              type: "text",
              text: `Successfully flipped node "${typedResult.name}" horizontally`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error flipping node: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Flip Vertical Tool
  server.tool(
    "flip_vertical",
    "Flip a node vertically",
    {
      nodeId: z.string().describe("The ID of the node to flip")
    },
    async ({ nodeId }) => {
      try {
        const result = await sendCommandToFigma("flip_vertical", {
          nodeId
        });

        const typedResult = result as { name: string };

        return {
          content: [
            {
              type: "text",
              text: `Successfully flipped node "${typedResult.name}" vertically`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error flipping node: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Set Visible Tool
  server.tool(
    "set_visible",
    "Show or hide a node in Figma",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      visible: z.boolean().describe("Whether the node should be visible")
    },
    async ({ nodeId, visible }) => {
      try {
        const result = await sendCommandToFigma("set_visible", {
          nodeId,
          visible
        });

        const typedResult = result as { name: string; visible: boolean };

        return {
          content: [
            {
              type: "text",
              text: `Successfully set node "${typedResult.name}" to ${visible ? "visible" : "hidden"}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting visibility: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Set Locked Tool
  server.tool(
    "set_locked",
    "Lock or unlock a node to prevent/allow editing",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      locked: z.boolean().describe("Whether the node should be locked")
    },
    async ({ nodeId, locked }) => {
      try {
        const result = await sendCommandToFigma("set_locked", {
          nodeId,
          locked
        });

        const typedResult = result as { name: string; locked: boolean };

        return {
          content: [
            {
              type: "text",
              text: `Successfully ${locked ? "locked" : "unlocked"} node "${typedResult.name}"`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting lock: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Bring to Front Tool
  server.tool(
    "bring_to_front",
    "Bring a node to the front of its siblings (top layer)",
    {
      nodeId: z.string().describe("The ID of the node to bring to front")
    },
    async ({ nodeId }) => {
      try {
        const result = await sendCommandToFigma("bring_to_front", {
          nodeId
        });

        const typedResult = result as { name: string };

        return {
          content: [
            {
              type: "text",
              text: `Successfully brought node "${typedResult.name}" to front`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error bringing to front: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Send to Back Tool
  server.tool(
    "send_to_back",
    "Send a node to the back of its siblings (bottom layer)",
    {
      nodeId: z.string().describe("The ID of the node to send to back")
    },
    async ({ nodeId }) => {
      try {
        const result = await sendCommandToFigma("send_to_back", {
          nodeId
        });

        const typedResult = result as { name: string };

        return {
          content: [
            {
              type: "text",
              text: `Successfully sent node "${typedResult.name}" to back`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error sending to back: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Bring Forward Tool
  server.tool(
    "bring_forward",
    "Move a node one layer forward",
    {
      nodeId: z.string().describe("The ID of the node to bring forward")
    },
    async ({ nodeId }) => {
      try {
        const result = await sendCommandToFigma("bring_forward", {
          nodeId
        });

        const typedResult = result as { name: string };

        return {
          content: [
            {
              type: "text",
              text: `Successfully brought node "${typedResult.name}" forward`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error bringing forward: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Send Backward Tool
  server.tool(
    "send_backward",
    "Move a node one layer backward",
    {
      nodeId: z.string().describe("The ID of the node to send backward")
    },
    async ({ nodeId }) => {
      try {
        const result = await sendCommandToFigma("send_backward", {
          nodeId
        });

        const typedResult = result as { name: string };

        return {
          content: [
            {
              type: "text",
              text: `Successfully sent node "${typedResult.name}" backward`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error sending backward: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Reorder Children Tool
  server.tool(
    "reorder_children",
    "Reorder the children of a container node",
    {
      nodeId: z.string().describe("The ID of the parent node"),
      childIds: z.array(z.string()).describe("Array of child node IDs in the desired order")
    },
    async ({ nodeId, childIds }) => {
      try {
        const result = await sendCommandToFigma("reorder_children", {
          nodeId,
          childIds
        });

        const typedResult = result as { name: string };

        return {
          content: [
            {
              type: "text",
              text: `Successfully reordered children of node "${typedResult.name}"`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error reordering children: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Boolean Operation Tool
  server.tool(
    "boolean_operation",
    "Perform boolean operations on multiple nodes (union, subtract, intersect, exclude)",
    {
      nodeIds: z.array(z.string()).min(2).describe("Array of node IDs to perform boolean operation on"),
      operation: z.enum(["UNION", "SUBTRACT", "INTERSECT", "EXCLUDE"]).describe("Type of boolean operation")
    },
    async ({ nodeIds, operation }) => {
      try {
        const result = await sendCommandToFigma("boolean_operation", {
          nodeIds,
          operation
        });

        const typedResult = result as { name: string; operation: string };

        return {
          content: [
            {
              type: "text",
              text: `Successfully performed ${operation} boolean operation`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error performing boolean operation: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Create Mask Tool
  server.tool(
    "create_mask",
    "Create a mask from multiple nodes (first node becomes the mask)",
    {
      nodeIds: z.array(z.string()).min(2).describe("Array of node IDs (first will be the mask)")
    },
    async ({ nodeIds }) => {
      try {
        const result = await sendCommandToFigma("create_mask", {
          nodeIds
        });

        const typedResult = result as { name: string; id: string };

        return {
          content: [
            {
              type: "text",
              text: `Successfully created mask group "${typedResult.name}"`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating mask: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Apply Mask Tool
  server.tool(
    "apply_mask",
    "Apply a mask node to another node",
    {
      nodeId: z.string().describe("The ID of the node to be masked"),
      maskNodeId: z.string().describe("The ID of the node that will act as the mask")
    },
    async ({ nodeId, maskNodeId }) => {
      try {
        const result = await sendCommandToFigma("apply_mask", {
          nodeId,
          maskNodeId
        });

        const typedResult = result as { name: string; id: string };

        return {
          content: [
            {
              type: "text",
              text: `Successfully applied mask to create group "${typedResult.name}"`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error applying mask: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Set Stroke Align Tool
  server.tool(
    "set_stroke_align",
    "Set the alignment of stroke (border) on a node",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      strokeAlign: z.enum(["CENTER", "INSIDE", "OUTSIDE"]).describe("Stroke alignment")
    },
    async ({ nodeId, strokeAlign }) => {
      try {
        const result = await sendCommandToFigma("set_stroke_align", {
          nodeId,
          strokeAlign
        });

        const typedResult = result as { name: string };

        return {
          content: [
            {
              type: "text",
              text: `Successfully set stroke align to ${strokeAlign} for node "${typedResult.name}"`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting stroke align: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Set Stroke Cap Tool
  server.tool(
    "set_stroke_cap",
    "Set the cap style for stroke endpoints",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      strokeCap: z.enum(["NONE", "ROUND", "SQUARE", "ARROW_LINES", "ARROW_EQUILATERAL"]).describe("Stroke cap style")
    },
    async ({ nodeId, strokeCap }) => {
      try {
        const result = await sendCommandToFigma("set_stroke_cap", {
          nodeId,
          strokeCap
        });

        const typedResult = result as { name: string };

        return {
          content: [
            {
              type: "text",
              text: `Successfully set stroke cap to ${strokeCap} for node "${typedResult.name}"`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting stroke cap: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Set Stroke Join Tool
  server.tool(
    "set_stroke_join",
    "Set the join style for stroke corners",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      strokeJoin: z.enum(["MITER", "BEVEL", "ROUND"]).describe("Stroke join style")
    },
    async ({ nodeId, strokeJoin }) => {
      try {
        const result = await sendCommandToFigma("set_stroke_join", {
          nodeId,
          strokeJoin
        });

        const typedResult = result as { name: string };

        return {
          content: [
            {
              type: "text",
              text: `Successfully set stroke join to ${strokeJoin} for node "${typedResult.name}"`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting stroke join: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Set Stroke Dashes Tool
  server.tool(
    "set_stroke_dashes",
    "Set a dashed or dotted pattern for strokes",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      dashPattern: z.array(z.number()).describe("Array of dash and gap lengths (e.g., [5, 3] for 5px dash, 3px gap)")
    },
    async ({ nodeId, dashPattern }) => {
      try {
        const result = await sendCommandToFigma("set_stroke_dashes", {
          nodeId,
          dashPattern
        });

        const typedResult = result as { name: string };

        return {
          content: [
            {
              type: "text",
              text: `Successfully set stroke dash pattern for node "${typedResult.name}"`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting stroke dashes: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Set Image Fill Tool
  server.tool(
    "set_image_fill",
    "Set an image fill on a node from a URL",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      imageUrl: z.string().describe("URL of the image to use"),
      scaleMode: z.enum(["FILL", "FIT", "CROP", "TILE"]).optional().describe("How the image should scale (defaults to FILL)")
    },
    async ({ nodeId, imageUrl, scaleMode }) => {
      try {
        const result = await sendCommandToFigma("set_image_fill", {
          nodeId,
          imageUrl,
          scaleMode
        });

        const typedResult = result as { name: string };

        return {
          content: [
            {
              type: "text",
              text: `Successfully set image fill for node "${typedResult.name}"`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting image fill: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Get Image Fills Tool
  server.tool(
    "get_image_fills",
    "Get information about image fills on a node",
    {
      nodeId: z.string().describe("The ID of the node to inspect")
    },
    async ({ nodeId }) => {
      try {
        const result = await sendCommandToFigma("get_image_fills", {
          nodeId
        });

        const typedResult = result as { name: string; imageFills: any[] };

        return {
          content: [
            {
              type: "text",
              text: `Found ${typedResult.imageFills.length} image fill(s) on node "${typedResult.name}"`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting image fills: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Add Layout Grid Tool
  server.tool(
    "add_layout_grid",
    "Add a layout grid to a frame or component",
    {
      nodeId: z.string().describe("The ID of the node to add grid to"),
      gridType: z.enum(["COLUMNS", "ROWS", "GRID"]).optional().describe("Type of grid (defaults to COLUMNS)"),
      count: z.number().optional().describe("Number of columns/rows (defaults to 12)"),
      offset: z.number().optional().describe("Offset from edges (defaults to 0)"),
      gutterSize: z.number().optional().describe("Space between columns/rows (defaults to 20)"),
      color: z.object({
        r: z.number().min(0).max(1),
        g: z.number().min(0).max(1),
        b: z.number().min(0).max(1),
        a: z.number().min(0).max(1)
      }).optional().describe("Grid color (defaults to light gray)")
    },
    async ({ nodeId, gridType, count, offset, gutterSize, color }) => {
      try {
        const result = await sendCommandToFigma("add_layout_grid", {
          nodeId,
          gridType,
          count,
          offset,
          gutterSize,
          color
        });

        const typedResult = result as { name: string };

        return {
          content: [
            {
              type: "text",
              text: `Successfully added layout grid to node "${typedResult.name}"`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error adding layout grid: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Remove Layout Grid Tool
  server.tool(
    "remove_layout_grid",
    "Remove layout grids from a node",
    {
      nodeId: z.string().describe("The ID of the node to remove grids from"),
      index: z.number().optional().describe("Index of specific grid to remove (if not provided, removes all)")
    },
    async ({ nodeId, index }) => {
      try {
        const result = await sendCommandToFigma("remove_layout_grid", {
          nodeId,
          index
        });

        const typedResult = result as { name: string };

        return {
          content: [
            {
              type: "text",
              text: `Successfully removed layout grid(s) from node "${typedResult.name}"`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error removing layout grid: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );
}