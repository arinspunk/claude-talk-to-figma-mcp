import { classifyAsset, NodeSignals } from '../../../src/talk_to_figma_mcp/utils/asset-classify';

function signals(overrides: Partial<NodeSignals>): NodeSignals {
  return {
    nodeId: '1:1', name: 'n', type: 'FRAME', width: 100, height: 100,
    nodeCount: 1, vectorCount: 0, textCount: 0, imageFillCount: 0, hasPhotoFill: false,
    hasMask: false, hasBlend: false, unsupportedEffectTypes: [], effectCount: 0,
    isSinglePrimitive: false, rootFillTypes: [],
    ...overrides,
  };
}

describe('classifyAsset', () => {
  it('recommends raster for photographic image fills', () => {
    const r = classifyAsset(signals({ type: 'RECTANGLE', imageFillCount: 1, hasPhotoFill: true, isSinglePrimitive: true, rootFillTypes: ['IMAGE'] }));
    expect(r.recommendation).toBe('raster');
    expect(r.confidence).toBeGreaterThan(0.9);
  });

  it('recommends css for a single simple rounded rectangle', () => {
    const r = classifyAsset(signals({ type: 'RECTANGLE', isSinglePrimitive: true, rootFillTypes: ['SOLID'] }));
    expect(r.recommendation).toBe('css');
    expect(r.reasons.join(' ')).toMatch(/CSS box/);
  });

  it('recommends css for a single gradient rectangle', () => {
    const r = classifyAsset(signals({ type: 'RECTANGLE', isSinglePrimitive: true, rootFillTypes: ['GRADIENT_LINEAR'] }));
    expect(r.recommendation).toBe('css');
  });

  it('recommends svg for clean vector art', () => {
    const r = classifyAsset(signals({ type: 'GROUP', vectorCount: 6, nodeCount: 9 }));
    expect(r.recommendation).toBe('svg');
  });

  it('forces raster when a node has a NOISE effect (SVG-hostile)', () => {
    const r = classifyAsset(signals({ type: 'FRAME', vectorCount: 2, nodeCount: 4, effectCount: 1, unsupportedEffectTypes: ['NOISE'] }));
    expect(r.recommendation).toBe('raster');
    expect(r.reasons.join(' ')).toMatch(/NOISE/);
  });

  it('forces raster for masks and blend modes', () => {
    expect(classifyAsset(signals({ type: 'GROUP', vectorCount: 3, nodeCount: 5, hasMask: true })).recommendation).toBe('raster');
    expect(classifyAsset(signals({ type: 'GROUP', vectorCount: 3, nodeCount: 5, hasBlend: true })).recommendation).toBe('raster');
  });

  it('forces raster for very large subtrees', () => {
    const r = classifyAsset(signals({ type: 'FRAME', vectorCount: 50, nodeCount: 500 }));
    expect(r.recommendation).toBe('raster');
  });

  it('image fill beats simple-shape detection', () => {
    // A rectangle with an image fill is raster, not css.
    const r = classifyAsset(signals({ type: 'RECTANGLE', isSinglePrimitive: true, imageFillCount: 1, rootFillTypes: ['IMAGE'] }));
    expect(r.recommendation).toBe('raster');
  });

  it('suggests a raster fallback for big SVGs', () => {
    const r = classifyAsset(signals({ type: 'GROUP', vectorCount: 80, nodeCount: 150 }));
    expect(r.recommendation).toBe('svg');
    expect(r.alternative).toBe('raster');
  });
});
