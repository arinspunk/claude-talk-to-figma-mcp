import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma } from "../utils/websocket";
import { StrokeAlign, StrokeCap, StrokeJoin } from "../types";

/**
 * Register stroke tools to the MCP server
 * This module contains tools for advanced stroke control in Figma
 * @param server - The MCP server instance
 */
export function registerStrokeTools(server: McpServer): void {
  // Tool implementations will be added here
}