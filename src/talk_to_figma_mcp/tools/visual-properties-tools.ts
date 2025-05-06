import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma } from "../utils/websocket";
import { BlendMode } from "../types";

/**
 * Register visual property tools to the MCP server
 * This module contains tools for modifying visual properties of elements in Figma
 * @param server - The MCP server instance
 */
export function registerVisualPropertyTools(server: McpServer): void {
  // Set Opacity Tool
  server.tool(
    "set_opacity",
    "Set the opacity of a node in Figma",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      opacity: z.number().min(0).max(1).describe("Opacity value between 0 and 1"),
    },
    async ({ nodeId, opacity }) => {
      try {
        const result = await sendCommandToFigma("set_opacity", {
          nodeId,
          opacity,
        });
        const typedResult = result as { name: string };
        return {
          content: [
            {
              type: "text",
              text: `Set opacity of node "${typedResult.name}" to ${opacity} (${Math.round(opacity * 100)}%)`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting opacity: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}