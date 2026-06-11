import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma, joinChannel } from "../utils/websocket";
import { filterFigmaNode } from "../utils/figma-helpers";
import { coerceJson, coerceBoolean } from "../utils/schema-helpers";

/**
 * Register document-related tools to the MCP server
 * @param server - The MCP server instance
 */
export function registerDocumentTools(server: McpServer): void {
  // Document Info Tool
  server.registerTool(
    "get_document_info",
    {
      description: "Get detailed information about the current Figma document",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const result = await sendCommandToFigma("get_document_info");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result)
            }
          ],
          structuredContent: result as Record<string, unknown>,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting document info: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Selection Tool
  server.registerTool(
    "get_selection",
    {
      description: "Get information about the current selection in Figma",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const result = await sendCommandToFigma("get_selection");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result)
            }
          ],
          structuredContent: result as Record<string, unknown>,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting selection: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Node Info Tool
  server.registerTool(
    "get_node_info",
    {
      description: "Get detailed information about a specific node in Figma",
      inputSchema: {
      nodeId: z.string().describe("The ID of the node to get information about"),
      depth: z.number().int().min(0).optional().describe("How many child levels to include in full detail. Deeper levels return only id/name/type stubs."),
    },
      annotations: { readOnlyHint: true },
    },
    async ({ nodeId, depth }) => {
      try {
        const result = await sendCommandToFigma("get_node_info", { nodeId });
        const filtered = filterFigmaNode(result, depth ?? 1);
        const coordinateNote = filtered.absoluteBoundingBox && filtered.localPosition
          ? "absoluteBoundingBox contains global coordinates (relative to canvas). localPosition contains local coordinates (relative to parent, use these for move_node)."
          : undefined;

        const payload = coordinateNote ? { ...filtered, _note: coordinateNote } : filtered;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(payload)
            }
          ],
          structuredContent: payload as Record<string, unknown>,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting node info: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Nodes Info Tool
  server.registerTool(
    "get_nodes_info",
    {
      description: "Get detailed information about multiple nodes in Figma",
      inputSchema: {
      nodeIds: coerceJson(z.array(z.string())).describe("Array of node IDs to get information about"),
      depth: z.number().int().min(0).optional().describe("How many child levels to include in full detail. Deeper levels return only id/name/type stubs.")
    },
      annotations: { readOnlyHint: true },
    },
    async ({ nodeIds, depth }) => {
      try {
        const results = await sendCommandToFigma('get_nodes_info', { nodeIds }) as any[];
        const nodes = results.map((result) => filterFigmaNode(result.document || result.info, depth ?? 1));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(nodes)
            }
          ],
          structuredContent: { nodes },
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting nodes info: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true,
        };
      }
    }
  );

  // Get Styles Tool
  server.registerTool(
    "get_styles",
    {
      description: "Get all styles from the current Figma document",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const result = await sendCommandToFigma("get_styles");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result)
            }
          ],
          structuredContent: result as Record<string, unknown>,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting styles: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Get Local Components Tool
  server.registerTool(
    "get_local_components",
    {
      description: "Get all local components from the Figma document",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const result = await sendCommandToFigma("get_local_components");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result)
            }
          ],
          structuredContent: result as Record<string, unknown>,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting local components: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Get Remote Components Tool
  server.registerTool(
    "get_remote_components",
    {
      description: "Get available components from team libraries in Figma",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const result = await sendCommandToFigma("get_remote_components");
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
              text: `Error getting remote components: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true,
        };
      }
    }
  );

  // Text Node Scanning Tool
  server.registerTool(
    "scan_text_nodes",
    {
      description: "Scan all text nodes in the selected Figma node",
      inputSchema: {
      nodeId: z.string().describe("ID of the node to scan"),
      highlight: z.coerce.boolean().optional().describe("Briefly highlight each text node as it is scanned (default false — slows down large scans)."),
    },
      annotations: { readOnlyHint: true },
    },
    async ({ nodeId, highlight }) => {
      try {
        // Use the plugin's scan_text_nodes function with chunking flag
        const result = await sendCommandToFigma("scan_text_nodes", {
          nodeId,
          useChunking: true,  // Enable chunking on the plugin side
          chunkSize: 10,      // Process 10 nodes at a time
          highlight: highlight ?? false,
        });

        // If the result indicates chunking was used, format the response accordingly
        if (result && typeof result === 'object' && 'chunks' in result) {
          const typedResult = result as {
            success: boolean,
            totalNodes: number,
            processedNodes: number,
            chunks: number,
            textNodes: Array<any>
          };

          const summaryText = `
          Scan completed:
          - Found ${typedResult.totalNodes} text nodes
          - Processed in ${typedResult.chunks} chunks
          `;

          return {
            content: [
              {
                type: "text" as const,
                text: summaryText
              },
              {
                type: "text" as const,
                text: JSON.stringify(typedResult.textNodes, null, 2)
              }
            ],
          };
        }

        // If chunking wasn't used or wasn't reported in the result format, return the result as is
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
              text: `Error scanning text nodes: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Join Channel Tool
  server.registerTool(
    "join_channel",
    {
      description: "ADVANCED / rarely needed. Connection is zero-config: Figma tools auto-route to the connected plugin, so you normally do NOT call this. Only use it to disambiguate when MULTIPLE Figma files are connected, passing the specific channel ID the user provides.",
      inputSchema: {
      channel: z.string().describe("The name of the channel to join"),
    },
    },
    async ({ channel }) => {
      try {
        if (!channel) {
          // If no channel provided, ask the user for input
          return {
            content: [
              {
                type: "text",
                text: "Please provide a channel name to join:",
              },
            ],
            followUp: {
              tool: "join_channel",
              description: "Join the specified channel",
            },
          };
        }

        // Use joinChannel instead of sendCommandToFigma to ensure currentChannel is updated
        await joinChannel(channel);

        return {
          content: [
            {
              type: "text",
              text: `Successfully joined channel: ${channel}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error joining channel: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Export Node as Image Tool
  server.registerTool(
    "export_node_as_image",
    {
      description: "Export a node as an image from Figma",
      inputSchema: {
      nodeId: z.string().describe("The ID of the node to export"),
      format: z
        .enum(["PNG", "JPG", "SVG", "PDF"])
        .optional()
        .describe("Export format"),
      scale: z.coerce.number().positive().optional().describe("Export scale"),
    },
      annotations: { readOnlyHint: true },
    },
    async ({ nodeId, format, scale }) => {
      try {
        const result = await sendCommandToFigma("export_node_as_image", {
          nodeId,
          format: format || "PNG",
          scale: scale || 1,
        }, 120000); // 120 second timeout for image export
        const typedResult = result as { imageData: string; mimeType: string };

        return {
          content: [
            {
              type: "image",
              data: typedResult.imageData,
              mimeType: typedResult.mimeType || "image/png",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error exporting node as image: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Create Page Tool
  server.registerTool(
    "create_page",
    {
      description: "Create a new page in the current Figma document",
      inputSchema: {
      name: z.string().describe("Name for the new page"),
    },
    },
    async ({ name }) => {
      try {
        const result = await sendCommandToFigma("create_page", { name });
        const typedResult = result as { id: string; name: string };
        return {
          content: [
            {
              type: "text",
              text: `Created page "${typedResult.name}" with ID: ${typedResult.id}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating page: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Delete Page Tool
  server.registerTool(
    "delete_page",
    {
      description: "Delete a page from the current Figma document",
      inputSchema: {
      pageId: z.string().describe("ID of the page to delete"),
    },
      annotations: { destructiveHint: true },
    },
    async ({ pageId }) => {
      try {
        const result = await sendCommandToFigma("delete_page", { pageId });
        const typedResult = result as { success: boolean; name: string };
        return {
          content: [
            {
              type: "text",
              text: `Deleted page "${typedResult.name}" successfully`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error deleting page: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Rename Page Tool
  server.registerTool(
    "rename_page",
    {
      description: "Rename an existing page in the Figma document",
      inputSchema: {
      pageId: z.string().describe("ID of the page to rename"),
      name: z.string().describe("New name for the page"),
    },
    },
    async ({ pageId, name }) => {
      try {
        const result = await sendCommandToFigma("rename_page", { pageId, name });
        const typedResult = result as { id: string; name: string; oldName: string };
        return {
          content: [
            {
              type: "text",
              text: `Renamed page from "${typedResult.oldName}" to "${typedResult.name}"`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error renaming page: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Get Pages Tool
  server.registerTool(
    "get_pages",
    {
      description: "Get all pages in the current Figma document",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const result = await sendCommandToFigma("get_pages");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
          structuredContent: result as Record<string, unknown>,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting pages: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Set Current Page Tool
  server.registerTool(
    "set_current_page",
    {
      description: "DEPRECATED — this stateful command is blocked by the relay server. Instead, pass the target page's node ID as parentId on creation commands (e.g., create_rectangle, create_frame). Use get_pages to discover page IDs.",
      inputSchema: {
      pageId: z.string().describe("ID of the page to switch to"),
    },
    },
    async ({ pageId }) => {
      try {
        const result = await sendCommandToFigma("set_current_page", { pageId });
        const typedResult = result as { id: string; name: string };
        return {
          content: [
            {
              type: "text",
              text: `Switched to page "${typedResult.name}"`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error switching page: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Duplicate Page Tool
  server.registerTool(
    "duplicate_page",
    {
      description: "Duplicate an existing page in the Figma document, creating a complete copy of all its contents",
      inputSchema: {
      pageId: z.string().describe("ID of the page to duplicate"),
      name: z.string().optional().describe("Optional name for the duplicated page (defaults to 'Original Name (Copy)')"),
    },
    },
    async ({ pageId, name }) => {
      try {
        const result = await sendCommandToFigma("duplicate_page", { pageId, name });
        const typedResult = result as { id: string; name: string; originalName: string };
        return {
          content: [
            {
              type: "text",
              text: `Duplicated page "${typedResult.originalName}" → "${typedResult.name}" with ID: ${typedResult.id}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error duplicating page: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Get CSS Tool — Figma's own Dev Mode CSS (highest-fidelity styling source)
  server.registerTool(
    "get_css",
    {
      description: "Get Figma's exact computed CSS (Dev Mode) for a node — sizing, padding, colors, gradients, border-radius, box-shadow, and the full font/line-height/letter-spacing. Prefer this over reconstructing styles from get_node_info: it removes guesswork and is the most faithful source for 1:1 code. Defaults to the current selection. Use recursive=true to get CSS for the whole subtree.",
      inputSchema: {
      nodeId: z.string().optional().describe("Node to inspect. Omit to use the current selection."),
      recursive: coerceBoolean.optional().describe("If true, return CSS for the node and all descendants (capped). Default false."),
    },
      annotations: { readOnlyHint: true },
    },
    async ({ nodeId, recursive }) => {
      try {
        const result = await sendCommandToFigma("get_css", { nodeId, recursive: recursive ?? false }, 60000);

        const fmtBlock = (n: { id: string; name: string; type: string; css: Record<string, string> }) => {
          const decls = Object.entries(n.css).map(([k, v]) => `  ${k}: ${v};`).join("\n");
          return `/* "${n.name}" (${n.type}, ${n.id}) */\n${decls || "  /* no CSS */"}`;
        };

        let text: string;
        if (recursive) {
          const typed = result as { root: string; count: number; truncated: boolean; nodes: any[] };
          text = typed.nodes.map(fmtBlock).join("\n\n");
          if (typed.truncated) text += `\n\n/* … output truncated at ${typed.count} nodes; query a sub-node for the rest */`;
        } else {
          text = fmtBlock(result as any);
        }

        return { content: [{ type: "text", text }] };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting CSS: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}