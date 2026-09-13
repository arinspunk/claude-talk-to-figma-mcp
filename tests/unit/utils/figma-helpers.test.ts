import { filterFigmaNode } from '../../../src/talk_to_figma_mcp/utils/figma-helpers';

describe('filterFigmaNode', () => {
  describe('constraints', () => {
    it('should preserve constraints so responsive behavior survives the filter', () => {
      const node = {
        id: '1:2',
        name: 'Button',
        type: 'FRAME',
        constraints: { horizontal: 'CENTER', vertical: 'MAX' },
      };

      expect(filterFigmaNode(node).constraints).toEqual({
        horizontal: 'CENTER',
        vertical: 'MAX',
      });
    });

    it('should preserve STRETCH and SCALE', () => {
      const node = {
        id: '1:3',
        name: 'Background',
        type: 'RECTANGLE',
        constraints: { horizontal: 'STRETCH', vertical: 'SCALE' },
      };

      expect(filterFigmaNode(node).constraints).toEqual({
        horizontal: 'STRETCH',
        vertical: 'SCALE',
      });
    });

    it('should omit constraints on nodes that have none', () => {
      // Group and BooleanOperation nodes have no constraints of their own.
      const node = { id: '1:4', name: 'Group', type: 'GROUP' };

      expect(filterFigmaNode(node)).not.toHaveProperty('constraints');
    });

    it('should preserve constraints on nested children', () => {
      const node = {
        id: '1:5',
        name: 'Screen',
        type: 'FRAME',
        constraints: { horizontal: 'MIN', vertical: 'MIN' },
        children: [
          {
            id: '1:6',
            name: 'Label',
            type: 'TEXT',
            constraints: { horizontal: 'CENTER', vertical: 'CENTER' },
          },
        ],
      };

      const filtered = filterFigmaNode(node);
      expect(filtered.children[0].constraints).toEqual({
        horizontal: 'CENTER',
        vertical: 'CENTER',
      });
    });

    it('should drop constraints of children truncated by maxDepth', () => {
      const node = {
        id: '1:7',
        name: 'Screen',
        type: 'FRAME',
        children: [
          {
            id: '1:8',
            name: 'Label',
            type: 'TEXT',
            constraints: { horizontal: 'CENTER', vertical: 'CENTER' },
          },
        ],
      };

      // Depth-truncated children are stubs by design, so the model can request them on demand.
      const filtered = filterFigmaNode(node, 0);
      expect(filtered.children[0]).toEqual({ id: '1:8', name: 'Label', type: 'TEXT' });
      expect(filtered._childrenTruncated).toBe(true);
    });
  });
});
