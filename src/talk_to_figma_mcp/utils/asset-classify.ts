/**
 * Decide how a Figma node should become a web asset: a raster PNG, an inline
 * SVG, or pure CSS. Pure & dependency-free → the plugin gathers raw SIGNALS
 * about a node's subtree and this function makes the call, so the heuristic is
 * unit-testable without a live Figma file.
 *
 * Rules of thumb encoded here:
 *  - Photographic / image-fill content can't be vectorized → PNG.
 *  - A single simple shape (rect/ellipse/line) with a solid or gradient fill and
 *    at most a uniform stroke/radius is cheaper and sharper as CSS.
 *  - Clean vector art (icons, logos, line work) with no raster fills and no
 *    export-hostile effects → SVG.
 *  - Masks, non-normal blend modes, NOISE/TEXTURE effects, or very large
 *    subtrees don't survive SVG cleanly → PNG (export clean, reapply effects).
 */

export interface NodeSignals {
  nodeId: string;
  name: string;
  type: string;
  width: number;
  height: number;
  /** Total nodes in the subtree (including the root). */
  nodeCount: number;
  /** Descendant nodes whose type is a vector primitive. */
  vectorCount: number;
  /** Descendant TEXT nodes. */
  textCount: number;
  /** Distinct image fills found anywhere in the subtree. */
  imageFillCount: number;
  /** True if any image fill uses FILL/CROP scale mode (i.e. a photo, not a tiny pattern). */
  hasPhotoFill: boolean;
  /** Any descendant uses a mask. */
  hasMask: boolean;
  /** Any descendant uses a non-NORMAL blend mode. */
  hasBlend: boolean;
  /** Effect types present anywhere in the subtree that CSS can't reproduce (NOISE/TEXTURE/…). */
  unsupportedEffectTypes: string[];
  /** Total visible effects in the subtree. */
  effectCount: number;
  /** Root node is a single primitive shape with no children. */
  isSinglePrimitive: boolean;
  /** Fill kinds on the root: e.g. ["SOLID"], ["GRADIENT_LINEAR"], ["IMAGE"]. */
  rootFillTypes: string[];
}

export type Recommendation = "raster" | "svg" | "css";

export interface ClassifyResult {
  recommendation: Recommendation;
  /** 0-1 confidence in the recommendation. */
  confidence: number;
  reasons: string[];
  /** Secondary option worth considering, if any. */
  alternative?: Recommendation;
  signals: NodeSignals;
}

const PRIMITIVE_FILLS = new Set(["SOLID", "GRADIENT_LINEAR", "GRADIENT_RADIAL", "GRADIENT_ANGULAR", "GRADIENT_DIAMOND"]);

export function classifyAsset(s: NodeSignals): ClassifyResult {
  const reasons: string[] = [];

  // 1) Raster wins whenever there's photographic content — vectors can't carry it.
  if (s.hasPhotoFill || s.imageFillCount > 0) {
    if (s.hasPhotoFill) reasons.push("Contains a photographic image fill (FILL/CROP) — not vectorizable.");
    else reasons.push(`Contains ${s.imageFillCount} image fill(s).`);
    // A bare image rectangle: still raster, but note the original bytes are best.
    return {
      recommendation: "raster",
      confidence: s.hasPhotoFill ? 0.95 : 0.85,
      reasons,
      alternative: s.imageFillCount === 1 && s.isSinglePrimitive ? undefined : "svg",
      signals: s,
    };
  }

  // 2) Export-hostile features force a raster (export clean, reapply effects in CSS).
  const hostile: string[] = [];
  if (s.unsupportedEffectTypes.length) hostile.push(`effects CSS can't reproduce (${[...new Set(s.unsupportedEffectTypes)].join(", ")})`);
  if (s.hasMask) hostile.push("masking");
  if (s.hasBlend) hostile.push("non-normal blend mode(s)");
  if (s.nodeCount > 400) hostile.push(`large subtree (${s.nodeCount} nodes)`);
  if (hostile.length) {
    reasons.push(`SVG export would be unreliable: ${hostile.join(", ")}. Export a clean raster and reapply effects in code.`);
    return { recommendation: "raster", confidence: 0.8, reasons, alternative: "svg", signals: s };
  }

  // 3) A single simple shape is cheapest and sharpest as CSS.
  const rootIsPrimitiveShape = ["RECTANGLE", "ELLIPSE", "LINE", "VECTOR"].includes(s.type);
  const fillsAreSimple = s.rootFillTypes.every((f) => PRIMITIVE_FILLS.has(f)) && s.rootFillTypes.length <= 1;
  if (s.isSinglePrimitive && rootIsPrimitiveShape && fillsAreSimple && s.effectCount === 0 && s.type !== "VECTOR") {
    reasons.push(`Single ${s.type.toLowerCase()} with a ${s.rootFillTypes[0]?.toLowerCase() || "simple"} fill — reproduce as a CSS box (border/border-radius/background).`);
    return { recommendation: "css", confidence: 0.85, reasons, alternative: "svg", signals: s };
  }

  // 4) Otherwise: clean vector content → SVG.
  if (s.vectorCount > 0 || s.type === "VECTOR" || s.type === "BOOLEAN_OPERATION") {
    reasons.push(`Vector art (${s.vectorCount || 1} vector node(s)${s.textCount ? `, ${s.textCount} text` : ""}), no raster fills or export-hostile features — inline SVG.`);
    const confidence = s.nodeCount > 120 ? 0.6 : 0.85;
    if (s.nodeCount > 120) reasons.push(`Subtree is fairly large (${s.nodeCount} nodes); a PNG is a safe fallback if the SVG is heavy.`);
    return { recommendation: "svg", confidence, reasons, alternative: s.nodeCount > 120 ? "raster" : "css", signals: s };
  }

  // 5) Fallback: frames/groups of shapes with no images → SVG is the safe default.
  reasons.push("Shape/group content with no raster fills — default to SVG.");
  return { recommendation: "svg", confidence: 0.6, reasons, alternative: "raster", signals: s };
}
