# Detailed installation

📖 [**Commands**](COMMANDS.md) | 🚀 [**Installation**](INSTALLATION.md) | 🛠️ [**Contributing**](CONTRIBUTING.md) | 🆘 [**Troubleshooting**](TROUBLESHOOTING.md) | 📜 [**Changelog**](CHANGELOG.md)

This guide covers all installation and configuration methods for different Agentic Tools.

## Prerequisites

- [Node.js](https://nodejs.org/en/download)
- [Figma Desktop](https://www.figma.com/downloads/)
- Agentic Tool:
  - [Claude Desktop](https://claude.ai/download)
  - [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
  - [Cursor](https://cursor.com/downloads)
  - [Windsurf](https://windsurf.com/download)
  - [VS Code](https://code.visualstudio.com/) + [GitHub Copilot](https://github.com/features/copilot)
  - [Cline](https://marketplace.visualstudio.com/items?itemName=saoudrizwan.claude-dev)
  - [Roo Code](https://marketplace.visualstudio.com/items?itemName=RooVeterinaryInc.roo-cline)

---

## 1. Start the WebSocket Server (Required)

Navigate to the folder where you want to install the MCP and simply run:

```bash
npx claude-talk-to-figma-mcp
```

This single command will:
1. Clone the repository.
2. Install optimized dependencies (Bun).
3. Start the socket server for you automatically.

*Verify the server is running at: `http://localhost:3055/status`*

---

## 2. Setup Figma Plugin

1. In Figma Desktop: **Menu → Plugins → Development → Import plugin from manifest...**
2. Navigate to the folder where you ran the command in Step 1.
3. Select `src/claude_mcp_plugin/manifest.json`.
4. Open the plugin.


---

## 3. Configure your Agentic Tool

Once the server is running, you need to tell your AI tool how to find the MCP tools.

### Claude Desktop

#### Option A: DXT Package (easiest)

1. Download `claude-talk-to-figma-mcp.dxt` from [releases](https://github.com/arinspunk/claude-talk-to-figma-mcp/releases)
2. Double-click the `.dxt` file → it installs automatically in Claude Desktop

#### Option B: JSON Configuration

In Claude Desktop, go to **Settings → Developer → Edit Config**. This will open the `claude_desktop_config.json` file. Add the following configuration:

```json
{
  "mcpServers": {
    "ClaudeTalkToFigma": {
      "command": "npx",
      "args": ["-p", "claude-talk-to-figma-mcp@latest", "claude-talk-to-figma-mcp-server"]
    }
  }
}
```

**Restart Claude Desktop** for changes to take effect.

---

### Claude Code

From your terminal:

```bash
claude mcp add ClaudeTalkToFigma -- npx -p claude-talk-to-figma-mcp@latest claude-talk-to-figma-mcp-server
```

Verify with:

```bash
claude mcp list
```

Alternatively, create a `.mcp.json` file in your project root (recommended for per-project configurations):

```json
{
  "mcpServers": {
    "ClaudeTalkToFigma": {
      "command": "npx",
      "args": ["-p", "claude-talk-to-figma-mcp@latest", "claude-talk-to-figma-mcp-server"]
    }
  }
}
```

Inside Claude Code, use `/mcp` to check the server status.

---

### Cursor IDE

1. Open **Cursor Settings → Tools & Integrations**
2. Click **"New MCP Server"** to open the `mcp.json` file
3. Add this configuration:

```json
{
  "mcpServers": {
    "ClaudeTalkToFigma": {
      "command": "npx",
      "args": ["-p", "claude-talk-to-figma-mcp@latest", "claude-talk-to-figma-mcp-server"]
    }
  }
}
```

4. Save the file and restart Cursor

---

### Windsurf (Codeium)

1. Open **Windsurf Settings → Cascade → MCP Servers** (or click the MCPs icon in the Cascade panel)
2. Click **"View raw config"** to edit `mcp_config.json`
   - **macOS:** `~/.codeium/windsurf/mcp_config.json`
   - **Windows:** `%USERPROFILE%\.codeium\windsurf\mcp_config.json`

3. Add the configuration:

```json
{
  "mcpServers": {
    "ClaudeTalkToFigma": {
      "command": "npx",
      "args": ["-p", "claude-talk-to-figma-mcp@latest", "claude-talk-to-figma-mcp-server"]
    }
  }
}
```

4. Save and click the **Refresh** button in the Cascade panel to load the server

---

### VS Code + GitHub Copilot

**Requirement:** GitHub Copilot enabled on your account.

#### Option A: Command line

```bash
code --add-mcp "{\"name\":\"ClaudeTalkToFigma\",\"command\":\"npx\",\"args\":[\"-p\",\"claude-talk-to-figma-mcp@latest\",\"claude-talk-to-figma-mcp-server\"]}"
```

#### Option B: From the Command Palette

1. Open **Command Palette** (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Search for **"MCP: Add Server"**
3. Select **"Command (stdio)"**
4. Enter the command: `npx`
5. Enter the arguments: `-p claude-talk-to-figma-mcp@latest claude-talk-to-figma-mcp-server`
6. Set the name: `ClaudeTalkToFigma`
7. Choose whether to add it **globally** or only for the **current workspace**

This will generate an entry in your `mcp.json` (or `.vscode/mcp.json` for workspace):

```json
{
  "servers": {
    "ClaudeTalkToFigma": {
      "type": "stdio",
      "command": "npx",
      "args": ["-p", "claude-talk-to-figma-mcp@latest", "claude-talk-to-figma-mcp-server"]
    }
  }
}
```

Confirm it works by typing `#` in the Copilot chat to see the available MCP tools.

---

### Cline (VS Code extension)

1. Open the **Cline** extension in VS Code
2. Go to **Settings → MCP Servers** (or find "Installed" → "Configure MCP Servers")
3. The `cline_mcp_settings.json` file will open
   - **macOS:** `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
   - **Windows:** `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`

4. Add under `"mcpServers"`:

```json
{
  "mcpServers": {
    "ClaudeTalkToFigma": {
      "command": "npx",
      "args": ["-p", "claude-talk-to-figma-mcp@latest", "claude-talk-to-figma-mcp-server"],
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

5. Save. Cline will automatically detect the new server.

---

### Roo Code (VS Code extension)

1. Open **Roo Code** in VS Code
2. Click the **MCP icon** in the Roo Code panel navigation bar
3. Select **"Edit MCP Settings"** (opens `mcp_settings.json`)
   - **macOS:** `~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json`
   - **Windows:** `%APPDATA%\Code\User\globalStorage\rooveterinaryinc.roo-cline\settings\mcp_settings.json`

4. Add under `"mcpServers"`:

```json
{
  "mcpServers": {
    "ClaudeTalkToFigma": {
      "command": "npx",
      "args": ["-p", "claude-talk-to-figma-mcp@latest", "claude-talk-to-figma-mcp-server"],
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

5. Save and restart Roo Code

**Note:** Roo Code also supports per-project configuration by creating a `.roo/mcp.json` file in the project root with the same structure.
