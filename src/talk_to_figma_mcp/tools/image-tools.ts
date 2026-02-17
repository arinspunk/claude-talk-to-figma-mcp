import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma } from "../utils/websocket";
import fs from "fs";
import path from "path";
import os from "os";

/**
 * Register image manipulation tools to the MCP server
 * This module contains tools for setting, replacing, and transforming images on nodes
 * @param server - The MCP server instance
 */
export function registerImageTools(server: McpServer): void {
  // Set Image Fill Tool
  server.tool(
    "set_image_fill",
    "Apply image to node from URL or base64 data",
    {
      nodeId: z.string().describe("The ID of the node to apply image to"),
      imageSource: z.string().describe("Image URL or base64 data string"),
      sourceType: z.enum(["url", "base64"]).describe("Source type: 'url' for image URL, 'base64' for base64 encoded data"),
      scaleMode: z.enum(["FILL", "FIT", "CROP", "TILE"]).optional().describe("Image scaling mode (default: FILL)"),
    },
    async ({ nodeId, imageSource, sourceType, scaleMode }) => {
      try {
        const result = await sendCommandToFigma("set_image_fill", {
          nodeId,
          imageSource,
          sourceType,
          scaleMode: scaleMode || "FILL",
        }, 60000); // 60 second timeout for image upload

        const typedResult = result as { name: string; scaleMode: string };
        return {
          content: [
            {
              type: "text",
              text: `Set image fill on node "${typedResult.name}" with scaleMode: ${typedResult.scaleMode}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting image fill: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Get Image from Node Tool
  server.tool(
    "get_image_from_node",
    "Extract image metadata from a node",
    {
      nodeId: z.string().describe("The ID of the node to get image from"),
    },
    async ({ nodeId }) => {
      try {
        const result = await sendCommandToFigma("get_image_from_node", { nodeId });
        const typedResult = result as {
          name: string;
          hasImage: boolean;
          imageHash?: string;
          scaleMode?: string;
          imageSize?: { width: number; height: number };
          rotation?: number;
          filters?: Record<string, number> | null;
        };

        if (!typedResult.hasImage) {
          return {
            content: [
              {
                type: "text",
                text: `Node "${typedResult.name}" does not have an image fill`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `Image on node "${typedResult.name}":\n- Hash: ${typedResult.imageHash}\n- Scale Mode: ${typedResult.scaleMode}\n- Image Size: ${typedResult.imageSize?.width}x${typedResult.imageSize?.height}\n- Rotation: ${typedResult.rotation}°\n- Filters: ${typedResult.filters ? JSON.stringify(typedResult.filters) : 'none'}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting image from node: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Replace Image Fill Tool
  server.tool(
    "replace_image_fill",
    "Replace existing image on node with new image while preserving transform",
    {
      nodeId: z.string().describe("The ID of the node with image to replace"),
      newImageSource: z.string().describe("New image URL or base64 data"),
      sourceType: z.enum(["url", "base64"]).describe("Source type: 'url' or 'base64'"),
      preserveTransform: z.boolean().optional().describe("Preserve existing image transform (default: true)"),
    },
    async ({ nodeId, newImageSource, sourceType, preserveTransform }) => {
      try {
        const result = await sendCommandToFigma("replace_image_fill", {
          nodeId,
          newImageSource,
          sourceType,
          preserveTransform: preserveTransform !== false,
        }, 60000); // 60 second timeout

        const typedResult = result as { name: string; preserved: boolean };
        return {
          content: [
            {
              type: "text",
              text: `Replaced image on node "${typedResult.name}"${typedResult.preserved ? " (transform preserved)" : ""}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error replacing image fill: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // COMMENTED OUT: get_image_bytes - Issues pending investigation
  // Known issues: 400 errors, inconsistent behavior (black images), file save path needs discussion
  /*
  server.tool(
    "get_image_bytes",
    "Download image from Figma and save to local file",
    {
      imageHash: z.string().optional().describe("Image hash to download"),
      nodeId: z.string().optional().describe("Node ID to get image from (alternative to imageHash)"),
    },
    async ({ imageHash, nodeId }) => {
      try {
        if (!imageHash && !nodeId) {
          throw new Error("Either imageHash or nodeId must be provided");
        }

        const result = await sendCommandToFigma("get_image_bytes", {
          imageHash,
          nodeId,
        }, 120000); // 120 second timeout for download

        const typedResult = result as {
          imageData: string;
          mimeType: string;
          size: number;
        };

        const imageBuffer = Buffer.from(typedResult.imageData, "base64");
        const ext = typedResult.mimeType === "image/png" ? "png" : "jpg";
        const hashOrId = imageHash?.substring(0, 8) || nodeId?.replace(/:/g, "-") || "unknown";
        const filename = `figma-${hashOrId}-${Date.now()}.${ext}`;
        const filepath = path.join(os.tmpdir(), filename);

        fs.writeFileSync(filepath, imageBuffer);

        return {
          content: [
            {
              type: "text",
              text: `Image saved successfully!\n\nFile: ${filepath}\nSize: ${typedResult.size} bytes\nMIME: ${typedResult.mimeType}\n\nUse Read tool to view the image.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting image bytes: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
  */

  // Apply Image Transform Tool
  server.tool(
    "apply_image_transform",
    "Adjust image position, scale, and rotation within node. Rotates the IMAGE inside the node, not the node itself.",
    {
      nodeId: z.string().describe("The ID of the node to transform image on"),
      scaleMode: z.enum(["FILL", "FIT", "CROP", "TILE"]).optional().describe("Change scale mode"),
      rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).optional().describe("Rotation in 90-degree increments (0, 90, 180, 270). Rotates the IMAGE inside the node, not the node itself."),
      translateX: z.number().optional().describe("Horizontal translation offset"),
      translateY: z.number().optional().describe("Vertical translation offset"),
      scale: z.number().positive().optional().describe("Scale factor (1 = 100%)"),
    },
    async ({ nodeId, scaleMode, rotation, translateX, translateY, scale }) => {
      try {
        const result = await sendCommandToFigma("apply_image_transform", {
          nodeId,
          scaleMode,
          rotation,
          translateX,
          translateY,
          scale,
        });

        const typedResult = result as { name: string; transformApplied: string[] };
        return {
          content: [
            {
              type: "text",
              text: `Applied image transform to node "${typedResult.name}": ${typedResult.transformApplied.join(", ")}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error applying image transform: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Set Image Filters Tool
  server.tool(
    "set_image_filters",
    "Apply color and light adjustments to image fills",
    {
      nodeId: z.string().describe("The ID of the node with image fill"),
      exposure: z.number().min(-1).max(1).optional().describe("Brightness adjustment (-1.0 to 1.0)"),
      contrast: z.number().min(-1).max(1).optional().describe("Contrast adjustment (-1.0 to 1.0)"),
      saturation: z.number().min(-1).max(1).optional().describe("Color intensity (-1.0 to 1.0, -1 = grayscale)"),
      temperature: z.number().min(-1).max(1).optional().describe("Warm/cool tint (-1.0 to 1.0)"),
      tint: z.number().min(-1).max(1).optional().describe("Green/magenta shift (-1.0 to 1.0)"),
      highlights: z.number().min(-1).max(1).optional().describe("Bright area adjustment (-1.0 to 1.0)"),
      shadows: z.number().min(-1).max(1).optional().describe("Dark area adjustment (-1.0 to 1.0)"),
    },
    async ({ nodeId, exposure, contrast, saturation, temperature, tint, highlights, shadows }) => {
      try {
        const filters: Record<string, number> = {};
        if (exposure !== undefined) filters.exposure = exposure;
        if (contrast !== undefined) filters.contrast = contrast;
        if (saturation !== undefined) filters.saturation = saturation;
        if (temperature !== undefined) filters.temperature = temperature;
        if (tint !== undefined) filters.tint = tint;
        if (highlights !== undefined) filters.highlights = highlights;
        if (shadows !== undefined) filters.shadows = shadows;

        const result = await sendCommandToFigma("set_image_filters", {
          nodeId,
          filters,
        });

        const typedResult = result as { name: string; appliedFilters: Record<string, number> };
        return {
          content: [
            {
              type: "text",
              text: `Applied image filters to node "${typedResult.name}": ${JSON.stringify(typedResult.appliedFilters)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting image filters: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}
