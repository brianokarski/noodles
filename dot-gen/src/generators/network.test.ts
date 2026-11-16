import { describe, it, expect } from 'vitest';
import { network } from './network';
import { RunContext } from './types';

const ctx: RunContext = {
  canvas: { width: 1000, height: 1000 },
  density: 1,
  seed: 99,
  palette: ['#000000', '#ff0000'],
};

describe('network generator', () => {
  it('is deterministic for the same seed and params', () => {
    const p = { ...network.defaultParams };
    const a = network.run(p, ctx);
    const b = network.run(p, ctx);
    expect(a.dots.length).toBe(b.dots.length);
    expect(a.edges?.length).toBe(b.edges?.length);
  });

  it('produces nodeCount dots and edges that reference valid indices', () => {
    const p = { ...network.defaultParams, nodeCount: 10 };
    const scene = network.run(p, ctx);
    expect(scene.dots.length).toBe(10);
    for (const e of scene.edges ?? []) {
      expect(e.a).toBeGreaterThanOrEqual(0);
      expect(e.a).toBeLessThan(10);
      expect(e.b).toBeGreaterThanOrEqual(0);
      expect(e.b).toBeLessThan(10);
      expect(e.a).not.toBe(e.b);
    }
  });

  it('every dot lies within canvas bounds', () => {
    const p = { ...network.defaultParams };
    const scene = network.run(p, ctx);
    for (const d of scene.dots) {
      expect(d.x).toBeGreaterThanOrEqual(0);
      expect(d.x).toBeLessThanOrEqual(ctx.canvas.width);
      expect(d.y).toBeGreaterThanOrEqual(0);
      expect(d.y).toBeLessThanOrEqual(ctx.canvas.height);
    }
  });

  it('edgeCurvature=0 leaves edges uncurved', () => {
    const p = { ...network.defaultParams, edgeCurvature: 0 };
    const scene = network.run(p, ctx);
    for (const e of scene.edges ?? []) {
      expect(e.curve).toBeCloseTo(0);
    }
  });

  it('alternating direction flips curve sign every other edge', () => {
    const p = { ...network.defaultParams, edgeCurvature: 0.4, curveDirection: 'alternating' };
    const scene = network.run(p, ctx);
    const edges = scene.edges ?? [];
    expect(edges.length).toBeGreaterThanOrEqual(2);
    expect(edges[0].curve).toBeCloseTo(0.4);
    expect(edges[1].curve).toBeCloseTo(-0.4);
  });

  it('consistent direction keeps all curves the same sign', () => {
    const p = { ...network.defaultParams, edgeCurvature: 0.3, curveDirection: 'consistent' };
    const scene = network.run(p, ctx);
    for (const e of scene.edges ?? []) {
      expect(e.curve).toBeCloseTo(0.3);
    }
  });

  it('dots, solid edges, and dashed edges land on three distinct colors for figma separation', () => {
    const p = { ...network.defaultParams, nodeCount: 40, k: 6, dashedRatio: 0.5 };
    const scene = network.run(p, { ...ctx, palette: ['#000000', '#ffffff'] });
    const dotColors = new Set(scene.dots.map((d) => d.color));
    const solidStrokes = new Set((scene.edges ?? []).filter((e) => !e.dashed).map((e) => e.stroke));
    const dashedStrokes = new Set((scene.edges ?? []).filter((e) => e.dashed).map((e) => e.stroke));
    expect(dotColors.size).toBe(1);
    expect(solidStrokes.size).toBe(1);
    expect(dashedStrokes.size).toBe(1);
    const dot = [...dotColors][0];
    const solid = [...solidStrokes][0];
    const dashed = [...dashedStrokes][0];
    expect(dot).not.toBe(solid);
    expect(solid).not.toBe(dashed);
    expect(dot).not.toBe(dashed);
  });
});
