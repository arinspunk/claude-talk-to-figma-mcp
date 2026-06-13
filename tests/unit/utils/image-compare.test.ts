import { PNG } from 'pngjs';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { compareImages, writeDiffHeatmap, ssimMap } from '../../../src/talk_to_figma_mcp/utils/image-compare';

/** Build a PNG buffer of size w×h, coloring each pixel via fn(x,y) → [r,g,b]. */
function makePng(w: number, h: number, fn: (x: number, y: number) => [number, number, number]): Buffer {
  const png = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const [r, g, b] = fn(x, y);
      png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

const solid = (r: number, g: number, b: number) => makePng(160, 120, () => [r, g, b]);
// A checkerboard gives structure for SSIM to latch onto.
const checker = (cell: number) => makePng(160, 120, (x, y) =>
  (Math.floor(x / cell) + Math.floor(y / cell)) % 2 ? [240, 240, 240] : [16, 16, 16]
);

describe('ssimMap', () => {
  it('returns 1.0 for identical grids', () => {
    const g = new Float64Array(100).fill(123);
    const { mssim } = ssimMap(g, g, 10, 10);
    expect(mssim).toBeCloseTo(1, 5);
  });
});

describe('compareImages', () => {
  it('scores identical images at ~100% similarity with ~0 color delta', () => {
    const img = checker(8);
    const r = compareImages(img, img, {});
    expect(r.similarity).toBeGreaterThanOrEqual(99.5);
    expect(r.ssim).toBe(r.similarity);
    expect(r.colorDelta).toBeLessThan(1);
    expect(r.worstRegion.diff).toBeLessThan(2);
  });

  it('scores black-vs-white as a severe mismatch with max color delta', () => {
    const r = compareImages(solid(0, 0, 0), solid(255, 255, 255), {});
    expect(r.similarity).toBeLessThan(20);
    expect(r.colorDelta).toBeGreaterThan(200);
  });

  it('penalizes structural drift (a shifted bar partially overlaps) below identical', () => {
    // A single (non-periodic) white bar, shifted right — partial overlap means
    // SSIM lands strictly between identical (100) and anti-correlated (0).
    const bar = (x0: number) => makePng(160, 120, (x) => (x >= x0 && x < x0 + 24 ? [240, 240, 240] : [16, 16, 16]));
    const r = compareImages(bar(70), bar(50), {});
    expect(r.similarity).toBeLessThan(95);
    expect(r.similarity).toBeGreaterThan(0);
    // The mismatch should localize to the left half where the bars diverge.
    expect(r.worstRegion.label).toMatch(/left|center/);
  });

  it('detects matching accent-color proportion', () => {
    const orange = (): [number, number, number] => [255, 103, 1];
    const half = (x: number): [number, number, number] => (x < 80 ? orange() : [0, 0, 0]);
    const a = makePng(160, 120, (x) => half(x));
    const b = makePng(160, 120, (x) => half(x));
    const r = compareImages(a, b, { targetColor: '#ff6701' });
    expect(r.colorMatch).toBeDefined();
    expect(r.colorMatch!.ok).toBe(true);
    expect(r.colorMatch!.refPct).toBeGreaterThan(30);
  });

  it('flags accent-color proportion mismatch', () => {
    const a = solid(0, 0, 0); // no orange
    const b = makePng(160, 120, (x) => (x < 120 ? [255, 103, 1] : [0, 0, 0])); // lots of orange
    const r = compareImages(a, b, { targetColor: '#ff6701' });
    expect(r.colorMatch!.ok).toBe(false);
  });
});

describe('writeDiffHeatmap', () => {
  const tmp = path.join(os.tmpdir(), `diff-${Date.now()}.png`);
  afterAll(() => { try { fs.unlinkSync(tmp); } catch {} });

  it('writes a viewable PNG sized to the grid × cellPx', () => {
    const a = checker(8);
    const b = solid(0, 0, 0);
    const dim = writeDiffHeatmap(a, b, tmp, 6);
    expect(fs.existsSync(tmp)).toBe(true);
    expect(dim.width).toBe(120 * 6); // GRID_WIDTH (120) × cellPx (6)
    const decoded = PNG.sync.read(fs.readFileSync(tmp));
    expect(decoded.width).toBe(dim.width);
    expect(decoded.height).toBe(dim.height);
  });
});
