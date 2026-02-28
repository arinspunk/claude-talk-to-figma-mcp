# Changelog

📖 [**Commands**](COMMANDS.md) | 🚀 [**Installation**](INSTALLATION.md) | 🛠️ [**Contributing**](CONTRIBUTING.md) | 🆘 [**Troubleshooting**](TROUBLESHOOTING.md) | 📜 [**Changelog**](CHANGELOG.md)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
- **🗒️ FigJam Support**: Six new tools for reading and writing FigJam boards (Thanks to [Rob Dearborn](https://github.com/rfdearborn))
  - `get_figjam_elements` – read all stickies, connectors, shapes-with-text, sections, and stamps on the current page
  - `create_sticky` – create a sticky note with text and colour (yellow, pink, green, blue, purple, red, orange, teal, gray, white)
  - `set_sticky_text` – update the text on an existing sticky note
  - `create_shape_with_text` – create a labelled FigJam shape (SQUARE, ELLIPSE, ROUNDED_RECTANGLE, DIAMOND, TRIANGLE_UP, TRIANGLE_DOWN, PARALLELOGRAM_RIGHT, PARALLELOGRAM_LEFT)
  - `create_connector` – draw an arrow or line between two nodes (by ID) or between canvas positions, with configurable line style and arrowheads
  - `create_section` – create a labelled colour region for grouping board content
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
