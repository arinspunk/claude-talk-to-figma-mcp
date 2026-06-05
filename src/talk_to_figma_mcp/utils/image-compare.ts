/**
 * Lightweight, dependency-light image comparison for design-fidelity checks.
 *
 * Decodes two PNGs, normalizes them onto a common grid (box-average downsample),
 * and produces OBJECTIVE metrics:
 *   - SSIM (structural similarity) — the headline number. Robust to the
 *     anti-aliasing texture that made the old raw grayscale-diff plateau ~92%
 *     on text-heavy sections; correlates far better with "looks the same".
 *   - a color delta (mean per-channel RGB difference),
 *   - a 3×3 region map (per-region structural mismatch, to localize problems),
 *   - an edge-overflow estimate (render content bleeding into empty margins),
 *   - optional brand-color presence,
 *   - and a saved diff HEATMAP png so the agent can SEE where it differs.
 *
 * Only depends on pngjs (already a dependency).
 */
import { PNG } from "pngjs";
import fs from "fs";

export interface RgbaImage {
  width: number;
  height: number;
  data: Buffer; // RGBA, length = width*height*4
}

export function decodePng(buffer: Buffer): RgbaImage {
  const png = PNG.sync.read(buffer);
  return { width: png.width, height: png.height, data: png.data };
}

/** Box-average downsample to gw×gh, returning grayscale (0-255) + mean RGB per cell. */
function toGrid(img: RgbaImage, gw: number, gh: number): { gray: Float64Array; rgb: Float64Array } {
  const gray = new Float64Array(gw * gh);
  const rgb = new Float64Array(gw * gh * 3);
  for (let cy = 0; cy < gh; cy++) {
    for (let cx = 0; cx < gw; cx++) {
      const x0 = Math.floor((cx * img.width) / gw);
      const x1 = Math.max(x0 + 1, Math.floor(((cx + 1) * img.width) / gw));
      const y0 = Math.floor((cy * img.height) / gh);
      const y1 = Math.max(y0 + 1, Math.floor(((cy + 1) * img.height) / gh));
      let r = 0, g = 0, b = 0, n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * img.width + x) * 4;
          r += img.data[i]; g += img.data[i + 1]; b += img.data[i + 2]; n++;
        }
      }
      r /= n; g /= n; b /= n;
      const idx = cy * gw + cx;
      gray[idx] = 0.299 * r + 0.587 * g + 0.114 * b;
      rgb[idx * 3] = r; rgb[idx * 3 + 1] = g; rgb[idx * 3 + 2] = b;
    }
  }
  return { gray, rgb };
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Windowed SSIM over two equal-sized grayscale grids.
 * Returns the mean SSIM (0-1) and a per-cell SSIM map for localization.
 */
export function ssimMap(
  a: Float64Array,
  b: Float64Array,
  gw: number,
  gh: number,
  win = 7
): { mssim: number; cell: Float64Array } {
  const C1 = (0.01 * 255) ** 2;
  const C2 = (0.03 * 255) ** 2;
  const half = Math.floor(win / 2);
  const cell = new Float64Array(gw * gh);
  let sum = 0;
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      let n = 0, sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
      for (let dy = -half; dy <= half; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= gh) continue;
        for (let dx = -half; dx <= half; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= gw) continue;
          const va = a[yy * gw + xx], vb = b[yy * gw + xx];
          sa += va; sb += vb; saa += va * va; sbb += vb * vb; sab += va * vb; n++;
        }
      }
      const ma = sa / n, mb = sb / n;
      const va = saa / n - ma * ma, vb = sbb / n - mb * mb, cov = sab / n - ma * mb;
      const s = ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2));
      cell[y * gw + x] = s;
      sum += s;
    }
  }
  return { mssim: sum / (gw * gh), cell };
}

export interface CompareResult {
  /** Headline: structural similarity, 0-100 (100 = identical). */
  similarity: number;
  /** Mean SSIM as 0-100 (same as similarity; kept explicit for clarity). */
  ssim: number;
  /** Legacy raw-pixel similarity (100 - mean grayscale diff %). Kept for continuity. */
  pixelSimilarity: number;
  meanDiff: number;          // 0-255 mean abs grayscale difference
  colorDelta: number;        // 0-255 mean per-channel RGB difference
  regions: number[][];       // 3×3 grid of structural mismatch (0=match … 100=worst)
  worstRegion: { row: number; col: number; diff: number; label: string };
  edgeOverflow: number;      // 0-1: bright render content in outer margins absent from reference
  colorMatch?: { target: string; renderPct: number; refPct: number; ok: boolean };
  /** Filled in by writeDiffHeatmap() when a path is provided. */
  diffImagePath?: string;
  gridWidth: number;
  gridHeight: number;
}

const REGION_LABELS = [
  ["top-left", "top-center", "top-right"],
  ["mid-left", "center", "mid-right"],
  ["bottom-left", "bottom-center", "bottom-right"],
];

const GRID_WIDTH = 120;

function buildGrids(renderPng: Buffer, referencePng: Buffer) {
  const render = decodePng(renderPng);
  const reference = decodePng(referencePng);
  const GW = GRID_WIDTH;
  const GH = Math.max(24, Math.round((GW * reference.height) / reference.width));
  return { a: toGrid(render, GW, GH), b: toGrid(reference, GW, GH), GW, GH };
}

