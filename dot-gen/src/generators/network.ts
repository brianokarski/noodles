import { GeneratorMeta, DotScene, RunContext, Dot, Edge } from './types';
import { mulberry32 } from '../state/rng';
import { pickByIndex, mixHex } from '../palette/index';

type Params = {
  nodeCount: number;
  layout: string;
  edgeStrategy: string;
  k: number;
  edgeCurvature: number;
  curveDirection: string;
  dashedRatio: number;
  dotRadius: number;
  edgeStroke: number;
  paletteMode: string;
};

function randomLayout(n: number, w: number, h: number, pad: number, rng: () => number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    out.push([pad + rng() * (w - 2 * pad), pad + rng() * (h - 2 * pad)]);
  }
  return out;
}

function poissonLayout(n: number, w: number, h: number, pad: number, rng: () => number): Array<[number, number]> {
  const minDist = Math.min(w, h) / Math.sqrt(n) * 0.8;
  const out: Array<[number, number]> = [];
  let tries = 0;
  while (out.length < n && tries < n * 100) {
    const x = pad + rng() * (w - 2 * pad);
    const y = pad + rng() * (h - 2 * pad);
    let ok = true;
    for (const [px, py] of out) {
      if (Math.hypot(px - x, py - y) < minDist) { ok = false; break; }
    }
    if (ok) out.push([x, y]);
    tries++;
  }
  while (out.length < n) out.push([pad + rng() * (w - 2 * pad), pad + rng() * (h - 2 * pad)]);
  return out;
}

function kNearestEdges(points: Array<[number, number]>, k: number): Edge[] {
  const edges: Edge[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < points.length; i++) {
    const dists: Array<{ j: number; d: number }> = [];
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue;
      dists.push({ j, d: Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1]) });
    }
    dists.sort((a, b) => a.d - b.d);
    for (let m = 0; m < Math.min(k, dists.length); m++) {
      const a = Math.min(i, dists[m].j);
      const b = Math.max(i, dists[m].j);
      const key = `${a}-${b}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({ a, b });
      }
    }
  }
  return edges;
}

function randomEdges(n: number, k: number, rng: () => number): Edge[] {
  const edges: Edge[] = [];
  const seen = new Set<string>();
  const target = Math.min(n * k, (n * (n - 1)) / 2);
  while (edges.length < target) {
    const a = Math.floor(rng() * n);
    const b = Math.floor(rng() * n);
    if (a === b) continue;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const key = `${lo}-${hi}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({ a: lo, b: hi });
  }
  return edges;
}

export const network: GeneratorMeta<Params> = {
  id: 'network',
  label: 'Network · Graph',
  defaultParams: {
    nodeCount: 14,
    layout: 'poisson',
    edgeStrategy: 'k-nearest',
    k: 3,
    edgeCurvature: 0,
    curveDirection: 'alternating',
    dashedRatio: 0.15,
    dotRadius: 28,
    edgeStroke: 2,
    paletteMode: 'solid',
  },
  paramSchema: {
    nodeCount: { kind: 'int', label: 'Node count', default: 14, min: 3, max: 200, step: 1 },
    layout: { kind: 'select', label: 'Layout', default: 'poisson', options: ['random', 'poisson'] },
    edgeStrategy: { kind: 'select', label: 'Edge strategy', default: 'k-nearest', options: ['k-nearest', 'random'] },
    k: { kind: 'int', label: 'k (edges per node)', default: 3, min: 1, max: 40, step: 1 },
    edgeCurvature: { kind: 'number', label: 'Edge curvature', default: 0, min: 0, max: 2, step: 0.02 },
    curveDirection: { kind: 'select', label: 'Curve direction', default: 'alternating', options: ['consistent', 'alternating'] },
    dashedRatio: { kind: 'number', label: 'Dashed ratio', default: 0.15, min: 0, max: 1, step: 0.01 },
    dotRadius: { kind: 'number', label: 'Dot radius', default: 28, min: 2, max: 120, step: 1 },
    edgeStroke: { kind: 'number', label: 'Edge stroke width', default: 2, min: 0.5, max: 12, step: 0.5 },
    paletteMode: { kind: 'select', label: 'Palette mode', default: 'solid', options: ['solid', 'per-node', 'edges-accent'] },
  },
  run(params, ctx: RunContext): DotScene {
    const rng = mulberry32(ctx.seed);
    const { width, height } = ctx.canvas;
    const pad = params.dotRadius * 1.5;
    const points =
      params.layout === 'poisson'
        ? poissonLayout(params.nodeCount, width, height, pad, rng)
        : randomLayout(params.nodeCount, width, height, pad, rng);
    const dots: Dot[] = points.map(([x, y], i) => {
      let color = ctx.palette[0] ?? '#000';
      if (params.paletteMode === 'per-node') color = pickByIndex(ctx.palette, i);
      return { x, y, r: params.dotRadius, color };
    });
    const edgesRaw = params.edgeStrategy === 'k-nearest'
      ? kNearestEdges(points, params.k)
      : randomEdges(points.length, params.k, rng);
    const edgeColor = params.paletteMode === 'edges-accent'
      ? (ctx.palette[1] ?? ctx.palette[0] ?? '#000')
      : (ctx.palette[0] ?? '#000');
    const solidEdgeColor = mixHex(edgeColor, '#808080', 0.25);
    const dashedEdgeColor = mixHex(edgeColor, '#808080', 0.5);
    const edges: Edge[] = edgesRaw.map((e, i) => {
      const sign = params.curveDirection === 'alternating' ? (i % 2 === 0 ? 1 : -1) : 1;
      const dashed = rng() < params.dashedRatio;
      return {
        a: e.a,
        b: e.b,
        dashed,
        stroke: dashed ? dashedEdgeColor : solidEdgeColor,
        width: params.edgeStroke,
        curve: params.edgeCurvature * sign,
      };
    });
    return { dots, edges };
  },
};
