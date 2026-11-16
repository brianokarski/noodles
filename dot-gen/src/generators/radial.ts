import { GeneratorMeta, DotScene, RunContext, Dot } from './types';
import { mulberry32 } from '../state/rng';
import { pickByIndex } from '../palette/index';

type Params = {
  ringCount: number;
  baseDots: number;
  dotsPerRing: string;
  rMin: number;
  rMax: number;
  dotSizeInner: number;
  dotSizeOuter: number;
  perspective: number;
  angleJitter: number;
  ringFalloff: number;
  paletteMode: string;
};

export const radial: GeneratorMeta<Params> = {
  id: 'radial',
  label: 'Radial · Sphere',
  defaultParams: {
    ringCount: 24,
    baseDots: 24,
    dotsPerRing: 'scale-linear',
    rMin: 40,
    rMax: -1,
    dotSizeInner: 2,
    dotSizeOuter: 12,
    perspective: 0.4,
    angleJitter: 0,
    ringFalloff: 0,
    paletteMode: 'solid',
  },
  paramSchema: {
    ringCount: { kind: 'int', label: 'Ring count', default: 24, min: 1, max: 80, step: 1 },
    baseDots: { kind: 'int', label: 'Dots on innermost ring', default: 24, min: 3, max: 200, step: 1 },
    dotsPerRing: { kind: 'select', label: 'Dots per ring', default: 'scale-linear', options: ['constant', 'scale-linear'] },
    rMin: { kind: 'number', label: 'Inner radius', default: 40, min: 0, max: 1000, step: 1 },
    rMax: { kind: 'number', label: 'Outer radius (-1 auto)', default: -1, min: -1, max: 4000, step: 1 },
    dotSizeInner: { kind: 'number', label: 'Dot size inner', default: 2, min: 0.5, max: 40, step: 0.5 },
    dotSizeOuter: { kind: 'number', label: 'Dot size outer', default: 12, min: 0.5, max: 60, step: 0.5 },
    perspective: { kind: 'number', label: 'Perspective', default: 0.4, min: 0, max: 1, step: 0.01 },
    angleJitter: { kind: 'number', label: 'Angle jitter', default: 0, min: 0, max: 1, step: 0.01 },
    ringFalloff: { kind: 'number', label: 'Ring falloff', default: 0, min: 0, max: 1, step: 0.01 },
    paletteMode: { kind: 'select', label: 'Palette mode', default: 'solid', options: ['solid', 'per-ring', 'per-dot'] },
  },
  run(params, ctx: RunContext): DotScene {
    const rng = mulberry32(ctx.seed);
    const { width, height } = ctx.canvas;
    const cx = width / 2;
    const cy = height / 2;
    const rMaxResolved = params.rMax < 0 ? 0.45 * Math.min(width, height) : params.rMax;
    const rings = Math.max(1, params.ringCount);
    const dots: Dot[] = [];
    let globalIdx = 0;
    for (let ri = 0; ri < rings; ri++) {
      const t = rings === 1 ? 0 : ri / (rings - 1);
      const ringR = params.rMin + (rMaxResolved - params.rMin) * t;
      const dotCount =
        params.dotsPerRing === 'constant'
          ? params.baseDots
          : Math.max(3, Math.round(params.baseDots * (1 + t)));
      const keepProb = 1 - params.ringFalloff * t;
      const size = params.dotSizeInner + (params.dotSizeOuter - params.dotSizeInner) * t;
      const color =
        params.paletteMode === 'per-ring'
          ? pickByIndex(ctx.palette, ri)
          : ctx.palette[0] ?? '#000';
      for (let k = 0; k < dotCount; k++) {
        if (rng() > keepProb) continue;
        const baseAngle = (k / dotCount) * Math.PI * 2;
        const jitter = (rng() - 0.5) * (Math.PI * 2 / dotCount) * params.angleJitter;
        const angle = baseAngle + jitter;
        const x = cx + Math.cos(angle) * ringR;
        const ySquash = 1 - params.perspective * 0.6;
        const yOffset = params.perspective * ringR * 0.2;
        const y = cy + Math.sin(angle) * ringR * ySquash - yOffset * (1 - t);
        const dotColor = params.paletteMode === 'per-dot' ? pickByIndex(ctx.palette, globalIdx) : color;
        const cx2 = Math.max(0, Math.min(width, x));
        const cy2 = Math.max(0, Math.min(height, y));
        dots.push({ x: cx2, y: cy2, r: size, color: dotColor });
        globalIdx++;
      }
    }
    return { dots };
  },
};
