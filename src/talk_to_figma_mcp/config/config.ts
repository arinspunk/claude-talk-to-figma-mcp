import { z } from "zod";

// Argumentos de línea de comandos
const args = process.argv.slice(2);
const serverArg = args.find(arg => arg.startsWith('--server='));
const portArg = args.find(arg => arg.startsWith('--port='));
const reconnectArg = args.find(arg => arg.startsWith('--reconnect-interval='));

// Configuración de conexión extraída de argumentos CLI
export const serverUrl = serverArg ? serverArg.split('=')[1] : 'localhost';
export const defaultPort = portArg ? parseInt(portArg.split('=')[1], 10) : 3055;
export const reconnectInterval = reconnectArg ? parseInt(reconnectArg.split('=')[1], 10) : 2000;

// URL de WebSocket basada en el servidor (WS para localhost, WSS para remoto)
export const WS_URL = serverUrl === 'localhost' ? `ws://${serverUrl}` : `wss://${serverUrl}`;

// Configuración del servidor MCP (Implementation info)
export const SERVER_CONFIG = {
  name: "ClaudeTalkToFigmaMCP",
  description: "Claude MCP Plugin for Figma",
  version: "1.1.0",
};

// Instructions surfaced to the MCP client (Claude) during initialization.
// These remove the "connection handshake" friction: Claude should call Figma
// tools directly instead of asking the user for a channel ID.
export const SERVER_INSTRUCTIONS = `This server reads from and writes to the user's live Figma file via the "Claude Talk to Figma" plugin.

CONNECTION IS ZERO-CONFIG. As long as the user has the plugin open and connected, you can call any Figma tool directly. Do NOT ask the user for a "channel ID" and do NOT call join_channel first — commands are auto-routed to the connected plugin.

If a tool returns an error indicating no plugin is connected, tell the user: "Open the Claude Talk to Figma plugin in your Figma file and click Connect," then retry.

Only call join_channel when a tool reports that MULTIPLE Figma files are connected and you need to disambiguate which file to target.`;