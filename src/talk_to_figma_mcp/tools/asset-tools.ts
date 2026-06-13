import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma } from "../utils/websocket";
import { coerceBoolean } from "../utils/schema-helpers";
import { effectsToCss } from "../utils/effects-css";
import { classifyAsset } from "../utils/asset-classify";
import { parseCommandResult } from "../utils/command-results";
import fs from "fs";
import path from "path";

/**
 * Asset-extraction tooling that goes beyond "dump the node":
 *
 *  - extract_asset  — exports a node CLEAN (effects stripped) at the same
 *    resolution and hands back the effects translated to CSS, so shadows/blurs
 *    and export-hostile effects (NOISE/TEXTURE that blank a node in the browser)
 *    are reproduced in code over a crisp asset instead of baked in.
 *
 *  - classify_asset — inspects a node's subtree and recommends raster PNG vs
 *    inline SVG vs pure CSS, with reasons, so you don't guess (and don't ship a
 *    100KB SVG of an embedded photo, or a blurry PNG of a one-line divider).
 */
export function registerAssetTools(server: McpServer): void {
  server.registerTool(
    "extract_asset",
    {
      description: "Export a Figma node as a CLEAN asset (effects temporarily stripped) at the same resolution, and get its effects back as ready-to-use CSS. Use this when a node has a drop shadow/blur (so the export isn't bloated by bleed and misaligned) or an effect that doesn't survive export (NOISE/TEXTURE blank the node in a browser): you get a crisp PNG/SVG plus the box-shadow/filter to reapply in code. Writes the asset to disk and returns its path; raw bytes never enter the conversation.",
      inputSchema: {
      nodeId: z.string().describe("The node to export."),
      format: z.enum(["PNG", "SVG", "JPG"]).optional().describe("Export format (default PNG). Use SVG only for clean vector art — see classify_asset."),
      scale: z.coerce.number().positive().optional().describe("Raster scale for PNG/JPG (default 2)."),
      stripScope: z.enum(["all", "root", "none"]).optional().describe("Which effects to disable before export: 'all' (default — every effect in the subtree, for a fully clean asset), 'root' (only the exported node's own effects), or 'none'."),
      effectScale: z.coerce.number().positive().optional().describe("Multiplier applied to the CSS effect lengths (default 1 = design px). Set if your CSS units differ from Figma px."),
      outDir: z.string().optional().describe("Directory to write the asset into (default: ./figma-assets)."),
      filename: z.string().optional().describe("Override the output filename (extension set automatically)."),
    },
    },
    async ({ nodeId, format, scale, stripScope, effectScale, outDir, filename }) => {
      try {
        const result = await sendCommandToFigma(
          "extract_asset",
          { nodeId, format: (format || "PNG").toUpperCase(), scale: scale ?? 2, stripScope: stripScope || "all" },
          120000
        );
        const typed = parseCommandResult("extract_asset", result);

        // Write the clean asset to disk.
        const buffer = Buffer.from(typed.dataBase64, "base64");
        const extByMime: Record<string, string> = {
          "image/png": "png", "image/jpeg": "jpg", "image/svg+xml": "svg",
        };
        const ext = extByMime[typed.mimeType] || "bin";
        // basename() keeps a model-supplied filename from escaping outDir via "../"
        const baseName =
          (filename && path.basename(filename).replace(/\.[^.]+$/, "")) ||
          (typed.name && typed.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40)) ||
          `asset-${Date.now()}`;
        const dir = outDir || path.join(process.cwd(), "figma-assets");
        fs.mkdirSync(dir, { recursive: true });
        const filepath = path.join(dir, `${baseName}.${ext}`);
        fs.writeFileSync(filepath, buffer);

        // Translate the root node's effects to CSS (these wrap the whole asset).
        const css = effectsToCss(typed.rootEffects, effectScale ?? 1);

        const lines: string[] = [
          `Saved clean ${typed.kind} asset → ${filepath}`,
          `Type: ${typed.mimeType} | Size: ${typed.bytesLength} bytes | Effects stripped before export: ${typed.strippedCount}`,
        ];

        // Bleed: how far the effect extends past the layout box (helps positioning).
        if (typed.box && typed.renderBounds) {
          const dx = Math.round(typed.box.x - typed.renderBounds.x);
          const dy = Math.round(typed.box.y - typed.renderBounds.y);
          const dw = Math.round(typed.renderBounds.width - typed.box.width);
          const dh = Math.round(typed.renderBounds.height - typed.box.height);
          if (dw > 1 || dh > 1) {
            lines.push(`Effect bleed past layout box: left/top ≈ ${dx}/${dy}px, extra size ≈ ${dw}×${dh}px (the clean asset is the layout box, not the bleed).`);
          }
        }

        if (!typed.rootEffects || typed.rootEffects.length === 0) {
          lines.push("", "No effects on the node — the asset is the design as-is.");
        } else {
          lines.push("", "Reapply these effects in CSS over the clean asset:");
          if (css.boxShadow) lines.push(`  box-shadow: ${css.boxShadow};`);
          if (css.filter) lines.push(`  filter: ${css.filter};`);
          if (css.backdropFilter) lines.push(`  backdrop-filter: ${css.backdropFilter};`);
          for (const e of css.perEffect) {
            if (e.note) lines.push(`  • ${e.type}: ${e.reproducible ? e.css || "(see above)" : "NOT reproducible"} — ${e.note}`);
          }
          if (css.unsupported.length) {
            lines.push(`  ⚠ Unsupported in CSS: ${[...new Set(css.unsupported)].join(", ")}. These were stripped so the export is clean; if they're visually essential, keep a raster that bakes them instead.`);
          }
        }

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error extracting asset: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "classify_asset",
    {
      description: "Inspect a Figma node's subtree and recommend how to bring it into code: a raster PNG, an inline SVG, or pure CSS — with reasons. Catches the common mistakes: shipping an SVG that embeds a photo, rasterizing a one-line divider, or trying to SVG-export a node with NOISE/blend/mask that won't survive. Run it before extracting an asset when you're unsure.",
      inputSchema: {
      nodeId: z.string().optional().describe("Node to classify. Omit to use the current selection."),
      includeSignals: coerceBoolean.optional().describe("Include the raw detected signals in the output (default false)."),
    },
    },
    async ({ nodeId, includeSignals }) => {
      try {
        const signals = parseCommandResult("classify_asset", await sendCommandToFigma("classify_asset", { nodeId }, 60000));
        const r = classifyAsset(signals);

        const lines: string[] = [
          `Asset "${signals.name}" (${signals.type}, ${signals.nodeId}, ${Math.round(signals.width)}×${Math.round(signals.height)})`,
          `Recommendation: ${r.recommendation.toUpperCase()}  (confidence ${(r.confidence * 100).toFixed(0)}%)${r.alternative ? `   alternative: ${r.alternative}` : ""}`,
          "Why:",
          ...r.reasons.map((x) => `  • ${x}`),
        ];
        if (includeSignals) {
          lines.push(
            "",
            "Signals:",
            `  nodes=${signals.nodeCount} vectors=${signals.vectorCount} text=${signals.textCount} imageFills=${signals.imageFillCount} (photo=${signals.hasPhotoFill})`,
            `  effects=${signals.effectCount} unsupported=[${[...new Set(signals.unsupportedEffectTypes)].join(", ")}] mask=${signals.hasMask} blend=${signals.hasBlend}`,
            `  rootFills=[${signals.rootFillTypes.join(", ")}] singlePrimitive=${signals.isSinglePrimitive}`
          );
        }
        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error classifying asset: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );
}
