/**
 * MCP Resources for the Figma server.
 *
 * Resources expose live Figma state (read-only) that the client can index
 * automatically — no explicit tool call required. The selection resource lets
 * the agent "see" whatever the user has clicked on at any moment.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma } from "../utils/websocket";
import { logger } from "../utils/logger";

/**
 * Fetch live data from Figma and wrap it as a JSON resource payload.
 * On failure (e.g. no plugin connected) returns a structured error object so a
 * resource read degrades gracefully instead of hard-failing.
 */
async function readFigmaResource(
  uriHref: string,
  command: "get_selection" | "get_document_info"
): Promise<{ contents: { uri: string; mimeType: string; text: string }[] }> {
  let payload: unknown;
  try {
    payload = await sendCommandToFigma(command, {}, 15000);
  } catch (error) {
    payload = {
      error: error instanceof Error ? error.message : String(error),
      hint: "Ensure the Claude Talk to Figma plugin is open and connected.",
    };
    logger.warn(`Resource ${uriHref} read failed: ${(payload as any).error}`);
  }

  return {
    contents: [
      {
        uri: uriHref,
        mimeType: "application/json",
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

/**
 * Register all resources with the MCP server.
 * @param server - The MCP server instance
 */
export function registerResources(server: McpServer): void {
  // Live current selection — the agent can read this to know what the user has
  // selected without a manual get_selection() tool call.
  server.registerResource(
    "figma-selection",
    "figma://local/selection",
    {
      description:
        "The user's current Figma selection (live). Read this to see which nodes are selected right now — ids, names, types.",
      mimeType: "application/json",
    },
    async (uri) => readFigmaResource(uri.href, "get_selection")
  );

  // Live document overview — current page, pages, and top-level structure.
  server.registerResource(
    "figma-document",
    "figma://local/document",
    {
      description:
        "Overview of the active Figma document (live): current page, pages, and top-level children.",
      mimeType: "application/json",
    },
    async (uri) => readFigmaResource(uri.href, "get_document_info")
  );
}