export function compareImages(
  renderPng: Buffer,
  referencePng: Buffer,
  opts: { targetColor?: string } = {}
): CompareResult {
  const { a, b, GW, GH } = buildGrids(renderPng, referencePng);

  // Structural similarity (headline) + per-cell map for localization.
  const { mssim, cell } = ssimMap(a.gray, b.gray, GW, GH);

  // Raw grayscale + color diffs (continuity + a chroma signal SSIM ignores).
  let total = 0, colorTotal = 0;
  const regSum = Array.from({ length: 3 }, () => [0, 0, 0]);
  const regCnt = Array.from({ length: 3 }, () => [0, 0, 0]);
  for (let y = 0; y < GH; y++) {
    const rr = Math.min(2, Math.floor((y * 3) / GH));
    for (let x = 0; x < GW; x++) {
      const cc = Math.min(2, Math.floor((x * 3) / GW));
      const idx = y * GW + x;
      total += Math.abs(a.gray[idx] - b.gray[idx]);
      colorTotal +=
        (Math.abs(a.rgb[idx * 3] - b.rgb[idx * 3]) +
          Math.abs(a.rgb[idx * 3 + 1] - b.rgb[idx * 3 + 1]) +
          Math.abs(a.rgb[idx * 3 + 2] - b.rgb[idx * 3 + 2])) / 3;
      // Region mismatch from structure: (1 - SSIM), clamped to [0,1].
      regSum[rr][cc] += Math.max(0, 1 - cell[idx]);
      regCnt[rr][cc]++;
    }
  }
  const meanDiff = total / (GW * GH);
  const colorDelta = colorTotal / (GW * GH);
  const regions = regSum.map((row, r) => row.map((s, c) => +((s / regCnt[r][c]) * 100).toFixed(1)));

  let worst = { row: 0, col: 0, diff: -1, label: "" };
  regions.forEach((row, r) => row.forEach((d, c) => {
    if (d > worst.diff) worst = { row: r, col: c, diff: d, label: REGION_LABELS[r][c] };
  }));

  // Edge overflow: bright render cells in outer 6% columns where reference is dark.
  const margin = Math.max(1, Math.round(GW * 0.06));
  let bright = 0, edge = 0;
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      if (a.gray[y * GW + x] > 50) {
        bright++;
        const inMargin = x < margin || x >= GW - margin;
        if (inMargin && b.gray[y * GW + x] < 30) edge++;
      }
    }
  }
  const edgeOverflow = bright ? edge / bright : 0;

  let colorMatch: CompareResult["colorMatch"];
  if (opts.targetColor) {
    const tc = hexToRgb(opts.targetColor);
    if (tc) {
      const count = (grid: Float64Array) => {
        let n = 0;
        for (let i = 0; i < GW * GH; i++) {
          const dr = grid[i * 3] - tc[0], dg = grid[i * 3 + 1] - tc[1], db = grid[i * 3 + 2] - tc[2];
          if (dr * dr + dg * dg + db * db < 45 * 45) n++;
        }
        return n / (GW * GH);
      };
      const renderPct = count(a.rgb), refPct = count(b.rgb);
      const ok = refPct < 0.003 || (renderPct >= refPct * 0.5 && renderPct <= refPct * 2);
      colorMatch = { target: opts.targetColor, renderPct: +(renderPct * 100).toFixed(2), refPct: +(refPct * 100).toFixed(2), ok };
    }
  }

  // SSIM is in [-1,1]; clamp to [0,100] so "similarity %" reads naturally
  // (strongly anti-correlated content just reports 0).
  const ssim100 = +(Math.max(0, mssim) * 100).toFixed(1);
  return {
    similarity: ssim100,
    ssim: ssim100,
    pixelSimilarity: +(100 - (meanDiff / 255) * 100).toFixed(1),
    meanDiff: +meanDiff.toFixed(1),
    colorDelta: +colorDelta.toFixed(1),
    regions,
    worstRegion: worst,
    edgeOverflow: +edgeOverflow.toFixed(3),
    colorMatch,
    gridWidth: GW,
    gridHeight: GH,
  };
}

/**
 * Render a diff HEATMAP png and write it to `outPath`. The reference is shown
 * dimmed in grayscale with structural-mismatch areas tinted red→yellow, so the
 * agent can open it and immediately see WHERE the implementation diverges.
 * Returns the output dimensions. Each grid cell is drawn as a `cellPx` block.
 */
export function writeDiffHeatmap(
  renderPng: Buffer,
  referencePng: Buffer,
  outPath: string,
  cellPx = 6
): { width: number; height: number } {
  const { a, b, GW, GH } = buildGrids(renderPng, referencePng);
  const { cell } = ssimMap(a.gray, b.gray, GW, GH);

  const W = GW * cellPx, H = GH * cellPx;
  const out = new PNG({ width: W, height: H });
  for (let gy = 0; gy < GH; gy++) {
    for (let gx = 0; gx < GW; gx++) {
      const idx = gy * GW + gx;
      const base = b.gray[idx] * 0.35; // dimmed reference backdrop
      const mismatch = Math.max(0, Math.min(1, 1 - cell[idx])); // 0 good … 1 bad
      // Heat ramp: green/blue (low) → red (high). Mix over the dim backdrop.
      const r = base + mismatch * (255 - base);
      const g = base + (1 - mismatch) * (160 - base) * 0.6;
      const bl = base * (1 - mismatch);
      for (let py = 0; py < cellPx; py++) {
        for (let px = 0; px < cellPx; px++) {
          const ox = gx * cellPx + px, oy = gy * cellPx + py;
          const o = (oy * W + ox) * 4;
          out.data[o] = Math.round(Math.max(0, Math.min(255, r)));
          out.data[o + 1] = Math.round(Math.max(0, Math.min(255, g)));
          out.data[o + 2] = Math.round(Math.max(0, Math.min(255, bl)));
          out.data[o + 3] = 255;
        }
      }
    }
  }
  const buf = PNG.sync.write(out);
  fs.writeFileSync(outPath, buf);
  return { width: W, height: H };
}
