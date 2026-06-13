import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import os from "os";
import path from "path";
import { PNG } from "pngjs";
import { logger } from "./logger";

const execFileAsync = promisify(execFile);

/**
 * Headless-browser capture of a local URL at an exact pixel size, for feeding
 * into compare_to_figma. Encodes the workflow tricks that make such captures
 * reliable:
 *  - warm the URL with plain GETs first (dev servers compile routes on first
 *    hit; a cold screenshot captures a loading/compiling state)
 *  - capture TALLER than requested and crop: a headless viewport whose height
 *    exactly equals the content height collapses the render
 *  - try several browser binary names (chromium / chromium-browser / chrome)
 */

const CHROMIUM_BINARIES = [
  "chromium",
  "chromium-browser",
  "google-chrome",
  "google-chrome-stable",
  "chrome",
];

// Extra viewport height captured beyond the requested crop (see note above).
const EXTRA_HEIGHT = 160;

let cachedBinary: string | null | undefined;

/** Locate a usable Chromium/Chrome binary ($CHROME_PATH wins). Cached. */
export async function findChromium(): Promise<string | null> {
  if (cachedBinary !== undefined) return cachedBinary;
  const envPath = process.env.CHROME_PATH;
  if (envPath && fs.existsSync(envPath)) {
    cachedBinary = envPath;
    return cachedBinary;
  }
  for (const bin of CHROMIUM_BINARIES) {
    try {
      await execFileAsync(bin, ["--version"], { timeout: 5000 });
      cachedBinary = bin;
      return bin;
    } catch {
      // try the next binary name
    }
  }
  cachedBinary = null;
  return null;
}

/** Crop a PNG buffer to the top-left width×height region. */
export function cropPng(buf: Buffer, width: number, height: number): Buffer {
  const src = PNG.sync.read(buf);
  const w = Math.min(Math.round(width), src.width);
  const h = Math.min(Math.round(height), src.height);
  if (w === src.width && h === src.height) return buf;
  const out = new PNG({ width: w, height: h });
  PNG.bitblt(src, out, 0, 0, w, h, 0, 0);
  return PNG.sync.write(out);
}

export interface CaptureOptions {
  url: string;
  width: number;
  height: number;
  /** Where to write the cropped PNG (default: a temp file). */
  outPath?: string;
  /** Plain GETs sent before the screenshot to warm dev-server compilation (default 2). */
  warmupRequests?: number;
}

export interface CaptureResult {
  path: string;
  width: number;
  height: number;
  binary: string;
}

/**
 * Screenshot `url` with a headless browser and save it cropped to exactly
 * width×height. Throws with an actionable message when no browser is found.
 */
export async function captureUrl(opts: CaptureOptions): Promise<CaptureResult> {
  const width = Math.round(opts.width);
  const height = Math.round(opts.height);
  if (!(width > 0 && height > 0)) {
    throw new Error(`Invalid capture size ${opts.width}×${opts.height}`);
  }

  const binary = await findChromium();
  if (!binary) {
    throw new Error(
      `No headless browser found (tried: ${CHROMIUM_BINARIES.join(", ")}). ` +
      `Install Chromium/Chrome or set the CHROME_PATH environment variable.`
    );
  }

  // Warm the route so dev-server compilation doesn't end up in the screenshot.
  const warmups = opts.warmupRequests ?? 2;
  for (let i = 0; i < warmups; i++) {
    try {
      await fetch(opts.url, { signal: AbortSignal.timeout(30_000) });
    } catch {
      // The dev server may still be compiling — the screenshot timeout below
      // is the real failure gate.
    }
  }

  const tmpShot = path.join(
    os.tmpdir(),
    `figma-capture-tall-${Date.now()}-${Math.random().toString(36).slice(2)}.png`
  );
  try {
    await execFileAsync(
      binary,
      [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        `--window-size=${width},${height + EXTRA_HEIGHT}`,
        `--screenshot=${tmpShot}`,
        opts.url,
      ],
      { timeout: 60_000 }
    );
    if (!fs.existsSync(tmpShot)) {
      throw new Error("Headless browser exited without producing a screenshot");
    }

    const cropped = cropPng(fs.readFileSync(tmpShot), width, height);
    const outPath =
      opts.outPath ||
      path.join(os.tmpdir(), `figma-render-${Date.now()}.png`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, cropped);

    const dims = PNG.sync.read(cropped);
    logger.info(`Captured ${opts.url} at ${dims.width}×${dims.height} via ${binary} → ${outPath}`);
    return { path: outPath, width: dims.width, height: dims.height, binary };
  } finally {
    fs.rmSync(tmpShot, { force: true });
  }
}
