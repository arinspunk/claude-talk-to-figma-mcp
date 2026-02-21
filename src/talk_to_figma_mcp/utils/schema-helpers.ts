import { z } from "zod";

/**
 * Wrap a Zod schema to auto-parse JSON strings from MCP/WebSocket serialization.
 * If the value is a string, attempts JSON.parse; on failure returns the original
 * value so Zod's own validation produces a proper ZodError.
 */
export const coerceJson = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => {
    if (typeof val === "string") {
      try { return JSON.parse(val); } catch { return val; }
    }
    return val;
  }, schema);

/**
 * Coerce string "true"/"false" to boolean for MCP/WebSocket serialization.
 * Unlike z.coerce.boolean() which uses JS truthiness (dangerous: "false" → true),
 * this only converts the exact strings "true" and "false".
 */
export const coerceBoolean = z.preprocess(
  (val) => val === "true" ? true : val === "false" ? false : val,
  z.boolean()
);
