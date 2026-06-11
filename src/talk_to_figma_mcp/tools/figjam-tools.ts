import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma } from "../utils/websocket";

/**
 * Register FigJam-specific tools to the MCP server.
 * FigJam is Figma's whiteboard tool with unique node types:
 *   - Sticky notes (STICKY)
 *   - Shapes with text (SHAPE_WITH_TEXT)
 *   - Connectors (CONNECTOR)
 *   - Sections (SECTION)
 *   - Stamps (STAMP)
 *
 * These tools work in FigJam documents. Some tools (e.g. create_section) also
 * work inside regular Figma documents.
 *
 * @param server - The MCP server instance
 */
export function registerFigJamTools(server: McpServer): void {
  // ─── Read tools ────────────────────────────────────────────────────────────

  /**
   * Get all FigJam-specific elements on the current page.
   * Returns stickies, connectors, shapes-with-text, sections and stamps.
   */
  server.registerTool(
    "get_figjam_elements",
    {
      description: "Get all FigJam-specific elements (stickies, connectors, shapes with text, sections, stamps) on the current page. Use this to read the contents of a FigJam board.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const result = await sendCommandToFigma("get_figjam_elements", {});
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result as Record<string, unknown>,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting FigJam elements: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ─── Write tools ───────────────────────────────────────────────────────────

  /**
   * Create a sticky note in FigJam.
   */
  server.registerTool(
    "create_sticky",
    {
      description: "Create a sticky note in a FigJam board. Sticky notes are the primary way to add text content in FigJam.",
      inputSchema: {
      x: z.coerce.number().describe("X position on the canvas"),
      y: z.coerce.number().describe("Y position on the canvas"),
      text: z.string().describe("Text content of the sticky note"),
      color: z
        .enum([
          "yellow",
          "pink",
          "green",
          "blue",
          "purple",
          "red",
          "orange",
          "teal",
          "gray",
          "white",
        ])
        .optional()
        .describe(
          "Background color of the sticky note (default: yellow). Supported values: yellow, pink, green, blue, purple, red, orange, teal, gray, white."
        ),
      isWide: z
        .boolean()
        .optional()
        .describe("Whether the sticky note should be wide format (default: false)"),
      name: z.string().optional().describe("Optional name/label for the node"),
      parentId: z
        .string()
        .optional()
        .describe("Parent node ID. REQUIRED — server enforces this. Use page node ID for top-level elements. Get page IDs via get_pages tool."),
    },
    },
    async ({ x, y, text, color, isWide, name, parentId }) => {
      try {
        const result = await sendCommandToFigma("create_sticky", {
          x,
          y,
          text,
          color: color ?? "yellow",
          isWide: isWide ?? false,
          name,
          parentId,
        });
        return {
          content: [
            {
              type: "text",
              text: `Created sticky note: ${JSON.stringify(result)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating sticky note: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * Update the text on an existing sticky note.
   */
  server.registerTool(
    "set_sticky_text",
    {
      description: "Update the text content of an existing FigJam sticky note.",
      inputSchema: {
      nodeId: z.string().describe("The ID of the sticky note node to update"),
      text: z.string().describe("The new text content"),
    },
    },
    async ({ nodeId, text }) => {
      try {
        const result = await sendCommandToFigma("set_sticky_text", {
          nodeId,
          text,
        });
        return {
          content: [
            {
              type: "text",
              text: `Updated sticky note text: ${JSON.stringify(result)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error updating sticky note text: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * Create a FigJam shape with text (e.g. process box, decision diamond).
   */
  server.registerTool(
    "create_shape_with_text",
    {
      description: "Create a FigJam shape with text inside. Useful for flowcharts, diagrams, and process maps. Supported shapes: SQUARE, ELLIPSE, ROUNDED_RECTANGLE, DIAMOND, TRIANGLE_UP, TRIANGLE_DOWN, PARALLELOGRAM_RIGHT, PARALLELOGRAM_LEFT.",
      inputSchema: {
      x: z.coerce.number().describe("X position on the canvas"),
      y: z.coerce.number().describe("Y position on the canvas"),
      width: z.coerce.number().optional().describe("Width of the shape (default: 200)"),
      height: z.coerce.number().optional().describe("Height of the shape (default: 200)"),
      shapeType: z
        .enum([
          "SQUARE",
          "ELLIPSE",
          "ROUNDED_RECTANGLE",
          "DIAMOND",
          "TRIANGLE_UP",
          "TRIANGLE_DOWN",
          "PARALLELOGRAM_RIGHT",
          "PARALLELOGRAM_LEFT",
        ])
        .optional()
        .describe("The shape type (default: ROUNDED_RECTANGLE)"),
      text: z.string().optional().describe("Text to display inside the shape"),
      fillColor: z
        .object({
          r: z.coerce.number().min(0).max(1).describe("Red (0-1)"),
          g: z.coerce.number().min(0).max(1).describe("Green (0-1)"),
          b: z.coerce.number().min(0).max(1).describe("Blue (0-1)"),
          a: z.coerce.number().min(0).max(1).optional().describe("Alpha (0-1)"),
        })
        .optional()
        .describe("Fill color in RGBA format (0-1 range each component)"),
      name: z.string().optional().describe("Optional name for the node"),
      parentId: z
        .string()
        .optional()
        .describe("Parent node ID. REQUIRED — server enforces this. Use page node ID for top-level elements. Get page IDs via get_pages tool."),
    },
    },
    async ({ x, y, width, height, shapeType, text, fillColor, name, parentId }) => {
      try {
        const result = await sendCommandToFigma("create_shape_with_text", {
          x,
          y,
          width: width ?? 200,
          height: height ?? 200,
          shapeType: shapeType ?? "ROUNDED_RECTANGLE",
          text: text ?? "",
          fillColor,
          name,
          parentId,
        });
        return {
          content: [
            {
              type: "text",
              text: `Created shape with text: ${JSON.stringify(result)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating shape with text: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * Create a connector (arrow/line) between two nodes or at arbitrary positions.
   */
  server.registerTool(
    "create_connector",
    {
      description: "Create a connector (arrow or line) in FigJam. Connectors can link two existing nodes by ID, or connect arbitrary canvas positions. Use this to draw flow arrows between stickies, shapes, etc.",
      inputSchema: {
      startNodeId: z
        .string()
        .optional()
        .describe("ID of the node where the connector starts (omit to use startX/startY)"),
      startX: z
        .number()
        .optional()
        .describe("X position of the connector start point (used when startNodeId is not provided)"),
      startY: z
        .number()
        .optional()
        .describe("Y position of the connector start point (used when startNodeId is not provided)"),
      endNodeId: z
        .string()
        .optional()
        .describe("ID of the node where the connector ends (omit to use endX/endY)"),
      endX: z
        .number()
        .optional()
        .describe("X position of the connector end point (used when endNodeId is not provided)"),
      endY: z
        .number()
        .optional()
        .describe("Y position of the connector end point (used when endNodeId is not provided)"),
      connectorLineType: z
        .enum(["ELBOWED", "STRAIGHT", "CURVED"])
        .optional()
        .describe("Line routing style (default: ELBOWED)"),
      startStrokeCap: z
        .enum(["NONE", "ARROW", "ARROW_EQUILATERAL", "CIRCLE_FILLED", "DIAMOND_FILLED"])
        .optional()
        .describe("Arrowhead at the start (default: NONE)"),
      endStrokeCap: z
        .enum(["NONE", "ARROW", "ARROW_EQUILATERAL", "CIRCLE_FILLED", "DIAMOND_FILLED"])
        .optional()
        .describe("Arrowhead at the end (default: ARROW)"),
      strokeColor: z
        .object({
          r: z.coerce.number().min(0).max(1),
          g: z.coerce.number().min(0).max(1),
          b: z.coerce.number().min(0).max(1),
          a: z.coerce.number().min(0).max(1).optional(),
        })
        .optional()
        .describe("Stroke color in RGBA format"),
      strokeWeight: z.coerce.number().positive().optional().describe("Stroke weight / line thickness"),
      name: z.string().optional().describe("Optional name for the connector node"),
      parentId: z
        .string()
        .optional()
        .describe("Parent node ID. REQUIRED — server enforces this. Use page node ID for top-level elements. Get page IDs via get_pages tool."),
    },
    },
    async ({
      startNodeId,
      startX,
      startY,
      endNodeId,
      endX,
      endY,
      connectorLineType,
      startStrokeCap,
      endStrokeCap,
      strokeColor,
      strokeWeight,
      name,
      parentId,
    }) => {
      try {
        const result = await sendCommandToFigma("create_connector", {
          startNodeId,
          startX,
          startY,
          endNodeId,
          endX,
          endY,
          connectorLineType: connectorLineType ?? "ELBOWED",
          startStrokeCap: startStrokeCap ?? "NONE",
          endStrokeCap: endStrokeCap ?? "ARROW",
          strokeColor,
          strokeWeight,
          name,
          parentId,
        });
        return {
          content: [
            {
              type: "text",
              text: `Created connector: ${JSON.stringify(result)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating connector: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * Create a FigJam section to group and organise content.
   */
  server.registerTool(
    "create_section",
    {
      description: "Create a FigJam section. Sections are used to group and organise content on the FigJam board. They appear as labelled coloured regions.",
      inputSchema: {
      x: z.coerce.number().describe("X position on the canvas"),
      y: z.coerce.number().describe("Y position on the canvas"),
      width: z.coerce.number().optional().describe("Width of the section (default: 800)"),
      height: z.coerce.number().optional().describe("Height of the section (default: 600)"),
      name: z.string().optional().describe("Label / name for the section"),
      fillColor: z
        .object({
          r: z.coerce.number().min(0).max(1),
          g: z.coerce.number().min(0).max(1),
          b: z.coerce.number().min(0).max(1),
          a: z.coerce.number().min(0).max(1).optional(),
        })
        .optional()
        .describe("Background fill color in RGBA format"),
      parentId: z
        .string()
        .optional()
        .describe("Parent node ID. REQUIRED — server enforces this. Use page node ID for top-level elements. Get page IDs via get_pages tool."),
    },
    },
    async ({ x, y, width, height, name, fillColor, parentId }) => {
      try {
        const result = await sendCommandToFigma("create_section", {
          x,
          y,
          width: width ?? 800,
          height: height ?? 600,
          name: name ?? "Section",
          fillColor,
          parentId,
        });
        return {
          content: [
            {
              type: "text",
              text: `Created section: ${JSON.stringify(result)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating section: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
