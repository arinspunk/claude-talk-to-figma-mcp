/**
 * Convert Figma effects into ready-to-use CSS so an asset can be exported CLEAN
 * (effects stripped) and the effects reproduced in code instead of baked into a
 * raster. Pure & dependency-free → unit-testable without a live Figma file.
 *
 * Figma effect shape (Plugin API & JSON_REST_V1 agree on the parts we use):
 *   { type, color:{r,g,b,a 0-1}, offset:{x,y}, radius, spread, blendMode, visible }
 *   blurs: { type:"LAYER_BLUR"|"BACKGROUND_BLUR", radius, visible }
 *
 * Why strip-then-reproduce: shadows/blurs bleed past the layout box (so a
 * with-effects export is larger and misaligned), and some newer effects
 * (NOISE / TEXTURE) don't survive SVG export at all — they blank the node in a
 * browser. Exporting clean + reapplying CSS keeps the asset crisp and aligned.
 */

export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface FigmaEffect {
  type: string;
  visible?: boolean;
  color?: FigmaColor;
  offset?: { x: number; y: number };
  radius?: number;
  spread?: number;
  blendMode?: string;
}

export interface PerEffectCss {
  type: string;
  /** A CSS fragment for THIS effect (a box-shadow term, a filter term, …). */
  css: string;
  /** Which CSS property this fragment belongs to. */
  property: "box-shadow" | "filter" | "backdrop-filter" | null;
  /** False when the effect can't be expressed in CSS (e.g. NOISE/TEXTURE). */
  reproducible: boolean;
  note?: string;
}

export interface EffectsCss {
  /** Combined `box-shadow` value (drop + inner shadows), or null. */
  boxShadow: string | null;
  /** Combined `filter` value (layer blur + drop-shadow alt for transparent PNGs), or null. */
  filter: string | null;
  /** Combined `backdrop-filter` value (background blur), or null. */
  backdropFilter: string | null;
  /** Per-effect breakdown, in source order. */
  perEffect: PerEffectCss[];
  /** Effect types we could not translate (caller should keep them baked or use a PNG). */
  unsupported: string[];
  /** True if every visible effect was reproducible in CSS. */
  fullyReproducible: boolean;
}

/** Round to at most `dp` decimals, dropping trailing zeros. */
function round(n: number, dp = 2): number {
  return +n.toFixed(dp);
}

/** Figma 0-1 color → CSS rgb()/rgba(). */
export function figmaColorToCss(c?: FigmaColor): string {
  if (!c) return "rgba(0,0,0,0.25)";
  const r = Math.round((c.r ?? 0) * 255);
  const g = Math.round((c.g ?? 0) * 255);
  const b = Math.round((c.b ?? 0) * 255);
  const a = c.a ?? 1;
  return a >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${round(a, 3)})`;
}

/** A length in px, scaled (e.g. for a 2x export reproduced at 1x design size, scale=1). */
function px(n: number | undefined, scale = 1): string {
  return `${round((n ?? 0) * scale)}px`;
}

/**
 * Translate a node's effects into CSS.
 * @param effects  The node's `effects` array (Figma format).
 * @param scale    Multiplier for all lengths (default 1 = design px). Pass the
 *                 ratio your CSS units differ from design px if needed.
 */
export function effectsToCss(effects: FigmaEffect[] | undefined, scale = 1): EffectsCss {
  const list = (effects || []).filter((e) => e && e.visible !== false);
  const boxShadows: string[] = [];
  const filters: string[] = [];
  const backdrop: string[] = [];
  const perEffect: PerEffectCss[] = [];
  const unsupported: string[] = [];

  for (const e of list) {
    switch (e.type) {
      case "DROP_SHADOW": {
        const term = `${px(e.offset?.x, scale)} ${px(e.offset?.y, scale)} ${px(e.radius, scale)} ${px(e.spread, scale)} ${figmaColorToCss(e.color)}`;
        boxShadows.push(term);
        // drop-shadow() ignores spread but follows alpha shape — better for cut-out PNGs.
        const ds = `drop-shadow(${px(e.offset?.x, scale)} ${px(e.offset?.y, scale)} ${px(e.radius, scale)} ${figmaColorToCss(e.color)})`;
        perEffect.push({
          type: e.type,
          css: term,
          property: "box-shadow",
          reproducible: true,
          note: `For a transparent PNG, prefer filter: ${ds}`,
        });
        break;
      }
      case "INNER_SHADOW": {
        const term = `inset ${px(e.offset?.x, scale)} ${px(e.offset?.y, scale)} ${px(e.radius, scale)} ${px(e.spread, scale)} ${figmaColorToCss(e.color)}`;
        boxShadows.push(term);
        perEffect.push({ type: e.type, css: term, property: "box-shadow", reproducible: true });
        break;
      }
      case "LAYER_BLUR": {
        const term = `blur(${px(e.radius, scale)})`;
        filters.push(term);
        perEffect.push({ type: e.type, css: term, property: "filter", reproducible: true });
        break;
      }
      case "BACKGROUND_BLUR": {
        const term = `blur(${px(e.radius, scale)})`;
        backdrop.push(term);
        perEffect.push({ type: e.type, css: term, property: "backdrop-filter", reproducible: true });
        break;
      }
      default: {
        // NOISE, TEXTURE, GRAIN, and any future type: not expressible in CSS.
        unsupported.push(e.type);
        perEffect.push({
          type: e.type,
          css: "",
          property: null,
          reproducible: false,
          note: "Not expressible in CSS — keep it baked in a raster export, or omit.",
        });
      }
    }
  }

  return {
    boxShadow: boxShadows.length ? boxShadows.join(", ") : null,
    filter: filters.length ? filters.join(" ") : null,
    backdropFilter: backdrop.length ? backdrop.join(" ") : null,
    perEffect,
    unsupported,
    fullyReproducible: list.length > 0 && unsupported.length === 0,
  };
}
