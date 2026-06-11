import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma } from "../utils/websocket";
import { compareImages, writeDiffHeatmap } from "../utils/image-compare";
import { captureUrl } from "../utils/capture";
import fs from "fs";
import path from "path";
import os from "os";

/**
 * Register design-fidelity verification tools.
 *
 * compare_to_figma turns "does my code look like the design?" into objective
 * numbers: it snapshots a Figma node (via the existing visual-snapshot path) and
 * pixel-diffs it against a screenshot of the implemented UI, reporting a
 * similarity score, a 3×3 region map (to localize mismatches), an overflow
 * estimate, and optional brand-color match. This lets the agent run a real
 * render → compare → fix loop instead of eyeballing downscaled images.
 */
export function registerVerifyTools(server: McpServer): void {
  server.registerTool(
    "compare_to_figma",
    {
      description: "Objectively compare your implemented UI against a Figma node. Pass either renderPath (a PNG you captured yourself) or url (a local route — it is screenshotted headlessly at the Figma node's EXACT size, so dimensions always match). Snapshots the node and compares using SSIM (structural similarity — robust to font anti-aliasing, so it reflects real layout/asset drift, not pixel noise), plus a color delta, a 3×3 region map (to localize what's off), an edge-overflow estimate, and an optional brand-color match. Also writes a DIFF HEATMAP png you can open to see exactly where they diverge. Use this to verify a section after building it instead of guessing from a downscaled image.",
      inputSchema: {
      renderPath: z.string().optional().describe("Absolute path to a PNG screenshot of your implemented UI. Provide either this or url."),
      url: z.string().optional().describe("Local URL of the implemented UI (e.g. http://localhost:3000/preview/hero). It is captured with a headless browser at the Figma node's exact size — requires Chromium/Chrome installed locally."),
      nodeId: z.string().optional().describe("Figma node to compare against. Omit to use the current selection."),
      targetColor: z.string().optional().describe("Optional brand/accent hex (e.g. #ff6701) to check is present in similar proportion in both images."),
      maxDimension: z.coerce.number().positive().optional().describe("Cap on the Figma snapshot's longest side (default 2000)."),
      diffPath: z.string().optional().describe("Where to write the diff heatmap PNG (default: a temp file). Open it to see where the render diverges from the design."),
    },
    },
    async ({ renderPath, url, nodeId, targetColor, maxDimension, diffPath }) => {
      try {
        if (!renderPath && !url) {
          return { content: [{ type: "text", text: "Provide either renderPath (a PNG of your render) or url (a local route to capture)." }], isError: true };
        }
        if (renderPath && url) {
          return { content: [{ type: "text", text: "Provide only one of renderPath or url, not both." }], isError: true };
        }

        // Snapshot the Figma node first (reuses the plugin's visual-snapshot
        // command) — in url mode its width/height drive the capture size.
        const snap = await sendCommandToFigma(
          "get_visual_snapshot",
          { nodeId, scale: 2, maxDimension: maxDimension ?? 2000 },
          120000
        );
        const typed = snap as { name: string; type: string; nodeId: string; imageData: string; mimeType: string; width?: number; height?: number };
        if (!typed.imageData) {
          return { content: [{ type: "text", text: "Figma snapshot returned no image data." }] };
        }
        const refBuf = Buffer.from(typed.imageData, "base64");

        let renderBuf: Buffer;
        let captureNote = "";
        if (url) {
          if (!typed.width || !typed.height) {
            return { content: [{ type: "text", text: "Figma snapshot did not report node dimensions — update the Figma plugin, or capture the render yourself and pass renderPath." }], isError: true };
          }
          const cap = await captureUrl({ url, width: typed.width, height: typed.height });
          renderBuf = fs.readFileSync(cap.path);
          captureNote = `Captured ${url} at ${cap.width}×${cap.height} (node size) → ${cap.path}`;
        } else {
          if (!fs.existsSync(renderPath!)) {
            return { content: [{ type: "text", text: `Render image not found: ${renderPath}` }], isError: true };
          }
          renderBuf = fs.readFileSync(renderPath!);
        }

        const r = compareImages(renderBuf, refBuf, { targetColor });

        // Write a diff heatmap the agent can open and inspect visually.
        const outPath =
          diffPath ||
          path.join(os.tmpdir(), `figma-diff-${(typed.nodeId || "node").replace(/[^a-z0-9]+/gi, "-")}-${Date.now()}.png`);
        let heatNote = "";
        try {
          const dim = writeDiffHeatmap(renderBuf, refBuf, outPath);
          r.diffImagePath = outPath;
          heatNote = `Diff heatmap (red = mismatch): ${outPath}  (${dim.width}×${dim.height})`;
        } catch (e) {
          heatNote = `Diff heatmap could not be written: ${e instanceof Error ? e.message : String(e)}`;
        }

        const grid = r.regions
          .map((row) => "    " + row.map((d) => String(d).padStart(5)).join(" "))
          .join("\n");
        const lines = [
          `Compared render vs Figma "${typed.name}" (${typed.type}, ${typed.nodeId})`,
          ...(captureNote ? [captureNote] : []),
          `Structural similarity (SSIM): ${r.similarity}%   |   raw-pixel similarity: ${r.pixelSimilarity}%`,
          `Color delta: ${r.colorDelta}/255 mean per-channel   |   grayscale diff: ${r.meanDiff}/255`,
          `Worst region: ${r.worstRegion.label} (structural mismatch ${r.worstRegion.diff}/100)`,
          `Region mismatch map (3×3, 0=match … 100=worst):`,
          grid,
          `Edge overflow: ${(r.edgeOverflow * 100).toFixed(1)}% of render content sits in margins the design leaves empty`,
        ];
        if (r.colorMatch) {
          lines.push(
            `Color ${r.colorMatch.target}: render ${r.colorMatch.renderPct}% vs design ${r.colorMatch.refPct}% → ${r.colorMatch.ok ? "OK" : "MISMATCH"}`
          );
        }
        lines.push(heatNote);

        // Verdict heuristics (SSIM-calibrated). SSIM is stricter than raw-pixel
        // similarity, so the thresholds are lower than the old metric's.
        const verdicts: string[] = [];
        if (r.similarity >= 80) verdicts.push("Close structural match.");
        else if (r.similarity >= 60) verdicts.push("Roughly right — inspect the worst region and the diff heatmap.");
        else verdicts.push("Significant mismatch — inspect layout/assets in the worst region (see heatmap).");
        if (r.colorDelta > 24) verdicts.push("Colors differ noticeably — check fills/backgrounds.");
        if (r.edgeOverflow > 0.04) verdicts.push("Content is overflowing the frame edges.");
        if (r.colorMatch && !r.colorMatch.ok) verdicts.push("Accent color proportion is off.");
        lines.push("Verdict: " + verdicts.join(" "));

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error comparing to Figma: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "capture_render",
    {
      description: "Screenshot a local URL with a headless browser at an exact pixel size and save it as a PNG (e.g. to feed into compare_to_figma, or to look at with vision). Handles the gotchas of headless captures: warms the route first so dev-server compilation isn't in the shot, and captures taller than requested then crops — a viewport whose height exactly equals the content height collapses the render. Requires Chromium/Chrome installed locally (set CHROME_PATH to override the binary).",
      inputSchema: {
        url: z.string().describe("URL to capture (e.g. http://localhost:3000/preview/hero)."),
        width: z.coerce.number().positive().describe("Viewport/crop width in CSS pixels (use the Figma frame's width)."),
        height: z.coerce.number().positive().describe("Crop height in CSS pixels (use the Figma frame's height)."),
        outPath: z.string().optional().describe("Where to write the PNG (default: a temp file)."),
        warmupRequests: z.coerce.number().int().min(0).optional().describe("Plain GETs sent before the screenshot to warm dev-server compilation (default 2)."),
      },
    },
    async ({ url, width, height, outPath, warmupRequests }) => {
      try {
        const result = await captureUrl({ url, width, height, outPath, warmupRequests });
        return {
          content: [
            {
              type: "text",
              text: `Captured ${url} at ${result.width}×${result.height} (via ${result.binary})\nSaved to: ${result.path}`,
            },
          ],
          structuredContent: { path: result.path, width: result.width, height: result.height },
        };
      } catch (error) {
        return { content: [{ type: "text", text: `Error capturing render: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );
}
