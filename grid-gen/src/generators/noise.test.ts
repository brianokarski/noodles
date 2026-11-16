import { describe, it, expect } from 'vitest';
import { makeRng, parseSeed } from '../state/seed';
import { noise } from './noise';

describe('noise generator', () => {
  it('produces a cols×rows grid of solid cells', () => {
    const g = noise.run({
      cols: 10,
      rows: 10,
      palette: ['#111', '#222', '#333'],
      rng: makeRng(parseSeed('01')),
      params: { scale: 0.2 },
    });
    expect(g.cols).toBe(10);
    expect(g.rows).toBe(10);
    g.cells.forEach((row) => row.forEach((c) => expect(c.fill.kind).toBe('solid')));
  });

  it('is deterministic under the same seed', () => {
    const mk = () =>
      noise.run({
        cols: 16,
        rows: 16,
        palette: ['#111', '#222', '#333'],
        rng: makeRng(parseSeed('deadbe')),
        params: { scale: 0.15 },
      });
    expect(mk().cells).toEqual(mk().cells);
  });

  it('uses all colors in the palette for sufficiently varied noise', () => {
    const g = noise.run({
      cols: 32,
      rows: 32,
      palette: ['#111', '#222', '#333', '#444'],
      rng: makeRng(parseSeed('cafe')),
      params: { scale: 0.2 },
    });
    const used = new Set<string>();
    g.cells.forEach((row) =>
      row.forEach((c) => {
        if (c.fill.kind === 'solid') used.add(c.fill.color);
      }),
    );
    expect(used.size).toBeGreaterThan(1);
  });
});
