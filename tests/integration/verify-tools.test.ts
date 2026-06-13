/**
 * Integration tests for the verify tools: compare_to_figma (renderPath and url
 * modes) and capture_render. The Figma transport and the headless-browser
 * capture are mocked; the real SSIM comparison runs on synthetic PNGs.
 */
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PNG } from 'pngjs';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { registerVerifyTools } from '../../src/talk_to_figma_mcp/tools/verify-tools';

jest.mock('../../src/talk_to_figma_mcp/utils/websocket', () => ({
  sendCommandToFigma: jest.fn(),
  joinChannel: jest.fn(),
  AUTO_CHANNEL: '__auto__',
}));

jest.mock('../../src/talk_to_figma_mcp/utils/capture', () => {
  const actual = jest.requireActual('../../src/talk_to_figma_mcp/utils/capture');
  return { ...actual, captureUrl: jest.fn() };
});

const handlers = new Map<string, { handler: Function; schema: z.ZodObject<any> }>();
let mockSend: jest.Mock;
let mockCapture: jest.Mock;

function solidPng(width: number, height: number, rgb: [number, number, number]): Buffer {
  const png = new PNG({ width, height });
  for (let i = 0; i < width * height; i++) {
    png.data[i * 4] = rgb[0];
    png.data[i * 4 + 1] = rgb[1];
    png.data[i * 4 + 2] = rgb[2];
    png.data[i * 4 + 3] = 255;
  }
  return PNG.sync.write(png);
}

function firstText(result: any): string {
  return (result?.content || [])
    .filter((c: any) => c.type === 'text')
    .map((c: any) => c.text)
    .join('\n');
}

beforeEach(() => {
  handlers.clear();
  mockSend = require('../../src/talk_to_figma_mcp/utils/websocket').sendCommandToFigma;
  mockSend.mockReset();
  mockCapture = require('../../src/talk_to_figma_mcp/utils/capture').captureUrl;
  mockCapture.mockReset();

  const server = new McpServer({ name: 'test', version: '1.3.0' }, { capabilities: { tools: {} } });
  const orig = server.registerTool.bind(server);
  jest.spyOn(server, 'registerTool').mockImplementation((...args: any[]) => {
    if (args.length === 3) {
      const [name, config, handler] = args;
      handlers.set(name, { handler, schema: z.object(config.inputSchema ?? {}) });
    }
    return (orig as any)(...args);
  });

  registerVerifyTools(server);
});

async function call(name: string, args: any) {
  const entry = handlers.get(name);
  if (!entry) throw new Error(`tool not registered: ${name}`);
  const validated = entry.schema.parse(args);
  return entry.handler(validated, { meta: {} });
}

describe('capture_render', () => {
  it('forwards args to captureUrl and reports the saved path', async () => {
    mockCapture.mockResolvedValue({ path: '/tmp/out.png', width: 1440, height: 800, binary: 'chromium' });

    const result = await call('capture_render', {
      url: 'http://localhost:3000/preview/hero',
      width: 1440,
      height: 800,
      outPath: '/tmp/out.png',
    });

    expect(mockCapture).toHaveBeenCalledWith({
      url: 'http://localhost:3000/preview/hero',
      width: 1440,
      height: 800,
      outPath: '/tmp/out.png',
      warmupRequests: undefined,
    });
    expect(firstText(result)).toContain('Saved to: /tmp/out.png');
    expect(result.structuredContent).toEqual({ path: '/tmp/out.png', width: 1440, height: 800 });
  });

  it('flags missing-browser failures with isError', async () => {
    mockCapture.mockRejectedValue(new Error('No headless browser found'));

    const result = await call('capture_render', { url: 'http://localhost:3000', width: 100, height: 100 });

    expect(result.isError).toBe(true);
    expect(firstText(result)).toContain('No headless browser found');
  });
});

describe('compare_to_figma (url mode)', () => {
  it('captures the url at the Figma node size and runs the comparison', async () => {
    const figmaPng = solidPng(64, 48, [200, 50, 50]);
    mockSend.mockResolvedValue({
      nodeId: '1:1',
      name: 'Hero',
      type: 'FRAME',
      mimeType: 'image/png',
      imageData: figmaPng.toString('base64'),
      scale: 2,
      requestedScale: 2,
      capped: false,
      width: 64,
      height: 48,
      absoluteBoundingBox: { x: 0, y: 0, width: 64, height: 48 },
      selectionCount: 0,
    });

    const renderFile = path.join(os.tmpdir(), `verify-test-render-${Date.now()}.png`);
    fs.writeFileSync(renderFile, solidPng(64, 48, [200, 50, 50]));
    mockCapture.mockResolvedValue({ path: renderFile, width: 64, height: 48, binary: 'chromium' });

    try {
      const result = await call('compare_to_figma', { url: 'http://localhost:3000/preview/hero', nodeId: '1:1' });

      expect(mockCapture).toHaveBeenCalledWith({ url: 'http://localhost:3000/preview/hero', width: 64, height: 48 });
      const text = firstText(result);
      expect(text).toContain('Compared render vs Figma "Hero"');
      expect(text).toContain('Captured http://localhost:3000/preview/hero at 64×48');
      expect(text).toContain('Structural similarity');
    } finally {
      fs.rmSync(renderFile, { force: true });
    }
  });

  it('rejects when neither renderPath nor url is given', async () => {
    const result = await call('compare_to_figma', {});
    expect(result.isError).toBe(true);
    expect(firstText(result)).toContain('Provide either renderPath');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('rejects when both renderPath and url are given', async () => {
    const result = await call('compare_to_figma', { renderPath: '/tmp/x.png', url: 'http://localhost:3000' });
    expect(result.isError).toBe(true);
    expect(firstText(result)).toContain('only one of renderPath or url');
  });

  it('still supports the original renderPath mode', async () => {
    const figmaPng = solidPng(32, 32, [10, 10, 10]);
    mockSend.mockResolvedValue({
      nodeId: '1:2',
      name: 'Card',
      type: 'FRAME',
      mimeType: 'image/png',
      imageData: figmaPng.toString('base64'),
      scale: 2,
      requestedScale: 2,
      capped: false,
      width: 32,
      height: 32,
      absoluteBoundingBox: { x: 0, y: 0, width: 32, height: 32 },
      selectionCount: 0,
    });

    const renderFile = path.join(os.tmpdir(), `verify-test-render-${Date.now()}.png`);
    fs.writeFileSync(renderFile, solidPng(32, 32, [10, 10, 10]));

    try {
      const result = await call('compare_to_figma', { renderPath: renderFile, nodeId: '1:2' });
      expect(mockCapture).not.toHaveBeenCalled();
      expect(firstText(result)).toContain('Compared render vs Figma "Card"');
    } finally {
      fs.rmSync(renderFile, { force: true });
    }
  });
});
