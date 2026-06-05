import { effectsToCss, figmaColorToCss, FigmaEffect } from '../../../src/talk_to_figma_mcp/utils/effects-css';

describe('figmaColorToCss', () => {
  it('emits rgb() for opaque colors', () => {
    expect(figmaColorToCss({ r: 1, g: 0.403922, b: 0.00392157, a: 1 })).toBe('rgb(255, 103, 1)');
  });
  it('emits rgba() for translucent colors', () => {
    expect(figmaColorToCss({ r: 0, g: 0, b: 0, a: 0.5 })).toBe('rgba(0, 0, 0, 0.5)');
  });
  it('defaults missing alpha to opaque', () => {
    expect(figmaColorToCss({ r: 1, g: 1, b: 1 })).toBe('rgb(255, 255, 255)');
  });
});

describe('effectsToCss', () => {
  it('returns empty result for no effects', () => {
    const r = effectsToCss([]);
    expect(r.boxShadow).toBeNull();
    expect(r.filter).toBeNull();
    expect(r.fullyReproducible).toBe(false);
  });

  it('translates a drop shadow to box-shadow with offset/radius/spread', () => {
    const fx: FigmaEffect[] = [
      { type: 'DROP_SHADOW', color: { r: 1, g: 0.4, b: 0, a: 1 }, offset: { x: 0, y: 4 }, radius: 5, spread: 0 },
    ];
    const r = effectsToCss(fx);
    expect(r.boxShadow).toBe('0px 4px 5px 0px rgb(255, 102, 0)');
    expect(r.fullyReproducible).toBe(true);
    expect(r.perEffect[0].note).toMatch(/drop-shadow/);
  });

  it('marks inner shadows with the inset keyword', () => {
    const r = effectsToCss([{ type: 'INNER_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.25 }, offset: { x: 1, y: 1 }, radius: 2 }]);
    expect(r.boxShadow).toBe('inset 1px 1px 2px 0px rgba(0, 0, 0, 0.25)');
  });

  it('translates layer blur to filter and background blur to backdrop-filter', () => {
    const r = effectsToCss([
      { type: 'LAYER_BLUR', radius: 8 },
      { type: 'BACKGROUND_BLUR', radius: 12 },
    ]);
    expect(r.filter).toBe('blur(8px)');
    expect(r.backdropFilter).toBe('blur(12px)');
  });

  it('flags NOISE/TEXTURE as not reproducible', () => {
    const r = effectsToCss([{ type: 'NOISE', radius: 1 } as FigmaEffect]);
    expect(r.unsupported).toContain('NOISE');
    expect(r.fullyReproducible).toBe(false);
    expect(r.perEffect[0].reproducible).toBe(false);
  });

  it('ignores invisible effects', () => {
    const r = effectsToCss([{ type: 'DROP_SHADOW', visible: false, offset: { x: 0, y: 4 }, radius: 5 }]);
    expect(r.boxShadow).toBeNull();
  });

  it('scales lengths by the scale factor', () => {
    const r = effectsToCss([{ type: 'LAYER_BLUR', radius: 10 }], 2);
    expect(r.filter).toBe('blur(20px)');
  });

  it('combines multiple shadows into one box-shadow value', () => {
    const r = effectsToCss([
      { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 1 }, offset: { x: 0, y: 1 }, radius: 1 },
      { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.5 }, offset: { x: 0, y: 8 }, radius: 16 },
    ]);
    expect(r.boxShadow).toBe('0px 1px 1px 0px rgb(0, 0, 0), 0px 8px 16px 0px rgba(0, 0, 0, 0.5)');
  });
});
