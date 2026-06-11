/**
 * Unit tests for the headless-capture helpers (pure parts only — no browser).
 */
import { PNG } from 'pngjs';
import { cropPng } from '../../../src/talk_to_figma_mcp/utils/capture';

function makePng(width: number, height: number, paint: (x: number, y: number) => [number, number, number]): Buffer {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const [r, g, b] = paint(x, y);
      png.data[i] = r;
      png.data[i + 1] = g;
      png.data[i + 2] = b;
      png.data[i + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

describe('cropPng', () => {
  it('crops the top-left region to the requested size', () => {
    // Top half red, bottom half blue — cropping the top must keep only red.
    const buf = makePng(40, 40, (_x, y) => (y < 20 ? [255, 0, 0] : [0, 0, 255]));
    const cropped = PNG.sync.read(cropPng(buf, 40, 20));

    expect(cropped.width).toBe(40);
    expect(cropped.height).toBe(20);
    // Every remaining pixel is red
    for (let y = 0; y < 20; y += 5) {
      for (let x = 0; x < 40; x += 5) {
        const i = (y * 40 + x) * 4;
        expect(cropped.data[i]).toBe(255);
        expect(cropped.data[i + 2]).toBe(0);
      }
    }
  });

  it('returns the buffer unchanged when the size already matches', () => {
    const buf = makePng(10, 10, () => [1, 2, 3]);
    expect(cropPng(buf, 10, 10)).toBe(buf);
  });

  it('clamps the crop to the source dimensions instead of failing', () => {
    const buf = makePng(10, 10, () => [9, 9, 9]);
    const cropped = PNG.sync.read(cropPng(buf, 100, 100));
    expect(cropped.width).toBe(10);
    expect(cropped.height).toBe(10);
  });

  it('rounds fractional dimensions (Figma node sizes are often fractional)', () => {
    const buf = makePng(20, 20, () => [5, 5, 5]);
    const cropped = PNG.sync.read(cropPng(buf, 15.6, 10.2));
    expect(cropped.width).toBe(16);
    expect(cropped.height).toBe(10);
  });
});
