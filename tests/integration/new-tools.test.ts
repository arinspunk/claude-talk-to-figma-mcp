/**
 * Integration tests for the tools added in v1.1.0:
 * get_visual_snapshot, get_css, get_fonts_used, scan_assets, get_asset, batch_operations.
 *
 * These exercise the real MCP tool handlers with a mocked Figma transport,
 * asserting parameter forwarding, response formatting, and edge cases.
 */
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { registerDocumentTools } from '../../src/talk_to_figma_mcp/tools/document-tools';
import { registerTextTools } from '../../src/talk_to_figma_mcp/tools/text-tools';
import { registerImageTools } from '../../src/talk_to_figma_mcp/tools/image-tools';
import { registerModificationTools } from '../../src/talk_to_figma_mcp/tools/modification-tools';

jest.mock('../../src/talk_to_figma_mcp/utils/websocket', () => ({
  sendCommandToFigma: jest.fn(),
  joinChannel: jest.fn(),
  AUTO_CHANNEL: '__auto__',
}));

const handlers = new Map<string, { handler: Function; schema: z.ZodObject<any> }>();
let mockSend: jest.Mock;

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

  const server = new McpServer({ name: 'test', version: '1.1.0' }, { capabilities: { tools: {} } });
  const orig = server.registerTool.bind(server);
  jest.spyOn(server, 'registerTool').mockImplementation((...args: any[]) => {
    if (args.length === 3) {
      const [name, config, handler] = args;
      const schema = config.inputSchema ?? {};
      handlers.set(name, { handler, schema: z.object(schema) });
    }
    return (orig as any)(...args);
  });

  registerDocumentTools(server);
  registerTextTools(server);
  registerImageTools(server);
  registerModificationTools(server);
});

async function call(name: string, args: any) {
  const entry = handlers.get(name);
  if (!entry) throw new Error(`tool not registered: ${name}`);
  const validated = entry.schema.parse(args);
  return entry.handler(validated, { meta: {} });
}

describe('get_visual_snapshot', () => {
  it('returns an MCP image block + geometry text, defaulting scale to 2', async () => {
    mockSend.mockResolvedValueOnce({
      nodeId: '1:2', name: 'Card', type: 'FRAME', mimeType: 'image/png',
      imageData: 'QUJD', scale: 2, requestedScale: 2, capped: false,
      width: 200, height: 100, absoluteBoundingBox: { x: 10, y: 20, width: 200, height: 100 }, selectionCount: 1,
    });

    const res = await call('get_visual_snapshot', {});
    expect(mockSend).toHaveBeenCalledWith('get_visual_snapshot', { nodeId: undefined, scale: 2, maxDimension: 2000 }, expect.any(Number));

    const image = res.content.find((c: any) => c.type === 'image');
    expect(image).toEqual({ type: 'image', data: 'QUJD', mimeType: 'image/png' });
    expect(firstText(res)).toContain('200×100');
    expect(firstText(res)).toContain('x=10, y=20');
  });

  it('notes when the scale was auto-capped for a large frame', async () => {
    mockSend.mockResolvedValueOnce({
      nodeId: '1:2', name: 'Long', type: 'FRAME', mimeType: 'image/png', imageData: 'QQ==',
      scale: 0.2, requestedScale: 2, capped: true, width: 1440, height: 10000, absoluteBoundingBox: null, selectionCount: 1,
    });
    const res = await call('get_visual_snapshot', {});
    expect(firstText(res)).toMatch(/auto-reduced from 2x/);
  });
});

describe('get_css', () => {
  it('formats a single node as a CSS block', async () => {
    mockSend.mockResolvedValueOnce({ id: '1:2', name: 'Btn', type: 'FRAME', css: { width: '100px', 'border-radius': '8px' } });
    const res = await call('get_css', { nodeId: '1:2' });
    const text = firstText(res);
    expect(text).toContain('"Btn" (FRAME, 1:2)');
    expect(text).toContain('width: 100px;');
    expect(text).toContain('border-radius: 8px;');
  });

  it('formats every node when recursive', async () => {
    mockSend.mockResolvedValueOnce({
      root: '1:2', count: 2, truncated: false,
      nodes: [
        { id: '1:2', name: 'Root', type: 'FRAME', css: { width: '10px' } },
        { id: '1:3', name: 'Child', type: 'TEXT', css: { color: '#fff' } },
      ],
    });
    const res = await call('get_css', { nodeId: '1:2', recursive: true });
    const text = firstText(res);
    expect(text).toContain('"Root"');
    expect(text).toContain('"Child"');
    expect(text).toContain('color: #fff;');
  });
});

