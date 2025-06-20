/**
 * Variable Tools for Figma MCP
 * Provides basic structure for working with Figma Variables API
 * 
 * This module implements the foundation for the Variables phase of the MCP expansion plan.
 * Initial implementation provides essential variable management tools.
 */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma } from "../utils/websocket.js";

/**
 * Register variable-related tools to the MCP server
 * 
 * This is the base structure for Phase 1 Variable Tools.
 * Currently implements basic variable creation and query operations.
 * 
 * @param server - The MCP server instance
 */
export function registerVariableTools(server: McpServer): void {
  // Create Variable Tool
  server.tool(
    "create_variable",
    "Create a new variable in a variable collection",
    {
      name: z.string().min(1).describe("Variable name"),
      variableCollectionId: z.string().min(1).describe("Variable collection ID"),
      resolvedType: z.enum(["BOOLEAN", "FLOAT", "STRING", "COLOR"]).describe("Variable data type"),
      initialValue: z.union([z.boolean(), z.number(), z.string(), z.object({
        r: z.number().min(0).max(1),
        g: z.number().min(0).max(1),
        b: z.number().min(0).max(1),
        a: z.number().min(0).max(1).optional()
      })]).optional().describe("Initial value for the variable"),
      description: z.string().optional().describe("Variable description"),
    },
    async ({ name, variableCollectionId, resolvedType, initialValue, description }) => {
      try {
        const result = await sendCommandToFigma("create_variable", {
          name,
          variableCollectionId,
          resolvedType,
          initialValue,
          description: description || "",
        });

        return {
          content: [
            {
              type: "text",
              text: `Variable "${name}" created successfully: ${JSON.stringify(result)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating variable: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Create Variable Collection Tool
  server.tool(
    "create_variable_collection",
    "Create a new variable collection",
    {
      name: z.string().min(1).describe("Collection name"),
      initialModeNames: z.array(z.string()).optional().describe("Initial mode names"),
    },
    async ({ name, initialModeNames }) => {
      try {
        const result = await sendCommandToFigma("create_variable_collection", {
          name,
          initialModeNames: initialModeNames || ["Mode 1"],
        });

        return {
          content: [
            {
              type: "text",
              text: `Variable collection "${name}" created successfully: ${JSON.stringify(result)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating variable collection: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Get Local Variables Tool
  server.tool(
    "get_local_variables",
    "Get all local variables from the document",
    {},
    async () => {
      try {
        const result = await sendCommandToFigma("get_local_variables");

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting local variables: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Get Local Variable Collections Tool
  server.tool(
    "get_local_variable_collections",
    "Get all local variable collections from the document",
    {},
    async () => {
      try {
        const result = await sendCommandToFigma("get_local_variable_collections");

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting local variable collections: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Get Variable by ID Tool
  server.tool(
    "get_variable_by_id",
    "Get a variable by its ID",
    {
      variableId: z.string().min(1).describe("Variable ID"),
    },
    async ({ variableId }) => {
      try {
        const result = await sendCommandToFigma("get_variable_by_id", { variableId });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting variable by ID: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Get Variable Collection by ID Tool
  server.tool(
    "get_variable_collection_by_id",
    "Get a variable collection by its ID",
    {
      variableCollectionId: z.string().min(1).describe("Variable collection ID"),
    },
    async ({ variableCollectionId }) => {
      try {
        const result = await sendCommandToFigma("get_variable_collection_by_id", { variableCollectionId });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting variable collection by ID: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
} 