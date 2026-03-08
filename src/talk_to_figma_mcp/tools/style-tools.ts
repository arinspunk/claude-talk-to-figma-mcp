import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma } from "../utils/websocket";

export function registerStyleTools(server: McpServer): void {
  // Create Text Style Tool
  server.tool(
    "create_text_style",
    "Create a reusable text style in Figma",
    {
      name: z.string().describe("Name for the style (e.g., 'Heading/H1')"),
      fontFamily: z.string().describe("Font family name"),
      fontStyle: z.string().optional().describe("Font style (e.g., 'Regular', 'Bold', 'Italic')"),
      fontSize: z.number().positive().describe("Font size in pixels"),
      letterSpacing: z.number().optional().describe("Letter spacing value"),
      letterSpacingUnit: z.enum(["PIXELS", "PERCENT"]).optional().describe("Letter spacing unit (PIXELS or PERCENT)"),
      lineHeight: z.number().optional().describe("Line height value"),
      lineHeightUnit: z.enum(["PIXELS", "PERCENT", "AUTO"]).optional().describe("Line height unit (PIXELS, PERCENT, or AUTO)"),
      textCase: z.enum(["ORIGINAL", "UPPER", "LOWER", "TITLE"]).optional().describe("Text case type"),
      textDecoration: z.enum(["NONE", "UNDERLINE", "STRIKETHROUGH"]).optional().describe("Text decoration type"),
    },
    async ({ name, fontFamily, fontStyle, fontSize, letterSpacing, letterSpacingUnit, lineHeight, lineHeightUnit, textCase, textDecoration }) => {
      try {
        const result = await sendCommandToFigma("create_text_style", {
          name,
          fontFamily,
          fontStyle: fontStyle || "Regular",
          fontSize,
          letterSpacing,
          letterSpacingUnit: letterSpacingUnit || "PIXELS",
          lineHeight,
          lineHeightUnit: lineHeightUnit || "PIXELS",
          textCase,
          textDecoration,
        });
        const typedResult = result as { id: string; name: string; key: string };
        return {
          content: [
            {
              type: "text",
              text: `Created text style "${typedResult.name}" (ID: ${typedResult.id}, Key: ${typedResult.key})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating text style: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Create Paint Style Tool
  server.tool(
    "create_paint_style",
    "Create a reusable color/paint style in Figma",
    {
      name: z.string().describe("Name for the style (e.g., 'Brand/Primary')"),
      r: z.number().min(0).max(1).describe("Red component (0-1)"),
      g: z.number().min(0).max(1).describe("Green component (0-1)"),
      b: z.number().min(0).max(1).describe("Blue component (0-1)"),
      a: z.number().min(0).max(1).optional().describe("Alpha/opacity (0-1, default 1)"),
    },
    async ({ name, r, g, b, a }) => {
      try {
        const result = await sendCommandToFigma("create_paint_style", {
          name,
          r,
          g,
          b,
          a: a ?? 1,
        });
        const typedResult = result as { id: string; name: string; key: string };
        return {
          content: [
            {
              type: "text",
              text: `Created paint style "${typedResult.name}" (ID: ${typedResult.id}, Key: ${typedResult.key})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating paint style: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Create Effect Style Tool
  server.tool(
    "create_effect_style",
    "Create a reusable effect style in Figma",
    {
      name: z.string().describe("Name for the style (e.g., 'Shadow/Medium')"),
      effects: z.array(
        z.object({
          type: z.enum(["DROP_SHADOW", "INNER_SHADOW", "LAYER_BLUR", "BACKGROUND_BLUR"]).describe("Effect type"),
          radius: z.number().optional().describe("Blur radius"),
          offset: z.object({
            x: z.number().describe("X offset"),
            y: z.number().describe("Y offset"),
          }).optional().describe("Shadow offset"),
          color: z.object({
            r: z.number().min(0).max(1).describe("Red (0-1)"),
            g: z.number().min(0).max(1).describe("Green (0-1)"),
            b: z.number().min(0).max(1).describe("Blue (0-1)"),
            a: z.number().min(0).max(1).optional().describe("Alpha (0-1)"),
          }).optional().describe("Effect color"),
          visible: z.boolean().optional().describe("Whether effect is visible"),
          spread: z.number().optional().describe("Spread radius for shadows"),
          blendMode: z.string().optional().describe("Blend mode (e.g., 'NORMAL', 'MULTIPLY')"),
        })
      ).describe("Array of effects to apply"),
    },
    async ({ name, effects }) => {
      try {
        const result = await sendCommandToFigma("create_effect_style", {
          name,
          effects,
        });
        const typedResult = result as { id: string; name: string; key: string; effectCount: number };
        return {
          content: [
            {
              type: "text",
              text: `Created effect style "${typedResult.name}" with ${typedResult.effectCount} effect(s) (ID: ${typedResult.id}, Key: ${typedResult.key})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating effect style: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}
