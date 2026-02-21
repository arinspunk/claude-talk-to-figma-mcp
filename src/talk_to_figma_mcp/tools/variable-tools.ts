import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma } from "../utils/websocket";

/**
 * Register variable tools to the MCP server
 * This module contains tools for managing Figma Variables (design tokens)
 * @param server - The MCP server instance
 */
export function registerVariableTools(server: McpServer): void {
  // Get Variables Tool
  server.tool(
    "get_variables",
    "List all variable collections and their variables in the current Figma file. Returns collections with their modes and variables.",
    {},
    async () => {
      try {
        const result = await sendCommandToFigma("get_variables", {});
        const typedResult = result as { collections: any[] };
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(typedResult, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting variables: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Variable Tool
  server.tool(
    "set_variable",
    "Create or update a variable in a Figma variable collection. Creates the collection if collectionName is provided and it doesn't exist.",
    {
      collectionId: z.string().optional().describe("ID of an existing variable collection"),
      collectionName: z.string().optional().describe("Name for a new collection (used if collectionId not provided)"),
      name: z.string().describe("Variable name"),
      resolvedType: z.enum(["COLOR", "FLOAT", "STRING", "BOOLEAN"]).describe("Variable type"),
      value: z.any().describe("Variable value. COLOR: {r,g,b,a} (0-1). FLOAT: number. STRING: string. BOOLEAN: boolean."),
      modeId: z.string().optional().describe("Mode ID to set the value for (uses default mode if omitted)"),
    },
    async ({ collectionId, collectionName, name, resolvedType, value, modeId }) => {
      try {
        const result = await sendCommandToFigma("set_variable", {
          collectionId,
          collectionName,
          name,
          resolvedType,
          value,
          modeId,
        });
        const typedResult = result as { variableId: string; variableName: string; collectionName: string };
        return {
          content: [
            {
              type: "text",
              text: `Set variable "${typedResult.variableName}" in collection "${typedResult.collectionName}" (ID: ${typedResult.variableId})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting variable: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Apply Variable to Node Tool
  server.tool(
    "apply_variable_to_node",
    "Bind a variable to a node property in Figma. Call once per field — for multiple fields, call multiple times.",
    {
      nodeId: z.string().describe("The ID of the node to bind the variable to"),
      variableId: z.string().describe("The ID of the variable to bind"),
      field: z.string().describe("The node property field to bind (e.g., 'fills/0/color', 'opacity', 'width', 'height')"),
    },
    async ({ nodeId, variableId, field }) => {
      try {
        const result = await sendCommandToFigma("apply_variable_to_node", {
          nodeId,
          variableId,
          field,
        });
        const typedResult = result as { nodeName: string; variableName: string; field: string };
        return {
          content: [
            {
              type: "text",
              text: `Bound variable "${typedResult.variableName}" to field "${typedResult.field}" on node "${typedResult.nodeName}"`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error applying variable to node: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Switch Variable Mode Tool
  server.tool(
    "switch_variable_mode",
    "Switch the variable mode on a node for a specific collection. This changes which mode's values are used for bound variables.",
    {
      nodeId: z.string().describe("The ID of the node to switch mode on"),
      collectionId: z.string().describe("The ID of the variable collection"),
      modeId: z.string().describe("The ID of the mode to switch to"),
    },
    async ({ nodeId, collectionId, modeId }) => {
      try {
        const result = await sendCommandToFigma("switch_variable_mode", {
          nodeId,
          collectionId,
          modeId,
        });
        const typedResult = result as { nodeName: string; collectionName: string; modeName: string };
        return {
          content: [
            {
              type: "text",
              text: `Switched to mode "${typedResult.modeName}" for collection "${typedResult.collectionName}" on node "${typedResult.nodeName}"`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error switching variable mode: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}
