import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerDocumentTools } from "./document-tools";
import { registerCreationTools } from "./creation-tools";
import { registerModificationTools } from "./modification-tools";
import { registerTextTools } from "./text-tools";
import { registerComponentTools } from "./component-tools";
// Import new tool categories
import { registerVisualPropertyTools } from "./visual-properties-tools";
import { registerStrokeTools } from "./stroke-tools";
import { registerLayoutTools } from "./layout-tools";
import { registerComponentAdvancedTools } from "./component-advanced-tools";

/**
 * Register all Figma tools to the MCP server
 * @param server - The MCP server instance
 */
export function registerTools(server: McpServer): void {
  // Register all tool categories
  registerDocumentTools(server);
  registerCreationTools(server);
  registerModificationTools(server);
  registerTextTools(server);
  registerComponentTools(server);
  // Register new tool categories
  registerVisualPropertyTools(server);
  registerStrokeTools(server);
  registerLayoutTools(server);
  registerComponentAdvancedTools(server);
}

// Export all tool registration functions for individual usage if needed
export {
  registerDocumentTools,
  registerCreationTools,
  registerModificationTools,
  registerTextTools,
  registerComponentTools,
  // Export new tool categories
  registerVisualPropertyTools,
  registerStrokeTools,
  registerLayoutTools,
  registerComponentAdvancedTools
};