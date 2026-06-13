// Leveled logger writing to stderr (stdout is reserved for the MCP stdio
// transport). Debug output is gated behind LOG_LEVEL=debug because debug
// payloads can embed multi-MB base64 images — written unconditionally they
// bloat the MCP host's log files and leak rendered design content into them.
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevel = keyof typeof LEVELS;

const envLevel = (process.env.LOG_LEVEL || "").toLowerCase();
const threshold: number = envLevel in LEVELS ? LEVELS[envLevel as LogLevel] : LEVELS.info;

// Messages may be passed as thunks so suppressed levels skip the (potentially
// expensive) string construction entirely.
type Lazy = string | (() => string);

const emit = (level: LogLevel, tag: string, message: Lazy) => {
  if (LEVELS[level] < threshold) return;
  process.stderr.write(`[${tag}] ${typeof message === "function" ? message() : message}\n`);
};

export const logger = {
  debug: (message: Lazy) => emit("debug", "DEBUG", message),
  info: (message: Lazy) => emit("info", "INFO", message),
  warn: (message: Lazy) => emit("warn", "WARN", message),
  error: (message: Lazy) => emit("error", "ERROR", message),
  log: (message: Lazy) => emit("info", "LOG", message),
};

/** Stringify a value for logging, capped so image payloads can't flood logs. */
export function truncateForLog(value: unknown, max = 2048): string {
  let s: string;
  try {
    s = typeof value === "string" ? value : JSON.stringify(value) ?? String(value);
  } catch {
    s = String(value);
  }
  return s.length > max ? `${s.slice(0, max)}… [truncated ${s.length - max} of ${s.length} chars]` : s;
}
