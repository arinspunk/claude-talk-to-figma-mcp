import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerDocumentTools } from "./document-tools";
import { registerCreationTools } from "./creation-tools";
import { registerModificationTools } from "./modification-tools";
import { registerTextTools } from "./text-tools";
import { registerComponentTools } from "./component-tools";
import { registerImageTools } from "./image-tools";
import { registerSvgTools } from "./svg-tools";
import { registerVariableTools } from "./variable-tools";
import { registerFigJamTools } from "./figjam-tools";
import { registerStyleTools } from "./style-tools";
import { registerVerifyTools } from "./verify-tools";
import { registerAssetTools } from "./asset-tools";
import { registerRestTools } from "./rest-tools";

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
  registerSvgTools(server);
  registerVariableTools(server);
  registerFigJamTools(server);
  registerStyleTools(server);
  registerVerifyTools(server);
  registerAssetTools(server);
  // REST API tools (Figma personal access token) — self-skip when no token is set.
  registerRestTools(server);
}

// Export all tool registration functions for individual usage if needed
export {
  registerDocumentTools,
  registerCreationTools,
  registerModificationTools,
  registerTextTools,
  registerComponentTools,
  registerImageTools,
  registerSvgTools,
  registerVariableTools,
  registerFigJamTools,
  registerStyleTools,
  registerVerifyTools,
  registerAssetTools,
  registerRestTools,
};