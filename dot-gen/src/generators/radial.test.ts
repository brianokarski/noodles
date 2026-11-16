import { describe, it, expect } from 'vitest';
import { radial } from './radial';
import { RunContext } from './types';

const ctx: RunContext = {
  canvas: { width: 1000, height: 1000 },
  density: 1,
  seed: 7,
  palette: ['#000000', '#ffffff'],
};

describe('radial generator', () => {
  it('is deterministic for the same seed and params', () => {
    const p = { ...radial.defaultParams };
    const a = radial.run(p, ctx);
    const b = radial.run(p, ctx);
    expect(a.dots[0]).toEqual(b.dots[0]);
    expect(a.dots.length).toBe(b.dots.length);
  });

  it('with perspective=0 and ringCount=1 produces baseDots dots on a circle of radius rMin', () => {
    const p = { ...radial.defaultParams, perspective: 0, ringCount: 1, baseDots: 12, angleJitter: 0, rMin: 100 };
    const scene = radial.run(p, ctx);
    expect(scene.dots.length).toBe(12);
    const cx = ctx.canvas.width / 2;
    const cy = ctx.canvas.height / 2;
    for (const d of scene.dots) {
      const r = Math.hypot(d.x - cx, d.y - cy);
      expect(Math.abs(r - 100)).toBeLessThan(0.5);
    }
  });

  it('every dot lies within canvas bounds', () => {
    const p = { ...radial.defaultParams };
    const scene = radial.run(p, ctx);
    for (const d of scene.dots) {
      expect(d.x).toBeGreaterThanOrEqual(0);
      expect(d.x).toBeLessThanOrEqual(ctx.canvas.width);
      expect(d.y).toBeGreaterThanOrEqual(0);
      expect(d.y).toBeLessThanOrEqual(ctx.canvas.height);
    }
  });
});
