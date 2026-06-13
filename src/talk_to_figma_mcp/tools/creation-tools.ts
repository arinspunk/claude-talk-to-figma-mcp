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
  server.registerTool(
    "create_rectangle",
    {
      description: "Create a new rectangle in Figma",
      inputSchema: {
      x: z.coerce.number().describe("X position (local coordinates, relative to parent)"),
      y: z.coerce.number().describe("Y position (local coordinates, relative to parent)"),
      width: z.coerce.number().describe("Width of the rectangle"),
      height: z.coerce.number().describe("Height of the rectangle"),
      name: z.string().optional().describe("Optional name for the rectangle"),
      parentId: z
        .string()
        .optional()
        .describe("Parent node ID. REQUIRED — server enforces this. Use page node ID for top-level elements. Get page IDs via get_pages tool."),
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
    },
    async ({ x, y, width, height, name, parentId, fillColor, strokeColor, strokeWeight }) => {
      try {
        const result = await sendCommandToFigma("create_rectangle", {
          x,
          y,
          width,
          height,
          name: name || "Rectangle",
          parentId,
          fillColor,
          strokeColor,
          strokeWeight,
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
          isError: true,
        };
      }
    }
  );

  // Create Frame Tool
  server.registerTool(
    "create_frame",
    {
      description: "Create a new frame in Figma",
      inputSchema: {
      x: z.coerce.number().describe("X position (local coordinates, relative to parent)"),
      y: z.coerce.number().describe("Y position (local coordinates, relative to parent)"),
      width: z.coerce.number().describe("Width of the frame"),
      height: z.coerce.number().describe("Height of the frame"),
      name: z.string().optional().describe("Optional name for the frame"),
      parentId: z
        .string()
        .optional()
        .describe("Parent node ID. REQUIRED — server enforces this. Use page node ID for top-level elements. Get page IDs via get_pages tool."),
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
          isError: true,
        };
      }
    }
  );

  // Create Text Tool
  server.registerTool(
    "create_text",
    {
      description: "Create a new text element in Figma",
      inputSchema: {
      x: z.coerce.number().describe("X position (local coordinates, relative to parent)"),
      y: z.coerce.number().describe("Y position (local coordinates, relative to parent)"),
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
        .describe("Parent node ID. REQUIRED — server enforces this. Use page node ID for top-level elements. Get page IDs via get_pages tool."),
      textAlignHorizontal: z
        .enum(["LEFT", "CENTER", "RIGHT", "JUSTIFIED"])
        .optional()
        .describe("Horizontal text alignment. Use RIGHT for Arabic/RTL text."),
      textAutoResize: z
        .enum(["WIDTH_AND_HEIGHT", "HEIGHT", "NONE", "TRUNCATE"])
        .optional()
        .describe("Text resize behavior. Use HEIGHT for fixed-width text that wraps."),
      width: z
        .coerce.number()
        .positive()
        .optional()
        .describe("Fixed width for the text node. Use with textAutoResize HEIGHT for wrapping text within a specific width."),
    },
    },
    async ({ x, y, text, fontSize, fontWeight, fontColor, name, parentId, textAlignHorizontal, textAutoResize, width }) => {
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
          width,
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
          isError: true,
        };
      }
    }
  );

  // Create Ellipse Tool
  server.registerTool(
    "create_ellipse",
    {
      description: "Create a new ellipse in Figma",
      inputSchema: {
      x: z.coerce.number().describe("X position (local coordinates, relative to parent)"),
      y: z.coerce.number().describe("Y position (local coordinates, relative to parent)"),
      width: z.coerce.number().describe("Width of the ellipse"),
      height: z.coerce.number().describe("Height of the ellipse"),
      name: z.string().optional().describe("Optional name for the ellipse"),
      parentId: z.string().describe("Parent node ID (required). Use page node ID for top-level elements. Get page IDs via get_pages tool."),
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
          ],
          isError: true,
        };
      }
    }
  );

  // Create Polygon Tool
  server.registerTool(
    "create_polygon",
    {
      description: "Create a new polygon in Figma",
      inputSchema: {
      x: z.coerce.number().describe("X position (local coordinates, relative to parent)"),
      y: z.coerce.number().describe("Y position (local coordinates, relative to parent)"),
      width: z.coerce.number().describe("Width of the polygon"),
      height: z.coerce.number().describe("Height of the polygon"),
      sides: z.coerce.number().min(3).optional().describe("Number of sides (default: 6)"),
      name: z.string().optional().describe("Optional name for the polygon"),
      parentId: z.string().describe("Parent node ID (required). Use page node ID for top-level elements. Get page IDs via get_pages tool."),
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
          ],
          isError: true,
        };
      }
    }
  );

  // Create Star Tool
  server.registerTool(
    "create_star",
    {
      description: "Create a new star in Figma",
      inputSchema: {
      x: z.coerce.number().describe("X position (local coordinates, relative to parent)"),
      y: z.coerce.number().describe("Y position (local coordinates, relative to parent)"),
      width: z.coerce.number().describe("Width of the star"),
      height: z.coerce.number().describe("Height of the star"),
      points: z.coerce.number().min(3).optional().describe("Number of points (default: 5)"),
      innerRadius: z.coerce.number().min(0.01).max(0.99).optional().describe("Inner radius ratio (0.01-0.99, default: 0.5)"),
      name: z.string().optional().describe("Optional name for the star"),
      parentId: z.string().describe("Parent node ID (required). Use page node ID for top-level elements. Get page IDs via get_pages tool."),
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
          ],
          isError: true,
        };
      }
    }
  );

  // Group Nodes Tool
  server.registerTool(
    "group_nodes",
    {
      description: "Group nodes in Figma",
      inputSchema: {
      nodeIds: coerceJson(z.array(z.string())).describe("Array of IDs of the nodes to group"),
      name: z.string().optional().describe("Optional name for the group")
    },
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
          ],
          isError: true,
        };
      }
    }
  );

  // Ungroup Nodes Tool
  server.registerTool(
    "ungroup_nodes",
    {
      description: "Ungroup nodes in Figma",
      inputSchema: {
      nodeId: z.string().describe("ID of the node (group or frame) to ungroup"),
    },
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
          ],
          isError: true,
        };
      }
    }
  );

  // Clone Node Tool
  server.registerTool(
    "clone_node",
    {
      description: "Clone an existing node in Figma",
      inputSchema: {
      nodeId: z.string().describe("The ID of the node to clone"),
      x: z.coerce.number().optional().describe("New X position for the clone (local coordinates, relative to parent)"),
      y: z.coerce.number().optional().describe("New Y position for the clone (local coordinates, relative to parent)"),
      parentId: z.string().describe("The ID of the parent node to place the clone into (required). Use page node ID for top-level elements.")
    },
    },
    async ({ nodeId, x, y, parentId }) => {
      try {
        const result = await sendCommandToFigma('clone_node', { nodeId, x, y, parentId });
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
          ],
          isError: true,
        };
      }
    }
  );

  // Insert Child Tool
  server.registerTool(
    "insert_child",
    {
      description: "Insert a child node inside a parent node in Figma",
      inputSchema: {
      parentId: z.string().describe("ID of the parent node where the child will be inserted"),
      childId: z.string().describe("ID of the child node to insert"),
      index: z.coerce.number().optional().describe("Optional index where to insert the child (if not specified, it will be added at the end)")
    },
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
          ],
          isError: true,
        };
      }
    }
  );

  // Flatten Node Tool
  server.registerTool(
    "flatten_node",
    {
      description: "Flatten a node in Figma (e.g., for boolean operations or converting to path)",
      inputSchema: {
      nodeId: z.string().describe("ID of the node to flatten"),
    },
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
          ],
          isError: true,
        };
      }
    }
  );

  // Boolean Operation Tool
  server.registerTool(
    "boolean_operation",
    {
      description: "Perform a boolean operation (union, subtract, intersect, exclude) on two or more nodes. All nodes must share the same parent.",
      inputSchema: {
      nodeIds: coerceJson(z.array(z.string()).min(2)).describe("Array of node IDs to combine (minimum 2). Order matters for SUBTRACT."),
      operation: z.enum(["UNION", "SUBTRACT", "INTERSECT", "EXCLUDE"]).describe("Boolean operation type"),
      name: z.string().optional().describe("Optional name for the resulting node"),
    },
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
          isError: true,
        };
      }
    }
  );
}