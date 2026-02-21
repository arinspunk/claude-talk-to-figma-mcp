import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma } from "../utils/websocket";
import { coerceJson } from "../utils/schema-helpers";

/**
 * Register creation tools to the MCP server
 * This module contains tools for creating various shapes and elements in Figma
 * @param server - The MCP server instance
 */
export function registerCreationTools(server: McpServer): void {
  // Create Rectangle Tool
  server.tool(
    "create_rectangle",
    "Create a new rectangle in Figma",
    {
      x: z.coerce.number().describe("X position"),
      y: z.coerce.number().describe("Y position"),
      width: z.coerce.number().describe("Width of the rectangle"),
      height: z.coerce.number().describe("Height of the rectangle"),
      name: z.string().optional().describe("Optional name for the rectangle"),
      parentId: z
        .string()
        .optional()
        .describe("Optional parent node ID to append the rectangle to"),
    },
    async ({ x, y, width, height, name, parentId }) => {
      try {
        const result = await sendCommandToFigma("create_rectangle", {
          x,
          y,
          width,
          height,
          name: name || "Rectangle",
          parentId,
        });
        return {
          content: [
            {
              type: "text",
              text: `Created rectangle "${JSON.stringify(result)}"`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating rectangle: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Create Frame Tool
  server.tool(
    "create_frame",
    "Create a new frame in Figma",
    {
      x: z.coerce.number().describe("X position"),
      y: z.coerce.number().describe("Y position"),
      width: z.coerce.number().describe("Width of the frame"),
      height: z.coerce.number().describe("Height of the frame"),
      name: z.string().optional().describe("Optional name for the frame"),
      parentId: z
        .string()
        .optional()
        .describe("Optional parent node ID to append the frame to"),
      fillColor: coerceJson(z.object({
          r: z.coerce.number().min(0).max(1).describe("Red component (0-1)"),
          g: z.coerce.number().min(0).max(1).describe("Green component (0-1)"),
          b: z.coerce.number().min(0).max(1).describe("Blue component (0-1)"),
          a: z.coerce.number().min(0).max(1).optional().describe("Alpha component (0-1)"),
        }))
        .optional()
        .describe("Fill color in RGBA format"),
      strokeColor: coerceJson(z.object({
          r: z.coerce.number().min(0).max(1).describe("Red component (0-1)"),
          g: z.coerce.number().min(0).max(1).describe("Green component (0-1)"),
          b: z.coerce.number().min(0).max(1).describe("Blue component (0-1)"),
          a: z.coerce.number().min(0).max(1).optional().describe("Alpha component (0-1)"),
        }))
        .optional()
        .describe("Stroke color in RGBA format"),
      strokeWeight: z.coerce.number().positive().optional().describe("Stroke weight"),
    },
    async ({
      x,
      y,
      width,
      height,
      name,
      parentId,
      fillColor,
      strokeColor,
      strokeWeight,
    }) => {
      try {
        const result = await sendCommandToFigma("create_frame", {
          x,
          y,
          width,
          height,
          name: name || "Frame",
          parentId,
          fillColor: fillColor || { r: 1, g: 1, b: 1, a: 1 },
          strokeColor: strokeColor,
          strokeWeight: strokeWeight,
        });
        const typedResult = result as { name: string; id: string };
        return {
          content: [
            {
              type: "text",
              text: `Created frame "${typedResult.name}" with ID: ${typedResult.id}. Use the ID as the parentId to appendChild inside this frame.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating frame: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Create Text Tool
  server.tool(
    "create_text",
    "Create a new text element in Figma",
    {
      x: z.coerce.number().describe("X position"),
      y: z.coerce.number().describe("Y position"),
      text: z.string().describe("Text content"),
      fontSize: z.coerce.number().optional().describe("Font size (default: 14)"),
      fontWeight: z
        .coerce.number()
        .optional()
        .describe("Font weight (e.g., 400 for Regular, 700 for Bold)"),
      fontColor: coerceJson(z.object({
          r: z.coerce.number().min(0).max(1).describe("Red component (0-1)"),
          g: z.coerce.number().min(0).max(1).describe("Green component (0-1)"),
          b: z.coerce.number().min(0).max(1).describe("Blue component (0-1)"),
          a: z.coerce.number().min(0).max(1).optional().describe("Alpha component (0-1)"),
        }))
        .optional()
        .describe("Font color in RGBA format"),
      name: z
        .string()
        .optional()
        .describe("Optional name for the text node by default following text"),
      parentId: z
        .string()
        .optional()
        .describe("Optional parent node ID to append the text to"),
      textAlignHorizontal: z
        .enum(["LEFT", "CENTER", "RIGHT", "JUSTIFIED"])
        .optional()
        .describe("Horizontal text alignment. Use RIGHT for Arabic/RTL text."),
      textAutoResize: z
        .enum(["WIDTH_AND_HEIGHT", "HEIGHT", "NONE", "TRUNCATE"])
        .optional()
        .describe("Text resize behavior. Use HEIGHT for fixed-width text that wraps."),
    },
    async ({ x, y, text, fontSize, fontWeight, fontColor, name, parentId, textAlignHorizontal, textAutoResize }) => {
      try {
        const result = await sendCommandToFigma("create_text", {
          x,
          y,
          text,
          fontSize: fontSize || 14,
          fontWeight: fontWeight || 400,
          fontColor: fontColor || { r: 0, g: 0, b: 0, a: 1 },
          name: name || "Text",
          parentId,
          textAlignHorizontal,
          textAutoResize,
        });
        const typedResult = result as { name: string; id: string };
        return {
          content: [
            {
              type: "text",
              text: `Created text "${typedResult.name}" with ID: ${typedResult.id}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating text: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Create Ellipse Tool
  server.tool(
    "create_ellipse",
    "Create a new ellipse in Figma",
    {
      x: z.coerce.number().describe("X position"),
      y: z.coerce.number().describe("Y position"),
      width: z.coerce.number().describe("Width of the ellipse"),
      height: z.coerce.number().describe("Height of the ellipse"),
      name: z.string().optional().describe("Optional name for the ellipse"),
      parentId: z.string().optional().describe("Optional parent node ID to append the ellipse to"),
      fillColor: coerceJson(z.object({
          r: z.coerce.number().min(0).max(1).describe("Red component (0-1)"),
          g: z.coerce.number().min(0).max(1).describe("Green component (0-1)"),
          b: z.coerce.number().min(0).max(1).describe("Blue component (0-1)"),
          a: z.coerce.number().min(0).max(1).optional().describe("Alpha component (0-1)"),
        }))
        .optional()
        .describe("Fill color in RGBA format"),
      strokeColor: coerceJson(z.object({
          r: z.coerce.number().min(0).max(1).describe("Red component (0-1)"),
          g: z.coerce.number().min(0).max(1).describe("Green component (0-1)"),
          b: z.coerce.number().min(0).max(1).describe("Blue component (0-1)"),
          a: z.coerce.number().min(0).max(1).optional().describe("Alpha component (0-1)"),
        }))
        .optional()
        .describe("Stroke color in RGBA format"),
      strokeWeight: z.coerce.number().positive().optional().describe("Stroke weight"),
    },
    async ({ x, y, width, height, name, parentId, fillColor, strokeColor, strokeWeight }) => {
      try {
        const result = await sendCommandToFigma("create_ellipse", {
          x,
          y,
          width,
          height,
          name: name || "Ellipse",
          parentId,
          fillColor,
          strokeColor,
          strokeWeight,
        });
        
        const typedResult = result as { id: string, name: string };
        return {
          content: [
            {
              type: "text",
              text: `Created ellipse with ID: ${typedResult.id}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating ellipse: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Create Polygon Tool
  server.tool(
    "create_polygon",
    "Create a new polygon in Figma",
    {
      x: z.coerce.number().describe("X position"),
      y: z.coerce.number().describe("Y position"),
      width: z.coerce.number().describe("Width of the polygon"),
      height: z.coerce.number().describe("Height of the polygon"),
      sides: z.coerce.number().min(3).optional().describe("Number of sides (default: 6)"),
      name: z.string().optional().describe("Optional name for the polygon"),
      parentId: z.string().optional().describe("Optional parent node ID to append the polygon to"),
      fillColor: coerceJson(z.object({
          r: z.coerce.number().min(0).max(1).describe("Red component (0-1)"),
          g: z.coerce.number().min(0).max(1).describe("Green component (0-1)"),
          b: z.coerce.number().min(0).max(1).describe("Blue component (0-1)"),
          a: z.coerce.number().min(0).max(1).optional().describe("Alpha component (0-1)"),
        }))
        .optional()
        .describe("Fill color in RGBA format"),
      strokeColor: coerceJson(z.object({
          r: z.coerce.number().min(0).max(1).describe("Red component (0-1)"),
          g: z.coerce.number().min(0).max(1).describe("Green component (0-1)"),
          b: z.coerce.number().min(0).max(1).describe("Blue component (0-1)"),
          a: z.coerce.number().min(0).max(1).optional().describe("Alpha component (0-1)"),
        }))
        .optional()
        .describe("Stroke color in RGBA format"),
      strokeWeight: z.coerce.number().positive().optional().describe("Stroke weight"),
    },
    async ({ x, y, width, height, sides, name, parentId, fillColor, strokeColor, strokeWeight }) => {
      try {
        const result = await sendCommandToFigma("create_polygon", {
          x,
          y,
          width,
          height,
          sides: sides || 6,
          name: name || "Polygon",
          parentId,
          fillColor,
          strokeColor,
          strokeWeight,
        });
        
        const typedResult = result as { id: string, name: string };
        return {
          content: [
            {
              type: "text",
              text: `Created polygon with ID: ${typedResult.id} and ${sides || 6} sides`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating polygon: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Create Star Tool
  server.tool(
    "create_star",
    "Create a new star in Figma",
    {
      x: z.coerce.number().describe("X position"),
      y: z.coerce.number().describe("Y position"),
      width: z.coerce.number().describe("Width of the star"),
      height: z.coerce.number().describe("Height of the star"),
      points: z.coerce.number().min(3).optional().describe("Number of points (default: 5)"),
      innerRadius: z.coerce.number().min(0.01).max(0.99).optional().describe("Inner radius ratio (0.01-0.99, default: 0.5)"),
      name: z.string().optional().describe("Optional name for the star"),
      parentId: z.string().optional().describe("Optional parent node ID to append the star to"),
      fillColor: coerceJson(z.object({
          r: z.coerce.number().min(0).max(1).describe("Red component (0-1)"),
          g: z.coerce.number().min(0).max(1).describe("Green component (0-1)"),
          b: z.coerce.number().min(0).max(1).describe("Blue component (0-1)"),
          a: z.coerce.number().min(0).max(1).optional().describe("Alpha component (0-1)"),
        }))
        .optional()
        .describe("Fill color in RGBA format"),
      strokeColor: coerceJson(z.object({
          r: z.coerce.number().min(0).max(1).describe("Red component (0-1)"),
          g: z.coerce.number().min(0).max(1).describe("Green component (0-1)"),
          b: z.coerce.number().min(0).max(1).describe("Blue component (0-1)"),
          a: z.coerce.number().min(0).max(1).optional().describe("Alpha component (0-1)"),
        }))
        .optional()
        .describe("Stroke color in RGBA format"),
      strokeWeight: z.coerce.number().positive().optional().describe("Stroke weight"),
    },
    async ({ x, y, width, height, points, innerRadius, name, parentId, fillColor, strokeColor, strokeWeight }) => {
      try {
        const result = await sendCommandToFigma("create_star", {
          x,
          y,
          width,
          height,
          points: points || 5,
          innerRadius: innerRadius || 0.5,
          name: name || "Star",
          parentId,
          fillColor,
          strokeColor,
          strokeWeight,
        });
        
        const typedResult = result as { id: string, name: string };
        return {
          content: [
            {
              type: "text",
              text: `Created star with ID: ${typedResult.id}, ${points || 5} points, and inner radius ratio of ${innerRadius || 0.5}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating star: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Group Nodes Tool
  server.tool(
    "group_nodes",
    "Group nodes in Figma",
    {
      nodeIds: coerceJson(z.array(z.string())).describe("Array of IDs of the nodes to group"),
      name: z.string().optional().describe("Optional name for the group")
    },
    async ({ nodeIds, name }) => {
      try {
        const result = await sendCommandToFigma("group_nodes", { 
          nodeIds, 
          name 
        });
        
        const typedResult = result as { 
          id: string, 
          name: string, 
          type: string, 
          children: Array<{ id: string, name: string, type: string }> 
        };
        
        return {
          content: [
            {
              type: "text",
              text: `Nodes successfully grouped into "${typedResult.name}" with ID: ${typedResult.id}. The group contains ${typedResult.children.length} elements.`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error grouping nodes: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Ungroup Nodes Tool
  server.tool(
    "ungroup_nodes",
    "Ungroup nodes in Figma",
    {
      nodeId: z.string().describe("ID of the node (group or frame) to ungroup"),
    },
    async ({ nodeId }) => {
      try {
        const result = await sendCommandToFigma("ungroup_nodes", { nodeId });
        
        const typedResult = result as { 
          success: boolean, 
          ungroupedCount: number, 
          items: Array<{ id: string, name: string, type: string }> 
        };
        
        return {
          content: [
            {
              type: "text",
              text: `Node successfully ungrouped. ${typedResult.ungroupedCount} elements were released.`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error ungrouping node: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Clone Node Tool
  server.tool(
    "clone_node",
    "Clone an existing node in Figma",
    {
      nodeId: z.string().describe("The ID of the node to clone"),
      x: z.coerce.number().optional().describe("New X position for the clone"),
      y: z.coerce.number().optional().describe("New Y position for the clone")
    },
    async ({ nodeId, x, y }) => {
      try {
        const result = await sendCommandToFigma('clone_node', { nodeId, x, y });
        const typedResult = result as { name: string, id: string };
        return {
          content: [
            {
              type: "text",
              text: `Cloned node "${typedResult.name}" with new ID: ${typedResult.id}${x !== undefined && y !== undefined ? ` at position (${x}, ${y})` : ''}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error cloning node: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Insert Child Tool
  server.tool(
    "insert_child",
    "Insert a child node inside a parent node in Figma",
    {
      parentId: z.string().describe("ID of the parent node where the child will be inserted"),
      childId: z.string().describe("ID of the child node to insert"),
      index: z.coerce.number().optional().describe("Optional index where to insert the child (if not specified, it will be added at the end)")
    },
    async ({ parentId, childId, index }) => {
      try {
        const result = await sendCommandToFigma("insert_child", { 
          parentId, 
          childId,
          index 
        });
        
        const typedResult = result as { 
          parentId: string,
          childId: string,
          index: number,
          success: boolean
        };
        
        return {
          content: [
            {
              type: "text",
              text: `Child node with ID: ${typedResult.childId} successfully inserted into parent node with ID: ${typedResult.parentId}${index !== undefined ? ` at position ${typedResult.index}` : ''}.`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error inserting child node: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Flatten Node Tool
  server.tool(
    "flatten_node",
    "Flatten a node in Figma (e.g., for boolean operations or converting to path)",
    {
      nodeId: z.string().describe("ID of the node to flatten"),
    },
    async ({ nodeId }) => {
      try {
        const result = await sendCommandToFigma("flatten_node", { nodeId });
        
        const typedResult = result as { 
          id: string, 
          name: string, 
          type: string 
        };
        
        return {
          content: [
            {
              type: "text",
              text: `Node "${typedResult.name}" flattened successfully. The new node has ID: ${typedResult.id} and is of type ${typedResult.type}.`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error flattening node: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Boolean Operation Tool
  server.tool(
    "boolean_operation",
    "Perform a boolean operation (union, subtract, intersect, exclude) on two or more nodes. All nodes must share the same parent.",
    {
      nodeIds: coerceJson(z.array(z.string()).min(2)).describe("Array of node IDs to combine (minimum 2). Order matters for SUBTRACT."),
      operation: z.enum(["UNION", "SUBTRACT", "INTERSECT", "EXCLUDE"]).describe("Boolean operation type"),
      name: z.string().optional().describe("Optional name for the resulting node"),
    },
    async ({ nodeIds, operation, name }) => {
      try {
        const result = await sendCommandToFigma("boolean_operation", {
          nodeIds,
          operation,
          name,
        });
        const typedResult = result as { id: string; name: string; type: string };
        return {
          content: [
            {
              type: "text",
              text: `Created ${operation} boolean operation "${typedResult.name}" with ID: ${typedResult.id}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error performing boolean operation: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}