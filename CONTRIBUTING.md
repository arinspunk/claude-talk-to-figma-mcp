# Contributing

📖 [**Commands**](COMMANDS.md) | 🚀 [**Installation**](INSTALLATION.md) | 🛠️ [**Contributing**](CONTRIBUTING.md) | 🆘 [**Troubleshooting**](TROUBLESHOOTING.md) | 📜 [**Changelog**](CHANGELOG.md)

Thank you for your interest in contributing to Claude Talk to Figma MCP.

## Architecture

```
+----------------+     +-------+     +---------------+     +---------------+
|                |     |       |     |               |     |               |
| Claude Desktop |<--->|  MCP  |<--->| WebSocket Srv |<--->| Figma Plugin  |
|   (AI Agent)   |     |       |     |  (Port 3055)  |     |  (UI Plugin)  |
|                |     |       |     |               |     |               |
+----------------+     +-------+     +---------------+     +---------------+
```

### Design principles

- **MCP Server:** Business logic, validation, default values
- **WebSocket Server:** Message routing and protocol translation
- **Figma Plugin:** Pure command executor within the Figma context

### Benefits of this architecture

- Clear separation of concerns
- Easy to test and maintain
- Scalable for adding new tools

## Project structure

```
src/
  talk_to_figma_mcp/        # MCP server implementation
    server.ts               # Main entry point
    tools/                  # Tool categories
      document-tools.ts     # Document interaction
      creation-tools.ts     # Shape and element creation
      modification-tools.ts # Property modification
      text-tools.ts         # Text manipulation
    utils/                  # Shared utilities
    types/                  # TypeScript definitions
  claude_mcp_plugin/        # Figma plugin
    code.js                 # Plugin implementation
    manifest.json           # Plugin configuration
```

## Environment setup

```bash
git clone https://github.com/arinspunk/claude-talk-to-figma-mcp.git
cd claude-talk-to-figma-mcp
bun install
```

Build:
- **macOS/Linux:** `bun run build`
- **Windows:** `bun run build:win`

### Create DXT package

To generate your own DXT package for distribution:

```bash
npm run build:dxt
```

This creates `claude-talk-to-figma-mcp.dxt` in the root directory.

## Local development with Claude Desktop

If you're developing new features or fixing bugs, you'll want to test your local changes directly in Claude Desktop.

**Important:** Do not use `bun run configure-claude` for local development, as this script is designed for end users and configures Claude to download the official version from NPM.

### Manual configuration

To use your local version, you must manually edit the Claude Desktop configuration file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add (or modify) the entry in `mcpServers` pointing to your locally built file:

```json
{
  "mcpServers": {
    "ClaudeTalkToFigma-Local": {
      "command": "node",
      "args": [
        "/YOUR/PATH/TO/PROJECT/claude-talk-to-figma-mcp/dist/talk_to_figma_mcp/server.js"
      ]
    }
  }
}
```

> **Note:** Remember that you must run `bun run build` every time you make changes to the server code and restart Claude Desktop for the changes to take effect.


## Testing

### Automated tests

```bash
bun run test            # Run all tests
bun run test:watch      # Watch mode
bun run test:coverage   # Coverage report
```

### Integration tests

```bash
bun run test:integration
```

This script guides you step by step to test the complete flow between Claude, the WebSocket server, and Figma.

### Manual verification

Checklist:

- [ ] The WebSocket server starts on port 3055
- [ ] The Figma plugin connects and generates a channel ID
- [ ] The MCP client recognizes "ClaudeTalkToFigma"
- [ ] Basic commands work (create rectangle, change color)
- [ ] Error handling works (invalid commands, timeouts)
- [ ] Channel communication works between client and Figma

For more detailed testing documentation, see [TESTING.md](TESTING.md).

## Contribution guide

### 1. Fork and branch

```bash
git checkout -b feature/my-new-feature
```

### 2. Code standards

- Follow existing TypeScript patterns
- Add types for all public functions
- Use descriptive names in English

### 3. Tests

- Add tests for new functionality
- Make sure existing tests pass
- Include edge case tests

### 4. Documentation

- Update COMMANDS.md if you add tools
- Update CHANGELOG.md with your changes
- Add comments in complex code

### 5. Pull Request

- Clear description of changes
- Reference to related issues
- Screenshots if there are visual changes

## Contributors

- **[sometimesdante](https://github.com/sometimesdante)** — Full instruction copy on channel click.
- **[ehs208](https://github.com/ehs208)** — Configuration script, Korean localization, channel verification ping, `set_instance_variant` tool, coordinate system unification, Docker orchestration, and image manipulation tools.
- **[mmabas77](https://github.com/mmabas77)** — Full text alignment support, RTL/Arabic languages, `set_selection_colors` tool, and massive expansion with 20+ new tools (variables, gradients, grids, and transformations).
- **[leeyc09](https://github.com/leeyc09)** — Fixed-width text support and dependency stability improvements.
- **[Rob Dearborn](https://github.com/rfdearborn)** — Component optimization and `set_text_style_id` tool.
- **[sk (kovalevsky)](https://github.com/kovalevsky)** — Page management tools and SVG export fix.
- **[Beomsu Koh](https://github.com/GoBeromsu)** — `rename_node` tool.
- **[Timur](https://github.com/Mirsmog)** — Zod validation improvements.
- **[Taylor Smits](https://github.com/smitstay)** — DXT package support, CI/CD workflows, and tests.
- **[easyhak](https://github.com/easyhak)** — Windows script compatibility.

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
