# Claude Talk to Figma MCP

This project implements a Model Context Protocol (MCP) integration between Claude Desktop and Figma, allowing Claude to communicate with Figma for reading designs and modifying them programmatically.

https://github.com/user-attachments/assets/129a14d2-ed73-470f-9a4c-2240b2a4885c

## Acerca de este proyecto

Este es un fork adaptado del proyecto original "Cursor Talk to Figma MCP", modificado específicamente para trabajar con Claude Desktop en lugar de Cursor. Permite que utilices Claude para interactuar con tus diseños de Figma, analizar componentes, modificar elementos y automatizar tareas de diseño.

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

Para configurar este MCP en Claude Desktop, hay dos opciones:

### Opción 1: Configuración automática (recomendada)

Ejecuta el script de configuración incluido:

```bash
bun run configure-claude
```

Este script detectará automáticamente la ubicación del archivo de configuración de Claude Desktop, creará una copia de seguridad de la configuración existente si la hay, y añadirá la configuración necesaria para usar este MCP.

### Opción 2: Configuración manual

1. Localiza el archivo de configuración de Claude Desktop:
   - En macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - En Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. Añade la siguiente configuración:

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

### Uso en Claude Desktop

1. Reinicia Claude Desktop si está ejecutándose
2. Inicia el servidor WebSocket: `bun socket`
3. Abre Claude Desktop y selecciona "ClaudeTalkToFigma" en la lista de MCPs
4. Instala y ejecuta el plugin de Figma según las instrucciones de la sección [Figma Plugin](#figma-plugin)

### Ejemplos de Prompts para Claude

Una vez conectado, puedes utilizar prompts como estos para interactuar con Figma:

#### Análisis de documentos

```
Analiza mi documento de Figma actual y dime qué elementos contiene.
```

#### Modificación de elementos

```
Selecciona el elemento con id "123:456" y cambia su color de fondo a rojo (#FF0000).
```

#### Automatización de tareas

```
Busca todos los nodos de texto en el documento y muéstrame aquellos que contienen la palabra "botón".
```

#### Creación de elementos

```
Crea un nuevo rectángulo con esquinas redondeadas de 10px, tamaño de 200x100 y color de fondo azul (#0000FF).
```
