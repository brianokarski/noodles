import { describe, it, expect } from 'vitest';
import { blocks } from './blocks';
import { makeRng } from '../state/seed';

const palette = ['#ff3366', '#ffc300', '#0066cc', '#f0f0f0'];

describe('blocks generator', () => {
  it('tiles the entire canvas (every cell gets a fill)', () => {
    const g = blocks.run({
      cols: 24,
      rows: 36,
      palette,
      rng: makeRng(0xabc123),
      params: { splitProb: 0.7, minSize: 1, bandOrient: 'mixed' },
    });
    expect(g.cells.length).toBe(36);
    for (const row of g.cells) {
      expect(row.length).toBe(24);
      for (const cell of row) {
        expect(cell.fill.kind).toBe('solid');
      }
    }
  });

  it('is deterministic: same seed produces identical output', () => {
    const params = { splitProb: 0.6, minSize: 1, bandOrient: 'mixed' as const };
    const a = blocks.run({ cols: 16, rows: 16, palette, rng: makeRng(42), params });
    const b = blocks.run({ cols: 16, rows: 16, palette, rng: makeRng(42), params });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('respects minSize: no block smaller than minSize in either dimension', () => {
    // with minSize=4, every contiguous run of the same color must be >= 4 cells
    const g = blocks.run({
      cols: 32,
      rows: 32,
      palette,
      rng: makeRng(7),
      params: { splitProb: 1.0, minSize: 4, bandOrient: 'mixed' },
    });
    // sample: every 4x4 block starting at a multiple-of-4 position should be uniform
    for (let y = 0; y < 32; y += 4) {
      for (let x = 0; x < 32; x += 4) {
        const ref = g.cells[y][x].fill;
        for (let dy = 0; dy < 4; dy++) {
          for (let dx = 0; dx < 4; dx++) {
            expect(g.cells[y + dy][x + dx].fill).toEqual(ref);
          }
        }
      }
    }
  });

  it('produces visibly different compositions across seeds', () => {
    const params = { splitProb: 0.75, minSize: 1, bandOrient: 'mixed' as const };
    const outs = [0, 1, 2, 3, 4, 5, 6, 7].map((s) =>
      JSON.stringify(blocks.run({ cols: 16, rows: 16, palette, rng: makeRng(s), params })),
    );
    // Expect at least 6 distinct compositions out of 8 seeds
    expect(new Set(outs).size).toBeGreaterThanOrEqual(6);
  });

  it('bandOrient="horizontal" produces horizontal bands (rows often uniform)', () => {
    const g = blocks.run({
      cols: 24,
      rows: 24,
      palette,
      rng: makeRng(99),
      params: { splitProb: 0.9, minSize: 1, bandOrient: 'horizontal' },
    });
    // in a purely-horizontal-band layout, every row should be a single color
    for (const row of g.cells) {
      const first = row[0].fill;
      for (const cell of row) {
        expect(cell.fill).toEqual(first);
      }
    }
  });
});
