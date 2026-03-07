import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma } from "../utils/websocket";

const TriggerSchema = z.enum([
  "ON_CLICK",
  "ON_DRAG",
  "ON_HOVER",
  "ON_PRESS",
  "MOUSE_ENTER",
  "MOUSE_LEAVE",
  "MOUSE_UP",
  "MOUSE_DOWN",
  "AFTER_TIMEOUT",
]).describe("The trigger type for the interaction");

const NavigationTypeSchema = z.enum([
  "NAVIGATE",
  "OVERLAY",
  "SWAP",
  "SCROLL_TO",
  "CHANGE_TO",
]).describe("The navigation type");

const TransitionTypeSchema = z.enum([
  "DISSOLVE",
  "SMART_ANIMATE",
  "MOVE_IN",
  "MOVE_OUT",
  "PUSH",
  "SLIDE_IN",
  "SLIDE_OUT",
]).describe("The transition animation type");

const EasingTypeSchema = z.enum([
  "LINEAR",
  "EASE_IN",
  "EASE_OUT",
  "EASE_IN_AND_OUT",
  "EASE_IN_BACK",
  "EASE_OUT_BACK",
  "EASE_IN_AND_OUT_BACK",
  "CUSTOM_BEZIER",
]).describe("The easing type for the transition");

const TransitionSchema = z.object({
  type: TransitionTypeSchema,
  duration: z.number().min(0).optional().describe("Duration in milliseconds (default: 300)"),
  easing: EasingTypeSchema.optional().describe("Easing type (default: EASE_IN_AND_OUT)"),
}).optional().describe("Transition animation settings");

/**
 * Register prototyping tools to the MCP server
 * This module contains tools for managing prototype interactions and flows in Figma
 * @param server - The MCP server instance
 */
