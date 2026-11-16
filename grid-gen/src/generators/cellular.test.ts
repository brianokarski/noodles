import { describe, it, expect } from 'vitest';
import { makeRng, parseSeed } from '../state/seed';
import { cellular } from './cellular';

describe('cellular generator', () => {
  it('produces a cols×rows grid', () => {
    const g = cellular.run({
      cols: 16,
      rows: 16,
      palette: ['#111', '#222'],
      rng: makeRng(parseSeed('01')),
      params: { fillChance: 0.45, iterations: 4 },
    });
    expect(g.cols).toBe(16);
    expect(g.rows).toBe(16);
  });

  it('is deterministic under the same seed', () => {
    const mk = () =>
      cellular.run({
        cols: 24,
        rows: 24,
        palette: ['#111', '#222'],
        rng: makeRng(parseSeed('f00d')),
        params: { fillChance: 0.45, iterations: 4 },
      });
    expect(mk().cells).toEqual(mk().cells);
  });

  it('emits both colors from the palette', () => {
    const g = cellular.run({
      cols: 32,
      rows: 32,
      palette: ['#111', '#222'],
      rng: makeRng(parseSeed('01')),
      params: { fillChance: 0.45, iterations: 4 },
    });
    const used = new Set<string>();
    g.cells.forEach((row) =>
      row.forEach((c) => {
        if (c.fill.kind === 'solid') used.add(c.fill.color);
      }),
    );
    expect(used.size).toBe(2);
  });
});
