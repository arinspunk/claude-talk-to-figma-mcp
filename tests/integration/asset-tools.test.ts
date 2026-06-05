/**
 * Integration tests for v1.2 asset tools: extract_asset, classify_asset.
 * Exercises the real MCP tool handlers with a mocked Figma transport.
 */
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { registerAssetTools } from '../../src/talk_to_figma_mcp/tools/asset-tools';

jest.mock('../../src/talk_to_figma_mcp/utils/websocket', () => ({
  sendCommandToFigma: jest.fn(),
  joinChannel: jest.fn(),
  AUTO_CHANNEL: '__auto__',
}));

const handlers = new Map<string, { handler: Function; schema: z.ZodObject<any> }>();
let mockSend: jest.Mock;

function firstText(result: any): string {
  return (result?.content || []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n');
}

beforeEach(() => {
  handlers.clear();
  mockSend = require('../../src/talk_to_figma_mcp/utils/websocket').sendCommandToFigma;
  mockSend.mockReset();

  const server = new McpServer({ name: 'test', version: '1.2.0' }, { capabilities: { tools: {} } });
  const orig = server.tool.bind(server);
  jest.spyOn(server, 'tool').mockImplementation((...args: any[]) => {
    if (args.length === 4) {
      const [name, , schema, handler] = args;
      handlers.set(name, { handler, schema: z.object(schema) });
    }
    return (orig as any)(...args);
  });

  registerAssetTools(server);
});

async function call(name: string, args: any) {
  const entry = handlers.get(name);
  if (!entry) throw new Error(`tool not registered: ${name}`);
  const validated = entry.schema.parse(args);
  return entry.handler(validated, { meta: {} });
}

describe('extract_asset', () => {
  const tmpDir = path.join(os.tmpdir(), `extract-asset-test-${Date.now()}`);
  afterAll(() => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {} });

  it('writes a clean PNG and reports the drop shadow as box-shadow', async () => {
    mockSend.mockResolvedValueOnce({
      kind: 'image', name: 'Panel', mimeType: 'image/png',
      dataBase64: Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64'), bytesLength: 4,
      rootEffects: [{ type: 'DROP_SHADOW', color: { r: 1, g: 0.4, b: 0, a: 1 }, offset: { x: 0, y: 4 }, radius: 8, spread: 0 }],
      strippedCount: 1,
      box: { x: 0, y: 0, width: 200, height: 100 },
      renderBounds: { x: -8, y: -4, width: 216, height: 116 },
    });

    const res = await call('extract_asset', { nodeId: '1:2', outDir: tmpDir });
    expect(mockSend).toHaveBeenCalledWith('extract_asset', { nodeId: '1:2', format: 'PNG', scale: 2, stripScope: 'all' }, expect.any(Number));
    const text = firstText(res);
    expect(text).toContain('Saved clean image asset');
    expect(text).toContain('box-shadow: 0px 4px 8px 0px rgb(255, 102, 0);');
    expect(text).toMatch(/Effect bleed past layout box/);
    expect(fs.readdirSync(tmpDir).some((f) => f.endsWith('.png'))).toBe(true);
  });

  it('warns when an effect is not reproducible in CSS (NOISE)', async () => {
    mockSend.mockResolvedValueOnce({
      kind: 'svg', name: 'Noisy', mimeType: 'image/svg+xml',
      dataBase64: Buffer.from('<svg/>', 'utf8').toString('base64'), bytesLength: 6,
      rootEffects: [{ type: 'NOISE', radius: 1 }],
      strippedCount: 1, box: null, renderBounds: null,
    });
    const res = await call('extract_asset', { nodeId: '1:3', format: 'SVG', outDir: tmpDir });
    const text = firstText(res);
    expect(text).toContain('Saved clean svg asset');
    expect(text).toMatch(/Unsupported in CSS: NOISE/);
  });

  it('notes when there are no effects', async () => {
    mockSend.mockResolvedValueOnce({
      kind: 'image', name: 'Plain', mimeType: 'image/png',
      dataBase64: Buffer.from([0x89, 0x50]).toString('base64'), bytesLength: 2,
      rootEffects: [], strippedCount: 0, box: null, renderBounds: null,
    });
    const res = await call('extract_asset', { nodeId: '1:4', outDir: tmpDir });
    expect(firstText(res)).toMatch(/No effects on the node/);
  });
});

describe('classify_asset', () => {
  function sig(overrides: any) {
    return {
      nodeId: '1:1', name: 'n', type: 'FRAME', width: 100, height: 100,
      nodeCount: 1, vectorCount: 0, textCount: 0, imageFillCount: 0, hasPhotoFill: false,
      hasMask: false, hasBlend: false, unsupportedEffectTypes: [], effectCount: 0,
      isSinglePrimitive: false, rootFillTypes: [], ...overrides,
    };
  }

  it('recommends RASTER for a photo fill', async () => {
    mockSend.mockResolvedValueOnce(sig({ type: 'RECTANGLE', name: 'Hero', imageFillCount: 1, hasPhotoFill: true, isSinglePrimitive: true, rootFillTypes: ['IMAGE'] }));
    const res = await call('classify_asset', { nodeId: '1:1' });
    const text = firstText(res);
    expect(text).toContain('Recommendation: RASTER');
    expect(text).toMatch(/photographic image fill/);
  });

  it('recommends SVG for clean vector art and can include signals', async () => {
    mockSend.mockResolvedValueOnce(sig({ type: 'GROUP', name: 'Logo', vectorCount: 5, nodeCount: 8 }));
    const res = await call('classify_asset', { nodeId: '2:2', includeSignals: true });
    const text = firstText(res);
    expect(text).toContain('Recommendation: SVG');
    expect(text).toContain('Signals:');
    expect(text).toContain('vectors=5');
  });

  it('recommends CSS for a single solid rectangle', async () => {
    mockSend.mockResolvedValueOnce(sig({ type: 'RECTANGLE', name: 'Divider', isSinglePrimitive: true, rootFillTypes: ['SOLID'] }));
    const res = await call('classify_asset', {});
    expect(firstText(res)).toContain('Recommendation: CSS');
  });
});
