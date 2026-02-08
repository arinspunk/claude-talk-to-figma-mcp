# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - 35 New Tools! 🎉

#### 🎨 Visual Effects & Appearance (7 tools)
- **`set_opacity`**: Control element transparency (0-1)
- **`set_blend_mode`**: Apply blend modes (multiply, overlay, screen, etc.)
- **`set_gradient_fill`**: Create gradients (linear, radial, angular, diamond) with multiple color stops
- **`set_image_fill`**: Apply images from URLs with scale modes (fill, fit, crop, tile)
- **`get_image_fills`**: Inspect image fill properties on nodes

#### 🖌️ Advanced Stroke Properties (4 tools)
- **`set_stroke_align`**: Position strokes (inside, center, outside)
- **`set_stroke_cap`**: Style line endings (none, round, square, arrows)
- **`set_stroke_join`**: Style corners (miter, bevel, round)
- **`set_stroke_dashes`**: Create dashed/dotted patterns

#### 🔄 Transform & Flip (3 tools)
- **`rotate_node`**: Rotate elements by angle (0-360°)
- **`flip_horizontal`**: Mirror elements horizontally
- **`flip_vertical`**: Mirror elements vertically

#### 📐 Responsive Design (2 tools)
- **`set_constraints`**: Define resize behavior (min, max, center, stretch, scale)
- **`set_layout_sizing`**: Auto-layout sizing modes (fixed, hug, fill)

#### 👁️ Visibility & Protection (2 tools)
- **`set_visible`**: Show/hide elements
- **`set_locked`**: Lock/unlock elements to prevent editing

#### 📚 Layer Organization (5 tools)
- **`bring_to_front`**: Move to top layer
- **`send_to_back`**: Move to bottom layer
- **`bring_forward`**: Move up one layer
- **`send_backward`**: Move down one layer
- **`reorder_children`**: Custom child order arrangement

#### 🔷 Boolean & Masking (3 tools)
- **`boolean_operation`**: Union, subtract, intersect, exclude operations
- **`create_mask`**: Create clipping masks from multiple nodes
- **`apply_mask`**: Apply mask to specific node

#### 📝 Text Alignment (3 tools)
- **`set_text_align`**: Horizontal alignment (left, center, right, justified)
- **`set_text_vertical_align`**: Vertical alignment (top, center, bottom)
- **`set_text_auto_resize`**: Auto-resize behavior (width/height, height, none)

#### 📏 Layout Grids (2 tools)
- **`add_layout_grid`**: Add column/row/grid guides with customization
- **`remove_layout_grid`**: Remove specific or all layout grids

#### 🔍 Search & Discovery (2 tools)
- **`find_nodes_by_name`**: Search nodes by name (case-sensitive, partial/exact match)
- **`find_nodes_by_type`**: Find all nodes of specific type (frame, text, etc.)

#### 🎨 Style Management (3 tools)
- **`create_color_style`**: Create reusable color styles
- **`get_color_styles`**: List all local color styles
- **`apply_color_style`**: Apply color style to nodes

#### 🎯 Batch Operations (2 tools)
- **`align_nodes`**: Align multiple nodes (left, right, top, bottom, center)
- **`distribute_nodes`**: Distribute spacing evenly (horizontal/vertical)

### 📊 Statistics
- **Total Tools**: 89 (was 54, added 35 new tools - 65% increase!)
- **Categories**: Expanded from 5 to 9 tool categories
- **Coverage**: Near-complete Figma API coverage for design automation

### 📚 Documentation
- Updated README with comprehensive tool tables organized by category
- Created gradient examples guide (`docs/gradient-examples.md`)
- Enhanced tool descriptions with practical use cases

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
