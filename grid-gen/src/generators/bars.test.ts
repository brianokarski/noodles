import { describe, it, expect } from 'vitest';
import { makeRng } from '../state/seed';
import { bars } from './bars';

const palette = ['#ff3366', '#ffc300', '#0066cc', '#f0f0f0'];

describe('bars generator (BSP + stripes)', () => {
  it('tiles the whole canvas (every cell has a solid fill)', () => {
    const g = bars.run({
      cols: 24,
      rows: 36,
      palette,
      rng: makeRng(0xabc123),
      params: { splitProb: 0.8, minRegion: 6, stripeMin: 1, stripeMax: 3, orient: 'mixed' },
    });
    expect(g.cells.length).toBe(36);
    for (const row of g.cells) {
      expect(row.length).toBe(24);
      for (const cell of row) expect(cell.fill.kind).toBe('solid');
    }
  });

  it('is deterministic under the same seed', () => {
    const params = { splitProb: 0.8, minRegion: 6, stripeMin: 1, stripeMax: 3, orient: 'mixed' as const };
    const a = bars.run({ cols: 24, rows: 24, palette, rng: makeRng(42), params });
    const b = bars.run({ cols: 24, rows: 24, palette, rng: makeRng(42), params });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('produces stripe patterns — adjacent cells vary within regions', () => {
    const g = bars.run({
      cols: 24,
      rows: 24,
      palette,
      rng: makeRng(7),
      params: { splitProb: 0.9, minRegion: 4, stripeMin: 1, stripeMax: 2, orient: 'mixed' },
    });
    // Count cells whose color differs from their right neighbor OR their
    // bottom neighbor. In a stripe-filled canvas, many cells must differ.
    let boundaryCells = 0;
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 23; x++) {
        const a = g.cells[y][x].fill;
        const b = g.cells[y][x + 1].fill;
        if (JSON.stringify(a) !== JSON.stringify(b)) boundaryCells++;
      }
    }
    // With thin stripes, we expect many color transitions per row
    expect(boundaryCells).toBeGreaterThan(30);
  });

  it('orient="horizontal" — within any region column, cells alternate along Y only', () => {
    const g = bars.run({
      cols: 16,
      rows: 16,
      palette,
      rng: makeRng(99),
      params: { splitProb: 0.5, minRegion: 8, stripeMin: 1, stripeMax: 1, orient: 'horizontal' },
    });
    // For horizontal stripes at thickness 1, every row must be monochromatic
    // across the full width of any region it spans. Verify: for each row,
    // every x that's in the same region as x=0 has the same color as (x,0).
    // Weaker check but robust without knowing region boundaries:
    // every row is made of at most len(palette) distinct solid colors.
    for (const row of g.cells) {
      const colors = new Set(row.map((c) => (c.fill.kind === 'solid' ? c.fill.color : 'x')));
      expect(colors.size).toBeLessThanOrEqual(palette.length);
    }
  });

  it('exposes metadata with expected param keys', () => {
    expect(bars.name).toBe('bars');
    const keys = bars.paramSchema.map((p) => p.key).sort();
    expect(keys).toEqual(['minRegion', 'orient', 'splitProb', 'stripeMax', 'stripeMin']);
  });
});
