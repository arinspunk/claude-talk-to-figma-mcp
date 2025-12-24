import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDocumentTools } from '../../src/talk_to_figma_mcp/tools/document-tools';

jest.mock('../../src/talk_to_figma_mcp/utils/websocket', () => ({
  sendCommandToFigma: jest.fn(),
  joinChannel: jest.fn()
}));

jest.mock('../../src/talk_to_figma_mcp/utils/figma-helpers', () => ({
  filterFigmaNode: jest.fn()
}));

describe("page tools integration", () => {
  let server: McpServer;
  let mockSendCommand: jest.Mock;
  let toolHandlers: Map<string, Function> = new Map();
  let toolSchemas: Map<string, z.ZodObject<any>> = new Map();

  beforeEach(() => {
    server = new McpServer(
      { name: 'test-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    mockSendCommand = require('../../src/talk_to_figma_mcp/utils/websocket').sendCommandToFigma;
    mockSendCommand.mockClear();

    const originalTool = server.tool.bind(server);
    jest.spyOn(server, 'tool').mockImplementation((...args: any[]) => {
      if (args.length === 4) {
        const [name, description, schema, handler] = args;
        toolHandlers.set(name, handler);
        toolSchemas.set(name, z.object(schema));
      }
      return (originalTool as any)(...args);
    });

    registerDocumentTools(server);
  });

  async function callTool(toolName: string, args: any) {
    const schema = toolSchemas.get(toolName);
    const handler = toolHandlers.get(toolName);
    if (!schema || !handler) {
      throw new Error(`Tool ${toolName} not found`);
    }
    const validatedArgs = schema.parse(args);
    return await handler(validatedArgs, { meta: {} });
  }

  describe("create_page", () => {
    it("creates a new page with name", async () => {
      mockSendCommand.mockResolvedValue({
        id: "page-123",
        name: "New Page"
      });

      const response = await callTool("create_page", {
        name: "New Page"
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(1);
      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(command).toBe("create_page");
      expect(payload.name).toBe("New Page");
      expect(response.content[0].text).toContain("New Page");
      expect(response.content[0].text).toContain("page-123");
    });

    it("rejects missing name", async () => {
      await expect(callTool("create_page", {}))
        .rejects.toThrow();
      expect(mockSendCommand).not.toHaveBeenCalled();
    });
  });

  describe("delete_page", () => {
    it("deletes a page by id", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        name: "Deleted Page"
      });

      const response = await callTool("delete_page", {
        pageId: "page-456"
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(1);
      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(command).toBe("delete_page");
      expect(payload.pageId).toBe("page-456");
      expect(response.content[0].text).toContain("Deleted");
    });

    it("rejects missing pageId", async () => {
      await expect(callTool("delete_page", {}))
        .rejects.toThrow();
      expect(mockSendCommand).not.toHaveBeenCalled();
    });

    it("handles error when page not found", async () => {
      mockSendCommand.mockRejectedValue(new Error("Page not found"));

      const response = await callTool("delete_page", {
        pageId: "invalid-page"
      });

      expect(response.content[0].text).toContain("Error");
    });
  });

  describe("rename_page", () => {
    it("renames a page", async () => {
      mockSendCommand.mockResolvedValue({
        id: "page-789",
        name: "New Name",
        oldName: "Old Name"
      });

      const response = await callTool("rename_page", {
        pageId: "page-789",
        name: "New Name"
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(1);
      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(command).toBe("rename_page");
      expect(payload.pageId).toBe("page-789");
      expect(payload.name).toBe("New Name");
      expect(response.content[0].text).toContain("Old Name");
      expect(response.content[0].text).toContain("New Name");
    });

    it("rejects missing pageId", async () => {
      await expect(callTool("rename_page", { name: "Test" }))
        .rejects.toThrow();
      expect(mockSendCommand).not.toHaveBeenCalled();
    });

    it("rejects missing name", async () => {
      await expect(callTool("rename_page", { pageId: "page-123" }))
        .rejects.toThrow();
      expect(mockSendCommand).not.toHaveBeenCalled();
    });
  });

  describe("get_pages", () => {
    it("returns all pages", async () => {
      mockSendCommand.mockResolvedValue({
        pages: [
          { id: "page-1", name: "Page 1", childCount: 5, isCurrent: true },
          { id: "page-2", name: "Page 2", childCount: 3, isCurrent: false }
        ],
        currentPageId: "page-1"
      });

      const response = await callTool("get_pages", {});

      expect(mockSendCommand).toHaveBeenCalledTimes(1);
      const [command] = mockSendCommand.mock.calls[0];
      expect(command).toBe("get_pages");
      expect(response.content[0].text).toContain("page-1");
      expect(response.content[0].text).toContain("Page 1");
    });
  });

  describe("set_current_page", () => {
    it("switches to a page", async () => {
      mockSendCommand.mockResolvedValue({
        id: "page-999",
        name: "Target Page"
      });

      const response = await callTool("set_current_page", {
        pageId: "page-999"
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(1);
      const [command, payload] = mockSendCommand.mock.calls[0];
      expect(command).toBe("set_current_page");
      expect(payload.pageId).toBe("page-999");
      expect(response.content[0].text).toContain("Target Page");
    });

    it("rejects missing pageId", async () => {
      await expect(callTool("set_current_page", {}))
        .rejects.toThrow();
      expect(mockSendCommand).not.toHaveBeenCalled();
    });

    it("handles error when page not found", async () => {
      mockSendCommand.mockRejectedValue(new Error("Page not found"));

      const response = await callTool("set_current_page", {
        pageId: "invalid-page"
      });

      expect(response.content[0].text).toContain("Error");
    });
  });
});
