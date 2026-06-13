import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma } from "../utils/websocket";
import { coerceJson } from "../utils/schema-helpers";
import { parseCommandResult } from "../utils/command-results";

/**
 * Register text-related tools to the MCP server
 * This module contains tools for working with text elements in Figma
 * @param server - The MCP server instance
 */
export function registerTextTools(server: McpServer): void {
  // Set Text Content Tool
  server.registerTool(
    "set_text_content",
    {
      description: "Set the text content of an existing text node in Figma",
      inputSchema: {
      nodeId: z.string().describe("The ID of the text node to modify"),
      text: z.string().describe("New text content"),
    },
    },
    async ({ nodeId, text }) => {
      try {
        const result = await sendCommandToFigma("set_text_content", {
          nodeId,
          text,
        });
        const typedResult = result as { name: string };
        return {
          content: [
            {
              type: "text",
              text: `Updated text content of node "${typedResult.name}" to "${text}"`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting text content: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Set Multiple Text Contents Tool
  server.registerTool(
    "set_multiple_text_contents",
    {
      description: "Set multiple text contents parallelly in a node",
      inputSchema: {
      nodeId: z
        .string()
        .describe("The ID of the node containing the text nodes to replace"),
      text: coerceJson(z
        .array(
          z.object({
            nodeId: z.string().describe("The ID of the text node"),
            text: z.string().describe("The replacement text"),
          })
        ))
        .describe("Array of text node IDs and their replacement texts"),
      highlight: z.coerce.boolean().optional().describe("Briefly highlight each node while its text is replaced (default false — slows down large replacements)."),
    },
    },
    async ({ nodeId, text, highlight }) => {
      try {
        if (!text || text.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No text provided",
              },
            ],
          };
        }

        const totalToProcess = text.length;

        // Use the plugin's set_multiple_text_contents function with chunking
        const result = await sendCommandToFigma("set_multiple_text_contents", {
          nodeId,
          text,
          highlight: highlight ?? false,
        });

        // Cast the result to a specific type to work with it safely
        interface TextReplaceResult {
          success: boolean;
          nodeId: string;
          replacementsApplied?: number;
          replacementsFailed?: number;
          totalReplacements?: number;
          completedInChunks?: number;
          results?: Array<{
            success: boolean;
            nodeId: string;
            error?: string;
            originalText?: string;
            translatedText?: string;
          }>;
        }

        const typedResult = result as TextReplaceResult;

        // Format the results for display
        const progressText = `
        Text replacement completed:
        - ${typedResult.replacementsApplied || 0} of ${totalToProcess} successfully updated
        - ${typedResult.replacementsFailed || 0} failed
        - Processed in ${typedResult.completedInChunks || 1} batches
        `;

        // Detailed results
        const detailedResults = typedResult.results || [];
        const failedResults = detailedResults.filter(item => !item.success);

        // Create the detailed part of the response
        let detailedResponse = "";
        if (failedResults.length > 0) {
          detailedResponse = `\n\nNodes that failed:\n${failedResults.map(item =>
            `- ${item.nodeId}: ${item.error || "Unknown error"}`
          ).join('\n')}`;
        }

        return {
          content: [
            {
              type: "text" as const,
              text: progressText + detailedResponse,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting multiple text contents: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Set Font Name Tool
  server.registerTool(
    "set_font_name",
    {
      description: "Set the font name and style of a text node in Figma",
      inputSchema: {
      nodeId: z.string().describe("The ID of the text node to modify"),
      family: z.string().describe("Font family name"),
      style: z.string().optional().describe("Font style (e.g., 'Regular', 'Bold', 'Italic')"),
    },
    },
    async ({ nodeId, family, style }) => {
      try {
        const result = await sendCommandToFigma("set_font_name", {
          nodeId,
          family,
          style
        });
        const typedResult = result as { name: string, fontName: { family: string, style: string } };
        return {
          content: [
            {
              type: "text",
              text: `Updated font of node "${typedResult.name}" to ${typedResult.fontName.family} ${typedResult.fontName.style}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting font name: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true,
        };
      }
    }
  );

  // Set Font Size Tool
  server.registerTool(
    "set_font_size",
    {
      description: "Set the font size of a text node in Figma",
      inputSchema: {
      nodeId: z.string().describe("The ID of the text node to modify"),
      fontSize: z.coerce.number().positive().describe("Font size in pixels"),
    },
    },
    async ({ nodeId, fontSize }) => {
      try {
        const result = await sendCommandToFigma("set_font_size", {
          nodeId,
          fontSize
        });
        const typedResult = result as { name: string, fontSize: number };
        return {
          content: [
            {
              type: "text",
              text: `Updated font size of node "${typedResult.name}" to ${typedResult.fontSize}px`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting font size: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true,
        };
      }
    }
  );

  // Set Font Weight Tool
  server.registerTool(
    "set_font_weight",
    {
      description: "Set the font weight of a text node in Figma",
      inputSchema: {
      nodeId: z.string().describe("The ID of the text node to modify"),
      weight: z.coerce.number().describe("Font weight (100, 200, 300, 400, 500, 600, 700, 800, 900)"),
    },
    },
    async ({ nodeId, weight }) => {
      try {
        const result = await sendCommandToFigma("set_font_weight", {
          nodeId,
          weight
        });
        const typedResult = result as { name: string, fontName: { family: string, style: string }, weight: number };
        return {
          content: [
            {
              type: "text",
              text: `Updated font weight of node "${typedResult.name}" to ${typedResult.weight} (${typedResult.fontName.style})`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting font weight: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true,
        };
      }
    }
  );

  // Set Letter Spacing Tool
  server.registerTool(
    "set_letter_spacing",
    {
      description: "Set the letter spacing of a text node in Figma",
      inputSchema: {
      nodeId: z.string().describe("The ID of the text node to modify"),
      letterSpacing: z.coerce.number().describe("Letter spacing value"),
      unit: z.enum(["PIXELS", "PERCENT"]).optional().describe("Unit type (PIXELS or PERCENT)"),
    },
    },
    async ({ nodeId, letterSpacing, unit }) => {
      try {
        const result = await sendCommandToFigma("set_letter_spacing", {
          nodeId,
          letterSpacing,
          unit: unit || "PIXELS"
        });
        const typedResult = result as { name: string, letterSpacing: { value: number, unit: string } };
        return {
          content: [
            {
              type: "text",
              text: `Updated letter spacing of node "${typedResult.name}" to ${typedResult.letterSpacing.value} ${typedResult.letterSpacing.unit}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting letter spacing: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true,
        };
      }
    }
  );

  // Set Line Height Tool
  server.registerTool(
    "set_line_height",
    {
      description: "Set the line height of a text node in Figma",
      inputSchema: {
      nodeId: z.string().describe("The ID of the text node to modify"),
      lineHeight: z.coerce.number().describe("Line height value"),
      unit: z.enum(["PIXELS", "PERCENT", "AUTO"]).optional().describe("Unit type (PIXELS, PERCENT, or AUTO)"),
    },
    },
    async ({ nodeId, lineHeight, unit }) => {
      try {
        const result = await sendCommandToFigma("set_line_height", {
          nodeId,
          lineHeight,
          unit: unit || "PIXELS"
        });
        const typedResult = result as { name: string, lineHeight: { value: number, unit: string } };
        return {
          content: [
            {
              type: "text",
              text: `Updated line height of node "${typedResult.name}" to ${typedResult.lineHeight.value} ${typedResult.lineHeight.unit}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting line height: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true,
        };
      }
    }
  );

  // Set Paragraph Spacing Tool
  server.registerTool(
    "set_paragraph_spacing",
    {
      description: "Set the paragraph spacing of a text node in Figma",
      inputSchema: {
      nodeId: z.string().describe("The ID of the text node to modify"),
      paragraphSpacing: z.coerce.number().describe("Paragraph spacing value in pixels"),
    },
    },
    async ({ nodeId, paragraphSpacing }) => {
      try {
        const result = await sendCommandToFigma("set_paragraph_spacing", {
          nodeId,
          paragraphSpacing
        });
        const typedResult = result as { name: string, paragraphSpacing: number };
        return {
          content: [
            {
              type: "text",
              text: `Updated paragraph spacing of node "${typedResult.name}" to ${typedResult.paragraphSpacing}px`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting paragraph spacing: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true,
        };
      }
    }
  );

  // Set Text Case Tool
  server.registerTool(
    "set_text_case",
    {
      description: "Set the text case of a text node in Figma",
      inputSchema: {
      nodeId: z.string().describe("The ID of the text node to modify"),
      textCase: z.enum(["ORIGINAL", "UPPER", "LOWER", "TITLE"]).describe("Text case type"),
    },
    },
    async ({ nodeId, textCase }) => {
      try {
        const result = await sendCommandToFigma("set_text_case", {
          nodeId,
          textCase
        });
        const typedResult = result as { name: string, textCase: string };
        return {
          content: [
            {
              type: "text",
              text: `Updated text case of node "${typedResult.name}" to ${typedResult.textCase}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting text case: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true,
        };
      }
    }
  );

  // Set Text Decoration Tool
  server.registerTool(
    "set_text_decoration",
    {
      description: "Set the text decoration of a text node in Figma",
      inputSchema: {
      nodeId: z.string().describe("The ID of the text node to modify"),
      textDecoration: z.enum(["NONE", "UNDERLINE", "STRIKETHROUGH"]).describe("Text decoration type"),
    },
    },
    async ({ nodeId, textDecoration }) => {
      try {
        const result = await sendCommandToFigma("set_text_decoration", {
          nodeId,
          textDecoration
        });
        const typedResult = result as { name: string, textDecoration: string };
        return {
          content: [
            {
              type: "text",
              text: `Updated text decoration of node "${typedResult.name}" to ${typedResult.textDecoration}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting text decoration: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true,
        };
      }
    }
  );

  // Get Styled Text Segments Tool
  server.registerTool(
    "get_styled_text_segments",
    {
      description: "Get text segments with specific styling in a text node",
      inputSchema: {
      nodeId: z.string().describe("The ID of the text node to analyze"),
      property: z.enum([
        "fillStyleId", 
        "fontName", 
        "fontSize", 
        "textCase", 
        "textDecoration", 
        "textStyleId", 
        "fills", 
        "letterSpacing", 
        "lineHeight", 
        "fontWeight"
      ]).describe("The style property to analyze segments by"),
    },
      annotations: { readOnlyHint: true },
    },
    async ({ nodeId, property }) => {
      try {
        const result = await sendCommandToFigma("get_styled_text_segments", {
          nodeId,
          property
        });
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ],
          structuredContent: { segments: result } as Record<string, unknown>,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting styled text segments: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true,
        };
      }
    }
  );

  // Set Text Style ID Tool
  server.registerTool(
    "set_text_style_id",
    {
      description: "Apply a text style to a text node in Figma",
      inputSchema: {
      nodeId: z.string().describe("The ID of the text node to modify"),
      textStyleId: z.string().describe("The ID of the text style to apply"),
    },
    },
    async ({ nodeId, textStyleId }) => {
      try {
        const result = await sendCommandToFigma("set_text_style_id", {
          nodeId,
          textStyleId
        });
        const typedResult = result as { name: string, textStyleId: string, styleName: string };
        return {
          content: [
            {
              type: "text",
              text: `Applied text style "${typedResult.styleName}" to node "${typedResult.name}"`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting text style: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true,
        };
      }
    }
  );

  // Load Font Async Tool
  server.registerTool(
    "load_font_async",
    {
      description: "Load a font asynchronously in Figma",
      inputSchema: {
      family: z.string().describe("Font family name"),
      style: z.string().optional().describe("Font style (e.g., 'Regular', 'Bold', 'Italic')"),
    },
    },
    async ({ family, style }) => {
      try {
        const result = await sendCommandToFigma("load_font_async", {
          family,
          style: style || "Regular"
        });
        const typedResult = result as { success: boolean, family: string, style: string, message: string };
        return {
          content: [
            {
              type: "text",
              text: typedResult.message || `Loaded font ${family} ${style || "Regular"}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error loading font: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true,
        };
      }
    }
  );

  // Set Text Align Tool
  server.registerTool(
    "set_text_align",
    {
      description: "Set the text alignment of a text node in Figma. Use textAlignHorizontal RIGHT for RTL/Arabic text.",
      inputSchema: {
      nodeId: z.string().describe("The ID of the text node to modify"),
      textAlignHorizontal: z.enum(["LEFT", "CENTER", "RIGHT", "JUSTIFIED"]).optional().describe("Horizontal text alignment (LEFT, CENTER, RIGHT, JUSTIFIED). Use RIGHT for Arabic/RTL text."),
      textAlignVertical: z.enum(["TOP", "CENTER", "BOTTOM"]).optional().describe("Vertical text alignment (TOP, CENTER, BOTTOM)"),
    },
    },
    async ({ nodeId, textAlignHorizontal, textAlignVertical }) => {
      try {
        const result = await sendCommandToFigma("set_text_align", {
          nodeId,
          textAlignHorizontal,
          textAlignVertical
        });
        const typedResult = result as { name: string, textAlignHorizontal: string, textAlignVertical: string };
        return {
          content: [
            {
              type: "text",
              text: `Updated text alignment of node "${typedResult.name}" to horizontal: ${typedResult.textAlignHorizontal}, vertical: ${typedResult.textAlignVertical}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting text alignment: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true,
        };
      }
    }
  );

  // Get Fonts Used Tool — inventory fonts in a selection for web-font setup
  server.registerTool(
    "get_fonts_used",
    {
      description: "List every font (family, style, sizes, occurrence count) used within a node's subtree. Use this before generating code to set up @font-face or pick correct web-font equivalents and avoid font mismatches. Defaults to the current selection.",
      inputSchema: {
      nodeId: z.string().optional().describe("Node to inspect. Omit to use the current selection."),
    },
      annotations: { readOnlyHint: true },
    },
    async ({ nodeId }) => {
      try {
        const result = await sendCommandToFigma("get_fonts_used", { nodeId }, 60000);
        const typed = parseCommandResult("get_fonts_used", result);

        if (!typed.fonts.length) {
          return { content: [{ type: "text", text: "No text nodes / fonts found in the selection." }] };
        }

        const lines = typed.fonts
          .sort((a, b) => b.occurrences - a.occurrences)
          .map(
            (f) =>
              `• ${f.family} — ${f.style}  | sizes: ${f.sizes.join(", ")}px  | used ${f.occurrences}×`
          );

        return {
          content: [
            {
              type: "text",
              text: `Fonts used (${typed.fonts.length}):\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting fonts used: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}