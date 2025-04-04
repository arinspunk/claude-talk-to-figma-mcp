# Claude Talk to Figma MCP

This project implements a Model Context Protocol (MCP) integration between Claude Desktop and Figma, allowing Claude to communicate with Figma for reading designs and modifying them programmatically.

## About this project

This is an adapted fork of the original "Cursor Talk to Figma MCP" project, specifically modified to work with Claude Desktop instead of Cursor. It allows you to use Claude to interact with your Figma designs, analyze components, modify elements, and automate design tasks.

## Project Structure

- `src/talk_to_figma_mcp/` - TypeScript MCP server for Figma integration
- `src/claude_mcp_plugin/` - Figma plugin for communicating with Claude
- `src/socket.ts` - WebSocket server that facilitates communication between the MCP server and Figma plugin

## Get Started

1. Install Bun if you haven't already:

```bash
curl -fsSL https://bun.sh/install | bash
```

2. Run setup, this will also install MCP in your Claude Desktop

```bash
bun setup
```

3. Start the Websocket server

```bash
bun socket
```

4. MCP server

```bash
bunx claude-talk-to-figma-mcp
```

5. Install [Figma Plugin](#figma-plugin)

## Quick Video Tutorial

[![image](images/tutorial.jpg)](https://www.linkedin.com/posts/sonnylazuardi_just-wanted-to-share-my-latest-experiment-activity-7307821553654657024-yrh8)

## Design Automation Example

**Bulk text content replacement**

Thanks to [@dusskapark](https://github.com/dusskapark) for contributing the bulk text replacement feature. Here is the [demo video](https://www.youtube.com/watch?v=j05gGT3xfCs).

## Manual Setup and Installation

### MCP Server: Integration with Claude Desktop

Add the server to your Claude Desktop MCP configuration (see the [Claude Desktop Configuration](#claude-desktop-configuration) section for details):

```json
{
  "mcpServers": {
    "ClaudeTalkToFigma": {
      "command": "bunx",
      "args": ["claude-talk-to-figma-mcp@latest"]
    }
  }
}
```

### WebSocket Server

Start the WebSocket server:

```bash
bun socket
```

### Figma Plugin

1. In Figma, go to Plugins > Development > New Plugin
2. Choose "Link existing plugin"
3. Select the `src/claude_mcp_plugin/manifest.json` file
4. The plugin should now be available in your Figma development plugins

## Windows + WSL Guide

1. Install bun via powershell

```bash
powershell -c "irm bun.sh/install.ps1|iex"
```

2. Uncomment the hostname `0.0.0.0` in `src/socket.ts`

```typescript
// uncomment this to allow connections in windows wsl
hostname: "0.0.0.0",
```

3. Start the websocket

```bash
bun socket
```

## Usage

1. Start the WebSocket server
2. Install the MCP server in Claude Desktop
3. Open Figma and run the Claude MCP Plugin
4. Connect the plugin to the WebSocket server by joining a channel using `join_channel`
5. Use Claude to communicate with Figma using the MCP tools

## MCP Tools

The MCP server provides the following tools for interacting with Figma:

### Document & Selection

- `get_document_info` - Get information about the current Figma document
- `get_selection` - Get information about the current selection
- `get_node_info` - Get detailed information about a specific node
- `get_nodes_info` - Get detailed information about multiple nodes by providing an array of node IDs

### Creating Elements

- `create_rectangle` - Create a new rectangle with position, size, and optional name
- `create_frame` - Create a new frame with position, size, and optional name
- `create_text` - Create a new text node with customizable font properties

### Modifying text content

- `scan_text_nodes` - Scan text nodes with intelligent chunking for large designs
- `set_text_content` - Set the text content of a single text node
- `set_multiple_text_contents` - Batch update multiple text nodes efficiently

### Styling

- `set_fill_color` - Set the fill color of a node (RGBA)
- `set_stroke_color` - Set the stroke color and weight of a node
- `set_corner_radius` - Set the corner radius of a node with optional per-corner control

### Layout & Organization

- `move_node` - Move a node to a new position
- `resize_node` - Resize a node with new dimensions
- `delete_node` - Delete a node
- `clone_node` - Create a copy of an existing node with optional position offset

### Components & Styles

- `get_styles` - Get information about local styles
- `get_local_components` - Get information about local components
- `get_team_components` - Get information about team components
- `create_component_instance` - Create an instance of a component

### Export & Advanced

- `export_node_as_image` - Export a node as an image (PNG, JPG, SVG, or PDF)
- `execute_figma_code` - Execute arbitrary JavaScript code in Figma (use with caution)

### Connection Management

- `join_channel` - Join a specific channel to communicate with Figma

## Development

### Building the Figma Plugin

1. Navigate to the Figma plugin directory:

   ```
   cd src/claude_mcp_plugin
   ```

2. Edit code.js and ui.html

## Best Practices

When working with the Figma MCP:

1. Always join a channel before sending commands
2. Get document overview using `get_document_info` first
3. Check current selection with `get_selection` before modifications
4. Use appropriate creation tools based on needs:
   - `create_frame` for containers
   - `create_rectangle` for basic shapes
   - `create_text` for text elements
5. Verify changes using `get_node_info`
6. Use component instances when possible for consistency
7. Handle errors appropriately as all commands can throw exceptions
8. For large designs:
   - Use chunking parameters in `scan_text_nodes`
   - Monitor progress through WebSocket updates
   - Implement appropriate error handling
9. For text operations:
   - Use batch operations when possible
   - Consider structural relationships
   - Verify changes with targeted exports

## License

MIT

## Claude Desktop Configuration

To configure this MCP in Claude Desktop, there are two options:

### Option 1: Automatic configuration (recommended)

Run the included configuration script:

```bash
bun run configure-claude
```

This script will automatically detect the location of the Claude Desktop configuration file, create a backup of the existing configuration if available, and add the necessary configuration to use this MCP.

### Option 2: Manual configuration

1. Locate the Claude Desktop configuration file:
   - On macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - On Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the following configuration:

```json
{
  "mcpServers": {
    "ClaudeTalkToFigma": {
      "command": "bunx",
      "args": ["claude-talk-to-figma-mcp@latest"]
    }
  }
}
```

### Using with Claude Desktop

1. Restart Claude Desktop if it's running
2. Start the WebSocket server: `bun socket`
3. Open Claude Desktop and select "ClaudeTalkToFigma" from the MCPs list
4. Install and run the Figma plugin following the instructions in the [Figma Plugin](#figma-plugin) section

### Example Prompts for Claude

Once connected, you can use prompts like these to interact with Figma:

#### Document Analysis

```
Analyze my current Figma document and tell me what elements it contains.
```

#### Element Modification

```
Select the element with id "123:456" and change its background color to red (#FF0000).
```

#### Task Automation

```
Find all text nodes in the document and show me those containing the word "button".
```

#### Element Creation

```
Create a new rectangle with 10px rounded corners, 200x100 size, and blue background color (#0000FF).
```
