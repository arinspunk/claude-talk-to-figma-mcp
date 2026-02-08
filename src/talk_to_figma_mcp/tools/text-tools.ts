import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma } from "../utils/websocket";

/**
 * Register text-related tools to the MCP server
 * This module contains tools for working with text elements in Figma
 * @param server - The MCP server instance
 */
export function registerTextTools(server: McpServer): void {
  // Set Text Content Tool
  server.tool(
    "set_text_content",
    "Set the text content of an existing text node in Figma",
    {
      nodeId: z.string().describe("The ID of the text node to modify"),
      text: z.string().describe("New text content"),
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
        };
      }
    }
  );

  // Set Multiple Text Contents Tool
  server.tool(
    "set_multiple_text_contents",
    "Set multiple text contents parallelly in a node",
    {
      nodeId: z
        .string()
        .describe("The ID of the node containing the text nodes to replace"),
      text: z
        .array(
          z.object({
            nodeId: z.string().describe("The ID of the text node"),
            text: z.string().describe("The replacement text"),
          })
        )
        .describe("Array of text node IDs and their replacement texts"),
    },
    async ({ nodeId, text }, extra) => {
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

        // Initial response to indicate we're starting the process
        const initialStatus = {
          type: "text" as const,
          text: `Starting text replacement for ${text.length} nodes. This will be processed in batches of 5...`,
        };

        // Track overall progress
        let totalProcessed = 0;
        const totalToProcess = text.length;

        // Use the plugin's set_multiple_text_contents function with chunking
        const result = await sendCommandToFigma("set_multiple_text_contents", {
          nodeId,
          text,
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
        const success = typedResult.replacementsApplied && typedResult.replacementsApplied > 0;
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
            initialStatus,
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
        };
      }
    }
  );

  // Set Font Name Tool
  server.tool(
    "set_font_name",
    "Set the font name and style of a text node in Figma",
    {
      nodeId: z.string().describe("The ID of the text node to modify"),
      family: z.string().describe("Font family name"),
      style: z.string().optional().describe("Font style (e.g., 'Regular', 'Bold', 'Italic')"),
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
          ]
        };
      }
    }
  );

  // Set Font Size Tool
  server.tool(
    "set_font_size",
    "Set the font size of a text node in Figma",
    {
      nodeId: z.string().describe("The ID of the text node to modify"),
      fontSize: z.number().positive().describe("Font size in pixels"),
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
          ]
        };
      }
    }
  );

  // Set Font Weight Tool
  server.tool(
    "set_font_weight",
    "Set the font weight of a text node in Figma",
    {
      nodeId: z.string().describe("The ID of the text node to modify"),
      weight: z.number().describe("Font weight (100, 200, 300, 400, 500, 600, 700, 800, 900)"),
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
          ]
        };
      }
    }
  );

  // Set Letter Spacing Tool
  server.tool(
    "set_letter_spacing",
    "Set the letter spacing of a text node in Figma",
    {
      nodeId: z.string().describe("The ID of the text node to modify"),
      letterSpacing: z.number().describe("Letter spacing value"),
      unit: z.enum(["PIXELS", "PERCENT"]).optional().describe("Unit type (PIXELS or PERCENT)"),
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
          ]
        };
      }
    }
  );

  // Set Line Height Tool
  server.tool(
    "set_line_height",
    "Set the line height of a text node in Figma",
    {
      nodeId: z.string().describe("The ID of the text node to modify"),
      lineHeight: z.number().describe("Line height value"),
      unit: z.enum(["PIXELS", "PERCENT", "AUTO"]).optional().describe("Unit type (PIXELS, PERCENT, or AUTO)"),
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
          ]
        };
      }
    }
  );

  // Set Paragraph Spacing Tool
  server.tool(
    "set_paragraph_spacing",
    "Set the paragraph spacing of a text node in Figma",
    {
      nodeId: z.string().describe("The ID of the text node to modify"),
      paragraphSpacing: z.number().describe("Paragraph spacing value in pixels"),
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
          ]
        };
      }
    }
  );

  // Set Text Case Tool
  server.tool(
    "set_text_case",
    "Set the text case of a text node in Figma",
    {
      nodeId: z.string().describe("The ID of the text node to modify"),
      textCase: z.enum(["ORIGINAL", "UPPER", "LOWER", "TITLE"]).describe("Text case type"),
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
          ]
        };
      }
    }
  );

  // Set Text Decoration Tool
  server.tool(
    "set_text_decoration",
    "Set the text decoration of a text node in Figma",
    {
      nodeId: z.string().describe("The ID of the text node to modify"),
      textDecoration: z.enum(["NONE", "UNDERLINE", "STRIKETHROUGH"]).describe("Text decoration type"),
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
          ]
        };
      }
    }
  );

  // Get Styled Text Segments Tool
  server.tool(
    "get_styled_text_segments",
    "Get text segments with specific styling in a text node",
    {
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
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting styled text segments: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Set Text Style ID Tool
  server.tool(
    "set_text_style_id",
    "Apply a text style to a text node in Figma",
    {
      nodeId: z.string().describe("The ID of the text node to modify"),
      textStyleId: z.string().describe("The ID of the text style to apply"),
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
          ]
        };
      }
    }
  );

  // Load Font Async Tool
  server.tool(
    "load_font_async",
    "Load a font asynchronously in Figma",
    {
      family: z.string().describe("Font family name"),
      style: z.string().optional().describe("Font style (e.g., 'Regular', 'Bold', 'Italic')"),
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
          ]
        };
      }
    }
  );

  // Get Available Fonts Tool
  server.tool(
    "get_available_fonts",
    "Get all available fonts in Figma",
    {},
    async () => {
      try {
        const result = await sendCommandToFigma("get_available_fonts", {});
        const typedResult = result as {
          totalFonts: number,
          totalFamilies: number,
          fonts: Array<{ family: string, style: string }>,
          fontsByFamily: Record<string, string[]>
        };

        // Format the output for better readability
        const familyList = Object.entries(typedResult.fontsByFamily)
          .map(([family, styles]) => `${family}: ${styles.join(', ')}`)
          .join('\n');

        return {
          content: [
            {
              type: "text",
              text: `Found ${typedResult.totalFonts} fonts from ${typedResult.totalFamilies} families\n\n${familyList}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting available fonts: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Set Text Align Tool
  server.tool(
    "set_text_align",
    "Set horizontal text alignment for a text node",
    {
      nodeId: z.string().describe("The ID of the text node to modify"),
      textAlignHorizontal: z.enum(["LEFT", "CENTER", "RIGHT", "JUSTIFIED"]).describe("Horizontal alignment")
    },
    async ({ nodeId, textAlignHorizontal }) => {
      try {
        const result = await sendCommandToFigma("set_text_align", {
          nodeId,
          textAlignHorizontal
        });

        const typedResult = result as { name: string };

        return {
          content: [
            {
              type: "text",
              text: `Successfully set horizontal text alignment to ${textAlignHorizontal} for node "${typedResult.name}"`
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
          ]
        };
      }
    }
  );

  // Set Text Vertical Align Tool
  server.tool(
    "set_text_vertical_align",
    "Set vertical text alignment for a text node",
    {
      nodeId: z.string().describe("The ID of the text node to modify"),
      textAlignVertical: z.enum(["TOP", "CENTER", "BOTTOM"]).describe("Vertical alignment")
    },
    async ({ nodeId, textAlignVertical }) => {
      try {
        const result = await sendCommandToFigma("set_text_vertical_align", {
          nodeId,
          textAlignVertical
        });

        const typedResult = result as { name: string };

        return {
          content: [
            {
              type: "text",
              text: `Successfully set vertical text alignment to ${textAlignVertical} for node "${typedResult.name}"`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting vertical text alignment: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Set Text Auto Resize Tool
  server.tool(
    "set_text_auto_resize",
    "Set auto resize behavior for a text node",
    {
      nodeId: z.string().describe("The ID of the text node to modify"),
      textAutoResize: z.enum(["WIDTH_AND_HEIGHT", "HEIGHT", "NONE"]).describe("Auto resize mode")
    },
    async ({ nodeId, textAutoResize }) => {
      try {
        const result = await sendCommandToFigma("set_text_auto_resize", {
          nodeId,
          textAutoResize
        });

        const typedResult = result as { name: string };

        return {
          content: [
            {
              type: "text",
              text: `Successfully set text auto resize to ${textAutoResize} for node "${typedResult.name}"`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting text auto resize: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );
}