describe('get_fonts_used', () => {
  it('lists fonts sorted by occurrence', async () => {
    mockSend.mockResolvedValueOnce({
      root: '1:2',
      fonts: [
        { family: 'Inter', style: 'Regular', sizes: [16], occurrences: 2 },
        { family: 'Inter', style: 'Bold', sizes: [28, 56], occurrences: 5 },
      ],
    });
    const res = await call('get_fonts_used', {});
    const text = firstText(res);
    expect(text).toContain('Fonts used (2)');
    // Bold (5×) should be listed before Regular (2×)
    expect(text.indexOf('Bold')).toBeLessThan(text.indexOf('Regular'));
    expect(text).toContain('28, 56px');
  });

  it('handles an empty selection gracefully', async () => {
    mockSend.mockResolvedValueOnce({ root: '1:2', fonts: [] });
    const res = await call('get_fonts_used', {});
    expect(firstText(res)).toMatch(/No text nodes/);
  });
});

describe('scan_assets', () => {
  it('reports images (by hash) and vectors (by nodeId)', async () => {
    mockSend.mockResolvedValueOnce({
      root: '1:2', imageCount: 1, vectorCount: 1,
      images: [{ hash: 'abc123', width: 64, height: 64, bytes: 2048, suggestedName: 'logo', scaleMode: 'FILL', usedBy: [{ id: '1:5', name: 'Logo' }] }],
      vectors: [{ nodeId: '2:3', name: 'icon', type: 'VECTOR', width: 24, height: 24, suggestedName: 'icon.svg' }],
    });
    const res = await call('scan_assets', {});
    const text = firstText(res);
    expect(text).toContain('hash=abc123');
    expect(text).toContain('nodeId=2:3');
    expect(text).toContain('1 image(s), 1 vector/icon(s)');
  });
});

describe('get_asset', () => {
  const tmpDir = path.join(os.tmpdir(), `figma-asset-test-${Date.now()}`);
  afterAll(() => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {} });

  it('writes an SVG asset to disk and returns the path + inline svg', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
    mockSend.mockResolvedValueOnce({
      kind: 'svg', name: 'icon', mimeType: 'image/svg+xml',
      dataBase64: Buffer.from(svg, 'utf8').toString('base64'), bytesLength: svg.length,
    });
    const res = await call('get_asset', { nodeId: '2:3', outDir: tmpDir });
    const text = firstText(res);
    expect(text).toContain('Saved svg asset');
    expect(text).toContain(svg); // inline svg included
    const file = path.join(tmpDir, 'icon.svg');
    expect(fs.existsSync(file)).toBe(true);
    expect(fs.readFileSync(file, 'utf8')).toBe(svg);
  });

  it('writes a PNG image asset with the correct extension', async () => {
    mockSend.mockResolvedValueOnce({
      kind: 'image', mimeType: 'image/png', dataBase64: Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64'), bytesLength: 4,
    });
    const res = await call('get_asset', { hash: 'deadbeef', outDir: tmpDir });
    expect(firstText(res)).toContain('Saved image asset');
    expect(fs.readdirSync(tmpDir).some((f) => f.endsWith('.png'))).toBe(true);
  });

  it('errors when neither hash nor nodeId is provided', async () => {
    const res = await call('get_asset', {});
    expect(firstText(res)).toMatch(/either 'hash' .* or 'nodeId'/);
    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe('batch_operations', () => {
  it('forwards the operations array and summarizes per-op results', async () => {
    mockSend.mockResolvedValueOnce({
      total: 3, succeeded: 2, failed: 1,
      results: [
        { index: 0, command: 'move_node', ok: true },
        { index: 1, command: 'set_fill_color', ok: true },
        { index: 2, command: 'rename_node', ok: false, error: 'Node not found' },
      ],
    });
    const ops = [
      { command: 'move_node', params: { nodeId: '1', x: 0, y: 0 } },
      { command: 'set_fill_color', params: { nodeId: '2', color: { r: 1, g: 0, b: 0 } } },
      { command: 'rename_node', params: { nodeId: 'bad', name: 'x' } },
    ];
    const res = await call('batch_operations', { operations: ops });

    expect(mockSend).toHaveBeenCalledWith('batch_operations', { operations: ops, stopOnError: false }, expect.any(Number));
    const text = firstText(res);
    expect(text).toContain('2/3 succeeded');
    expect(text).toContain('[#2] rename_node: Node not found');
  });

  it('accepts operations passed as a JSON string (coerceJson)', async () => {
    mockSend.mockResolvedValueOnce({ total: 1, succeeded: 1, failed: 0, results: [{ index: 0, command: 'move_node', ok: true }] });
    const ops = [{ command: 'move_node', params: { nodeId: '1', x: 5, y: 5 } }];
    await call('batch_operations', { operations: JSON.stringify(ops) });
    expect(mockSend).toHaveBeenCalledWith('batch_operations', { operations: ops, stopOnError: false }, expect.any(Number));
  });
});
