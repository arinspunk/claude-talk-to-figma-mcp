# Architectural Review — claude-talk-to-figma-mcp

**Branch:** `feature/zero-config-multimodal-mcp` (v1.3.0, HEAD `bdc4f12`)
**Scope:** MCP server (`src/talk_to_figma_mcp/`), WebSocket relay (`src/socket.ts`), Figma plugin (`src/claude_mcp_plugin/`), build/CI.

---

## 1. System Overview

Three cooperating processes:

```
Claude (MCP client)
   │ stdio
   ▼
MCP server  (Node/Bun, src/talk_to_figma_mcp/server.ts)
   │ ws://localhost:3055  — role: "agent", channel: "__auto__"
   ▼
Relay       (Bun.serve, src/socket.ts) — per-channel FIFO queue, auto-routing, heartbeat
   │ ws://localhost:3055  — role: "plugin", channel: <random 8-char>
   ▼
Plugin UI iframe (ui.html)  ⇄ postMessage ⇄  Plugin sandbox (code.js, Figma Plugin API)
```

**Key design decision:** there is **no Figma REST API usage anywhere**. All document access goes through the Plugin API inside the user's running Figma session. Consequently there are **no Figma access tokens, no file keys, and no HTTP 429 concerns** — the questions of token storage and REST rate-limit backoff are structurally moot (verified: no `fetch` to `api.figma.com`, no `FIGMA_TOKEN`-style env vars in the tree). The trade-offs move elsewhere: the security boundary becomes the **unauthenticated localhost relay** (§3.1), and "rate limiting" becomes the relay's **per-channel serialized command queue** (`MAX_QUEUE_SIZE` 100, 2-min per-command timeout), which is implemented and works.

### 1.1 Zero-config trace (how it survives missing/malformed config)

- **No env vars are required.** The MCP server reads only CLI args (`--server`, `--port`, `--reconnect-interval`, `config/config.ts:4-12`); the relay reads `--port` / `FIGMA_SOCKET_PORT` / `FIGMA_SOCKET_HOST` (`socket.ts:588-597`). Everything defaults sanely (localhost:3055).
- **Channel handshake removed:** the MCP joins sentinel channel `__auto__` on every (re)connect (`utils/websocket.ts:70-81`); the relay resolves `__auto__` to the single live plugin's channel at command time (`socket.ts:106-143`), returning instructive errors for 0 or >1 plugins. `SERVER_INSTRUCTIONS` (`config/config.ts:27-33`) tells the model not to ask for channel IDs.
- **Liveness:** relay pings plugins at the application level every 10 s and reaps sockets silent >25 s — except while a command is in flight (`socket.ts:1074-1101`), since `exportAsync` blocks the single-threaded plugin. Plugin replies `{type:"pong"}` (`ui.html:384-389`). Both the plugin UI (`ui.html:457-473`) and the MCP client (`websocket.ts:199-204`) auto-reconnect with exponential backoff + jitter; the MCP additionally dedupes its own reconnects via a stable `sessionId` that the relay uses to evict stale agent sockets (`socket.ts:705-723`).
- **Startup failure tolerance:** `connectToFigma()` failure at boot is caught and deferred to first command (`server.ts:48-53`); commands wait up to 15 s for connection+join before failing (`websocket.ts:281-303`).
- **Gap:** malformed CLI args are *not* validated — `parseInt('abc')` → `NaN` propagates (see Critical Bug C2).

The design is genuinely robust for the "no config at all" case; the weak spot is *malformed* (rather than missing) input, plus the relay-down-forever case, which retries every ≤30 s indefinitely (acceptable, but it never surfaces a "give up" state).

### 1.2 Multimodal pipeline trace

Node data and pixels take the same transport but different shapes:

