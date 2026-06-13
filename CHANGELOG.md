# Changelog

📖 [**Commands**](COMMANDS.md) | 🚀 [**Installation**](INSTALLATION.md) | 🛠️ [**Contributing**](CONTRIBUTING.md) | 🆘 [**Troubleshooting**](TROUBLESHOOTING.md) | 📜 [**Changelog**](CHANGELOG.md)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-06-12

Implements the full backlog from the architectural review (`ARCH_REVIEW.md`), and adds optional Figma REST API access via a personal access token.

### Added — Figma REST API (optional, personal access token)
- **New tools, gated on `FIGMA_PERSONAL_TOKEN`** (they don't appear without a token, keeping plugin-only setups clean): `rest_whoami`, `rest_get_file`, `rest_render_image`, `rest_get_comments`, `rest_post_comment`. These work **without the plugin or an open Figma session**, against **any file the token's user can access**, addressed by figma.com URL or file key (URLs' `node-id` is parsed automatically; branch URLs supported).
- **Reads + renders remotely**: `rest_get_file` returns the depth-filtered node tree (reusing the same `filterFigmaNode` as the plugin path); `rest_render_image` renders nodes server-side, writes them to `figma-assets/`, and returns the first raster inline for vision. The REST API is **read-only for document content** — writes still go through the plugin; the only REST write is `rest_post_comment`.
- **Token hygiene**: the token is resolved once from `FIGMA_PERSONAL_TOKEN` (or `FIGMA_API_TOKEN`/`FIGMA_TOKEN`/`--figma-token`), kept in module scope, sent only in the `X-Figma-Token` header (never in a URL), and scrubbed from error text. Configurable via the DXT manifest's `user_config` (stored in the OS keychain) or an `env` block.
- **Rate-limit handling (HTTP 429)**: REST calls honor `Retry-After`, fall back to exponential backoff + jitter (capped), retry transient 5xx/network errors, and surface actionable messages for 401/403/404.

### Security
- **Relay origin allowlist (CSWSH protection)**: browsers don't apply CORS to WebSocket connects, so any web page could previously connect to `localhost:3055` and read or mutate the open Figma document. The relay now rejects browser requests whose `Origin` isn't the Figma plugin sandbox (`null`) or `*.figma.com`; non-browser clients (the MCP server) are unaffected. Extra origins via `FIGMA_SOCKET_ALLOWED_ORIGINS`. `/status` and the upgrade path echo only vetted origins instead of `*`.
- **No more design content in logs**: debug logging is gated behind `LOG_LEVEL=debug` on both the MCP server and the relay, and logged payloads are truncated — multi-MB base64 snapshots no longer land in the MCP host's log files (or the plugin's iframe console, which retains references).
- **Path-safe asset filenames**: `get_asset` / `extract_asset` run model-supplied filenames through `path.basename()`, so `../`-style names can't escape the output directory.

### Fixed
- **Plugin disconnect mid-command no longer hangs zero-config agents**: the relay's close handler deleted the (now-empty) channel queue *before* the cleanup that flushes it, so in zero-config mode the "plugin disconnected" error was never sent and agents waited out 2–5 minute timeouts. Cleanup now runs first, and all queued commands are rejected immediately when no plugin remains (regression-tested against the real relay).
- **Malformed CLI args no longer spin**: `--port=abc` / `--reconnect-interval=abc` produced `NaN`, driving an endless (potentially ~0ms-tight) reconnect loop. Both the MCP server and the relay now validate numeric args and fall back to defaults with a warning.
- **Caller timeouts survive queue/progress updates**: queue-position and progress frames replaced the caller's timeout with hardcoded 300s/120s values — a 15s resource read could silently stretch to 5 minutes. The caller's own inactivity budget is re-armed instead.
- **`export_node_as_image` PDF**: `application/pdf` was returned inside an MCP `image` content block (invalid per spec); PDFs are now written to `figma-assets/` and returned as a path.
- **`compare_to_figma` 3-digit hex**: `targetColor: "#fff"` silently disabled the brand-color check; shorthand hex is now expanded.
- **`rgbaToHex` without alpha** produced `#rrggbbNaN`; missing alpha now defaults to opaque (alpha `0` stays transparent).
- **Relay session-dedup eviction** leaked empty channel sets/queues; they're now cleaned up like regular disconnects.

### Added
- **Depth pushdown for `get_node_info` / `get_nodes_info`**: the plugin prunes the exported subtree to the requested depth *before* transport, keeping megabytes of JSON out of the postMessage → WebSocket → relay pipeline on large sections (the server-side filter remains as a fallback for older plugins). `get_nodes_info` also exports in batches of 5 instead of an unbounded `Promise.all`.
- **Stable per-file channel names**: the plugin persists its channel in the document (`setPluginData`), so a plugin reconnect no longer strands manually-joined agents on a dead channel (multi-file disambiguation workflows survive blips).
- **Content-addressed asset cache**: repeated `get_asset { hash }` calls are served from an in-server LRU (64MB budget) — image hashes are content hashes, so hits can never be stale. The render → compare → fix loop stops re-transferring identical images.
- **Validated plugin responses**: results for the multimodal/asset/fidelity commands (`get_visual_snapshot`, `export_node_as_image`, `get_asset`, `extract_asset`, `classify_asset`, `scan_assets`, `get_fonts_used`, `get_css`) are validated with zod at the transport boundary; version skew now produces "plugin may be outdated — re-import it" instead of `Cannot read properties of undefined`.
- **Real-relay test harness**: `startRelay()` factory (with CLI auto-start preserved across bun/node/compiled builds) lets tests exercise the actual relay on an ephemeral port; new regression suite covers the disconnect flush and the origin allowlist.

### Changed
- **`extract_asset` no longer mutates the user's document**: effects are stripped on a temporary clone (removed in `finally`) instead of the real node — a mid-export crash can no longer permanently lose effects. Nodes that can't be cloned fall back to the old strip-and-restore.
- **`parentId` is now required in the schemas** of all creation tools (the relay already enforced it); the requirement fails at schema validation instead of costing a round-trip.
- **Shared command registry** (`src/shared/commands.ts`): command names, creation-command and blocked-command lists are defined once and consumed by the MCP server, the relay, and the tests — the three hand-synced copies (which had already drifted: `get_team_components`) are gone.
- **Typed relay envelope**: the MCP client parses relay frames as a discriminated union (`queue_position` / `progress_update` / `system` / `error` / `broadcast` / `ping` / `pong`) instead of `any`-casting.
- **`compare_to_figma` computes SSIM once**: metrics and the diff heatmap share one decode + grid + SSIM pass (previously the full pipeline ran twice per comparison). The relay also serializes each command payload once instead of twice (forward + echo).
- **Dependencies pinned** to exact versions; removed a stale embedded `package.json` (`@modelcontextprotocol/sdk: "latest"`) under `src/talk_to_figma_mcp/`.
- **Stricter typechecking**: `noUnusedLocals`/`noUnusedParameters`, unified ES2022 target, and `src/socket.ts` + the shared registry are now covered by `npm run typecheck`.

## [1.3.0] - 2026-06-11

### Added
- **`capture_render`** — screenshot a local URL with a headless browser at an exact pixel size and save it as a PNG. Encodes the gotchas of reliable headless captures: warms the route first (so dev-server compilation isn't in the shot), captures taller than requested then crops (a viewport whose height equals the content height collapses the render), and falls back across chromium/chromium-browser/google-chrome binaries (`CHROME_PATH` overrides). Requires a local Chromium/Chrome.
- **`compare_to_figma` url mode** — pass `url` instead of `renderPath` and the tool captures the route headlessly at the Figma node's exact width×height before comparing, closing the render → compare → fix loop in a single call with guaranteed-matching dimensions.

### Fixed
- **Alpha 0 no longer becomes opaque**: `create_text`, `create_vector`, and `create_line` used `parseFloat(color.a) || 1`, silently turning a fully transparent color (`a: 0`) into a fully opaque one. They now use the shared `safePaint` helper (like the other creation handlers).
- **`batch_operations` no longer bypasses relay validation**: blocked commands (`set_current_page`) and parentId-less creation commands were rejected when sent directly but allowed when wrapped in a batch. The relay now validates every operation inside a batch payload against the same rules.
- **`create_component_from_node` honors `parentId`**: for primitive nodes the component was appended to the requested parent and then immediately re-inserted into the original parent (parentId silently ignored); the built-in FRAME/GROUP/INSTANCE path ignored it entirely. An explicit parentId now wins in all paths.
- **Relay connection stats**: session deduplication decremented `activeConnections` twice per reconnect (manually + via the close handler), drifting the count negative over time.
- **Real exponential backoff**: the MCP→relay reconnect delay was labeled exponential but used a random exponent, never growing with attempts. It now backs off per attempt (capped at 30s, with jitter) and resets on successful connect.
- **Commands wait for reconnects instead of failing**: `sendCommandToFigma` rejected immediately with "Not connected" during the brief window of an auto-reconnect. Commands now wait up to 15s for the connection + channel join to come back before failing.
- **Fractional font sizes**: `create_text` truncated `fontSize` with `parseInt` (13.5 → 13); now uses `parseFloat`. The `width` parameter also accepts numeric strings like every other numeric arg.
- **Mixed-font text nodes**: `set_font_weight` threw on text nodes with multiple fonts (`fontName` is `figma.mixed`); it now samples the first character's family. Also fixed a broken branch in the smart-font-matching helper (`getRangeFontName(start, start[0])` — `start[0]` of a number is undefined).
- **`get_document_info` pages array**: reported only the current page in `pages`, making single-page documents indistinguishable from multi-page ones. Now lists all pages with an `isCurrent` flag.
- **Version drift**: `config.ts` still reported 1.1.0. The `sync-version` script now updates `config.ts` alongside `manifest.json`, so this can't recur.
- Removed dead `processFigmaNodeResponse` helper (unused, and it logged to stdout — which would corrupt the stdio JSON-RPC stream if ever used).
- Typo in the `design_strategy` prompt ("Mofifying" → "Modifying").

### Changed
- **Errors are machine-readable**: every tool error response now sets `isError: true`, so MCP clients can distinguish failures from successes programmatically (~100 call sites).
- **Migrated to the SDK's `registerTool`/`registerResource`/`registerPrompt` APIs** (from the deprecated `server.tool()`/`.resource()`/`.prompt()`), adding tool annotations: read-only tools are marked `readOnlyHint`, `delete_*` tools `destructiveHint`.
- **Structured output**: JSON-returning read tools (`get_document_info`, `get_selection`, `get_node_info`, `get_nodes_info`, `get_styles`, `get_variables`, `get_reactions`, `get_figjam_elements`, `get_pages`, `get_styled_text_segments`, and more) now also return `structuredContent` alongside the text payload.
- **Scan highlighting is opt-in**: `scan_text_nodes` and `set_multiple_text_contents` no longer flash every node orange by default — that mutated user fills and added 100–500ms per node (a 100-node frame took ~1 minute longer). Pass `highlight: true` to re-enable; the inter-chunk pause also dropped from 1s to 250ms.
- **`scan_assets` is faster by default**: it no longer fetches every image's full bytes just to report a byte size; pass `includeByteSizes: true` if you need sizes.
- **`get_styles`** now returns the full `paints` array for color styles (multi-paint styles previously lost everything past `paints[0]`).
- **`set_reactions`** returns a concise verification summary instead of echoing full debug JSON payloads.
- **Dependencies pinned**: `@modelcontextprotocol/sdk`, `uuid`, and `ws` were `"latest"` (unreproducible builds); now pinned to caret ranges.
- **CI**: the test workflow now also runs `typecheck` and the Bun socket relay tests, on Node 20/22.

## [1.2.0] - 2026-06-05

### Added
- **🧼 Effects-aware extraction** — `extract_asset`: exports a node as a CLEAN asset with its effects temporarily stripped (so shadow/blur bleed isn't baked into the bitmap, and NOISE/TEXTURE effects that blank a node in SVG/browser are removed), then hands back the effects translated to ready-to-use CSS (`box-shadow` / `filter` / `backdrop-filter`). Reports the effect bleed past the layout box and flags any effect that can't be reproduced in CSS. Always restores the node's effects afterward.
- **🧭 Asset-vs-SVG advisor** — `classify_asset`: inspects a node's subtree (image fills, vector/text counts, masks, blend modes, effect support, root fills) and recommends **raster PNG / inline SVG / pure CSS** with reasons — so you don't ship an SVG that embeds a photo, rasterize a one-line divider, or try to SVG-export a NOISE/mask/blend node that won't survive. The decision is a pure, unit-tested function fed by raw signals gathered in the plugin.

### Changed
- **📐 More accurate `compare_to_figma`**: the headline metric is now **SSIM (structural similarity)** instead of raw mean grayscale diff, so font anti-aliasing no longer drags text-heavy sections down to a false ~92% — the score reflects real layout/asset drift. Adds a **color delta**, recasts the 3×3 map as per-region structural mismatch, and writes a **diff HEATMAP png** (red = mismatch) you can open to see exactly where the render diverges. Verdict thresholds recalibrated for SSIM.

### Tests
- +33 tests (160 total): unit coverage for the effects→CSS translator, the asset classifier heuristics, and the SSIM/color/heatmap comparison; integration coverage for `extract_asset` and `classify_asset` wiring.

## [1.1.0] - 2026-06-03

### Added
- **🔌 Zero-config connection**: The MCP server auto-routes tool calls to the single connected Figma plugin — no more copying a channel ID or saying "connect to channel XYZ". Clients self-identify on join (`role`), a friendly error tells the user to open the plugin when none is connected, and `join_channel` remains as an advanced override for multi-file disambiguation.
- **❤️ Heartbeat & auto-reconnect**: Application-level ping/pong prunes stale/crashed plugin sockets so routing stays accurate; the Figma plugin now auto-reconnects (exponential backoff) through socket restarts and network blips. The plugin server port is restored from saved settings.
- **👁️ Multimodal vision** — `get_visual_snapshot`: returns a PNG of the selection (auto-scaled to a max dimension for large frames) so the agent can *see* layout, spacing, and fonts and verify its work.
- **📐 Objective fidelity check** — `compare_to_figma`: snapshots a Figma node and pixel-diffs it against a screenshot of the implemented UI, returning a similarity %, a 3×3 region diff map (to localize mismatches), an edge-overflow estimate, and an optional brand-color match. Turns "does it look right?" into measured numbers for a render → compare → fix loop. (Adds a lightweight `pngjs` dependency for PNG decoding.)
- **🎯 High-fidelity extraction**:
  - `get_css` — Figma's exact Dev-Mode CSS per node (optionally recursive).
  - `get_fonts_used` — inventory of every font/style/size in a subtree.
  - `scan_assets` + `get_asset` — inventory and extract real image bytes & SVG icons to files.
- **📦 Operation batching** — `batch_operations`: apply many edits in one payload; streams progress (timeout-safe) and returns a per-operation success/failure summary.
- **🧩 Native MCP surface**: live Resources (`figma://local/selection`, `figma://local/document`) and Prompts (`/audit-accessibility`, `/export-to-tailwind`).
- **📦 Standalone executables** (`npm run build:compile`): compiles the MCP server and socket relay into single-file native binaries via `bun build --compile` (no Bun/Node needed at runtime). Cross-compile for all platforms with `npm run compile:all-platforms`. The relay port is now configurable via `--port=` or `FIGMA_SOCKET_PORT`, and `FIGMA_SOCKET_HOST` allows binding for WSL.

### Fixed
- **Type-safety gate restored**: the inner tsconfig used `NodeNext` resolution that broke `tsc`; switched to `bundler` so `npm run typecheck` works. This immediately surfaced and fixed 8 commands missing from the `FigmaCommand` union (`get_nodes_info`, `set_text_align`, `set_reactions`, `get_reactions`, `detach_instance`, `create_text_style`, `create_paint_style`, `create_effect_style`).
- Progress updates now reset the relay's per-command timeout, so long-running operations (batches, bulk text/colour) aren't reaped mid-flight.
- Standardized error handling in image tools (return error content instead of throwing protocol errors).

### Changed
- Removed dead, commented-out `get_image_bytes` (superseded by `get_asset`).
- Re-enabled the 16 socket-queue unit tests via `bun test` (`npm run test:socket`); added `npm run typecheck` and `npm run test:all`.

## [1.0.0] - 2026-04-18

### Added
- **🤖 Multi-Agent / Parallel Execution**: Added a server-side FIFO command queue to the WebSocket relay. This allows multiple AI agents (e.g. Claude Code sub-agents or Cursor parallel processes) to work on the same Figma file simultaneously without blocking the single-threaded Figma plugin or causing timeouts. Achieves up to ~1.87x speedup for complex generation tasks. (Thanks to [mmabas77](https://github.com/mmabas77) - [PR #77](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/77))
- **🛡️ Node Info Depth Control**: Added `depth` parameter to `get_node_info` and `get_nodes_info` (default 1) to prevent token overflow in giant documents. Children beyond the depth limit return as minimal stubs with a `_childrenTruncated: true` flag, allowing for progressive disclosure. (Thanks to [mmabas77](https://github.com/mmabas77) - [PR #90](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/90))
- **✨ Plugin Quality Improvements**: Enhanced stability and usability across core tools. (Thanks to [mmabas77](https://github.com/mmabas77) - [PR #87](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/87))
  - Robust layout grids (properly handling STRETCH vs fixed-pixel modes).
  - Enhanced `clone_node` with `parentId` support for direct container injection.
  - Smart text wrapping and numeric font weight mapping (mapping 100-900 to Figma styles).
  - Unified styling (fill/stroke) for all basic shape creation tools.
  - Automatic column grids for top-level frames for better alignment.
  - Safe color utilities to prevent accidental black-fills on malformed input data.
- **🎯 Unicast Response Routing**: Responses from Figma are now exclusively routed to the exact agent that requested them via session tracking, eliminating broadcast noise across multiple connected clients.
- **🧱 Component Detaching**: Added `detach_instance` tool to convert component instances back into regular frames. (Thanks to [hoxinzhen](https://github.com/hoxinzhen) - [PR #85](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/85))
- **🎨 Local Style Creation**: New tools to create and manage reusable styles in Figma's local library. (Thanks to [Kejsaren](https://github.com/hello-amed) - [PR #83](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/83))
  - `create_text_style` – Create typography styles (font, size, spacing, etc).
  - `create_paint_style` – Create reusable SOLID color styles.
  - `create_effect_style` – Create reusable shadow and blur styles.
- **✨ Prototype Interaction Tools**: Added two new tools for managing Figma prototype logic. (Thanks to [ravszmig](https://github.com/ravszmig) - [PR #82](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/82))
  - `set_reactions` – Programmatically configure triggers (CLICK, HOVER, etc.), actions (NAVIGATE, OVERLAY, BACK), and transitions. Includes smart logic to handle overlay position and background behavior.
  - `get_reactions` – Inspect and debug existing interactions on any node.
- **🛡️ Robust Type Coercion**: Implementation of Zod-based coercion helpers (`coerce.number()`, `coerceBoolean`, `coerceJson`) to guarantee that all tools correctly handle parameters sent as strings (common in MCP/WebSocket environments). (Thanks to [ehs208](https://github.com/ehs208) - [PR #79](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/79))
- **🛠️ Integration & DX Fixes**:
  - **Fixed `get_pages`**: Added automatic `figma.loadAllPagesAsync()` to prevent "unloaded page" runtime errors.
  - **`parentId` in Components**: Added `parentId` support to `create_component_from_node` for deterministic container injection via the relay server.
  - **Plugin Compatibility**: Fixed syntax errors in `code.js` to ensure support for diverse Figma plugin execution environments.


### Changed
- **⚠️ Breaking Changes for State Independence**: To guarantee race-condition-free parallel execution, implicit page caching has been completely ripped out:
  - `set_current_page` is now completely **blocked** and deprecated by the server.
  - State-altering creation tools (e.g. `create_frame`, `create_rectangle`, `create_text`) now strictly require the `parentId` argument explicitly to declare where elements should be instantiated.
  - Updated tool descriptions to explicitly guide LLMs towards using the `parentId`.

## [0.9.2] - 2026-02-28

### Fixed
- **🔧 Zod compatibility**: Updated `zod` dependency from `^3.24.0` to `^3.25.0` to align with `@modelcontextprotocol/sdk@latest` (v1.27.1+) which requires `zod: "^3.25 || ^4.0"`. This resolves the `Cannot read properties of undefined (reading '_zod')` error that caused `tools/list` to fail and prevented all 54 tools from loading in Claude Desktop and Cursor ([#80](https://github.com/arinspunk/claude-talk-to-figma-mcp/issues/80), [#81](https://github.com/arinspunk/claude-talk-to-figma-mcp/issues/81)).

## [0.9.1] - 2026-02-28

### Added
- **🗒️ FigJam Support**: Six new tools for reading and writing FigJam boards (Thanks to [Rob Dearborn](https://github.com/rfdearborn))
  - `get_figjam_elements` – read all stickies, connectors, shapes-with-text, sections, and stamps on the current page
  - `create_sticky` – create a sticky note with text and colour (yellow, pink, green, blue, purple, red, orange, teal, gray, white)
  - `set_sticky_text` – update the text on an existing sticky note
  - `create_shape_with_text` – create a labelled FigJam shape (SQUARE, ELLIPSE, ROUNDED_RECTANGLE, DIAMOND, TRIANGLE_UP, TRIANGLE_DOWN, PARALLELOGRAM_RIGHT, PARALLELOGRAM_LEFT)
  - `create_connector` – draw an arrow or line between two nodes (by ID) or between canvas positions, with configurable line style and arrowheads
  - `create_section` – create a labelled colour region for grouping board content
- **🖼️ Image Manipulation Tools**: Complete image handling support for Figma nodes (Thanks to [ehs208](https://github.com/ehs208) - [PR #61](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/61))
  - `set_image_fill`: Apply images from URL or base64 data with scaleMode options (FILL, FIT, CROP, TILE).
  - `get_image_from_node`: Extract image metadata (hash, scaleMode, rotation, filters).
  - `replace_image_fill`: Replace existing images while preserving transforms and filters.
  - `apply_image_transform`: Adjust image position, scale, rotation (90° increments), and scaleMode.
  - `set_image_filters`: Apply 7 types of color/light adjustments (exposure, contrast, saturation, temperature, tint, highlights, shadows).
- **📐 Coordinate Consistency**: Added `localPosition` support to `get_node_info` and `get_nodes_info` (batch) for full parity with local coordinate transforms (Thanks to [ehs208](https://github.com/ehs208) - [PR #57](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/57)).
- **📝 Fixed-Width Text**: Added `width` parameter to `create_text` tool for better layout control and wrapping (Thanks to [leeyc09](https://github.com/leeyc09) - [PR #59](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/59)).

### Fixed
- **🔄 Image Features**: 
  - Image rotation properly implemented (90-degree increments) inside node fills (#61).
  - Image filters are now preserved when replacing images using `replace_image_fill` (#61).
- **🎯 Coordinate System**: Fixed mismatch between `get_node_info` and `move_node` by clarifying and unifying local vs global coordinate usage across all tools (Thanks to [ehs208](https://github.com/ehs208) - [PR #57](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/57)).
- **⚡ Performance & Stability**:
  - Optimized `get_nodes_info` using a high-performance native batch implementation in the plugin.
  - Fixed plugin race condition by awaiting `setCharacters` in text node creation (#59).
  - Pinned `zod` dependency to `^3.24.0` to resolve installation failures in containerized/fresh environments (#59).
- **🐳 Docker**: Fixed Dockerfile to run as a network bridge (WebSocket server) and added comprehensive setup documentation (Thanks to [ehs208](https://github.com/ehs208) - [PR #56](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/56)).

### Notes
- **Image Handling**: `apply_image_transform` rotates the image fill inside the node boundary; to rotate the entire node, use `rotate_node`. External URLs are subject to the `allowedDomains` list in `manifest.json`.
- **API Parity**: Standardized `x`/`y` descriptions across all creation and modification tools to explicitly reference local coordinates.

## [0.9.0] - 2026-02-20

### Added
- **🛠️ 20 New Tools**: Massive expansion of Figma capabilities including:
  - **Transformation**: `rotate_node`, `reorder_node`, `convert_to_frame`.
  - **Properties**: `set_node_properties` (visibility, lock, opacity).
  - **Visuals**: `set_gradient`, `boolean_operation`, `set_svg`, `get_svg`, `set_image`.
  - **Layout & Guides**: `set_grid`, `get_grid`, `set_guide`, `get_guide`.
  - **Documentation**: `set_annotation`, `get_annotation`.
  - **Variables**: `get_variables`, `set_variable`, `apply_variable_to_node`, `switch_variable_mode`.
  - **Pages**: `duplicate_page`.
  (Thanks to [mmabas77](https://github.com/mmabas77) - [PR #76](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/76))
- **🌓 Dark Mode**: Added a dark and light mode toggle to the plugin UI for better integration with Figma's themes.
- **📋 Enhanced Clipboard**: The plugin now copies the full connection instruction instead of just the channel name, making it easier to paste into Claude.

### Fixed
- **⚡ Error propagation**: Error responses from Figma now resolve immediately instead of waiting for the 60s timeout. The WebSocket message handler in `websocket.ts` now robustly checks for errors at both the root level (`myResponse.error`) and nested inside the result (`myResponse.result.error`).
- **🎨 UI Refinement**: Adjusted plugin dimensions and mode selector opacity for a cleaner look. Structured the UI script into a class for better maintainability.

## [0.8.2] - 2026-02-15

### Added
- **🔄 Component Variants**: New `set_instance_variant` tool to change variant properties without recreating the instance. Preserves instance overrides like text and colors. (Thanks to [ehs208](https://github.com/ehs208) - [PR #50](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/50))
- **📁 Custom Installation Path**: The launcher now supports an optional second argument to specify a custom installation directory (e.g., `npx claude-talk-to-figma-mcp ./my-folder`).
- **🇰🇷 Korean Localization**: Added UX/UI specialist prompt in Korean (`prompts/prompt-ux-ui-specialist-ko.md`). (Thanks to [ehs208](https://github.com/ehs208) - [PR #54](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/54))

### Fixed
- **📡 Channel Reliability**: Added verification via ping when joining a channel to prevent false success messages and ensure the Figma plugin is active. (Thanks to [ehs208](https://github.com/ehs208) - [PR #52](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/52))
- **🔗 Channel Verification**: Fixed `join_channel` accepting invalid channel codes. Now verifies connection by sending a ping after join, providing fast feedback (12s timeout) instead of waiting for first command to timeout (60s). Added internal `ping` command for connection verification.

## [0.8.1] - 2026-02-11

### Added
- **🎨 Selection Colors**: New `set_selection_colors` tool to recursively change colors of all vector nodes within the current selection. Ideal for coloring icon sets. (Thanks to [mmabas77](https://github.com/mmabas77) - [PR #49](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/49))
- **📝 Enhanced Text Alignment**: Added full support for horizontal and vertical text alignment (Top/Middle/Bottom and Left/Center/Right/Justified). (Thanks to [mmabas77](https://github.com/mmabas77) - [PR #49](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/49))
- **🌍 RTL Support**: Improved text alignment handling for Right-to-Left languages like Arabic. (Thanks to [mmabas77](https://github.com/mmabas77) - [PR #49](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/49))

### Fixed
- **🚀 Setup Command**: Fixed incorrect MCP server command in `configure-claude.js` and `README.md` that was causing connection failures. (Thanks to [ehs208](https://github.com/ehs208) - [PR #47](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/47))
- **🛡️ Type Safety**: Added missing `set_selection_colors` to `FigmaCommand` union type to resolve TypeScript compilation errors.

## [0.8.0] - 2026-02-01

### Added
- **🚀 Unified Launcher**: New `npx claude-talk-to-figma-mcp` command that handles repository setup, dependencies, and execution in a single step.
- **🛠️ Smart Bootstrapping**: Automated Bun detection and installation prompts for an optimized experience.

### Fixed
- **🛡️ Type Safety**: Updated `FigmaCommand` union types to include all new tools, resolving TypeScript compilation errors during CI/CD.
- **🏗️ CI/CD Permissions**: Fixed 403 errors in GitHub Actions by granting explicit write permissions for DXT package releases.

## [0.7.0] - 2026-01-31

### Added
- **🎨 Text Styles**: New `set_text_style_id` tool to apply local text styles to nodes (Thanks to [Rob Dearborn](https://github.com/rfdearborn) - [PR #43](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/43))
- **🏷️ Rename Node**: New `rename_node` tool for better document organization (Thanks to [Beomsu Koh](https://github.com/GoBeromsu) - [PR #36](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/36))
- **📑 Page Management**: Comprehensive suite of tools for managing document pages: `create_page`, `delete_page`, `rename_page`, `get_pages`, and `set_current_page` (Thanks to [sk (kovalevsky)](https://github.com/kovalevsky) - [PR #32](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/32))

### Fixed
- **🚀 Performance**: Optimized component lookup using `findAllWithCriteria` to resolve initialization timeouts (Thanks to [Rob Dearborn](https://github.com/rfdearborn) - [PR #42](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/42))
- **📸 SVG Export**: Corrected format parameter handling for SVG exports and increased timeouts for large exports (Thanks to [sk (kovalevsky)](https://github.com/kovalevsky) - [PR #32](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/32))
- **🛡️ Validation**: Improved Zod validation for `join_channel` by making the channel parameter strictly mandatory (Thanks to [Timur](https://github.com/Mirsmog) - [PR #29](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/29))

## [0.6.1] - 2025-08-02

### Fixed
- **`set_stroke_color` Tool**: Corrected a validation rule that incorrectly rejected a `strokeWeight` of `0`. This change allows for the creation of invisible strokes, aligning the tool's behavior with Figma's capabilities. (Thanks to [Taylor Smits](https://github.com/smitstay) - [PR #16](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/16))

## [0.6.0] - 2025-07-15

### Added
- **🚀 DXT Package Support**: Complete implementation of Anthropic's Desktop Extensions format for Claude Desktop
- **📦 Automated CI/CD Pipeline**: GitHub Actions workflow for automatic DXT package generation and release distribution
- **🔧 DXT Build Scripts**: New npm scripts for DXT packaging (`pack`, `build:dxt`, `sync-version`)
- **📋 .dxtignore Configuration**: Optimized package exclusions for minimal DXT file size (11.6MB compressed)
- **🎯 Dual Distribution Strategy**: NPM registry for developers + DXT packages for end users

### Changed
- **⚡ Installation Experience**: Reduced setup time from 15-30 minutes to 2-5 minutes via one-click DXT installation
- **📖 Documentation**: Enhanced README with comprehensive DXT installation instructions and troubleshooting
- **🏗️ Build Process**: Improved version synchronization between package.json and manifest.json
- **🔄 Release Workflow**: Automated DXT package attachment to GitHub releases

### Technical Details
- Added `@anthropic-ai/dxt@^0.2.0` development dependency for DXT packaging
- Implemented robust error handling and validation in CI/CD pipeline
- Enhanced build artifacts with 90-day retention for testing and rollback capabilities
- Established quality gates ensuring DXT packages only build after successful test suites

### Credits
- **DXT Implementation**: [Taylor Smits](https://github.com/smitstay) - [PR #17](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/17)

## [0.5.3] - 2025-06-20

### Added
- Added Windows-specific build command (`build:win`: `tsup`) for improved cross-platform compatibility
- Enhanced build process to support development on Windows systems without chmod dependency

### Fixed
- Resolved Windows build compatibility issues where `chmod` command would fail on Windows systems
- Improved developer experience for Windows users by providing dedicated build script

### Changed
- Separated Unix/Linux build process (with executable permissions) from Windows build process
- Updated installation documentation to reflect platform-specific build commands

## [0.5.2] - 2025-06-19

### Fixed
- Fixed critical opacity handling bug in `set_stroke_color` where `a: 0` (transparent) was incorrectly converted to `a: 1` (opaque)
- Fixed stroke weight handling where `strokeWeight: 0` (no border) was incorrectly converted to `strokeWeight: 1`
- Resolved problematic `||` operator usage that affected falsy values in color and stroke operations

### Added
- Extended `applyDefault()` utility function to handle stroke weight defaults safely
- Added `FIGMA_DEFAULTS.stroke.weight` constant for centralized stroke configuration
- Comprehensive test suite for `set_stroke_color` covering edge cases and integration scenarios
- Enhanced validation for RGB components in stroke operations

### Changed
- Improved architectural consistency by applying the same safe defaults pattern from `set_fill_color` to `set_stroke_color`
- Enhanced separation of concerns between MCP layer (business logic) and Figma plugin (pure translator)
- Renamed `weight` parameter to `strokeWeight` for better clarity and consistency
- Updated Figma plugin to expect complete data from MCP layer instead of handling defaults internally

### Technical Details
- Replaced `strokeWeight: strokeWeight || 1` with `applyDefault(strokeWeight, FIGMA_DEFAULTS.stroke.weight)`
- Enhanced type safety with proper `Color` and `ColorWithDefaults` interface usage
- Improved error messages and validation for better debugging experience

## [0.5.1] - 2025-06-15

### Fixed
- Fixed opacity handling in `set_fill_color` to properly respect alpha values
- Added `applyColorDefaults` function to ensure appropriate default values for colors

### Added
- Added automated tests for color functions and node manipulation

### Changed
- Improved TypeScript typing for colors and related properties
- General code cleanup and better utility organization

## [0.5.0] - 2025-05-28

### Changed
- Implemented modular tool structure for better maintainability
- Enhanced handling of complex operations with timeouts and chunking
- Improved error handling and recovery for all tools
- Improved TypeScript typing and standardized error handling

### Fixed
- Fixed channel connection issues with improved state management
- Resolved timeout problems in `flatten_node`, `create_component_instance`, and `set_effect_style_id`
- Enhanced remote component access with better error handling

### Added
- Comprehensive documentation of tool categories and capabilities

## [0.4.0] - 2025-04-15

### Added
- New tools for creating advanced shapes:
  - `create_ellipse`: Creation of ellipses and circles
  - `create_polygon`: Creation of polygons with customizable sides
  - `create_star`: Creation of stars with customizable points and inner radius
  - `create_vector`: Creation of complex vector shapes
  - `create_line`: Creation of straight lines
- Advanced text and font manipulation capabilities
- New commands for controlling typography: font styles, spacing, text case, and more
- Support for accessing team library components
- Improved error handling and timeout management
- Enhanced text scanning capabilities

### Changed
- Improvements in documentation and usage examples

## [0.3.0] - 2025-03-10

### Added
- Added `set_auto_layout` command to configure auto layout properties for frames and groups
- Support for settings for layout direction, padding, item spacing, alignment and more

## [0.2.0] - 2025-02-01

### Added
- Initial public release with Claude Desktop support
