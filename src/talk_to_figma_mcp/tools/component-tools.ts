import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma } from "../utils/websocket";

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
      x: z.number().describe("X position (local coordinates, relative to parent)"),
      y: z.number().describe("Y position (local coordinates, relative to parent)"),
    },
    async ({ componentKey, x, y }) => {
      try {
        const result = await sendCommandToFigma("create_component_instance", {
          componentKey,
          x,
          y,
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
    },
    async ({ nodeId, name }) => {
      try {
        const result = await sendCommandToFigma("create_component_from_node", {
          nodeId,
          name,
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
      componentIds: z.array(z.string()).describe("Array of component node IDs to combine into a component set"),
      name: z.string().optional().describe("Optional name for the component set"),
    },
    async ({ componentIds, name }) => {
      try {
        const result = await sendCommandToFigma("create_component_set", {
          componentIds,
          name,
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

  // Add Component Property Tool
  server.tool(
    "add_component_property",
    "Add a component property (text, boolean, instance swap, or variant) to a component in Figma. This creates per-instance editable inputs — e.g., a TEXT property lets each instance override a text value independently.",
    {
      nodeId: z.string().describe("The ID of the component node to add the property to"),
      propertyName: z.string().describe("Display name for the property (e.g., 'Button Label', 'Show Icon')"),
      type: z.enum(["TEXT", "BOOLEAN", "INSTANCE_SWAP", "VARIANT"]).describe("The type of component property"),
      defaultValue: z.union([z.string(), z.boolean()]).optional().describe("Default value for the property. String for TEXT/VARIANT/INSTANCE_SWAP, boolean for BOOLEAN."),
    },
    async ({ nodeId, propertyName, type, defaultValue }) => {
      try {
        const result = await sendCommandToFigma("add_component_property", {
          nodeId,
          propertyName,
          type,
          defaultValue,
        });
        const typedResult = result as any;
        return {
          content: [
            {
              type: "text",
              text: `Added "${propertyName}" (${type}) property to component "${typedResult.name}" (ID: ${typedResult.id}). Property key: ${typedResult.propertyKey}. Use this key with set_component_property to set values on instances.`,
            }
          ]
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error adding component property: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Get Component Properties Tool
  server.tool(
    "get_component_properties",
    "Get the component property definitions from a component, or the current property values from an instance. Useful for inspecting what properties are available before setting them.",
    {
      nodeId: z.string().describe("The ID of the component or instance node"),
    },
    async ({ nodeId }) => {
      try {
        const result = await sendCommandToFigma("get_component_properties", {
          nodeId,
        });
        const typedResult = result as any;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(typedResult, null, 2),
            }
          ]
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting component properties: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Component Property on Instance Tool
  server.tool(
    "set_component_property",
    "Set component property values on an instance. Use get_component_properties first to discover the property keys, then pass them here with new values.",
    {
      nodeId: z.string().describe("The ID of the instance node"),
      properties: z.record(z.union([z.string(), z.boolean()])).describe("Object mapping property keys to new values. Keys come from get_component_properties (e.g., 'ClientName#1234:0')."),
    },
    async ({ nodeId, properties }) => {
      try {
        const result = await sendCommandToFigma("set_component_property", {
          nodeId,
          properties,
        });
        const typedResult = result as any;
        return {
          content: [
            {
              type: "text",
              text: `Updated properties on instance "${typedResult.name}" (ID: ${typedResult.id}). Current properties: ${JSON.stringify(typedResult.componentProperties)}`,
            }
          ]
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting component property: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Link Component Property to Text Node Tool
  server.tool(
    "link_component_property",
    "Link a component property to a child text node, so the text node's content is controlled by the property. Use add_component_property first to create the property and get its key, then use this to bind it to a specific text node.",
    {
      nodeId: z.string().describe("The ID of the component node"),
      textNodeId: z.string().describe("The ID of the child text node to link"),
      propertyKey: z.string().describe("The property key returned by add_component_property (e.g., 'ClientName#1234:0')"),
    },
    async ({ nodeId, textNodeId, propertyKey }) => {
      try {
        const result = await sendCommandToFigma("link_component_property", {
          nodeId,
          textNodeId,
          propertyKey,
        });
        const typedResult = result as any;
        return {
          content: [
            {
              type: "text",
              text: `Linked property "${typedResult.linkedPropertyKey}" to text node "${typedResult.textNodeName}" (ID: ${typedResult.textNodeId}) in component "${typedResult.componentName}". The text node's content is now controlled by this component property.`,
            }
          ]
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error linking component property: ${error instanceof Error ? error.message : String(error)}`,
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
      properties: z.record(z.string()).describe("Variant properties to set as key-value pairs (e.g., { \"State\": \"Hover\", \"Size\": \"Large\" })"),
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
}