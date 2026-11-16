import { describe, it, expect } from 'vitest';
import { makeRng, parseSeed } from '../state/seed';
import { columns } from './columns';
import type { Cell } from './types';

function allSolid(cells: Cell[][]): boolean {
  return cells.every((row) => row.every((c) => c.fill.kind === 'solid'));
}

describe('columns generator', () => {
  it('fills a grid of cols×rows cells', () => {
    const g = columns.run({
      cols: 12,
      rows: 8,
      palette: ['#aaa', '#bbb'],
      rng: makeRng(parseSeed('01')),
      params: { stripeWidth: 3 },
    });
    expect(g.cols).toBe(12);
    expect(g.rows).toBe(8);
    expect(g.cells.length).toBe(8);
    expect(g.cells[0].length).toBe(12);
    expect(allSolid(g.cells)).toBe(true);
  });

  it('groups cells into vertical stripes of stripeWidth', () => {
    const g = columns.run({
      cols: 6,
      rows: 2,
      palette: ['#a', '#b'],
      rng: makeRng(parseSeed('01')),
      params: { stripeWidth: 3 },
    });
    const rowColors = g.cells[0].map((c) => (c.fill as any).color);
    expect(rowColors[0]).toBe(rowColors[1]);
    expect(rowColors[1]).toBe(rowColors[2]);
    expect(rowColors[3]).toBe(rowColors[4]);
    expect(rowColors[4]).toBe(rowColors[5]);
    expect(rowColors[0]).not.toBe(rowColors[3]);
  });

  it('exposes metadata', () => {
    expect(columns.name).toBe('columns');
    expect(columns.label).toBeDefined();
    expect(columns.paramSchema.find((p) => p.key === 'stripeWidth')).toBeDefined();
  });
});