export function registerPrototypingTools(server: McpServer): void {
  // Get Reactions Tool
  server.tool(
    "get_reactions",
    "Get all prototyping reactions (interactions) on a node in Figma",
    {
      nodeId: z.string().describe("The ID of the node to get reactions from"),
    },
    async ({ nodeId }) => {
      try {
        const result = await sendCommandToFigma("get_reactions", { nodeId });
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
              text: `Error getting reactions: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Add Reaction Tool
  server.tool(
    "add_reaction",
    "Add a prototyping interaction (reaction) to a node in Figma. Creates links between frames/nodes for prototype navigation.",
    {
      nodeId: z.string().describe("The ID of the node to add the reaction to (the trigger node)"),
      trigger: TriggerSchema,
      triggerTimeout: z.number().min(0).optional().describe("Timeout in milliseconds (only for AFTER_TIMEOUT trigger)"),
      navigationType: NavigationTypeSchema,
      destinationId: z.string().optional().describe("The ID of the destination node to navigate to"),
      transition: TransitionSchema,
      overlayRelativePosition: z.object({
        x: z.number(),
        y: z.number(),
      }).optional().describe("Position offset for overlay (only for OVERLAY navigation type)"),
      resetScrollPosition: z.boolean().optional().describe("Whether to reset scroll position on navigate (default: false)"),
      resetInteractions: z.boolean().optional().describe("Whether to reset interactions on navigate (default: false)"),
      resetVideoPosition: z.boolean().optional().describe("Whether to reset video position on navigate (default: false)"),
    },
    async ({ nodeId, trigger, triggerTimeout, navigationType, destinationId, transition, overlayRelativePosition, resetScrollPosition, resetInteractions, resetVideoPosition }) => {
      try {
        const result = await sendCommandToFigma("add_reaction", {
          nodeId,
          trigger,
          triggerTimeout,
          navigationType,
          destinationId,
          transition,
          overlayRelativePosition,
          resetScrollPosition,
          resetInteractions,
          resetVideoPosition,
        });
        return {
          content: [
            {
              type: "text",
              text: `Added ${trigger} → ${navigationType} reaction to node. ${JSON.stringify(result)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error adding reaction: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Add Back/Close Reaction Tool
  server.tool(
    "add_back_reaction",
    "Add a 'navigate back' or 'close overlay' prototyping interaction to a node",
    {
      nodeId: z.string().describe("The ID of the node to add the reaction to"),
      trigger: TriggerSchema,
      actionType: z.enum(["BACK", "CLOSE"]).describe("BACK to go back, CLOSE to close overlay"),
      transition: TransitionSchema,
    },
    async ({ nodeId, trigger, actionType, transition }) => {
      try {
        const result = await sendCommandToFigma("add_back_reaction", {
          nodeId,
          trigger,
          actionType,
          transition,
        });
        return {
          content: [
            {
              type: "text",
              text: `Added ${trigger} → ${actionType} reaction to node. ${JSON.stringify(result)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error adding back/close reaction: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Add URL Reaction Tool
  server.tool(
    "add_url_reaction",
    "Add a prototyping interaction that opens a URL",
    {
      nodeId: z.string().describe("The ID of the node to add the reaction to"),
      trigger: TriggerSchema,
      url: z.string().describe("The URL to open"),
    },
    async ({ nodeId, trigger, url }) => {
      try {
        const result = await sendCommandToFigma("add_url_reaction", {
          nodeId,
          trigger,
          url,
        });
        return {
          content: [
            {
              type: "text",
              text: `Added ${trigger} → Open URL reaction to node. ${JSON.stringify(result)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error adding URL reaction: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Remove Reactions Tool
  server.tool(
    "remove_reactions",
    "Remove prototyping reactions from a node. Can remove all reactions or a specific one by index.",
    {
      nodeId: z.string().describe("The ID of the node to remove reactions from"),
      reactionIndex: z.number().int().min(0).optional().describe("Index of the specific reaction to remove. Omit to remove all reactions."),
    },
    async ({ nodeId, reactionIndex }) => {
      try {
        const result = await sendCommandToFigma("remove_reactions", {
          nodeId,
          reactionIndex,
        });
        return {
          content: [
            {
              type: "text",
              text: `Removed reactions from node. ${JSON.stringify(result)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error removing reactions: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Get Flow Starting Points Tool
  server.tool(
    "get_flow_starting_points",
    "Get all prototype flow starting points on the current page",
    {},
    async () => {
      try {
        const result = await sendCommandToFigma("get_flow_starting_points", {});
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
              text: `Error getting flow starting points: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Flow Starting Point Tool
  server.tool(
    "set_flow_starting_point",
    "Set or remove a node as a prototype flow starting point",
    {
      nodeId: z.string().describe("The ID of the node (must be a top-level frame)"),
      name: z.string().optional().describe("Name for the flow starting point. Omit or set empty to remove as starting point."),
    },
    async ({ nodeId, name }) => {
      try {
        const result = await sendCommandToFigma("set_flow_starting_point", {
          nodeId,
          name,
        });
        return {
          content: [
            {
              type: "text",
              text: name
                ? `Set node as flow starting point "${name}". ${JSON.stringify(result)}`
                : `Removed flow starting point. ${JSON.stringify(result)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting flow starting point: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Prototype Device Tool
  server.tool(
    "set_prototype_device",
    "Set the prototype device settings for the current page (device frame shown in prototype presentation)",
    {
      deviceType: z.enum([
        "NONE",
        "PRESET",
      ]).describe("NONE for no device, PRESET for a specific device"),
      presetIdentifier: z.string().optional().describe("Device preset identifier (e.g., 'APPLE_IPHONE_16', 'APPLE_IPHONE_16_PRO', 'ANDROID_SMALL', 'APPLE_IPAD_MINI_8_3'). Required when deviceType is PRESET."),
      rotation: z.enum(["NONE", "CCW_90"]).optional().describe("Device rotation (default: NONE)"),
    },
    async ({ deviceType, presetIdentifier, rotation }) => {
      try {
        const result = await sendCommandToFigma("set_prototype_device", {
          deviceType,
          presetIdentifier,
          rotation,
        });
        return {
          content: [
            {
              type: "text",
              text: `Set prototype device settings. ${JSON.stringify(result)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting prototype device: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Prototype Start Node Tool
  server.tool(
    "set_prototype_start_node",
    "Set the starting node for prototype presentation on the current page",
    {
      nodeId: z.string().optional().describe("The ID of the node to set as the prototype start. Omit to clear the start node."),
    },
    async ({ nodeId }) => {
      try {
        const result = await sendCommandToFigma("set_prototype_start_node", {
          nodeId,
        });
        return {
          content: [
            {
              type: "text",
              text: nodeId
                ? `Set prototype start node. ${JSON.stringify(result)}`
                : `Cleared prototype start node. ${JSON.stringify(result)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting prototype start node: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}