- **Structured data:** plugin `exportAsync({format:"JSON_REST_V1"})` → JSON → UI iframe postMessage → WS → relay (parse + re-stringify) → MCP, which *then* depth-filters with `filterFigmaNode` (`document-tools.ts:94`). Filtering after transport is the main inefficiency (P1).
- **Pixels:** `getVisualSnapshot` (`code.js:1245-1317`) exports PNG with a **scale auto-cap** (longest side ≤ `maxDimension`, default 2000 px — protects both export timeouts and model-usable resolution), encodes with **native `figma.base64Encode` when available** (`bytesToBase64`, `code.js:1327-1332`; the O(n²) string-concat fallback is correctly documented as a last resort), then travels as base64 inside JSON. The relay's `maxPayloadLength` is raised to 100 MB for this (`socket.ts:669`). The MCP returns it as a proper MCP `image` content block plus a geometry caption (logical size + absolute canvas position) so the model can map pixels→coordinates (`image-tools.ts:60-91`).
- **Assets:** `scan_assets` inventories hashes/dimensions *without* bytes (opt-in `includeByteSizes`), and `get_asset`/`extract_asset` write bytes to disk and return a **path**, so raw bytes never enter model context — a good context-economy pattern. `extract_asset` strips effects before export and returns them as CSS (`effects-css.ts`), with bounds-bleed reporting.
- **Verification loop:** `compare_to_figma` snapshots the node, captures the implemented UI headlessly at the node's exact logical size (`utils/capture.ts` — warm-up GETs, taller-than-needed viewport + crop), and computes SSIM + color delta + 3×3 region map + edge overflow + diff heatmap (`utils/image-compare.ts`). Architecturally sound; the SSIM work is duplicated per call (P3).

Overall verdict: the pipeline is well-shaped for an LLM consumer (caps, captions, paths-not-bytes). The costs are in *logging* (C3), *transport re-serialization* (P2), and *no depth pushdown* (P1).

---

## 2. Critical Bugs

### C1 — Plugin disconnect mid-command hangs the agent for 2–5 minutes in zero-config mode (relay close-handler ordering)

`socket.ts` close handler (`socket.ts:997-1050`): channel membership is removed and **empty channels are deleted — including their `channelQueues` entry — *before* `cleanupClient()` runs** (`socket.ts:1030-1034` vs `:1039`).

In the flagship zero-config topology the agent is a member of `__auto__`, *not* of the plugin's channel, so the plugin is the **only** member of its channel. When the plugin disconnects:

1. `channels.delete(ch)` + `channelQueues.delete(ch)` fire first (channel is now empty).
2. `cleanupClient(ws, clientChannels)` then finds no `queueState` for the channel (`socket.ts:474-476`) and silently skips the in-flight flush — the immediate *"Figma plugin disconnected while processing command"* error (`socket.ts:489-503`) **is never sent**.
3. The agent instead waits for the orphaned per-command timeout closure (2 min, `socket.ts:346-374`) — or, for queued-but-not-started commands, nothing at all until the MCP-side request timeout (up to 5 min).

