import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma } from "../utils/websocket";
import { coerceJson } from "../utils/schema-helpers";

/**
 * Register component-related tools to the MCP server
 * This module contains tools for working with components in Figma
 * @param server - The MCP server instance
 */
export function registerComponentTools(server: McpServer): void {
  // Create Component Instance Tool
  server.tool(
    "create_component_instance",
    "Create an instance of a component in Figma",
    {
      componentKey: z.string().describe("Key of the component to instantiate"),
      x: z.coerce.number().describe("X position (local coordinates, relative to parent)"),
      y: z.coerce.number().describe("Y position (local coordinates, relative to parent)"),
      parentId: z.string().optional().describe("Parent node ID. REQUIRED — server enforces this. Use page node ID for top-level elements. Get page IDs via get_pages tool."),
    },
    async ({ componentKey, x, y, parentId }) => {
      try {
        const result = await sendCommandToFigma("create_component_instance", {
          componentKey,
          x,
          y,
          parentId,
        });
        const typedResult = result as any;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(typedResult),
            }
          ]
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating component instance: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Create Component from Node Tool
  server.tool(
    "create_component_from_node",
    "Convert an existing node (frame, group, etc.) into a reusable component in Figma",
    {
      nodeId: z.string().describe("The ID of the node to convert into a component"),
      name: z.string().optional().describe("Optional new name for the component"),
      parentId: z.string().optional().describe("Parent node ID. REQUIRED — server enforces this. Use page node ID for top-level elements. Get page IDs via get_pages tool."),
    },
    async ({ nodeId, name, parentId }) => {
      try {
        const result = await sendCommandToFigma("create_component_from_node", {
          nodeId,
          name,
          parentId,
        });
        const typedResult = result as { id: string; name: string; key: string };
        return {
          content: [
            {
              type: "text",
              text: `Created component "${typedResult.name}" with ID: ${typedResult.id} and key: ${typedResult.key}. You can now create instances of this component using the key.`,
            }
          ]
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating component from node: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Create Component Set from Components Tool
  server.tool(
    "create_component_set",
    "Create a component set (variants) from multiple component nodes in Figma",
    {
      componentIds: coerceJson(z.array(z.string())).describe("Array of component node IDs to combine into a component set"),
      name: z.string().optional().describe("Optional name for the component set"),
      parentId: z.string().optional().describe("Parent node ID. REQUIRED — server enforces this. Use page node ID for top-level elements. Get page IDs via get_pages tool."),
    },
    async ({ componentIds, name, parentId }) => {
      try {
        const result = await sendCommandToFigma("create_component_set", {
          componentIds,
          name,
          parentId,
        });
        const typedResult = result as { id: string; name: string; key: string; variantCount: number };
        return {
          content: [
            {
              type: "text",
              text: `Created component set "${typedResult.name}" with ID: ${typedResult.id}, key: ${typedResult.key}, containing ${typedResult.variantCount} variants.`,
            }
          ]
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating component set: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Instance Variant Tool
  server.tool(
    "set_instance_variant",
    "Change the variant properties of a component instance without recreating it. This preserves instance overrides and is more efficient than delete + create workflow.",
    {
      nodeId: z.string().describe("The ID of the instance node to modify"),
      properties: coerceJson(z.record(z.string())).describe("Variant properties to set as key-value pairs (e.g., { \"State\": \"Hover\", \"Size\": \"Large\" })"),
    },
    async ({ nodeId, properties }) => {
      try {
        const result = await sendCommandToFigma("set_instance_variant", {
          nodeId,
          properties,
        });
        const typedResult = result as { id: string; name: string; properties: Record<string, string> };
        return {
          content: [
            {
              type: "text",
              text: `Successfully changed variant properties of instance "${typedResult.name}" (ID: ${typedResult.id}). New properties: ${JSON.stringify(typedResult.properties)}`,
            }
          ]
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting instance variant: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Reactions Tool (Prototype Interactions)
  server.tool(
    "set_reactions",
    "Set prototype interactions (reactions) on a node in Figma. Use this to add hover effects, click interactions, etc. For component variants, set on the default variant to add 'While hovering -> Change to hover variant' interactions.",
    {
      nodeId: z.string().describe("The ID of the node to set reactions on"),
      reactions: coerceJson(
        z.array(
          z.object({
            trigger: z
              .object({
                type: z
                  .string()
                  .describe(
                    "Trigger type: ON_CLICK, ON_HOVER, ON_PRESS, ON_DRAG, AFTER_TIMEOUT, MOUSE_ENTER, MOUSE_LEAVE, MOUSE_UP, MOUSE_DOWN"
                  ),
                delay: z
                  .number()
                  .optional()
                  .describe("Delay in seconds (for AFTER_TIMEOUT)"),
              })
              .describe("The trigger for this reaction"),
            actions: z
              .array(
                z.object({
                  type: z
                    .string()
                    .describe("Action type: NODE, BACK, CLOSE, URL"),
                  destinationId: z
                    .string()
                    .optional()
                    .describe("Target node ID (for NODE type)"),
                  navigation: z
                    .string()
                    .optional()
                    .describe(
                      "Navigation type: NAVIGATE, SWAP, OVERLAY, SCROLL_TO, CHANGE_TO"
                    ),
                  transition: z
                    .object({
                      type: z
                        .string()
                        .optional()
                        .describe(
                          "Transition type: DISSOLVE, SMART_ANIMATE, MOVE_IN, MOVE_OUT, PUSH, SLIDE_IN, SLIDE_OUT"
                        ),
                      easing: z
                        .object({ type: z.string() })
                        .optional()
                        .describe(
                          "Easing: EASE_IN, EASE_OUT, EASE_IN_AND_OUT, LINEAR"
                        ),
                      duration: z.number().optional().describe("Duration in seconds"),
                    })
                    .optional()
                    .describe("Transition animation"),
                  overlayRelativePosition: z
                    .object({
                      x: z.number(),
                      y: z.number(),
                    })
                    .optional()
                    .describe(
                      "Position of the overlay relative to the viewport top-left (for OVERLAY navigation)"
                    ),
                  // New fields from PR #82
                  resetVideoPosition: z.boolean().optional(),
                  resetScrollPosition: z.boolean().optional(),
                  resetInteractiveComponents: z.boolean().optional(),
                })
              )
              .describe("Actions to perform when triggered"),
          })
        )
      ).describe("Array of reactions to set on the node"),
    },
    async ({ nodeId, reactions }) => {
      try {
        const result = await sendCommandToFigma("set_reactions", {
          nodeId,
          reactions,
        });
        const typedResult = result as Record<string, unknown>;
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
              text: `Error setting reactions: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  // Get Reactions (Prototype Interactions) Tool
  server.tool(
    "get_reactions",
    "Read all prototype interactions (reactions) from a node in Figma. Useful for debugging and inspecting existing interactions.",
    {
      nodeId: z.string().describe("The ID of the node to read reactions from"),
    },
    async ({ nodeId }) => {
      try {
        const result = await sendCommandToFigma("get_reactions", {
          nodeId,
        });
        const typedResult = result as Record<string, unknown>;
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
              text: `Error getting reactions: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  // Detach Instance Tool
  server.tool(
    "detach_instance",
    "Detach a component instance, converting it into a regular frame. This breaks the link with the main component.",
    {
      instanceId: z.string().describe("The ID of the instance to detach"),
    },
    async ({ instanceId }) => {
      try {
        const result = await sendCommandToFigma("detach_instance", { nodeId: instanceId });
        const typedResult = result as { success: boolean; frameId: string; frameName: string; frameType: string };
        return {
          content: [
            {
              type: "text",
              text: `✅ Detached instance "${typedResult.frameName}" (Original ID: ${instanceId})\nNew regular frame ID: ${typedResult.frameId}\nType: ${typedResult.frameType}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Error detaching instance: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}