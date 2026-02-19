import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma } from "../utils/websocket";

/**
 * Register SVG-related tools to the MCP server
 * @param server - The MCP server instance
 */
export function registerSvgTools(server: McpServer): void {
  // Import SVG Tool
  server.tool(
    "set_svg",
    "Import an SVG string as a vector node in Figma. The SVG is sanitized (scripts and external resources are stripped) before import. Max 500KB.",
    {
      svgString: z.string().max(500_000).describe("SVG markup string (max 500KB). Must contain a valid <svg> element."),
      x: z.number().optional().describe("X position for the imported SVG (default: 0)"),
      y: z.number().optional().describe("Y position for the imported SVG (default: 0)"),
      name: z.string().optional().describe("Optional name for the imported node"),
      parentId: z.string().optional().describe("Parent node ID. REQUIRED — server enforces this. Use page node ID for top-level elements. Get page IDs via get_pages tool."),
    },
    async ({ svgString, x, y, name, parentId }) => {
      try {
        const result = await sendCommandToFigma("set_svg", {
          svgString,
          x: x || 0,
          y: y || 0,
          name,
          parentId,
        });
        const typedResult = result as { id: string; name: string; width: number; height: number };
        return {
          content: [
            {
              type: "text",
              text: `Imported SVG as "${typedResult.name}" with ID: ${typedResult.id} (${typedResult.width}x${typedResult.height})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error importing SVG: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Export SVG Tool
  server.tool(
    "get_svg",
    "Export a single node as an SVG string from Figma. Returns the SVG markup including all nested children.",
    {
      nodeId: z.string().describe("The ID of the node to export as SVG"),
    },
    async ({ nodeId }) => {
      try {
        const result = await sendCommandToFigma("get_svg", { nodeId }, 120000);
        const typedResult = result as { svgString: string; name: string };
        return {
          content: [
            {
              type: "text",
              text: typedResult.svgString,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error exporting SVG: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}
