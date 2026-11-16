import { describe, it, expect } from 'vitest';
import { makeRng, parseSeed } from '../state/seed';
import { stamps } from './stamps';

describe('stamps generator', () => {
  it('produces a cols×rows grid', () => {
    const g = stamps.run({
      cols: 20,
      rows: 20,
      palette: ['#111', '#eee', '#ff0'],
      rng: makeRng(parseSeed('01')),
      params: {
        background: '#111111',
        stampCount: 5,
        stampSize: 4,
        pattern: 'stripe',
      },
    });
    expect(g.cols).toBe(20);
    expect(g.rows).toBe(20);
  });

  it('is deterministic under the same seed', () => {
    const mk = () =>
      stamps.run({
        cols: 32,
        rows: 32,
        palette: ['#111', '#eee', '#ff0'],
        rng: makeRng(parseSeed('beef')),
        params: {
          background: '#111111',
          stampCount: 8,
          stampSize: 4,
          pattern: 'checker',
        },
      });
    expect(mk().cells).toEqual(mk().cells);
  });

  it('emits pattern fills when pattern param is set', () => {
    const g = stamps.run({
      cols: 32,
      rows: 32,
      palette: ['#111', '#eee'],
      rng: makeRng(parseSeed('01')),
      params: {
        background: '#111111',
        stampCount: 5,
        stampSize: 4,
        pattern: 'stripe',
      },
    });
    const hasPattern = g.cells.some((row) => row.some((c) => c.fill.kind === 'pattern'));
    expect(hasPattern).toBe(true);
  });
});
