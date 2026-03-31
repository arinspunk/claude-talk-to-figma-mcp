import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCompoundTools } from '../../src/talk_to_figma_mcp/tools/compound-tools';

jest.mock('../../src/talk_to_figma_mcp/utils/websocket', () => ({
  sendCommandToFigma: jest.fn().mockResolvedValue({ name: 'MockNode', id: 'mock-id-1' }),
}));

describe('compound tools', () => {
  let server: McpServer;
  let mockSendCommand: jest.Mock;
  const handlers: Record<string, { handler: (...args: any[]) => any; schema: z.ZodObject<any> }> = {};

  beforeEach(() => {
    server = new McpServer(
      { name: 'test-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    mockSendCommand = require('../../src/talk_to_figma_mcp/utils/websocket').sendCommandToFigma;
    mockSendCommand.mockClear();
    mockSendCommand.mockResolvedValue({ name: 'MockNode', id: 'mock-id-1' });

    const originalTool = server.tool.bind(server);
    jest.spyOn(server, 'tool').mockImplementation((...args: any[]) => {
      if (args.length === 4) {
        const [name, , schema, handler] = args;
        handlers[name] = { handler, schema: z.object(schema) };
      }
      return (originalTool as any)(...args);
    });

    registerCompoundTools(server);
  });

  async function callTool(name: string, args: any) {
    const { handler, schema } = handlers[name];
    const validatedArgs = schema.parse(args);
    return handler(validatedArgs, { meta: {} });
  }

  // ── create_frame_with_autolayout ─────────────────────────────────────────

  describe('create_frame_with_autolayout tool', () => {
    const baseArgs = {
      x: 0,
      y: 0,
      width: 400,
      height: 300,
      layoutMode: 'HORIZONTAL',
    };

    it('calls create_frame then set_auto_layout in order', async () => {
      await callTool('create_frame_with_autolayout', baseArgs);

      expect(mockSendCommand).toHaveBeenCalledTimes(2);
      expect(mockSendCommand.mock.calls[0][0]).toBe('create_frame');
      expect(mockSendCommand.mock.calls[1][0]).toBe('set_auto_layout');
    });

    it('passes frame parameters to create_frame', async () => {
      await callTool('create_frame_with_autolayout', {
        ...baseArgs,
        name: 'Card',
        parentId: 'parent-1',
        fillColor: { r: 0.9, g: 0.9, b: 0.9, a: 1 },
      });

      const [, framePayload] = mockSendCommand.mock.calls[0];
      expect(framePayload).toMatchObject({
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        name: 'Card',
        parentId: 'parent-1',
        fillColor: { r: 0.9, g: 0.9, b: 0.9, a: 1 },
      });
    });

    it('passes the created frame ID to set_auto_layout as nodeId', async () => {
      mockSendCommand.mockResolvedValueOnce({ name: 'Card', id: 'frame-abc' });

      await callTool('create_frame_with_autolayout', {
        ...baseArgs,
        paddingTop: 16,
        itemSpacing: 8,
        primaryAxisAlignItems: 'CENTER',
      });

      const [, layoutPayload] = mockSendCommand.mock.calls[1];
      expect(layoutPayload.nodeId).toBe('frame-abc');
      expect(layoutPayload.layoutMode).toBe('HORIZONTAL');
      expect(layoutPayload.paddingTop).toBe(16);
      expect(layoutPayload.itemSpacing).toBe(8);
      expect(layoutPayload.primaryAxisAlignItems).toBe('CENTER');
    });

    it('defaults frame name to "Frame" when omitted', async () => {
      await callTool('create_frame_with_autolayout', baseArgs);

      const [, framePayload] = mockSendCommand.mock.calls[0];
      expect(framePayload.name).toBe('Frame');
    });

    it('defaults fillColor to white when omitted', async () => {
      await callTool('create_frame_with_autolayout', baseArgs);

      const [, framePayload] = mockSendCommand.mock.calls[0];
      expect(framePayload.fillColor).toEqual({ r: 1, g: 1, b: 1, a: 1 });
    });

    it('returns a success message containing the frame name and ID', async () => {
      mockSendCommand.mockResolvedValueOnce({ name: 'Hero', id: 'frame-xyz' });
      mockSendCommand.mockResolvedValueOnce({ name: 'Hero' });

      const result = await callTool('create_frame_with_autolayout', {
        ...baseArgs,
        name: 'Hero',
        layoutMode: 'VERTICAL',
      });

      expect(result.content[0].text).toContain('Hero');
      expect(result.content[0].text).toContain('frame-xyz');
      expect(result.content[0].text).toContain('VERTICAL');
    });

    it('returns an error message when create_frame fails', async () => {
      mockSendCommand.mockRejectedValueOnce(new Error('Node not found'));

      const result = await callTool('create_frame_with_autolayout', baseArgs);

      expect(result.content[0].text).toContain('Error creating frame with auto-layout');
      expect(result.content[0].text).toContain('Node not found');
    });

    it('rejects missing layoutMode', async () => {
      const { schema } = handlers['create_frame_with_autolayout'];
      expect(() => schema.parse({ x: 0, y: 0, width: 100, height: 100 })).toThrow();
    });

    it('accepts all optional auto-layout parameters', async () => {
      await callTool('create_frame_with_autolayout', {
        ...baseArgs,
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 16,
        paddingRight: 16,
        itemSpacing: 12,
        primaryAxisAlignItems: 'SPACE_BETWEEN',
        counterAxisAlignItems: 'CENTER',
        layoutWrap: 'WRAP',
        strokesIncludedInLayout: true,
      });

      const [, layoutPayload] = mockSendCommand.mock.calls[1];
      expect(layoutPayload.paddingTop).toBe(8);
      expect(layoutPayload.paddingBottom).toBe(8);
      expect(layoutPayload.paddingLeft).toBe(16);
      expect(layoutPayload.paddingRight).toBe(16);
      expect(layoutPayload.itemSpacing).toBe(12);
      expect(layoutPayload.primaryAxisAlignItems).toBe('SPACE_BETWEEN');
      expect(layoutPayload.counterAxisAlignItems).toBe('CENTER');
      expect(layoutPayload.layoutWrap).toBe('WRAP');
      expect(layoutPayload.strokesIncludedInLayout).toBe(true);
    });
  });

  // ── set_node_appearance ──────────────────────────────────────────────────

  describe('set_node_appearance tool', () => {
    it('applies fillColor when provided', async () => {
      await callTool('set_node_appearance', {
        nodeId: 'node-1',
        fillColor: { r: 0.2, g: 0.4, b: 0.6, a: 1 },
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(1);
      expect(mockSendCommand.mock.calls[0][0]).toBe('set_fill_color');
      expect(mockSendCommand.mock.calls[0][1]).toMatchObject({
        nodeId: 'node-1',
        color: { r: 0.2, g: 0.4, b: 0.6, a: 1 },
      });
    });

    it('applies strokeColor when provided', async () => {
      await callTool('set_node_appearance', {
        nodeId: 'node-1',
        strokeColor: { r: 0, g: 0, b: 0, a: 1 },
        strokeWeight: 2,
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(1);
      expect(mockSendCommand.mock.calls[0][0]).toBe('set_stroke_color');
      expect(mockSendCommand.mock.calls[0][1]).toMatchObject({
        nodeId: 'node-1',
        color: { r: 0, g: 0, b: 0, a: 1 },
        strokeWeight: 2,
      });
    });

    it('applies cornerRadius when provided', async () => {
      await callTool('set_node_appearance', {
        nodeId: 'node-1',
        cornerRadius: 8,
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(1);
      expect(mockSendCommand.mock.calls[0][0]).toBe('set_corner_radius');
      expect(mockSendCommand.mock.calls[0][1]).toMatchObject({
        nodeId: 'node-1',
        radius: 8,
        corners: [true, true, true, true],
      });
    });

    it('applies opacity when provided', async () => {
      await callTool('set_node_appearance', {
        nodeId: 'node-1',
        opacity: 0.5,
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(1);
      expect(mockSendCommand.mock.calls[0][0]).toBe('set_node_properties');
      expect(mockSendCommand.mock.calls[0][1]).toMatchObject({
        nodeId: 'node-1',
        opacity: 0.5,
      });
    });

    it('applies all provided properties in sequence', async () => {
      await callTool('set_node_appearance', {
        nodeId: 'node-1',
        fillColor: { r: 1, g: 0, b: 0, a: 1 },
        strokeColor: { r: 0, g: 0, b: 0 },
        strokeWeight: 1,
        cornerRadius: 4,
        opacity: 0.8,
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(4);
      expect(mockSendCommand.mock.calls[0][0]).toBe('set_fill_color');
      expect(mockSendCommand.mock.calls[1][0]).toBe('set_stroke_color');
      expect(mockSendCommand.mock.calls[2][0]).toBe('set_corner_radius');
      expect(mockSendCommand.mock.calls[3][0]).toBe('set_node_properties');
    });

    it('defaults stroke alpha to 1 when not specified', async () => {
      await callTool('set_node_appearance', {
        nodeId: 'node-1',
        strokeColor: { r: 0, g: 0, b: 0 },
      });

      const [, strokePayload] = mockSendCommand.mock.calls[0];
      expect(strokePayload.color.a).toBe(1);
    });

    it('defaults strokeWeight to 1 when strokeColor is provided without weight', async () => {
      await callTool('set_node_appearance', {
        nodeId: 'node-1',
        strokeColor: { r: 0, g: 0, b: 0, a: 1 },
      });

      const [, strokePayload] = mockSendCommand.mock.calls[0];
      expect(strokePayload.strokeWeight).toBe(1);
    });

    it('returns a descriptive message listing applied changes', async () => {
      const result = await callTool('set_node_appearance', {
        nodeId: 'node-1',
        fillColor: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
        cornerRadius: 6,
      });

      expect(result.content[0].text).toContain('node-1');
      expect(result.content[0].text).toContain('fill');
      expect(result.content[0].text).toContain('cornerRadius');
    });

    it('returns a warning when no properties are provided', async () => {
      const result = await callTool('set_node_appearance', { nodeId: 'node-1' });

      expect(mockSendCommand).not.toHaveBeenCalled();
      expect(result.content[0].text).toContain('No appearance properties');
    });

    it('returns an error message when a sub-command fails', async () => {
      mockSendCommand.mockRejectedValueOnce(new Error('Permission denied'));

      const result = await callTool('set_node_appearance', {
        nodeId: 'node-1',
        fillColor: { r: 1, g: 0, b: 0 },
      });

      expect(result.content[0].text).toContain('Error setting node appearance');
      expect(result.content[0].text).toContain('Permission denied');
    });

    it('rejects opacity > 1', async () => {
      const { schema } = handlers['set_node_appearance'];
      expect(() => schema.parse({ nodeId: 'n', opacity: 1.5 })).toThrow();
    });

    it('rejects opacity < 0', async () => {
      const { schema } = handlers['set_node_appearance'];
      expect(() => schema.parse({ nodeId: 'n', opacity: -0.1 })).toThrow();
    });

    it('accepts opacity 0 (fully transparent)', async () => {
      await callTool('set_node_appearance', { nodeId: 'node-1', opacity: 0 });

      const [, opacityPayload] = mockSendCommand.mock.calls[0];
      expect(opacityPayload.opacity).toBe(0);
    });
  });

  // ── bulk_create_nodes ────────────────────────────────────────────────────

  describe('bulk_create_nodes tool', () => {
    it('creates a single rectangle', async () => {
      mockSendCommand.mockResolvedValueOnce({ name: 'Rectangle', id: 'rect-1' });

      const result = await callTool('bulk_create_nodes', {
        nodes: [{ type: 'rectangle', x: 0, y: 0, width: 100, height: 50 }],
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(1);
      expect(mockSendCommand.mock.calls[0][0]).toBe('create_rectangle');
      expect(result.content[0].text).toContain('rect-1');
    });

    it('creates a single frame', async () => {
      mockSendCommand.mockResolvedValueOnce({ name: 'Frame', id: 'frame-1' });

      await callTool('bulk_create_nodes', {
        nodes: [{ type: 'frame', x: 0, y: 0, width: 200, height: 100 }],
      });

      expect(mockSendCommand.mock.calls[0][0]).toBe('create_frame');
    });

    it('creates a single text node', async () => {
      mockSendCommand.mockResolvedValueOnce({ name: 'Hello', id: 'text-1' });

      await callTool('bulk_create_nodes', {
        nodes: [{ type: 'text', x: 10, y: 20, text: 'Hello' }],
      });

      expect(mockSendCommand.mock.calls[0][0]).toBe('create_text');
      expect(mockSendCommand.mock.calls[0][1]).toMatchObject({
        text: 'Hello',
        x: 10,
        y: 20,
      });
    });

    it('creates a single ellipse', async () => {
      mockSendCommand.mockResolvedValueOnce({ name: 'Circle', id: 'ellipse-1' });

      await callTool('bulk_create_nodes', {
        nodes: [{ type: 'ellipse', x: 0, y: 0, width: 80, height: 80, name: 'Circle' }],
      });

      expect(mockSendCommand.mock.calls[0][0]).toBe('create_ellipse');
    });

    it('creates multiple nodes sequentially', async () => {
      mockSendCommand
        .mockResolvedValueOnce({ name: 'Rect', id: 'r-1' })
        .mockResolvedValueOnce({ name: 'Label', id: 't-1' });

      const result = await callTool('bulk_create_nodes', {
        nodes: [
          { type: 'rectangle', x: 0, y: 0, width: 100, height: 40 },
          { type: 'text', x: 10, y: 10, text: 'Label' },
        ],
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(2);
      expect(result.content[0].text).toContain('2 node(s)');
      expect(result.content[0].text).toContain('r-1');
      expect(result.content[0].text).toContain('t-1');
    });

    it('reports partial success when one node fails', async () => {
      mockSendCommand
        .mockResolvedValueOnce({ name: 'Rect', id: 'r-1' })
        .mockRejectedValueOnce(new Error('Font not loaded'));

      const result = await callTool('bulk_create_nodes', {
        nodes: [
          { type: 'rectangle', x: 0, y: 0, width: 100, height: 40 },
          { type: 'text', x: 0, y: 50, text: 'Hi' },
        ],
      });

      expect(result.content[0].text).toContain('Created 1');
      expect(result.content[0].text).toContain('Failed to create 1');
      expect(result.content[0].text).toContain('Font not loaded');
    });

    it('forwards parentId to each create command', async () => {
      mockSendCommand.mockResolvedValueOnce({ name: 'Rect', id: 'r-1' });

      await callTool('bulk_create_nodes', {
        nodes: [
          { type: 'rectangle', x: 0, y: 0, width: 50, height: 50, parentId: 'container-id' },
        ],
      });

      expect(mockSendCommand.mock.calls[0][1].parentId).toBe('container-id');
    });

    it('forwards fillColor and strokeColor for shapes', async () => {
      mockSendCommand.mockResolvedValueOnce({ name: 'Rect', id: 'r-1' });

      await callTool('bulk_create_nodes', {
        nodes: [
          {
            type: 'rectangle',
            x: 0,
            y: 0,
            width: 100,
            height: 50,
            fillColor: { r: 1, g: 0, b: 0, a: 1 },
            strokeColor: { r: 0, g: 0, b: 0, a: 1 },
            strokeWeight: 2,
          },
        ],
      });

      expect(mockSendCommand.mock.calls[0][1].fillColor).toEqual({ r: 1, g: 0, b: 0, a: 1 });
      expect(mockSendCommand.mock.calls[0][1].strokeColor).toEqual({ r: 0, g: 0, b: 0, a: 1 });
      expect(mockSendCommand.mock.calls[0][1].strokeWeight).toBe(2);
    });

    it('defaults text fontSize to 14 and fontWeight to 400', async () => {
      mockSendCommand.mockResolvedValueOnce({ name: 'Text', id: 'text-1' });

      await callTool('bulk_create_nodes', {
        nodes: [{ type: 'text', x: 0, y: 0, text: 'Hi' }],
      });

      const [, payload] = mockSendCommand.mock.calls[0];
      expect(payload.fontSize).toBe(14);
      expect(payload.fontWeight).toBe(400);
    });

    it('defaults frame fillColor to white', async () => {
      mockSendCommand.mockResolvedValueOnce({ name: 'Frame', id: 'f-1' });

      await callTool('bulk_create_nodes', {
        nodes: [{ type: 'frame', x: 0, y: 0, width: 200, height: 100 }],
      });

      const [, payload] = mockSendCommand.mock.calls[0];
      expect(payload.fillColor).toEqual({ r: 1, g: 1, b: 1, a: 1 });
    });

    it('rejects an empty nodes array', async () => {
      const { schema } = handlers['bulk_create_nodes'];
      expect(() => schema.parse({ nodes: [] })).toThrow();
    });

    it('rejects an unknown node type', async () => {
      const { schema } = handlers['bulk_create_nodes'];
      expect(() =>
        schema.parse({ nodes: [{ type: 'triangle', x: 0, y: 0, width: 50, height: 50 }] })
      ).toThrow();
    });

    it('includes node index in output for traceability', async () => {
      mockSendCommand
        .mockResolvedValueOnce({ name: 'R1', id: 'r-1' })
        .mockResolvedValueOnce({ name: 'R2', id: 'r-2' });

      const result = await callTool('bulk_create_nodes', {
        nodes: [
          { type: 'rectangle', x: 0, y: 0, width: 50, height: 50 },
          { type: 'rectangle', x: 60, y: 0, width: 50, height: 50 },
        ],
      });

      expect(result.content[0].text).toContain('[0]');
      expect(result.content[0].text).toContain('[1]');
    });
  });

  // ── get_all_components ───────────────────────────────────────────────────

  describe('get_all_components tool', () => {
    const localResponse = {
      count: 2,
      components: [
        { id: 'l-1', name: 'Button/Primary', key: 'key-btn-primary' },
        { id: 'l-2', name: 'Icon/Arrow', key: 'key-icon-arrow' },
      ],
    };
    const remoteResponse = {
      success: true,
      count: 1,
      components: [
        { key: 'r-key-1', name: 'Card/Default', description: '', libraryName: 'Design System', componentId: 'r-cmp-1' },
      ],
    };

    it('calls get_local_components and get_remote_components', async () => {
      mockSendCommand
        .mockResolvedValueOnce(localResponse)
        .mockResolvedValueOnce(remoteResponse);

      await callTool('get_all_components', {});

      expect(mockSendCommand).toHaveBeenCalledTimes(2);
      expect(mockSendCommand.mock.calls[0][0]).toBe('get_local_components');
      expect(mockSendCommand.mock.calls[1][0]).toBe('get_remote_components');
    });

    it('returns combined list with source labels', async () => {
      mockSendCommand
        .mockResolvedValueOnce(localResponse)
        .mockResolvedValueOnce(remoteResponse);

      const result = await callTool('get_all_components', {});
      const text = result.content[0].text;

      expect(text).toContain('Button/Primary');
      expect(text).toContain('key-btn-primary');
      expect(text).toContain('source: local');
      expect(text).toContain('Card/Default');
      expect(text).toContain('r-key-1');
      expect(text).toContain('source: remote');
      expect(text).toContain('Design System');
    });

    it('reports total count in the header', async () => {
      mockSendCommand
        .mockResolvedValueOnce(localResponse)
        .mockResolvedValueOnce(remoteResponse);

      const result = await callTool('get_all_components', {});
      expect(result.content[0].text).toContain('3 component(s)');
    });

    it('filters by name substring (case-insensitive)', async () => {
      mockSendCommand
        .mockResolvedValueOnce(localResponse)
        .mockResolvedValueOnce(remoteResponse);

      const result = await callTool('get_all_components', { filter: 'button' });
      const text = result.content[0].text;

      expect(text).toContain('Button/Primary');
      expect(text).not.toContain('Icon/Arrow');
      expect(text).not.toContain('Card/Default');
    });

    it('skips remote fetch when includeRemote is false', async () => {
      mockSendCommand.mockResolvedValueOnce(localResponse);

      const result = await callTool('get_all_components', { includeRemote: false });

      expect(mockSendCommand).toHaveBeenCalledTimes(1);
      expect(mockSendCommand.mock.calls[0][0]).toBe('get_local_components');
      expect(result.content[0].text).not.toContain('remote');
    });

    it('returns a "not found" message when filter matches nothing', async () => {
      mockSendCommand
        .mockResolvedValueOnce(localResponse)
        .mockResolvedValueOnce(remoteResponse);

      const result = await callTool('get_all_components', { filter: 'zzz-no-match' });
      expect(result.content[0].text).toContain('No components found matching');
    });

    it('returns a message when there are no components', async () => {
      mockSendCommand
        .mockResolvedValueOnce({ count: 0, components: [] })
        .mockResolvedValueOnce({ success: true, count: 0, components: [] });

      const result = await callTool('get_all_components', {});
      expect(result.content[0].text).toContain('No components found');
    });

    it('still succeeds if the remote call fails (best-effort)', async () => {
      mockSendCommand
        .mockResolvedValueOnce(localResponse)
        .mockRejectedValueOnce(new Error('remote unavailable'));

      const result = await callTool('get_all_components', {});
      // Should still list local components without error
      expect(result.content[0].text).toContain('Button/Primary');
      expect(result.content[0].text).not.toContain('Error');
    });

    it('returns an error message when get_local_components fails', async () => {
      mockSendCommand.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await callTool('get_all_components', {});
      expect(result.content[0].text).toContain('Error listing components');
      expect(result.content[0].text).toContain('Network timeout');
    });
  });

  // ── create_instance_with_properties ──────────────────────────────────────

  describe('create_instance_with_properties tool', () => {
    it('creates an instance at the specified position', async () => {
      mockSendCommand.mockResolvedValueOnce({ name: 'Button Instance', id: 'inst-1' });

      const result = await callTool('create_instance_with_properties', {
        componentKey: 'key-btn',
        x: 100,
        y: 200,
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(1);
      expect(mockSendCommand.mock.calls[0][0]).toBe('create_component_instance');
      expect(mockSendCommand.mock.calls[0][1]).toMatchObject({
        componentKey: 'key-btn',
        x: 100,
        y: 200,
      });
      expect(result.content[0].text).toContain('inst-1');
    });

    it('applies component properties after creating the instance', async () => {
      mockSendCommand.mockResolvedValueOnce({ name: 'Button', id: 'inst-2' });

      await callTool('create_instance_with_properties', {
        componentKey: 'key-btn',
        x: 0,
        y: 0,
        componentProperties: { 'Label#1234:0': 'Sign up', 'Show Icon#1234:1': true },
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(2);
      expect(mockSendCommand.mock.calls[1][0]).toBe('set_component_property');
      expect(mockSendCommand.mock.calls[1][1]).toMatchObject({
        nodeId: 'inst-2',
        properties: { 'Label#1234:0': 'Sign up', 'Show Icon#1234:1': true },
      });
    });

    it('applies variant properties after creating the instance', async () => {
      mockSendCommand.mockResolvedValueOnce({ name: 'Button', id: 'inst-3' });

      await callTool('create_instance_with_properties', {
        componentKey: 'key-btn',
        x: 0,
        y: 0,
        variantProperties: { State: 'Hover', Size: 'Large' },
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(2);
      expect(mockSendCommand.mock.calls[1][0]).toBe('set_instance_variant');
      expect(mockSendCommand.mock.calls[1][1]).toMatchObject({
        nodeId: 'inst-3',
        properties: { State: 'Hover', Size: 'Large' },
      });
    });

    it('applies both component and variant properties when both are provided', async () => {
      mockSendCommand.mockResolvedValueOnce({ name: 'Button', id: 'inst-4' });

      await callTool('create_instance_with_properties', {
        componentKey: 'key-btn',
        x: 0,
        y: 0,
        componentProperties: { 'Label#1234:0': 'Get started' },
        variantProperties: { State: 'Default' },
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(3);
      expect(mockSendCommand.mock.calls[1][0]).toBe('set_component_property');
      expect(mockSendCommand.mock.calls[2][0]).toBe('set_instance_variant');
    });

    it('inserts into parent when parentId is provided', async () => {
      mockSendCommand.mockResolvedValueOnce({ name: 'Button', id: 'inst-5' });

      await callTool('create_instance_with_properties', {
        componentKey: 'key-btn',
        x: 0,
        y: 0,
        parentId: 'container-xyz',
      });

      // create_component_instance + insert_child
      expect(mockSendCommand).toHaveBeenCalledTimes(2);
      expect(mockSendCommand.mock.calls[1][0]).toBe('insert_child');
      expect(mockSendCommand.mock.calls[1][1]).toMatchObject({
        parentId: 'container-xyz',
        childId: 'inst-5',
      });
    });

    it('does not call set_component_property when componentProperties is empty', async () => {
      mockSendCommand.mockResolvedValueOnce({ name: 'Button', id: 'inst-6' });

      await callTool('create_instance_with_properties', {
        componentKey: 'key-btn',
        x: 0,
        y: 0,
        componentProperties: {},
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(1);
      expect(mockSendCommand.mock.calls[0][0]).toBe('create_component_instance');
    });

    it('includes applied properties in the success message', async () => {
      mockSendCommand.mockResolvedValueOnce({ name: 'Card', id: 'inst-7' });

      const result = await callTool('create_instance_with_properties', {
        componentKey: 'key-card',
        x: 50,
        y: 50,
        variantProperties: { Size: 'Small' },
      });

      expect(result.content[0].text).toContain('inst-7');
      expect(result.content[0].text).toContain('variantProperties');
      expect(result.content[0].text).toContain('Small');
    });

    it('returns an error message when instance creation fails', async () => {
      mockSendCommand.mockRejectedValueOnce(new Error('Component key not found'));

      const result = await callTool('create_instance_with_properties', {
        componentKey: 'bad-key',
        x: 0,
        y: 0,
      });

      expect(result.content[0].text).toContain('Error creating instance with properties');
      expect(result.content[0].text).toContain('Component key not found');
    });

    it('rejects missing componentKey', async () => {
      const { schema } = handlers['create_instance_with_properties'];
      expect(() => schema.parse({ x: 0, y: 0 })).toThrow();
    });

    it('rejects missing x', async () => {
      const { schema } = handlers['create_instance_with_properties'];
      expect(() => schema.parse({ componentKey: 'k', y: 0 })).toThrow();
    });
  });

  // ── bulk_update_text ────────────────────────────────────────────────────

  describe('bulk_update_text tool', () => {
    it('calls set_text_content for each update', async () => {
      await callTool('bulk_update_text', {
        updates: [
          { nodeId: 'n1', text: 'Hello' },
          { nodeId: 'n2', text: 'World' },
        ],
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(2);
      expect(mockSendCommand.mock.calls[0]).toEqual(['set_text_content', { nodeId: 'n1', text: 'Hello' }]);
      expect(mockSendCommand.mock.calls[1]).toEqual(['set_text_content', { nodeId: 'n2', text: 'World' }]);
    });

    it('reports successes in the result text', async () => {
      const result = await callTool('bulk_update_text', {
        updates: [{ nodeId: 'node-abc', text: 'Sign up' }],
      });

      expect(result.content[0].text).toContain('Updated 1 text node(s)');
      expect(result.content[0].text).toContain('node-abc');
      expect(result.content[0].text).toContain('Sign up');
    });

    it('truncates long text in the summary to 40 chars with ellipsis', async () => {
      const longText = 'A'.repeat(50);
      const result = await callTool('bulk_update_text', {
        updates: [{ nodeId: 'node-x', text: longText }],
      });

      expect(result.content[0].text).toContain('A'.repeat(40) + '…');
    });

    it('continues and reports failures without aborting the batch', async () => {
      mockSendCommand
        .mockResolvedValueOnce({}) // n1 succeeds
        .mockRejectedValueOnce(new Error('node not found')) // n2 fails
        .mockResolvedValueOnce({}); // n3 succeeds

      const result = await callTool('bulk_update_text', {
        updates: [
          { nodeId: 'n1', text: 'Hello' },
          { nodeId: 'n2', text: 'World' },
          { nodeId: 'n3', text: 'Done' },
        ],
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(3);
      expect(result.content[0].text).toContain('Updated 2 text node(s)');
      expect(result.content[0].text).toContain('Failed to update 1 node(s)');
      expect(result.content[0].text).toContain('node not found');
    });

    it('rejects an empty updates array', async () => {
      const { schema } = handlers['bulk_update_text'];
      expect(() => schema.parse({ updates: [] })).toThrow();
    });

    it('rejects when nodeId is missing', async () => {
      const { schema } = handlers['bulk_update_text'];
      expect(() => schema.parse({ updates: [{ text: 'hi' }] })).toThrow();
    });
  });

  // ── swap_component_variant ──────────────────────────────────────────────

  describe('swap_component_variant tool', () => {
    it('calls set_instance_variant for each update', async () => {
      await callTool('swap_component_variant', {
        updates: [
          { nodeId: 'btn-1', variantProperties: { State: 'Hover' } },
          { nodeId: 'btn-2', variantProperties: { State: 'Disabled', Size: 'Large' } },
        ],
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(2);
      expect(mockSendCommand.mock.calls[0]).toEqual([
        'set_instance_variant',
        { nodeId: 'btn-1', properties: { State: 'Hover' } },
      ]);
      expect(mockSendCommand.mock.calls[1]).toEqual([
        'set_instance_variant',
        { nodeId: 'btn-2', properties: { State: 'Disabled', Size: 'Large' } },
      ]);
    });

    it('reports successes in the result text', async () => {
      const result = await callTool('swap_component_variant', {
        updates: [{ nodeId: 'inst-1', variantProperties: { State: 'Hover' } }],
      });

      expect(result.content[0].text).toContain('Updated variants on 1 instance(s)');
      expect(result.content[0].text).toContain('inst-1');
      expect(result.content[0].text).toContain('Hover');
    });

    it('continues and reports failures without aborting the batch', async () => {
      mockSendCommand
        .mockResolvedValueOnce({}) // btn-1 succeeds
        .mockRejectedValueOnce(new Error('instance locked')); // btn-2 fails

      const result = await callTool('swap_component_variant', {
        updates: [
          { nodeId: 'btn-1', variantProperties: { State: 'Hover' } },
          { nodeId: 'btn-2', variantProperties: { State: 'Disabled' } },
        ],
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(2);
      expect(result.content[0].text).toContain('Updated variants on 1 instance(s)');
      expect(result.content[0].text).toContain('Failed to update 1 instance(s)');
      expect(result.content[0].text).toContain('instance locked');
    });

    it('rejects an empty updates array', async () => {
      const { schema } = handlers['swap_component_variant'];
      expect(() => schema.parse({ updates: [] })).toThrow();
    });

    it('rejects when variantProperties is missing', async () => {
      const { schema } = handlers['swap_component_variant'];
      expect(() => schema.parse({ updates: [{ nodeId: 'n1' }] })).toThrow();
    });
  });

  // ── build_screen_from_template ──────────────────────────────────────────

  describe('build_screen_from_template tool', () => {
    const baseArgs = {
      screenName: 'Home Screen',
      x: 0,
      y: 0,
      width: 375,
      height: 812,
      components: [
        { componentKey: 'key-nav', x: 0, y: 0 },
        { componentKey: 'key-hero', x: 0, y: 64 },
      ],
    };

    beforeEach(() => {
      // Default: frame creation returns frame-1, then each instance returns its own id
      mockSendCommand.mockResolvedValue({ name: 'MockNode', id: 'mock-id-1' });
    });

    it('creates a frame then instances for each component', async () => {
      mockSendCommand
        .mockResolvedValueOnce({ name: 'Home Screen', id: 'frame-1' }) // create_frame
        .mockResolvedValueOnce({ name: 'Nav', id: 'inst-nav' }) // create_component_instance nav
        .mockResolvedValueOnce({}) // insert_child nav
        .mockResolvedValueOnce({ name: 'Hero', id: 'inst-hero' }) // create_component_instance hero
        .mockResolvedValueOnce({}); // insert_child hero

      await callTool('build_screen_from_template', baseArgs);

      expect(mockSendCommand.mock.calls[0][0]).toBe('create_frame');
      expect(mockSendCommand.mock.calls[1][0]).toBe('create_component_instance');
      expect(mockSendCommand.mock.calls[2][0]).toBe('insert_child');
      expect(mockSendCommand.mock.calls[3][0]).toBe('create_component_instance');
      expect(mockSendCommand.mock.calls[4][0]).toBe('insert_child');
    });

    it('passes the frame ID as parentId to insert_child calls', async () => {
      mockSendCommand
        .mockResolvedValueOnce({ name: 'Home Screen', id: 'frame-abc' })
        .mockResolvedValueOnce({ name: 'Nav', id: 'inst-1' })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ name: 'Hero', id: 'inst-2' })
        .mockResolvedValueOnce({});

      await callTool('build_screen_from_template', baseArgs);

      expect(mockSendCommand.mock.calls[2][1]).toMatchObject({ parentId: 'frame-abc', childId: 'inst-1' });
      expect(mockSendCommand.mock.calls[4][1]).toMatchObject({ parentId: 'frame-abc', childId: 'inst-2' });
    });

    it('passes frame parameters (name, position, size, fill) to create_frame', async () => {
      mockSendCommand
        .mockResolvedValueOnce({ name: 'Login', id: 'frame-2' })
        .mockResolvedValue({ name: 'Node', id: 'inst-x' });

      await callTool('build_screen_from_template', {
        ...baseArgs,
        screenName: 'Login',
        x: 100,
        y: 200,
        width: 390,
        height: 844,
        fillColor: { r: 0.95, g: 0.95, b: 0.95, a: 1 },
      });

      expect(mockSendCommand.mock.calls[0][1]).toMatchObject({
        name: 'Login',
        x: 100,
        y: 200,
        width: 390,
        height: 844,
        fillColor: { r: 0.95, g: 0.95, b: 0.95, a: 1 },
      });
    });

    it('applies auto-layout when layoutMode is provided', async () => {
      mockSendCommand
        .mockResolvedValueOnce({ name: 'Screen', id: 'frame-3' }) // create_frame
        .mockResolvedValueOnce({}) // set_auto_layout
        .mockResolvedValue({ name: 'Node', id: 'inst-y' });

      await callTool('build_screen_from_template', {
        ...baseArgs,
        layoutMode: 'VERTICAL',
        paddingTop: 16,
        itemSpacing: 8,
      });

      expect(mockSendCommand.mock.calls[1][0]).toBe('set_auto_layout');
      expect(mockSendCommand.mock.calls[1][1]).toMatchObject({
        nodeId: 'frame-3',
        layoutMode: 'VERTICAL',
        paddingTop: 16,
        itemSpacing: 8,
      });
    });

    it('skips set_auto_layout when layoutMode is omitted', async () => {
      mockSendCommand
        .mockResolvedValueOnce({ name: 'Screen', id: 'frame-4' })
        .mockResolvedValue({ name: 'Node', id: 'inst-z' });

      await callTool('build_screen_from_template', baseArgs);

      const commandNames = mockSendCommand.mock.calls.map((c: any[]) => c[0]);
      expect(commandNames).not.toContain('set_auto_layout');
    });

    it('applies componentProperties when provided', async () => {
      mockSendCommand
        .mockResolvedValueOnce({ name: 'Screen', id: 'frame-5' })
        .mockResolvedValueOnce({ name: 'Button', id: 'inst-btn' })
        .mockResolvedValueOnce({}) // insert_child
        .mockResolvedValueOnce({}); // set_component_property

      await callTool('build_screen_from_template', {
        screenName: 'Screen',
        x: 0, y: 0, width: 375, height: 812,
        components: [
          {
            componentKey: 'key-btn',
            x: 16,
            y: 16,
            componentProperties: { 'Label#1:0': 'Get started' },
          },
        ],
      });

      const setCpCall = mockSendCommand.mock.calls.find((c: any[]) => c[0] === 'set_component_property');
      expect(setCpCall).toBeDefined();
      expect(setCpCall![1]).toMatchObject({
        nodeId: 'inst-btn',
        properties: { 'Label#1:0': 'Get started' },
      });
    });

    it('applies variantProperties when provided', async () => {
      mockSendCommand
        .mockResolvedValueOnce({ name: 'Screen', id: 'frame-6' })
        .mockResolvedValueOnce({ name: 'Button', id: 'inst-btn2' })
        .mockResolvedValueOnce({}) // insert_child
        .mockResolvedValueOnce({}); // set_instance_variant

      await callTool('build_screen_from_template', {
        screenName: 'Screen',
        x: 0, y: 0, width: 375, height: 812,
        components: [
          {
            componentKey: 'key-btn',
            x: 0,
            y: 0,
            variantProperties: { State: 'Hover' },
          },
        ],
      });

      const setVarCall = mockSendCommand.mock.calls.find((c: any[]) => c[0] === 'set_instance_variant');
      expect(setVarCall).toBeDefined();
      expect(setVarCall![1]).toMatchObject({
        nodeId: 'inst-btn2',
        properties: { State: 'Hover' },
      });
    });

    it('continues and reports per-component failures without aborting', async () => {
      mockSendCommand
        .mockResolvedValueOnce({ name: 'Screen', id: 'frame-7' }) // create_frame
        .mockResolvedValueOnce({ name: 'Nav', id: 'inst-nav2' }) // first component OK
        .mockResolvedValueOnce({}) // insert_child OK
        .mockRejectedValueOnce(new Error('component key not found')); // second fails

      const result = await callTool('build_screen_from_template', baseArgs);

      expect(result.content[0].text).toContain('Placed 1 component(s)');
      expect(result.content[0].text).toContain('Failed to place 1 component(s)');
      expect(result.content[0].text).toContain('component key not found');
    });

    it('includes screen name and dimensions in success message', async () => {
      mockSendCommand
        .mockResolvedValueOnce({ name: 'Home Screen', id: 'frame-8' })
        .mockResolvedValue({ name: 'Node', id: 'inst-q' });

      const result = await callTool('build_screen_from_template', baseArgs);

      expect(result.content[0].text).toContain('Home Screen');
      expect(result.content[0].text).toContain('frame-8');
      expect(result.content[0].text).toContain('375');
      expect(result.content[0].text).toContain('812');
    });

    it('returns an error message when frame creation fails', async () => {
      mockSendCommand.mockRejectedValueOnce(new Error('canvas is locked'));

      const result = await callTool('build_screen_from_template', baseArgs);

      expect(result.content[0].text).toContain('Error building screen from template');
      expect(result.content[0].text).toContain('canvas is locked');
    });

    it('rejects when screenName is missing', async () => {
      const { schema } = handlers['build_screen_from_template'];
      expect(() =>
        schema.parse({ x: 0, y: 0, width: 375, height: 812, components: [] })
      ).toThrow();
    });

    it('accepts an empty components array', async () => {
      mockSendCommand.mockResolvedValueOnce({ name: 'Empty Screen', id: 'frame-9' });

      const result = await callTool('build_screen_from_template', {
        screenName: 'Empty Screen',
        x: 0, y: 0, width: 375, height: 812,
        components: [],
      });

      expect(mockSendCommand).toHaveBeenCalledTimes(1);
      expect(mockSendCommand.mock.calls[0][0]).toBe('create_frame');
      expect(result.content[0].text).toContain('Empty Screen');
    });
  });
});
