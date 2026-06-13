import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma } from "../utils/websocket";
import { coerceBoolean } from "../utils/schema-helpers";
import { parseCommandResult, CommandResult } from "../utils/command-results";
import fs from "fs";
import path from "path";

// Content-addressed cache for image-fill bytes: Figma image hashes are content
// hashes, so a hit can never be stale. Saves a plugin round-trip (and a multi-MB
// base64 transfer) every time the same image is re-extracted in a
// render→compare→fix loop. Insertion order doubles as LRU order.
const assetCacheByHash = new Map<string, CommandResult<"get_asset">>();
const ASSET_CACHE_MAX_BYTES = 64 * 1024 * 1024;
let assetCacheBytes = 0;

function cacheAsset(hash: string, asset: CommandResult<"get_asset">): void {
  if (asset.dataBase64.length > ASSET_CACHE_MAX_BYTES) return;
  assetCacheByHash.set(hash, asset);
  assetCacheBytes += asset.dataBase64.length;
  for (const [key, value] of assetCacheByHash) {
    if (assetCacheBytes <= ASSET_CACHE_MAX_BYTES) break;
    assetCacheByHash.delete(key);
    assetCacheBytes -= value.dataBase64.length;
  }
}

/**
 * Register image manipulation tools to the MCP server
 * This module contains tools for setting, replacing, and transforming images on nodes
 * @param server - The MCP server instance
 */