The carefully built disconnect-flush logic is dead code in precisely the mode it was built for. (In manual-join mode, where agent and plugin share a channel, the channel isn't empty after the plugin leaves and the flush works — which is presumably why tests pass.)

**Fix (small):** in the close handler, call `cleanupClient(ws, clientChannels)` **before** the channel-removal loop, or defer `channelQueues.delete` until after `cleanupClient`, and additionally make the plugin branch of `cleanupClient` reject *all queued items* for the plugin's channels (not just the in-flight one).

### C2 — Malformed CLI args produce `NaN` and an infinite, possibly tight, reconnect loop

`config/config.ts:10-12`: `--port=abc` → `parseInt` → `NaN` → `new WebSocket("ws://localhost:NaN")` throws on every attempt → retry every `reconnectInterval` forever, with no actionable message. If `--reconnect-interval` is *also* malformed, `setTimeout(fn, NaN)` fires at ~1 ms → a hot spin loop flooding stderr. This is exactly the "malformed input" half of the zero-config promise. **Fix:** validate with `Number.isFinite` + bounds; fall back to defaults with a single warning.

### C3 — Unconditional debug logging ships multi-MB base64 design content into logs

There is no log-level gating anywhere (`utils/logger.ts` writes every level unconditionally; the relay's `logger.debug` is a bare `console.log`).

- `websocket.ts:147` — **every** response is `JSON.stringify`'d a second time and written to stderr. A 2000 px @2x snapshot is several MB of base64; stderr of a stdio MCP server is captured into the host's (e.g. Claude Desktop's) log files. Effects: doubled CPU/memory per image, unbounded log-disk growth, and **the user's design renders + asset bytes persisted into host logs** — the closest thing this system has to a "secrets bleeding into logs" problem.
- `websocket.ts:373` — full request logging; `set_image_fill`/`set_image` requests embed user-supplied base64 images.
- `socket.ts:676` — relay logs every inbound message (up to the 100 MB cap) to stdout.

**Fix (small):** gate `debug` behind an env flag (`LOG_LEVEL=debug`) and truncate logged payloads (e.g. 2 KB) at all three sites.

### C4 — Queue/progress handlers silently replace the caller's timeout

`websocket.ts:88-104` (queue_position → hardcoded 300 s) and `:121-127` (progress → 120 s) discard the caller's `timeoutMs`. Concretely: MCP **resource reads** use a 15 s timeout (`resources/index.ts:24`); if the command lands in a non-empty queue, one `queue_position` message stretches that to 5 minutes — a resource read that blocks the client for minutes contradicts its own design ("degrade gracefully"). **Fix:** store `timeoutMs` on `PendingRequest` and reuse it (or `min(original, extension)`) when re-arming.

### C5 — `get_asset` / `extract_asset` `filename` allows path escape

`image-tools.ts:434-440` and `asset-tools.ts:62-69`: `filename` (model-controlled) only has its *extension* stripped, then `path.join(dir, base + ext)` — `filename: "../../.bashrc"` writes outside `outDir`. Severity is tempered (local tool, model-driven, `outDir` itself is a free parameter), but it's a one-line hardening: `path.basename(...)` the stem. Same for the `name`-derived stem (already slug-sanitized — fine).

---

## 3. Architectural Flaws

### A1 — Unauthenticated relay + no Origin check ⇒ cross-site WebSocket hijacking of the user's Figma document

The relay accepts any WebSocket upgrade with no auth, no Origin validation, and `Access-Control-Allow-Origin: *` (`socket.ts:599-665`; the code itself warns "the relay has no auth" only in the context of `FIGMA_SOCKET_HOST`, `socket.ts:595-596`). Browsers do **not** apply CORS to WebSocket connects, so **any web page open in the user's browser** can `new WebSocket("ws://localhost:3055")` and:

- join with `role: "agent"` and exfiltrate the open document through auto-routing (`get_document_info`, `export_node_as_image`, `get_asset` — full pixel and byte access), or mutate/destroy it (`delete_node`, `set_text_content`, …);
- join with `role: "plugin"` to either DoS auto-routing (2 plugins ⇒ ambiguity error) or, if it joins while the real plugin is absent, capture commands as a rogue endpoint;
- read `/status` stats cross-origin.

This is the project's real security boundary now that there are no API tokens. **Recommended mitigations** (in increasing strength): (1) reject upgrades whose `Origin` header is a non-Figma `http(s)` origin — the MCP client sends no Origin, the Figma plugin iframe sends a `null`/figma origin, while drive-by pages send theirs; (2) a shared secret generated by the relay at startup, displayed for the plugin UI and passed via `--token` to the MCP (one-time pairing); (3) keep `0.0.0.0` binding loudly discouraged. At minimum, document the exposure in README/TROUBLESHOOTING.

### A2 — Depth filtering happens after transport, not before (`get_node_info`)

`code.js:399-419` exports the **entire** subtree as `JSON_REST_V1`; `document-tools.ts:94` then prunes to `depth ?? 1`. For a large section this serializes MBs inside the single-threaded plugin sandbox (freezing the canvas/UI and starving the heartbeat — the heartbeat's "busy" exemption masks it), pushes it through 4 JSON encode/decode hops, then throws ~95 % away. The plugin already demonstrates the right pattern elsewhere (`getCSS` walks with `maxNodes`, `filterFigmaNode`-style stubs exist). **Fix:** pass `depth` through the command and prune inside the plugin before returning (keep MCP-side filtering as belt-and-braces for old plugins). Same for `get_nodes_info`.

### A3 — Stale embedded package: `src/talk_to_figma_mcp/package.json` (+ `bun.lock`)

A leftover v0.5.1 manifest pinning `@modelcontextprotocol/sdk: "latest"` and `uuid ^9` with its own lockfile and scripts. Nothing references it (the root tsup/tsc builds from source), but it is a live hazard: tooling (audit scanners, editors, `npm i` run in the wrong cwd) will resolve dependencies against it, and `"latest"` is unpinnable supply-chain drift. **Fix:** delete both files (keep `tsconfig.json` there — `typecheck` uses it).

### A4 — Channel identity is ephemeral; manual-join mode breaks on any plugin reconnect

`ui.html:711-716` generates a fresh random channel on **every** connect, and the relay's session dedupe applies only to agents (plugins don't send `sessionId`). In zero-config mode this is invisible, but in the one mode where channels matter (multiple files connected, agent manually joined channel X), a plugin blip strands the agent on a dead channel — and the MCP's own reconnect even deliberately *restores* the stale manual channel (`websocket.ts:77-80`). **Fix options:** persist the channel name in `figma.clientStorage` so a file reconnects to the same channel, and/or have the relay map manual channels by plugin identity. Low urgency, but it undermines the documented disambiguation workflow.

### A5 — `extract_asset` mutates the live document to export

`code.js:1691-1739` blanks `n.effects` across the subtree, exports, restores in `finally`. Correct in the happy path, but a hard plugin termination mid-export (tab close, Figma crash, plugin reload) permanently loses user effects, and each run pollutes document history/undo. **Safer pattern:** `node.clone()` → strip the clone → export → `clone.remove()` — zero risk to user content for a modest perf cost. At minimum the tool description should disclose the temporary mutation.

### A6 — Unvalidated `as`-cast boundary between MCP and plugin (77 sites)

Every tool does `result as { ... }` on `unknown` (77 occurrences across `tools/`). Version skew between server and plugin (very likely in the wild: plugin updates are manual re-imports of `code.js`) surfaces as `TypeError: Cannot read properties of undefined` stringified into a tool error, with no hint that the plugin is outdated. This is both an architectural robustness gap and the main TypeScript refactoring opportunity (T1).

---

## 4. Stability Audit Notes (promises, leaks, races)

What was checked and found **sound**:

- **Unhandled rejections:** `main().catch` (`server.ts:66`); `autoJoinChannel` has `.catch` (`websocket.ts:232`); plugin `Promise.race` timeout pattern attaches handlers to both promises so a late `exportAsync` rejection is not unhandled (`code.js:1187-1198`); `clientStorage.getAsync().catch` (`code.js:102-110`).
- **Pending-request hygiene:** MCP rejects + clears all pending requests on socket close (`websocket.ts:192-197`); relay sweeps `requestToClient` entries >10 min (`socket.ts:546-560`); session-dedupe entries removed only by current holder (`socket.ts:1042-1047`).
- **Queue race guards:** the per-command timeout and the response handler both verify `currentRequestId` before unblocking (`socket.ts:350`, `:451`) — the double-dequeue/FIFO-break race is correctly closed; queue draining uses `setTimeout(0)` to avoid stack overflow (`socket.ts:338`, `:509`).
- **Heartbeat vs long commands:** in-flight plugins are exempt from reaping, with the per-command timeout as the hung-plugin backstop (`socket.ts:1074-1093`) — a thoughtful interaction.
- **Send-after-drop race:** `sendCommandToFigma` re-checks socket state after the connection wait, just before send (`websocket.ts:366-371`).

Remaining minor issues:

- **M1** — Session-dedupe eviction path (`socket.ts:711-719`) removes the old socket from channels **without** the empty-channel cleanup, leaving empty `Set`s (and their `channelQueues`) in the maps indefinitely. Bounded, but it also interacts with C1's fix ordering.
- **M2** — `validateCommand(data, channelName)`'s second parameter is unused (`socket.ts:156`).
- **M3** — ui.html logs every message object (`ui.html:391`, `:503`, `:540`); browser consoles retain references, so multi-MB snapshot strings accumulate in iframe memory over a long session. Gate or truncate.
- **M4** — `join_channel` tool: `z.string()` admits `""`, which trips the dead "followUp" branch (`document-tools.ts:348-362`) — a non-MCP construct that does nothing. Use `.min(1)` and delete the branch.
- **M5** — `export_node_as_image` returns PDF (`application/pdf`) inside an MCP `image` content block (`document-tools.ts:404-421`) — invalid per spec; clients may reject. Return PDFs as a file path or omit PDF.
- **M6** — `image-compare.ts:57-62` `hexToRgb` accepts only 6-digit hex; `targetColor: "#fff"` silently disables the brand-color check instead of warning.
- **M7** — `rgbaToHex` (`figma-helpers.ts:10-17`) yields `#rrggbbNaN` if `color.a` is undefined; default `a ?? 1`.
- **M8** — Dead import `os` in `image-tools.ts:7` (would be caught by `noUnusedLocals`, see T4).

---

## 5. Performance Upgrades

- **P1 — Push `depth` into the plugin for `get_node_info`/`get_nodes_info`** (see A2). Biggest single win for large-document workflows: avoids serializing whole subtrees in the UI-blocking sandbox and shipping them through 4 parse/stringify hops.
- **P2 — Relay double-serialization.** Every payload is `JSON.parse`d then re-`JSON.stringify`'d to re-wrap the envelope (`socket.ts:677`, `:287-292`, `:423-428`) — for a 10 MB snapshot that's ~4 full-buffer passes in the relay alone. A cheap improvement without protocol changes: for `message`-type frames, splice the raw inner `message` string into the envelope (or move metadata to a small header frame). Measure first; this only matters for image-heavy loops.
- **P3 — `compare_to_figma` computes everything twice.** `compareImages` and `writeDiffHeatmap` each call `buildGrids` + `ssimMap` on the same two buffers (`verify-tools.ts:72-80` → `image-compare.ts:138-146`, `:232-239`): two PNG decodes (~16 MB buffers at 2000 px) and two SSIM passes per comparison. Refactor `writeDiffHeatmap` to accept the precomputed grids/cell map.
- **P4 — Asset/sn​apshot caching.** The render→compare→fix loop re-exports identical content every iteration. An in-MCP LRU keyed by `imageHash` (for `get_asset`) costs ~20 lines and eliminates repeat plugin round-trips for unchanged assets; for snapshots, returning `node.version`-style fingerprints (or hashing bytes plugin-side) would let the server reply "unchanged" cheaply. `scan_assets` could also reuse cached `getSizeAsync` results across scans.
- **P5 — Bound `getNodesInfo` parallelism.** `Promise.all` over unbounded `exportAsync(JSON_REST_V1)` calls (`code.js:421-456`) spikes sandbox memory on long ID lists; chunk 4–8 at a time (pairs with P1).
- **P6 — Headless capture cold-start.** Each `capture_render`/url-compare spawns a fresh Chromium (~1 s+) plus up to 2×30 s warm-up fetches (`capture.ts:104-131`). Fine at current usage; if the verify loop tightens, keep a long-lived browser via CDP (`--remote-debugging-port`) or `puppeteer-core` as an optional fast path.
- **P7 — Sync PNG work on the MCP event loop.** `PNG.sync` decode/encode and SSIM run on the only thread also servicing the WebSocket (`image-compare.ts`, `capture.ts:136-143`). Currently acceptable (single-user, between-commands); if it grows, move to a worker thread.

## 6. TypeScript Refactoring

- **T1 — Typed + validated command results.** Define per-command zod response schemas and a single `sendCommand<C extends FigmaCommand>(cmd, params): Promise<ResultOf<C>>` that parses at the boundary. Kills the 77 `result as {…}` casts, converts plugin-version skew into actionable errors ("plugin is older than server: missing field X — re-import code.js"), and gives `z.infer` types for free. This is the highest-leverage refactor in the repo.
- **T2 — Single source of truth for command names.** `FigmaCommand` (types/index.ts) vs plugin `switch` (code.js:134-356) vs relay `CREATION_COMMANDS`/`BLOCKED_COMMANDS` (socket.ts:54-64) are three hand-synced lists; they have already drifted (`get_team_components` exists in the type but is commented out in the plugin). Export one const map (command → metadata: `requiresParentId`, `blocked`, `timeoutMs`) consumed by MCP and relay; optionally codegen a checklist for code.js.
- **T3 — Tighten the transport types.** `FigmaResponse.result?: any`, `ProgressMessage` with `[key: string]: any`, and the 5 `any`s in `websocket.ts` defeat the strict-mode setting. Model the relay envelope as a discriminated union on `type` (`join`/`message`/`progress_update`/`queue_position`/`system`/`error`/`ping`/`pong`) — the message handler then narrows naturally instead of casting.
- **T4 — Compiler settings.** Two divergent tsconfigs (root: ES2022; `src/talk_to_figma_mcp/tsconfig.json`: ES2020) — unify targets. Enable `noUnusedLocals`/`noUnusedParameters` (catches M8 and `validateCommand`'s dead param) and consider `noUncheckedIndexedAccess` for the relay's map-heavy code.
- **T5 — Schema/relay contract alignment.** `parentId` is `z.string().optional()` with a "REQUIRED — server enforces this" description across creation tools, so the requirement only surfaces as a failed round-trip. Make it `z.string()` (required) in the schemas; keep relay validation as defense in depth. (Deliberate-looking, but the schema is the cheaper enforcement point and the model reads it.)
- **T6 — Dependency pinning intent.** Commit `e127edb` says "pinned deps", but root `package.json` still uses `^` ranges; bun.lock pins for repo builds, but `npm install -g claude-talk-to-figma-mcp` resolves fresh. If pinning was the intent, use exact versions; either way, reconcile the claim.
- **T7 — Logger with levels.** Replace the 5-function stderr logger with a leveled logger + `truncate(payload, n)` helper (prerequisite for C3's fix; ~25 lines, no deps).

---

## 7. Suggested Fix Order

| Priority | Items | Effort |
|---|---|---|
| Now (correctness/safety) | C1, C2, C3, C4, C5, M6, M7, M8 | ~1 day total, all local |
| Next (security posture) | A1 (origin check + docs), A3 (delete stale package) | ~½ day |
| Soon (perf + robustness) | A2/P1, P3, P5, T1, T2, T7 | 2–3 days |
| Opportunistic | A4, A5, P2, P4, P6, T3–T6, M1–M5 | as touched |

---

## 8. Implementation Status (2026-06-12, shipped as v1.4.0)

**Implemented** — all critical bugs, all architectural flaws, all minor issues, and the practical performance/TS items:

- **C1–C5, M1–M8** — all fixed. C1 additionally rejects *queued* (not just in-flight) commands on plugin disconnect, and is regression-tested against the real relay (`tests/unit/relay-disconnect.test.ts`).
- **A1** — origin allowlist on every relay request (no-Origin, `null`, `*.figma.com`, `FIGMA_SOCKET_ALLOWED_ORIGINS`); vetted-origin CORS echo; security model documented in `TROUBLESHOOTING.md`.
- **A2/P1 + P5** — depth pruning inside the plugin (`pruneNodeDocToDepth`) with the server-side filter kept for old plugins; `get_nodes_info` batched (5 at a time). Note: `exportAsync` itself still serializes the full subtree (the Plugin API has no depth option) — the win is transport + parse hops.
- **A3** — stale embedded package.json/bun.lock deleted.
- **A4** — channel persisted per-file via `figma.root.setPluginData` (clientStorage is cross-file, so it was unsuitable).
- **A5** — `extract_asset` strips effects on a temporary clone (sibling, removed in `finally`); brief auto-layout reflow while the clone exists is the accepted trade-off vs. risking permanent effect loss. Non-clonable nodes keep the old strip-restore path.
- **A6/T1** — implemented for the commands whose results feed logic (`get_visual_snapshot`, `export_node_as_image`, `get_asset`, `extract_asset`, `classify_asset`, `scan_assets`, `get_fonts_used`, `get_css`) via `utils/command-results.ts` + `parseCommandResult()`. Deliberately **not** applied to the ~60 display-only casts: lenient schemas would add churn without safety (a missing field there degrades to "undefined" in a string, not a crash), and strict schemas would turn harmless skew into failures. Migrate a command when its result starts feeding logic.
- **P2** — command path serializes the inner message once (forward + echo splice the same string). Full raw-frame pass-through was *not* done: it requires extracting the inner JSON from the raw inbound frame, which is fragile without a framing change.
- **P3, P4** — SSIM/decode shared via `prepareComparison()`; content-addressed LRU (64MB) for `get_asset { hash }`.
- **T2–T7** — shared command registry (`src/shared/commands.ts`, also consumed by tests), typed relay envelope union, `noUnusedLocals`/`noUnusedParameters` + ES2022 + relay/shared under typecheck, required `parentId` schemas, exact-version pins, leveled logger.

**Deliberately deferred** (both were conditioned on future need in this review):

- **P6** (long-lived headless browser) — current per-capture Chrome spawn is acceptable at observed usage; revisit if the verify loop tightens to many captures per minute.
- **P7** (PNG/SSIM in a worker thread) — sync work between commands hasn't been observed blocking the transport; revisit if comparisons grow past ~2000px caps or run concurrently.

*Generated by architectural review on the `feature/zero-config-multimodal-mcp` branch.*
