/**
 * Runtime validation for plugin command results (the MCP ⇄ plugin boundary).
 *
 * The plugin is updated by manually re-importing code.js into Figma, so version
 * skew between server and plugin is common in the wild. Without validation that
 * skew surfaces as `Cannot read properties of undefined` stringified into a tool
 * error; with it, the agent gets an actionable "plugin may be outdated" message.
 *
 * Schemas are deliberately lenient (`.passthrough()`, optional display-only
 * fields): they assert only the fields the server logic actually consumes —
 * fields that would crash or corrupt output when missing. Commands whose results
 * feed pure string interpolation degrade gracefully without validation and are
 * intentionally not listed here; add a schema when a result starts feeding logic.
 */
import { z } from "zod";

const box = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

const figmaEffect = z
  .object({
    type: z.string(),
    visible: z.boolean().optional(),
    color: z
      .object({ r: z.number(), g: z.number(), b: z.number(), a: z.number().optional() })
      .optional(),
    offset: z.object({ x: z.number(), y: z.number() }).optional(),
    radius: z.number().optional(),
    spread: z.number().optional(),
    blendMode: z.string().optional(),
  })
  .passthrough();

// No .passthrough() here: index signatures would defeat `"nodes" in typed`
// narrowing of the get_css union, and these results are render-only anyway.
const cssBlock = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  css: z.record(z.string()),
});

export const COMMAND_RESULT_SCHEMAS = {
  get_visual_snapshot: z
    .object({
      nodeId: z.string(),
      name: z.string(),
      type: z.string(),
      mimeType: z.string(),
      imageData: z.string().min(1),
      scale: z.number(),
      requestedScale: z.number(),
      capped: z.boolean(),
      width: z.number(),
      height: z.number(),
      absoluteBoundingBox: box.nullable(),
      selectionCount: z.number(),
    })
    .passthrough(),

  export_node_as_image: z
    .object({
      imageData: z.string().min(1),
      mimeType: z.string(),
    })
    .passthrough(),

  get_asset: z
    .object({
      kind: z.enum(["image", "svg"]),
      name: z.string().optional(),
      mimeType: z.string(),
      dataBase64: z.string().min(1),
      bytesLength: z.number(),
    })
    .passthrough(),

  extract_asset: z
    .object({
      kind: z.enum(["image", "svg"]),
      name: z.string().optional(),
      mimeType: z.string(),
      dataBase64: z.string().min(1),
      bytesLength: z.number(),
      rootEffects: z.array(figmaEffect),
      strippedCount: z.number(),
      box: box.nullable(),
      renderBounds: box.nullable(),
    })
    .passthrough(),

  classify_asset: z
    .object({
      nodeId: z.string(),
      name: z.string(),
      type: z.string(),
      // Pages have no width/height; display-only, so default rather than fail.
      width: z.number().default(0),
      height: z.number().default(0),
      nodeCount: z.number(),
      vectorCount: z.number(),
      textCount: z.number(),
      imageFillCount: z.number(),
      hasPhotoFill: z.boolean(),
      hasMask: z.boolean(),
      hasBlend: z.boolean(),
      unsupportedEffectTypes: z.array(z.string()),
      effectCount: z.number(),
      isSinglePrimitive: z.boolean(),
      rootFillTypes: z.array(z.string()),
    })
    .passthrough(),

  scan_assets: z
    .object({
      root: z.string(),
      imageCount: z.number(),
      vectorCount: z.number(),
      images: z.array(
        z
          .object({
            hash: z.string(),
            width: z.number().optional(),
            height: z.number().optional(),
            bytes: z.number().optional(),
            scaleMode: z.string().optional(),
            usedBy: z.array(z.object({ id: z.string(), name: z.string() }).passthrough()),
            suggestedName: z.string(),
          })
          .passthrough()
      ),
      vectors: z.array(
        z
          .object({
            nodeId: z.string(),
            name: z.string(),
            type: z.string(),
            width: z.number(),
            height: z.number(),
            suggestedName: z.string(),
          })
          .passthrough()
      ),
    })
    .passthrough(),

  get_fonts_used: z
    .object({
      root: z.string(),
      fonts: z.array(
        z
          .object({
            family: z.string(),
            style: z.string(),
            sizes: z.array(z.number()),
            occurrences: z.number(),
          })
          .passthrough()
      ),
    })
    .passthrough(),

  get_css: z.union([
    cssBlock,
    z.object({
      root: z.string(),
      count: z.number(),
      truncated: z.boolean(),
      nodes: z.array(cssBlock),
    }),
  ]),
} as const;

export type ValidatedCommand = keyof typeof COMMAND_RESULT_SCHEMAS;
export type CommandResult<C extends ValidatedCommand> = z.infer<
  (typeof COMMAND_RESULT_SCHEMAS)[C]
>;

/**
 * Validate a raw plugin result against the command's schema. Throws an
 * actionable error (pointing at the outdated-plugin cause) on mismatch.
 */
export function parseCommandResult<C extends ValidatedCommand>(
  command: C,
  raw: unknown
): CommandResult<C> {
  const parsed = COMMAND_RESULT_SCHEMAS[command].safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue && issue.path.length ? ` at "${issue.path.join(".")}"` : "";
    throw new Error(
      `Unexpected response shape from the Figma plugin for "${command}"${where}: ` +
      `${issue?.message ?? "validation failed"}. The plugin may be outdated — ` +
      `re-import the plugin (src/claude_mcp_plugin/manifest.json) in Figma to update it.`
    );
  }
  return parsed.data as CommandResult<C>;
}