export function registerImageTools(server: McpServer): void {
  // Visual Snapshot Tool — multimodal "eyes" on the canvas
  server.registerTool(
    "get_visual_snapshot",
    {
      description: "Capture a PNG image of the current Figma selection (or a specific node) so you can SEE the rendered result — layout, spacing, alignment, fonts, and colors. Use this to verify your work after creating or editing nodes: render, look, and correct any placement drift or font mismatch before telling the user you're done. Defaults to the current selection at 2x scale; no nodeId needed.",
      inputSchema: {
      nodeId: z
        .string()
        .optional()
        .describe("Node to snapshot. Omit to snapshot the current Figma selection."),
      scale: z.coerce
        .number()
        .positive()
        .optional()
        .describe("Render scale (default 2 for crisp detail). Auto-reduced if the result would exceed maxDimension."),
      maxDimension: z.coerce
        .number()
        .positive()
        .optional()
        .describe("Cap on the longest output side in px (default 2000). Keeps very large frames fast and reviewable."),
    },
      annotations: { readOnlyHint: true },
    },
    async ({ nodeId, scale, maxDimension }) => {
      try {
        const result = await sendCommandToFigma(
          "get_visual_snapshot",
          { nodeId, scale: scale ?? 2, maxDimension: maxDimension ?? 2000 },
          120000 // 120s: large frames can take a while to rasterize
        );
        const typed = parseCommandResult("get_visual_snapshot", result);

        const box = typed.absoluteBoundingBox;
        const lines = [
          `Snapshot of "${typed.name}" (${typed.type}, id ${typed.nodeId}) @${typed.scale.toFixed(2)}x`,
          `Logical size: ${Math.round(typed.width)}×${Math.round(typed.height)} px`,
          box
            ? `Absolute position: x=${Math.round(box.x)}, y=${Math.round(box.y)} (canvas coordinates)`
            : `Absolute position: unavailable for this node type`,
        ];
        if (typed.capped) {
          lines.push(
            `Note: scale auto-reduced from ${typed.requestedScale}x to fit within the ${maxDimension ?? 2000}px cap (large frame).`
          );
        }
        if (typed.selectionCount > 1) {
          lines.push(
            `Note: ${typed.selectionCount} nodes were selected — snapshot shows the first. Pass an explicit nodeId to target a specific one.`
          );
        }

        return {
          content: [
            {
              type: "image",
              data: typed.imageData,
              mimeType: typed.mimeType || "image/png",
            },
            {
              type: "text",
              text: lines.join("\n"),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error capturing visual snapshot: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Set Image Fill Tool
  server.registerTool(
    "set_image_fill",
    {
      description: "Apply image to node from URL or base64 data",
      inputSchema: {
      nodeId: z.string().describe("The ID of the node to apply image to"),
      imageSource: z.string().describe("Image URL or base64 data string"),
      sourceType: z.enum(["url", "base64"]).describe("Source type: 'url' for image URL, 'base64' for base64 encoded data"),
      scaleMode: z.enum(["FILL", "FIT", "CROP", "TILE"]).optional().describe("Image scaling mode (default: FILL)"),
    },
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
        return { content: [{ type: "text", text: `Error setting image fill: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // Get Image from Node Tool
  server.registerTool(
    "get_image_from_node",
    {
      description: "Extract image metadata from a node",
      inputSchema: {
      nodeId: z.string().describe("The ID of the node to get image from"),
    },
      annotations: { readOnlyHint: true },
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
          isError: true,
        };
      }
    }
  );

  // Replace Image Fill Tool
  server.registerTool(
    "replace_image_fill",
    {
      description: "Replace existing image on node with new image while preserving transform",
      inputSchema: {
      nodeId: z.string().describe("The ID of the node with image to replace"),
      newImageSource: z.string().describe("New image URL or base64 data"),
      sourceType: z.enum(["url", "base64"]).describe("Source type: 'url' or 'base64'"),
      preserveTransform: z.boolean().optional().describe("Preserve existing image transform (default: true)"),
    },
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
        return { content: [{ type: "text", text: `Error replacing image fill: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // (get_image_bytes was removed — superseded by get_asset, which reliably
  //  extracts image-fill bytes by hash and writes them to disk.)

  // Apply Image Transform Tool
  server.registerTool(
    "apply_image_transform",
    {
      description: "Adjust image position, scale, and rotation within node. Rotates the IMAGE inside the node, not the node itself.",
      inputSchema: {
      nodeId: z.string().describe("The ID of the node to transform image on"),
      scaleMode: z.enum(["FILL", "FIT", "CROP", "TILE"]).optional().describe("Change scale mode"),
      rotation: z.coerce.number().optional().describe("Rotation in 90-degree increments (0, 90, 180, 270). Rotates the IMAGE inside the node, not the node itself."),
      translateX: z.coerce.number().optional().describe("Horizontal translation offset"),
      translateY: z.coerce.number().optional().describe("Vertical translation offset"),
      scale: z.coerce.number().positive().optional().describe("Scale factor (1 = 100%)"),
    },
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
        return { content: [{ type: "text", text: `Error applying image transform: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // Set Image Filters Tool
  server.registerTool(
    "set_image_filters",
    {
      description: "Apply color and light adjustments to image fills",
      inputSchema: {
      nodeId: z.string().describe("The ID of the node with image fill"),
      exposure: z.number().min(-1).max(1).optional().describe("Brightness adjustment (-1.0 to 1.0)"),
      contrast: z.number().min(-1).max(1).optional().describe("Contrast adjustment (-1.0 to 1.0)"),
      saturation: z.number().min(-1).max(1).optional().describe("Color intensity (-1.0 to 1.0, -1 = grayscale)"),
      temperature: z.number().min(-1).max(1).optional().describe("Warm/cool tint (-1.0 to 1.0)"),
      tint: z.number().min(-1).max(1).optional().describe("Green/magenta shift (-1.0 to 1.0)"),
      highlights: z.number().min(-1).max(1).optional().describe("Bright area adjustment (-1.0 to 1.0)"),
      shadows: z.number().min(-1).max(1).optional().describe("Dark area adjustment (-1.0 to 1.0)"),
    },
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
        return { content: [{ type: "text", text: `Error setting image filters: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // Scan Assets Tool — inventory images + vector/icon nodes in a subtree
  server.registerTool(
    "scan_assets",
    {
      description: "Inventory all extractable assets within a node's subtree: image fills (deduped by hash, with dimensions, byte size, suggested filename, and which nodes use them) and vector/icon nodes. Lightweight (no raw bytes) — use it to decide what to pull, then call get_asset for each. Defaults to the current selection.",
      inputSchema: {
      nodeId: z.string().optional().describe("Subtree root to scan. Omit to use the current selection."),
      includeImages: coerceBoolean.optional().describe("Include image fills (default true)."),
      includeVectors: coerceBoolean.optional().describe("Include vector/icon nodes (default true)."),
      includeByteSizes: coerceBoolean.optional().describe("Also report each image's byte size (default false — fetches full image bytes, slow on image-heavy files)."),
    },
      annotations: { readOnlyHint: true },
    },
    async ({ nodeId, includeImages, includeVectors, includeByteSizes }) => {
      try {
        const result = await sendCommandToFigma(
          "scan_assets",
          {
            nodeId,
            includeImages: includeImages ?? true,
            includeVectors: includeVectors ?? true,
            includeByteSizes: includeByteSizes ?? false,
          },
          60000
        );
        const typed = parseCommandResult("scan_assets", result);

        const lines: string[] = [
          `Assets in ${typed.root}: ${typed.imageCount} image(s), ${typed.vectorCount} vector/icon(s).`,
        ];
        if (typed.images.length) {
          lines.push("", "IMAGES (fetch with get_asset { hash }):");
          for (const im of typed.images) {
            const dim = im.width && im.height ? `${im.width}×${im.height}` : "?";
            const kb = im.bytes ? `${Math.round(im.bytes / 1024)}KB` : "?";
            lines.push(`  • ${im.suggestedName}  [${dim}, ${kb}]  hash=${im.hash}  scaleMode=${im.scaleMode ?? "?"}  usedBy=${im.usedBy.map((u) => u.name).join(", ")}`);
          }
        }
        if (typed.vectors.length) {
          lines.push("", "VECTORS/ICONS (fetch with get_asset { nodeId }, default SVG):");
          for (const v of typed.vectors) {
            lines.push(`  • ${v.suggestedName}  [${v.type}, ${v.width}×${v.height}]  nodeId=${v.nodeId}`);
          }
        }

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error scanning assets: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Get Asset Tool — fetch one asset's bytes and write it to a file
  server.registerTool(
    "get_asset",
    {
      description: "Extract a single asset to a local file so you can use it in code. Provide either 'hash' (an image fill from scan_assets) to save the original image bytes, or 'nodeId' to export a node (default SVG for icons/vectors; or PNG/JPG via format). Writes the file to disk and returns its path — raw bytes don't enter the conversation. SVG content is also returned inline so you can embed icons directly.",
      inputSchema: {
      hash: z.string().optional().describe("Image fill hash from scan_assets (extracts original image bytes)."),
      nodeId: z.string().optional().describe("Node to export (alternative to hash)."),
      format: z.enum(["SVG", "PNG", "JPG"]).optional().describe("Export format when using nodeId (default SVG)."),
      scale: z.coerce.number().positive().optional().describe("Scale for raster (PNG/JPG) node exports (default 2)."),
      outDir: z.string().optional().describe("Directory to write the asset into (default: ./figma-assets under the server's working directory)."),
      filename: z.string().optional().describe("Override the output filename (extension is set automatically from the asset type)."),
    },
    },
    async ({ hash, nodeId, format, scale, outDir, filename }) => {
      try {
        if (!hash && !nodeId) {
          throw new Error("Provide either 'hash' (image fill) or 'nodeId' (node to export).");
        }

        // Image-fill bytes are content-addressed by hash → serve repeats from
        // cache without a plugin round-trip. Node exports are never cached
        // (node content changes between calls).
        let typed: CommandResult<"get_asset">;
        const cached = hash ? assetCacheByHash.get(hash) : undefined;
        if (hash && cached) {
          assetCacheByHash.delete(hash); // LRU touch: re-insert as most recent
          assetCacheByHash.set(hash, cached);
          typed = cached;
        } else {
          const result = await sendCommandToFigma(
            "get_asset",
            { hash, nodeId, format: format || "SVG", scale: scale ?? 2 },
            120000
          );
          typed = parseCommandResult("get_asset", result);
          if (hash) cacheAsset(hash, typed);
        }

        const buffer = Buffer.from(typed.dataBase64, "base64");
        const extByMime: Record<string, string> = {
          "image/png": "png",
          "image/jpeg": "jpg",
          "image/gif": "gif",
          "image/webp": "webp",
          "image/svg+xml": "svg",
        };
        const ext = extByMime[typed.mimeType] || "bin";

        // basename() keeps a model-supplied filename from escaping outDir via "../"
        const baseName =
          (filename && path.basename(filename).replace(/\.[^.]+$/, "")) ||
          (typed.name && typed.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40)) ||
          (hash ? `image-${hash.slice(0, 8)}` : `asset-${Date.now()}`);

        const dir = outDir || path.join(process.cwd(), "figma-assets");
        fs.mkdirSync(dir, { recursive: true });
        const filepath = path.join(dir, `${baseName}.${ext}`);
        fs.writeFileSync(filepath, buffer);

        const lines = [
          `Saved ${typed.kind} asset → ${filepath}${cached ? " (from cache — no plugin round-trip)" : ""}`,
          `Type: ${typed.mimeType} | Size: ${typed.bytesLength} bytes`,
        ];
        if (typed.kind === "svg") {
          const svgText = buffer.toString("utf8");
          lines.push("", "Inline SVG:", svgText);
        }

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting asset: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
