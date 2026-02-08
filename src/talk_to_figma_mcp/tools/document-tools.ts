import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma, joinChannel } from "../utils/websocket.js";
import { filterFigmaNode } from "../utils/figma-helpers.js";

/**
 * Register document-related tools to the MCP server
 * @param server - The MCP server instance
 */
export function registerDocumentTools(server: McpServer): void {
  // Document Info Tool
  server.tool(
    "get_document_info",
    "Get detailed information about the current Figma document",
    {},
    async () => {
      try {
        const result = await sendCommandToFigma("get_document_info");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting document info: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Selection Tool
  server.tool(
    "get_selection",
    "Get information about the current selection in Figma",
    {},
    async () => {
      try {
        const result = await sendCommandToFigma("get_selection");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting selection: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Node Info Tool
  server.tool(
    "get_node_info",
    "Get detailed information about a specific node in Figma",
    {
      nodeId: z.string().describe("The ID of the node to get information about"),
    },
    async ({ nodeId }) => {
      try {
        const result = await sendCommandToFigma("get_node_info", { nodeId });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(filterFigmaNode(result))
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting node info: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Nodes Info Tool
  server.tool(
    "get_nodes_info",
    "Get detailed information about multiple nodes in Figma",
    {
      nodeIds: z.array(z.string()).describe("Array of node IDs to get information about")
    },
    async ({ nodeIds }) => {
      try {
        const results = await Promise.all(
          nodeIds.map(async (nodeId) => {
            const result = await sendCommandToFigma('get_node_info', { nodeId });
            return { nodeId, info: result };
          })
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results.map((result) => filterFigmaNode(result.info)))
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting nodes info: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Get Styles Tool
  server.tool(
    "get_styles",
    "Get all styles from the current Figma document",
    {},
    async () => {
      try {
        const result = await sendCommandToFigma("get_styles");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting styles: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Get Local Components Tool
  server.tool(
    "get_local_components",
    "Get all local components from the Figma document",
    {},
    async () => {
      try {
        const result = await sendCommandToFigma("get_local_components");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting local components: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Get Remote Components Tool
  server.tool(
    "get_remote_components",
    "Get available components from team libraries in Figma",
    {},
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
          ]
        };
      }
    }
  );

  // Text Node Scanning Tool
  server.tool(
    "scan_text_nodes",
    "Scan all text nodes in the selected Figma node",
    {
      nodeId: z.string().describe("ID of the node to scan"),
    },
    async ({ nodeId }) => {
      try {
        // Initial response to indicate we're starting the process
        const initialStatus = {
          type: "text" as const,
          text: "Starting text node scanning. This may take a moment for large designs...",
        };

        // Use the plugin's scan_text_nodes function with chunking flag
        const result = await sendCommandToFigma("scan_text_nodes", {
          nodeId,
          useChunking: true,  // Enable chunking on the plugin side
          chunkSize: 10       // Process 10 nodes at a time
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
              initialStatus,
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
            initialStatus,
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
        };
      }
    }
  );

  // Join Channel Tool
  server.tool(
    "join_channel",
    "Join a specific channel to communicate with Figma",
    {
      channel: z.string().describe("The name of the channel to join"),
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
        };
      }
    }
  );

  // Export Node as Image Tool
  server.tool(
    "export_node_as_image",
    "Export a node as an image from Figma",
    {
      nodeId: z.string().describe("The ID of the node to export"),
      format: z
        .enum(["PNG", "JPG", "SVG", "PDF"])
        .optional()
        .describe("Export format"),
      scale: z.number().positive().optional().describe("Export scale"),
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
        };
      }
    }
  );

  // Create Page Tool
  server.tool(
    "create_page",
    "Create a new page in the current Figma document",
    {
      name: z.string().describe("Name for the new page"),
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
        };
      }
    }
  );

  // Delete Page Tool
  server.tool(
    "delete_page",
    "Delete a page from the current Figma document",
    {
      pageId: z.string().describe("ID of the page to delete"),
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
        };
      }
    }
  );

  // Rename Page Tool
  server.tool(
    "rename_page",
    "Rename an existing page in the Figma document",
    {
      pageId: z.string().describe("ID of the page to rename"),
      name: z.string().describe("New name for the page"),
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
        };
      }
    }
  );

  // Get Pages Tool
  server.tool(
    "get_pages",
    "Get all pages in the current Figma document",
    {},
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
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting pages: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Current Page Tool
  server.tool(
    "set_current_page",
    "Switch to a specific page in the Figma document",
    {
      pageId: z.string().describe("ID of the page to switch to"),
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
        };
      }
    }
  );

  // Find Nodes by Name Tool
  server.tool(
    "find_nodes_by_name",
    "Search for nodes by name in the current page",
    {
      name: z.string().describe("Name or partial name to search for"),
      caseSensitive: z.boolean().optional().describe("Whether search should be case sensitive (defaults to false)"),
      exactMatch: z.boolean().optional().describe("Whether to match exact name only (defaults to false)")
    },
    async ({ name, caseSensitive, exactMatch }) => {
      try {
        const result = await sendCommandToFigma("find_nodes_by_name", {
          name,
          caseSensitive: caseSensitive ?? false,
          exactMatch: exactMatch ?? false
        });

        const typedResult = result as { results: any[]; count: number };

        return {
          content: [
            {
              type: "text",
              text: `Found ${typedResult.count} node(s) matching "${name}"`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error finding nodes by name: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Find Nodes by Type Tool
  server.tool(
    "find_nodes_by_type",
    "Search for nodes by type in the current page",
    {
      nodeType: z.enum([
        "FRAME", "GROUP", "RECTANGLE", "ELLIPSE", "POLYGON", "STAR", "LINE",
        "TEXT", "VECTOR", "COMPONENT", "COMPONENT_SET", "INSTANCE", "BOOLEAN_OPERATION"
      ]).describe("Type of node to search for")
    },
    async ({ nodeType }) => {
      try {
        const result = await sendCommandToFigma("find_nodes_by_type", {
          nodeType
        });

        const typedResult = result as { results: any[]; count: number };

        return {
          content: [
            {
              type: "text",
              text: `Found ${typedResult.count} node(s) of type ${nodeType}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error finding nodes by type: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Create Color Style Tool
  server.tool(
    "create_color_style",
    "Create a new color style in the document",
    {
      name: z.string().describe("Name for the color style"),
      color: z.object({
        r: z.number().min(0).max(1).describe("Red component (0-1)"),
        g: z.number().min(0).max(1).describe("Green component (0-1)"),
        b: z.number().min(0).max(1).describe("Blue component (0-1)"),
        a: z.number().min(0).max(1).describe("Alpha component (0-1)")
      }).describe("Color for the style")
    },
    async ({ name, color }) => {
      try {
        const result = await sendCommandToFigma("create_color_style", {
          name,
          color
        });

        const typedResult = result as { id: string; name: string; key: string };

        return {
          content: [
            {
              type: "text",
              text: `Successfully created color style "${typedResult.name}" with ID ${typedResult.id}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating color style: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Get Color Styles Tool
  server.tool(
    "get_color_styles",
    "Get all local color styles in the document",
    {},
    async () => {
      try {
        const result = await sendCommandToFigma("get_color_styles", {});

        const typedResult = result as { styles: any[] };

        return {
          content: [
            {
              type: "text",
              text: `Found ${typedResult.styles.length} color style(s) in the document`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting color styles: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Apply Color Style Tool
  server.tool(
    "apply_color_style",
    "Apply a color style to a node",
    {
      nodeId: z.string().describe("The ID of the node to apply style to"),
      styleId: z.string().describe("The ID of the color style to apply")
    },
    async ({ nodeId, styleId }) => {
      try {
        const result = await sendCommandToFigma("apply_color_style", {
          nodeId,
          styleId
        });

        const typedResult = result as { name: string; id: string };

        return {
          content: [
            {
              type: "text",
              text: `Successfully applied color style to node "${typedResult.name}"`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error applying color style: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Align Nodes Tool
  server.tool(
    "align_nodes",
    "Align multiple nodes relative to each other",
    {
      nodeIds: z.array(z.string()).min(2).describe("Array of node IDs to align"),
      alignment: z.enum(["LEFT", "RIGHT", "TOP", "BOTTOM", "CENTER_HORIZONTAL", "CENTER_VERTICAL"]).describe("Alignment direction")
    },
    async ({ nodeIds, alignment }) => {
      try {
        const result = await sendCommandToFigma("align_nodes", {
          nodeIds,
          alignment
        });

        const typedResult = result as { nodeIds: string[]; alignment: string };

        return {
          content: [
            {
              type: "text",
              text: `Successfully aligned ${nodeIds.length} node(s) using ${alignment} alignment`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error aligning nodes: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Distribute Nodes Tool
  server.tool(
    "distribute_nodes",
    "Distribute spacing evenly between multiple nodes",
    {
      nodeIds: z.array(z.string()).min(3).describe("Array of node IDs to distribute (minimum 3)"),
      direction: z.enum(["HORIZONTAL", "VERTICAL"]).describe("Distribution direction")
    },
    async ({ nodeIds, direction }) => {
      try {
        const result = await sendCommandToFigma("distribute_nodes", {
          nodeIds,
          direction
        });

        const typedResult = result as { nodeIds: string[]; direction: string };

        return {
          content: [
            {
              type: "text",
              text: `Successfully distributed ${nodeIds.length} node(s) ${direction.toLowerCase()}ly`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error distributing nodes: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );
}