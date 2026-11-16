import { describe, it, expect } from 'vitest';
import { particlePath } from './particle-path';
import { RunContext } from './types';

const ctx: RunContext = {
  canvas: { width: 1000, height: 1000 },
  density: 1,
  seed: 5,
  palette: ['#000000', '#00ff00'],
};

describe('particle-path generator', () => {
  it('is deterministic for the same seed and params', () => {
    const p = { ...particlePath.defaultParams };
    const a = particlePath.run(p, ctx);
    const b = particlePath.run(p, ctx);
    expect(a.dots[0]).toEqual(b.dots[0]);
    expect(a.dots.length).toBe(b.dots.length);
  });

  it('produces dotCount dots', () => {
    const p = { ...particlePath.defaultParams, dotCount: 150, thicknessJitter: 0 };
    const scene = particlePath.run(p, ctx);
    expect(scene.dots.length).toBe(150);
  });

  it('every dot lies within canvas bounds (with some padding tolerance)', () => {
    const p = { ...particlePath.defaultParams };
    const scene = particlePath.run(p, ctx);
    for (const d of scene.dots) {
      expect(d.x).toBeGreaterThanOrEqual(-10);
      expect(d.x).toBeLessThanOrEqual(ctx.canvas.width + 10);
      expect(d.y).toBeGreaterThanOrEqual(-10);
      expect(d.y).toBeLessThanOrEqual(ctx.canvas.height + 10);
    }
  });
});
