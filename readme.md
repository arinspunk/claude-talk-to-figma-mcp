<img src="images/claude-talk-to-figma.png" alt="Claude Talk to Figma collage" />

# Claude Talk to Figma MCP

A Model Context Protocol (MCP) plugin that allows Claude Desktop and other AI tools (GitHub Copilot, Cursor, etc.) to interact directly with Figma, enabling powerful AI-assisted design capabilities.

> **Important**: This project is based on [cursor-talk-to-figma-mcp](https://github.com/sonnylazuardi/cursor-talk-to-figma-mcp) by Sonny Lazuardi. It has been adapted to work with Claude Desktop and expanded with additional tools. Original credit belongs to Sonny Lazuardi ❤️

## ⚡ Quick Start (5 minutes)

### Installation Options

#### Option 1: DXT Package (Recommended)
1. **Download**: Get the latest `claude-talk-to-figma-mcp.dxt` from [releases](https://github.com/arinspunk/claude-talk-to-figma-mcp/releases)
2. **Install**: Double-click the `.dxt` file → Claude Desktop installs automatically
3. **Setup WebSocket**: Clone repo, run `bun install && bun socket` for Figma communication
4. **Setup Figma Plugin**: Import `src/claude_mcp_plugin/manifest.json` in Figma → Menu → Plugins → Development
5. **Connect**: Open plugin in Figma → copy channel ID → tell Claude "Talk to Figma, channel {ID}"

#### Option 2: Source Installation
### Prerequisites
- [Claude Desktop](https://claude.ai/download) + [Figma Desktop](https://www.figma.com/downloads/) + [Bun](https://bun.sh) installed

### Installation
1. **Setup**:
   - **macOs / Linux**: 
     - `git clone https://github.com/arinspunk/claude-talk-to-figma-mcp.git && cd claude-talk-to-figma-mcp && bun install && bun run build`
   - **Windows**: 
     - `git clone https://github.com/arinspunk/claude-talk-to-figma-mcp.git`
     - `cd claude-talk-to-figma-mcp`
     - `bun install`
     - `bun run build:win`
2. **Configure Claude**: `bun run configure-claude` (restart Claude Desktop)
3. **Install Figma Plugin**: Import `src/claude_mcp_plugin/manifest.json` in Figma → Menu → Plugins → Development

### First Connection
1. **Start server**: `bun socket` (verify at `http://localhost:3055/status`)
2. **Connect plugin**: Open Claude MCP Plugin in Figma → copy channel ID
3. **Test in Claude**: "Talk to Figma, channel {channel-ID}"

✅ **Success**: Claude should confirm connection and you can start designing!

---

## 🚀 Core Concepts

### How It Works
```
Claude Desktop ↔ MCP Server ↔ WebSocket Server ↔ Figma Plugin
```

**Simple**: Claude sends design commands → Figma executes them in real-time  
**Bidirectional**: Get info from Figma, create/modify elements, manage components

### Key Capabilities
- **Document Interaction**: Analyze designs, get selections, export assets
- **Element Creation**: Shapes, text, frames with full styling control
- **Smart Modifications**: Colors, effects, auto-layout, responsive design
- **Text Mastery**: Advanced typography, font loading, text scanning
- **Component Integration**: Local and team library components

---

## 🛠️ Usage Patterns

### Getting Started with AI Design
1. **Make Claude a UX expert**: [Use this prompt](prompts/prompt-ux-ui-specialist.md) 🎨
2. **Connect to your project**: "Talk to Figma, channel {channel-ID}"
3. **Start designing**: "Create a mobile app login screen with modern styling"

### Effective Prompting Examples
```
✅ Good: "Create a dashboard with a sidebar navigation, header with user profile, and main content area with card-based metrics"

✅ Good: "Redesign this button component with hover states and better contrast ratios"

❌ Avoid: "Make it look nice" (too vague)
```

### Server Management
- **Start**: `bun socket`
- **Stop**: `Ctrl+C` in terminal
- **Status**: Check `http://localhost:3055/status`
- **Restart**: Required if connection issues occur

---

## 📚 Command Reference

### 📄 Document Tools
| Command | Purpose | Example Use |
|---------|---------|-------------|
| `get_document_info` | Document analysis | Get project overview |
| `get_selection` | Current selection | What's selected now |
| `get_node_info` | Element details | Inspect specific component |
| `get_nodes_info` | Multiple elements info | Batch element inspection |
| `scan_text_nodes` | Find all text | Text audit and updates |
| `get_styles` | Document styles | Color/text style audit |
| `join_channel` | Connect to Figma | Establish communication |
| `export_node_as_image` | Asset export | Generate design assets |

### 🔧 Creation Tools
| Command | Purpose | Example Use |
|---------|---------|-------------|
| `create_rectangle` | Basic shapes | Buttons, backgrounds |
| `create_frame` | Layout containers | Page sections, cards |
| `create_text` | Text elements | Headlines, labels |
| `create_ellipse` | Circles/ovals | Profile pics, icons |
| `create_polygon` | Multi-sided shapes | Custom geometric elements |
| `create_star` | Star shapes | Decorative elements |
| `clone_node` | Duplicate elements | Copy existing designs |
| `group_nodes` | Organize elements | Component grouping |
| `ungroup_nodes` | Separate groups | Break apart components |
| `insert_child` | Nest elements | Hierarchical structure |
| `flatten_node` | Vector operations | Boolean operations |

### ✏️ Modification Tools
| Command | Purpose | Example Use |
|---------|---------|-------------|
| `set_fill_color` | Element colors | Brand color application |
| `set_stroke_color` | Border colors | Outline styling |
| `move_node` | Positioning | Layout adjustments |
| `resize_node` | Size changes | Responsive scaling |
| `delete_node` | Remove elements | Clean up designs |
| `set_corner_radius` | Rounded corners | Modern UI styling |
| `set_auto_layout` | Flexbox-like layout | Component spacing |
| `set_effects` | Shadows/blurs | Visual polish |
| `set_effect_style_id` | Apply effect styles | Consistent shadow styles |

### 📝 Text Tools
| Command | Purpose | Example Use |
|---------|---------|-------------|
| `set_text_content` | Text updates | Copy changes |
| `set_multiple_text_contents` | Batch text updates | Multi-element editing |
| `set_font_name` | Typography | Brand font application |
| `set_font_size` | Text sizing | Hierarchy creation |
| `set_font_weight` | Text weight | Bold/light variations |
| `set_letter_spacing` | Character spacing | Typography fine-tuning |
| `set_line_height` | Vertical spacing | Text readability |
| `set_paragraph_spacing` | Paragraph gaps | Content structure |
| `set_text_case` | Case transformation | UPPER/lower/Title case |
| `set_text_decoration` | Text styling | Underline/strikethrough |
| `get_styled_text_segments` | Text analysis | Rich text inspection |
| `load_font_async` | Font loading | Custom font access |

### 🎨 Component Tools
| Command | Purpose | Example Use |
|---------|---------|-------------|
| `get_local_components` | Project components | Design system audit |
| `get_remote_components` | Team libraries | Shared component access |
| `create_component_instance` | Use components | Consistent UI elements |

---

## 🔧 Complete Installation Guide

### DXT Package Installation (Recommended)

1. **Download DXT Package**:
   - Get the latest `claude-talk-to-figma-mcp.dxt` from [releases](https://github.com/arinspunk/claude-talk-to-figma-mcp/releases)

2. **Install in Claude Desktop**:
   - Double-click the `.dxt` file, or
   - Drag & drop onto Claude Desktop window, or  
   - Claude → Extensions → Install from file
   - Claude automatically handles all MCP configuration

3. **Install Figma Plugin**:
   - Download plugin files from the repository: `src/claude_mcp_plugin/`
   - Open Figma → **Menu > Plugins > Development**
   - Select "Import plugin from manifest"
   - Navigate to `manifest.json` from downloaded plugin files
   - Plugin appears in your development plugins list

4. **Setup WebSocket Server**:
   - Clone this repository for WebSocket server: `git clone https://github.com/arinspunk/claude-talk-to-figma-mcp.git`
   - Install dependencies: `bun install`
   - Start WebSocket server: `bun socket` (verify at `http://localhost:3055/status`)

5. **Connect Everything**:
   - Open plugin in Figma → copy channel ID
   - In Claude: "Talk to Figma, channel {your-channel-id}"
   - MCP server runs automatically via DXT, WebSocket handles Figma communication

### Source Installation (Advanced Users)

1. **Clone and Build**:
   ```bash
   git clone https://github.com/arinspunk/claude-talk-to-figma-mcp.git
   cd claude-talk-to-figma-mcp
   bun install
   ```
   run the appropriate command based on your operating system:
   - **macOs / Linux**
   ```bash
   bun run build
   ```
   - **Windows**
   ```bash
   bun run build:win
   ```

2. **Configure Claude Desktop**:
   ```bash
   bun run configure-claude
   ```
   This script:
   - Locates your Claude config file (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`)
   - Creates a backup of existing configuration
   - Adds "ClaudeTalkToFigma" to your MCP list
   - **Restart Claude Desktop** after running this

3. **Install Figma Plugin**:
   - Open Figma → **Menu > Plugins > Development**
   - Select "Import plugin from manifest"
   - Navigate to `src/claude_mcp_plugin/manifest.json`
   - Plugin appears in your development plugins list

4. **Verify Installation**:
   - Claude Desktop: Check "ClaudeTalkToFigma" appears in MCPs selector
   - Figma: Find "Claude MCP Plugin" in your plugins
   - WebSocket: `bun socket` should start without errors

### Building DXT Package (Developers)

To create your own DXT package:
```bash
npm run build:dxt    # Builds TypeScript and packages DXT
```
This creates `claude-talk-to-figma-mcp.dxt` ready for distribution.

---

## 🧪 Testing & Quality Assurance

### Automated Testing
```bash
bun run test            # Run all tests
bun run test:watch      # Watch mode
bun run test:coverage   # Coverage report
```

### Integration Testing
```bash
bun run test:integration  # Guided end-to-end testing
```

### Manual Verification Checklist
- [ ] WebSocket server starts on port 3055
- [ ] Figma plugin connects and generates channel ID
- [ ] Claude recognizes "ClaudeTalkToFigma" MCP
- [ ] Basic commands execute (create rectangle, change color)
- [ ] Error handling works (invalid commands, timeouts)

---

## 🐛 Troubleshooting & Support

### Connection Issues
- **"Can't connect to WebSocket"**: Ensure `bun socket` is running
- **"Plugin not found"**: Verify plugin import in Figma Development settings
- **"MCP not available"**: Run `bun run configure-claude` and restart Claude

### Execution Problems
- **"Command failed"**: Check Figma development console for errors
- **"Font not found"**: Use `load_font_async` to verify font availability
- **"Permission denied"**: Ensure you have edit access to the Figma document
- **"Timeout errors"**: Complex operations may need retry

### Performance Issues
- **Slow responses**: Large documents may require more processing time
- **Memory usage**: Close unused Figma tabs, restart if necessary
- **WebSocket disconnects**: Server auto-reconnects, restart if persistent

### Common Solutions
1. **Restart sequence**: Stop server → Close Claude → Restart both
2. **Clean reinstall**: Delete `node_modules` → `bun install` → `bun run build`
3. **Check logs**: Server terminal shows detailed error messages
4. **Update fonts**: Some team fonts require manual loading in Figma

---

## 🏗️ Advanced Topics

### Architecture Deep Dive

```
+----------------+     +-------+     +---------------+     +---------------+
|                |     |       |     |               |     |               |
| Claude Desktop |<--->|  MCP  |<--->| WebSocket Srv |<--->| Figma Plugin  |
|   (AI Agent)   |     |       |     |  (Port 3055)  |     |  (UI Plugin)  |
|                |     |       |     |               |     |               |
+----------------+     +-------+     +---------------+     +---------------+
```

**Design Principles**:
- **MCP Server**: Business logic, validation, default values
- **WebSocket Server**: Message routing and protocol translation  
- **Figma Plugin**: Pure command executor in Figma context

**Benefits**:
- Clear separation of concerns
- Easy testing and maintenance
- Scalable architecture for additional tools

### Project Structure
```
src/
  talk_to_figma_mcp/     # MCP Server implementation
    server.ts            # Main entry point
    tools/               # Tool categories by function
      document-tools.ts  # Document interaction
      creation-tools.ts  # Shape and element creation
      modification-tools.ts # Property modification
      text-tools.ts      # Text manipulation
    utils/               # Shared utilities
    types/               # TypeScript definitions
  claude_mcp_plugin/     # Figma plugin
    code.js              # Plugin implementation
    manifest.json        # Plugin configuration
```

### Contributing Guidelines

1. **Fork and Branch**: `git checkout -b feature/amazing-feature`
2. **Code Standards**: Follow existing TypeScript patterns
3. **Testing**: Add tests for new functionality
4. **Documentation**: Update relevant sections
5. **Pull Request**: Clear description of changes

#### Recent Contributors
- **[Taylor Smits](https://github.com/smitstay)** - Fixed opacity handling in color functions and added automated tests ([PR #13](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/13), [PR #14](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/14))
- **[easyhak](https://github.com/easyhak)** - Fixed build script not working on Windows OS ([PR #10](https://github.com/arinspunk/claude-talk-to-figma-mcp/pull/10))

---

## 📋 Version History

### Current: 0.5.3
- **Windows Compatibility**: Added dedicated build command for Windows systems
- **Cross-Platform Support**: Improved developer experience across all operating systems
- **Build Process Enhancement**: Separated Unix/Linux and Windows build workflows
- **Developer Experience**: Resolved chmod dependency issues on Windows

See [CHANGELOG.md](CHANGELOG.md) for complete version history.

---

## 📄 License & Credits

**License**: MIT License - see [LICENSE](LICENSE) file

**Authors**:
- **Xúlio Zé** - *Claude adaptation* - [GitHub](https://github.com/arinspunk)
- **Sonny Lazuardi** - *Original implementation* - [GitHub](https://github.com/sonnylazuardi)

**Acknowledgments**:
- Anthropic team for Claude and Model Context Protocol
- Figma community for excellent plugin API
- Bun team for fast JavaScript runtime