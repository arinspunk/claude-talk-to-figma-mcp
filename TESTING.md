# Testing Guide for Claude Talk to Figma MCP

📖 [**Docs**](COMMANDS.md) | 🚀 [**Installation**](INSTALLATION.md) | 🛠️ [**Contributing**](CONTRIBUTING.md) | 🆘 [**Troubleshooting**](TROUBLESHOOTING.md) | 📜 [**Changelog**](CHANGELOG.md)

This document provides a detailed guide for testing the Claude Talk to Figma MCP project, including both automated tests and manual integration tests.

## Testing Approaches

The project uses two complementary testing approaches:

1. **Automated Tests**: Unit and component integration tests using Jest
2. **Manual Integration Tests**: End-to-end tests for the complete Claude-MCP-Figma workflow

## Prerequisites

Before starting the tests, make sure you have:

- Claude Desktop or Cursor installed
- Figma account with plugin development access
- Node.js / Bun installed
- Permissions to install plugins in Figma

## Automated Tests

### Running Automated Tests

```bash
# Run all automated tests
bun run test

# Run in watch mode (re-runs on file changes)
bun run test:watch

# Run with coverage report
bun run test:coverage
```

### Test Categories

1. **Unit Tests** (`tests/unit/utils/`):
   - Test individual functions and utilities in isolation
   - Verify edge cases and error handling
   - Example: `defaults.test.ts` - Tests the proper handling of falsy values

2. **Integration Tests** (`tests/integration/`):
   - Test interactions between multiple components
   - Verify that components work together correctly
   - Example: `set-fill-color.test.ts` - Tests the opacity handling in fill colors

### Adding New Tests

1. For unit tests:
   - Create a file in `tests/unit/utils/`
   - Name the file `*.test.ts` to be detected by Jest

2. For integration tests:
   - Create a file in the `tests/integration/` directory
   - Use the test fixtures in `tests/fixtures/` for test data

## Manual Integration Tests

These tests verify the complete end-to-end workflow between Claude Desktop/Cursor, the MCP server, and Figma.

### Running Guided Integration Tests

```bash
bun run test:integration
```

This script will guide you through the complete testing process.

## Test Cases

### 1. Environment Setup

| Test case | Steps | Expected result |
| -------------- | ----- | ------------------ |
| Dependencies installation | Run `bun install` | All dependencies are installed without errors |
| Claude configuration (DXT) | Double click `claude-talk-to-figma-mcp.dxt` | Claude installs and configures automatically |
| Manual verify | Check `claude_desktop_config.json` file | Contains configuration for "ClaudeTalkToFigma" |

### 2. WebSocket Server Configuration

| Test case | Steps | Expected result |
| -------------- | ----- | ------------------ |
| Start WebSocket server | Run `npx claude-talk-to-figma-mcp` | Server starts on port 3055, shows confirmation message |
| Verify server status | Access `http://localhost:3055/status` | Returns JSON with "running" status and statistics |
| Test reconnection | Stop and restart the server | Client reconnects automatically |

### 3. Figma Plugin Setup

#### Install the Figma Plugin

1. In Figma Desktop: **Menu > Plugins > Development > Import plugin from manifest...**
2. Navigate to and select `src/claude_mcp_plugin/manifest.json` from this repository

#### Connect Plugin to WebSocket Server

1. Open the plugin in Figma
2. Copy the **Channel ID**
3. In Claude/Cursor, type: "Talk to Figma, channel {YOUR_ID}"
4. You should receive a confirmation message

#### Integration Test

To test if everything is working:

1. Start the WebSocket server (`npx claude-talk-to-figma-mcp`)
2. Open Figma and run the Claude MCP Plugin
3. Connect in Claude Desktop
4. Ask: "Can you show me information about my current Figma selection?"

## Common Problems and Solutions

### Connection Problems

| Problem | Possible cause | Solution |
| -------- | ------------- | -------- |
| "Cannot connect to WebSocket" | Server is not running | Run `npx claude-talk-to-figma-mcp` |
| "Connection error: port in use" | Port 3055 is occupied | Free the port (`lsof -i :3055`) |
| "MCP does not appear" | Configuration not loaded | Restart Claude/Cursor after installing DXT or editing json |

### Problems with Figma

| Problem | Possible cause | Solution |
| -------- | ------------- | -------- |
| "Plugin does not appear" | Incorrect import | Verify path to `manifest.json` |
| "Cannot modify elements" | Read-only mode | Ensure you have edit access to the document |

## Diagnostics and Debugging

1. **WebSocket Logs**: Detailed logs appear in the terminal where the server runs.
2. **Status Endpoint**: Access `http://localhost:3055/status` to verify alive status.
3. **Figma Console**: Open via **Plugins > Development > Show/Hide console**.
4. **Restart Order**: Stop server -> Close AI tool -> Restart Server -> Open AI tool.

---

## Comprehensive Testing Checklist

- [ ] Claude Desktop/Cursor configuration completed
- [ ] WebSocket server started and running
- [ ] Figma plugin installed and connected
- [ ] Claude can get document information
- [ ] Claude can create/modify elements
- [ ] Automated tests pass successfully (`bun run test`)