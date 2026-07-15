import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma } from "../utils/websocket.js";

/**
 * Register slide-related tools to the MCP server.
 * These tools are only available when running in Figma Slides editor.
 * @param server - The MCP server instance
 */
export function registerSlidesTools(server: McpServer): void {
  // ─── List Slides ──────────────────────────────────────────────────────────
  server.tool(
    "slides_list_slides",
    "List all slides in the current Figma Slides presentation with IDs, names, types, and child counts",
    {},
    async () => {
      try {
        const result = await sendCommandToFigma("slides_list_slides");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error listing slides: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // ─── Get Slide Content ────────────────────────────────────────────────────
  server.tool(
    "slides_get_slide_content",
    "Get the full node tree of a slide, including all child elements with their properties",
    {
      slideId: z.string().describe("The ID of the slide to get content from"),
    },
    async ({ slideId }) => {
      try {
        const result = await sendCommandToFigma("slides_get_slide_content", { slideId });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting slide content: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // ─── Create Slide ─────────────────────────────────────────────────────────
  server.tool(
    "slides_create_slide",
    "Create a new blank slide in the presentation at the specified index (default: at the end)",
    {
      index: z.number().int().min(0).optional().describe("Optional position index (0 = first). Default: appends at end."),
      name: z.string().optional().describe("Optional name for the new slide"),
    },
    async ({ index, name }) => {
      try {
        const result = await sendCommandToFigma("slides_create_slide", { index, name });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating slide: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // ─── Delete Slide ─────────────────────────────────────────────────────────
  server.tool(
    "slides_delete_slide",
    "Delete a slide from the presentation",
    {
      slideId: z.string().describe("ID of the slide to delete"),
    },
    async ({ slideId }) => {
      try {
        const result = await sendCommandToFigma("slides_delete_slide", { slideId });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error deleting slide: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // ─── Duplicate Slide ─────────────────────────────────────────────────────
  server.tool(
    "slides_duplicate_slide",
    "Duplicate/clone a slide. The clone is inserted right after the original.",
    {
      slideId: z.string().describe("ID of the slide to duplicate"),
    },
    async ({ slideId }) => {
      try {
        const result = await sendCommandToFigma("slides_duplicate_slide", { slideId });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error duplicating slide: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // ─── Get Slide Transition ────────────────────────────────────────────────
  server.tool(
    "slides_get_slide_transition",
    "Get the transition effect settings for a slide",
    {
      slideId: z.string().describe("ID of the slide to get transition from"),
    },
    async ({ slideId }) => {
      try {
        const result = await sendCommandToFigma("slides_get_slide_transition", { slideId });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting slide transition: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // ─── Set Slide Transition ────────────────────────────────────────────────
  server.tool(
    "slides_set_slide_transition",
    "Set the transition effect on a slide. Options for transitionType: dissolve, push, slide, smart_animate, fade, none",
    {
      slideId: z.string().describe("ID of the slide to set transition on"),
      transitionType: z.enum(["dissolve", "push", "slide", "smart_animate", "fade", "none"]).describe("Transition effect type"),
      duration: z.number().min(0.1).max(10).optional().describe("Transition duration in seconds (0.1-10, default 0.5)"),
      direction: z.enum(["left", "right", "up", "down"]).optional().describe("Direction for push/slide transitions"),
    },
    async ({ slideId, transitionType, duration, direction }) => {
      try {
        const result = await sendCommandToFigma("slides_set_slide_transition", {
          slideId,
          transitionType,
          duration,
          direction,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting slide transition: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // ─── Get Focused Slide ───────────────────────────────────────────────────
  server.tool(
    "slides_get_focused_slide",
    "Get the currently focused/active slide in the editor",
    {},
    async () => {
      try {
        const result = await sendCommandToFigma("slides_get_focused_slide");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting focused slide: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // ─── Focus Slide ─────────────────────────────────────────────────────────
  server.tool(
    "slides_focus_slide",
    "Navigate to and focus a specific slide by its ID",
    {
      slideId: z.string().describe("ID of the slide to focus on"),
    },
    async ({ slideId }) => {
      try {
        const result = await sendCommandToFigma("slides_focus_slide", { slideId });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error focusing slide: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // ─── Skip Slide ──────────────────────────────────────────────────────────
  server.tool(
    "slides_skip_slide",
    "Toggle whether a slide is skipped (hidden) in presentation mode. If skip is not specified, toggles the current state.",
    {
      slideId: z.string().describe("ID of the slide to skip or un-skip"),
      skip: z.boolean().optional().describe("true = skip (hide), false = show. If omitted, toggles current state."),
    },
    async ({ slideId, skip }) => {
      try {
        const result = await sendCommandToFigma("slides_skip_slide", { slideId, skip });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error toggling slide skip: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // ─── Add Text to Slide ──────────────────────────────────────────────────
  server.tool(
    "slides_add_text_to_slide",
    "Add a text element to a slide. Supports positioning, font size, color, and alignment.",
    {
      slideId: z.string().describe("ID of the slide to add text to"),
      text: z.string().describe("Text content to display"),
      x: z.number().optional().describe("X position (default: 0)"),
      y: z.number().optional().describe("Y position (default: 0)"),
      fontSize: z.number().optional().describe("Font size in pixels"),
      fillColor: z.object({
        r: z.number().min(0).max(1),
        g: z.number().min(0).max(1),
        b: z.number().min(0).max(1),
        a: z.number().min(0).max(1).optional(),
      }).optional().describe("Text fill color as {r, g, b, a} values (0-1)"),
      name: z.string().optional().describe("Layer name (default: 'Text')"),
      textAlignHorizontal: z.enum(["LEFT", "CENTER", "RIGHT", "JUSTIFIED"]).optional().describe("Horizontal text alignment"),
    },
    async ({ slideId, text, x, y, fontSize, fillColor, name, textAlignHorizontal }) => {
      try {
        const result = await sendCommandToFigma("slides_add_text_to_slide", {
          slideId,
          text,
          x,
          y,
          fontSize,
          fillColor,
          name,
          textAlignHorizontal,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error adding text to slide: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // ─── Add Shape to Slide ──────────────────────────────────────────────────
  server.tool(
    "slides_add_shape_to_slide",
    "Add a shape (rectangle or ellipse) to a slide. Supports positioning, size, fill, stroke, and corner radius.",
    {
      slideId: z.string().describe("ID of the slide to add the shape to"),
      shapeType: z.enum(["rectangle", "ellipse"]).optional().describe("Shape type: 'rectangle' or 'ellipse' (default: rectangle)"),
      x: z.number().optional().describe("X position (default: 0)"),
      y: z.number().optional().describe("Y position (default: 0)"),
      width: z.number().optional().describe("Width in pixels (default: 200)"),
      height: z.number().optional().describe("Height in pixels (default: 200)"),
      fillColor: z.object({
        r: z.number().min(0).max(1),
        g: z.number().min(0).max(1),
        b: z.number().min(0).max(1),
        a: z.number().min(0).max(1).optional(),
      }).optional().describe("Fill color as {r, g, b, a} values (0-1)"),
      strokeColor: z.object({
        r: z.number().min(0).max(1),
        g: z.number().min(0).max(1),
        b: z.number().min(0).max(1),
        a: z.number().min(0).max(1).optional(),
      }).optional().describe("Stroke color as {r, g, b, a} values (0-1)"),
      strokeWeight: z.number().optional().describe("Stroke weight in pixels"),
      cornerRadius: z.number().optional().describe("Corner radius in pixels (rectangle only)"),
      name: z.string().optional().describe("Layer name"),
    },
    async ({ slideId, shapeType, x, y, width, height, fillColor, strokeColor, strokeWeight, cornerRadius, name }) => {
      try {
        const result = await sendCommandToFigma("slides_add_shape_to_slide", {
          slideId,
          shapeType,
          x,
          y,
          width,
          height,
          fillColor,
          strokeColor,
          strokeWeight,
          cornerRadius,
          name,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error adding shape to slide: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}