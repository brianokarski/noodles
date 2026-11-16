import { describe, it, expect } from 'vitest';
import { gridCluster } from './grid-cluster';
import { RunContext } from './types';

const ctx: RunContext = {
  canvas: { width: 1000, height: 1000 },
  density: 1,
  seed: 42,
  palette: ['#000000', '#ff0000'],
};

describe('grid-cluster generator', () => {
  it('is deterministic for the same seed and params', () => {
    const p = { ...gridCluster.defaultParams };
    const a = gridCluster.run(p, ctx);
    const b = gridCluster.run(p, ctx);
    expect(a.dots.length).toBe(b.dots.length);
    expect(a.dots[0]).toEqual(b.dots[0]);
  });

  it('produces cols*rows*(cluster dot count) dots for a grid-2x2 cluster with jitter=0', () => {
    const p = { ...gridCluster.defaultParams, cols: 3, rows: 2, clusterShape: 'grid-2x2', jitter: 0 };
    const scene = gridCluster.run(p, ctx);
    expect(scene.dots.length).toBe(3 * 2 * 4);
  });

  it('every dot lies within canvas bounds', () => {
    const p = { ...gridCluster.defaultParams };
    const scene = gridCluster.run(p, ctx);
    for (const d of scene.dots) {
      expect(d.x).toBeGreaterThanOrEqual(0);
      expect(d.x).toBeLessThanOrEqual(ctx.canvas.width);
      expect(d.y).toBeGreaterThanOrEqual(0);
      expect(d.y).toBeLessThanOrEqual(ctx.canvas.height);
    }
  });
});
