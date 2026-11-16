import { GeneratorMeta, DotScene, RunContext, Dot } from './types';
import { mulberry32 } from '../state/rng';
import { pickByIndex } from '../palette/index';

type Params = {
  curve: string;
  a: number;
  b: number;
  dotCount: number;
  spacing: string;
  dotRadiusStart: number;
  dotRadiusEnd: number;
  thicknessJitter: number;
  paletteMode: string;
};

function curvePoint(curve: string, t: number, a: number, b: number): [number, number] {
  const TAU = Math.PI * 2;
  switch (curve) {
    case 'sine':
      return [t * 2 - 1, Math.sin(t * TAU * a) * 0.5];
    case 'lissajous':
      return [Math.sin(t * TAU * a) * 0.9, Math.cos(t * TAU * b) * 0.9];
    case 'spiral': {
      const angle = t * TAU * a;
      const r = t * 0.9;
      return [Math.cos(angle) * r, Math.sin(angle) * r];
    }
    case 'rose': {
      const angle = t * TAU;
      const r = Math.cos(a * angle) * 0.9;
      return [Math.cos(angle) * r, Math.sin(angle) * r];
    }
    case 'bezier-loop': {
      const angle = t * TAU;
      return [Math.cos(angle) * 0.8 + Math.cos(angle * a) * 0.2, Math.sin(angle) * 0.8 + Math.sin(angle * b) * 0.2];
    }
    default:
      return [0, 0];
  }
}

export const particlePath: GeneratorMeta<Params> = {
  id: 'particle-path',
  label: 'Particle · Path',
  defaultParams: {
    curve: 'lissajous',
    a: 3,
    b: 5,
    dotCount: 400,
    spacing: 'even',
    dotRadiusStart: 4,
    dotRadiusEnd: 4,
    thicknessJitter: 0,
    paletteMode: 'solid',
  },
  paramSchema: {
    curve: { kind: 'select', label: 'Curve', default: 'lissajous', options: ['sine', 'lissajous', 'spiral', 'rose', 'bezier-loop'] },
    a: { kind: 'number', label: 'a', default: 3, min: 1, max: 12, step: 0.1 },
    b: { kind: 'number', label: 'b', default: 5, min: 1, max: 12, step: 0.1 },
    dotCount: { kind: 'int', label: 'Dot count', default: 400, min: 10, max: 2000, step: 1 },
    spacing: { kind: 'select', label: 'Spacing', default: 'even', options: ['even', 'jitter', 'ease-in-out'] },
    dotRadiusStart: { kind: 'number', label: 'Dot radius start', default: 4, min: 0.5, max: 40, step: 0.5 },
    dotRadiusEnd: { kind: 'number', label: 'Dot radius end', default: 4, min: 0.5, max: 40, step: 0.5 },
    thicknessJitter: { kind: 'number', label: 'Thickness jitter', default: 0, min: 0, max: 1, step: 0.01 },
    paletteMode: { kind: 'select', label: 'Palette mode', default: 'solid', options: ['solid', 'gradient-along-path', 'per-dot'] },
  },
  run(params, ctx: RunContext): DotScene {
    const rng = mulberry32(ctx.seed);
    const { width, height } = ctx.canvas;
    const cx = width / 2;
    const cy = height / 2;
    const scale = Math.min(width, height) * 0.45;
    const dots: Dot[] = [];
    const N = Math.max(1, params.dotCount);
    for (let i = 0; i < N; i++) {
      let t: number;
      if (params.spacing === 'jitter') t = (i + rng()) / N;
      else if (params.spacing === 'ease-in-out') {
        const u = i / (N - 1 || 1);
        t = u * u * (3 - 2 * u);
      } else t = i / (N - 1 || 1);
      const [nx, ny] = curvePoint(params.curve, t, params.a, params.b);
      const perp = (rng() - 0.5) * params.thicknessJitter * scale * 0.1;
      const angle = rng() * Math.PI * 2;
      const px = cx + nx * scale + Math.cos(angle) * perp;
      const py = cy + ny * scale + Math.sin(angle) * perp;
      const r = params.dotRadiusStart + (params.dotRadiusEnd - params.dotRadiusStart) * t;
      let color = ctx.palette[0] ?? '#000';
      if (params.paletteMode === 'gradient-along-path') color = pickByIndex(ctx.palette, Math.floor(t * ctx.palette.length));
      else if (params.paletteMode === 'per-dot') color = pickByIndex(ctx.palette, i);
      dots.push({ x: px, y: py, r, color });
    }
    return { dots };
  },
};
