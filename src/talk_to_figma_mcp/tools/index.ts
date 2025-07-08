import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerDocumentTools } from "./document-tools.js";
import { registerCreationTools } from "./creation-tools.js";
import { registerModificationTools } from "./modification-tools.js";
import { registerTextTools } from "./text-tools.js";
import { registerComponentTools } from "./component-tools.js";
import { registerImageTools } from "./image-tools.js";
import { registerDesignOrchestrator } from "./design-orchestrator.js";
import { registerImageIntelligence } from "./image-intelligence.js";

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
  registerImageTools(server);
  registerDesignOrchestrator(server);
  registerImageIntelligence(server);
}

// Export all tool registration functions for individual usage if needed
export {
  registerDocumentTools,
  registerCreationTools,
  registerModificationTools,
  registerTextTools,
  registerComponentTools,
  registerImageTools,
  registerDesignOrchestrator,
  registerImageIntelligence
};