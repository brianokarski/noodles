import { GeneratorMeta, DotScene, RunContext, Dot } from './types';
import { mulberry32 } from '../state/rng';
import { pickByIndex } from '../palette/index';

type Params = {
  cols: number;
  rows: number;
  clusterShape: string;
  dotRadius: number;
  innerGap: number;
  outerGap: number;
  jitter: number;
  paletteMode: string;
};

function clusterOffsets(shape: string, gap: number): Array<[number, number]> {
  switch (shape) {
    case 'single':
      return [[0, 0]];
    case 'grid-2x2':
      return [[-gap / 2, -gap / 2], [gap / 2, -gap / 2], [-gap / 2, gap / 2], [gap / 2, gap / 2]];
    case 'grid-3x3': {
      const out: Array<[number, number]> = [];
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) out.push([i * gap, j * gap]);
      return out;
    }
    case 'ring': {
      const out: Array<[number, number]> = [];
      const N = 6;
      for (let k = 0; k < N; k++) {
        const a = (k / N) * Math.PI * 2;
        out.push([Math.cos(a) * gap, Math.sin(a) * gap]);
      }
      return out;
    }
    case 'triangle':
      return [[0, -gap], [-gap * 0.866, gap * 0.5], [gap * 0.866, gap * 0.5]];
    case 'plus':
      return [[0, 0], [0, -gap], [0, gap], [-gap, 0], [gap, 0]];
    default:
      return [[0, 0]];
  }
}

export const gridCluster: GeneratorMeta<Params> = {
  id: 'grid-cluster',
  label: 'Grid · Cluster',
  defaultParams: {
    cols: 4,
    rows: 4,
    clusterShape: 'grid-2x2',
    dotRadius: 40,
    innerGap: 60,
    outerGap: 200,
    jitter: 0,
    paletteMode: 'solid',
  },
  paramSchema: {
    cols: { kind: 'int', label: 'Cols', default: 4, min: 1, max: 20, step: 1 },
    rows: { kind: 'int', label: 'Rows', default: 4, min: 1, max: 20, step: 1 },
    clusterShape: {
      kind: 'select', label: 'Cluster shape', default: 'grid-2x2',
      options: ['single', 'grid-2x2', 'grid-3x3', 'ring', 'triangle', 'plus'],
    },
    dotRadius: { kind: 'number', label: 'Dot radius', default: 40, min: 1, max: 200, step: 1 },
    innerGap: { kind: 'number', label: 'Inner gap', default: 60, min: 0, max: 400, step: 1 },
    outerGap: { kind: 'number', label: 'Outer gap', default: 200, min: 0, max: 1000, step: 1 },
    jitter: { kind: 'number', label: 'Jitter', default: 0, min: 0, max: 1, step: 0.01 },
    paletteMode: { kind: 'select', label: 'Palette mode', default: 'solid', options: ['solid', 'per-cluster', 'per-dot'] },
  },
  run(params, ctx: RunContext): DotScene {
    const rng = mulberry32(ctx.seed);
    const dots: Dot[] = [];
    const offsets = clusterOffsets(params.clusterShape, params.innerGap);
    const { width, height } = ctx.canvas;
    const stepX = (width - params.outerGap) / Math.max(1, params.cols - 1);
    const stepY = (height - params.outerGap) / Math.max(1, params.rows - 1);
    const originX = params.outerGap / 2;
    const originY = params.outerGap / 2;
    let clusterIdx = 0;
    for (let j = 0; j < params.rows; j++) {
      for (let i = 0; i < params.cols; i++) {
        const cx = originX + i * stepX;
        const cy = originY + j * stepY;
        const clusterColor = pickByIndex(ctx.palette, clusterIdx);
        for (let k = 0; k < offsets.length; k++) {
          const [ox, oy] = offsets[k];
          const jx = (rng() - 0.5) * 2 * params.jitter * params.innerGap;
          const jy = (rng() - 0.5) * 2 * params.jitter * params.innerGap;
          let color = ctx.palette[0] ?? '#000';
          if (params.paletteMode === 'per-cluster') color = clusterColor;
          else if (params.paletteMode === 'per-dot') color = pickByIndex(ctx.palette, clusterIdx * offsets.length + k);
          const x = Math.max(0, Math.min(width, cx + ox + jx));
          const y = Math.max(0, Math.min(height, cy + oy + jy));
          dots.push({ x, y, r: params.dotRadius, color });
        }
        clusterIdx++;
      }
    }
    return { dots };
  },
};
