import { describe, it, expect } from 'vitest';
import { canvasPresets, gridFor, type DensityLevel } from './canvases';

describe('canvas presets', () => {
  it('exposes poster, square, landscape, tag presets', () => {
    const names = canvasPresets.map((p) => p.name);
    expect(names).toEqual(['poster', 'square', 'landscape', 'tag']);
  });

  it('all base grids are positive integers', () => {
    for (const p of canvasPresets) {
      expect(Number.isInteger(p.baseCols)).toBe(true);
      expect(Number.isInteger(p.baseRows)).toBe(true);
      expect(p.baseCols).toBeGreaterThan(0);
      expect(p.baseRows).toBeGreaterThan(0);
    }
  });

  it('gridFor multiplies base dims by density factor', () => {
    const poster = canvasPresets.find((p) => p.name === 'poster')!;
    expect(gridFor(poster, 1)).toEqual({ cols: poster.baseCols, rows: poster.baseRows });
    expect(gridFor(poster, 2)).toEqual({ cols: poster.baseCols * 2, rows: poster.baseRows * 2 });
    expect(gridFor(poster, 4)).toEqual({ cols: poster.baseCols * 4, rows: poster.baseRows * 4 });
    expect(gridFor(poster, 8)).toEqual({ cols: poster.baseCols * 8, rows: poster.baseRows * 8 });
  });

  it('density levels are 1, 2, 4, 8', () => {
    const levels: DensityLevel[] = [1, 2, 4, 8];
    levels.forEach((l) => expect([1, 2, 4, 8]).toContain(l));
  });
});
