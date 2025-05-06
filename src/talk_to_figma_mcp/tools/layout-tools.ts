import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma } from "../utils/websocket";
import { LayoutSizing, LayoutAlign, ConstraintType } from "../types";

/**
 * Register layout tools to the MCP server
 * This module contains tools for adaptive sizing and layout constraints in Figma
 * @param server - The MCP server instance
 */
export function registerLayoutTools(server: McpServer): void {
  // Tool implementations will be added here
}