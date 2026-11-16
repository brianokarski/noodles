import type { GeneratorMeta, Grid, Cell, Fill } from './types';

type Block = { x: number; y: number; w: number; h: number };
type BandOrient = 'mixed' | 'horizontal' | 'vertical';
type Axis = 'horizontal' | 'vertical' | null;

export const blocks: GeneratorMeta = {
  name: 'blocks',
  label: 'Blocks',
  defaultParams: {
    splitProb: 0.7,
    minSize: 1,
    bandOrient: 'mixed',
  },
  paramSchema: [
    { key: 'splitProb', kind: 'number', min: 0, max: 1, step: 0.01, default: 0.7 },
    { key: 'minSize', kind: 'number', min: 1, max: 8, step: 1, default: 1 },
    { key: 'bandOrient', kind: 'select', options: ['mixed', 'horizontal', 'vertical'], default: 'mixed' },
  ],
  run: ({ cols, rows, palette, rng, params }): Grid => {
    const splitProb = clamp01(Number(params.splitProb ?? 0.7));
    const minSize = Math.max(1, Math.floor(Number(params.minSize ?? 1)));
    const bandOrient = (params.bandOrient as BandOrient) ?? 'mixed';
    const maxDepth = 20;

    const leaves: Block[] = [];
    subdivide({ x: 0, y: 0, w: cols, h: rows }, 0, maxDepth, minSize, splitProb, bandOrient, rng, leaves);

    // Per-composition weighted palette: shuffle order and assign exponential
    // weights so one color dominates and one is the accent. This makes each
    // shuffle read as a distinct composition instead of uniform noise.
    const weighted = buildWeightedPalette(palette, rng);

    const cells: Cell[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, (): Cell => ({ fill: { kind: 'solid', color: palette[0] } })),
    );
    for (const b of leaves) {
      const color = sampleWeighted(weighted, rng);
      const fill: Fill = { kind: 'solid', color };
      for (let j = b.y; j < b.y + b.h; j++) {
        for (let i = b.x; i < b.x + b.w; i++) {
          cells[j][i] = { fill };
        }
      }
    }
    return { cols, rows, cells };
  },
};

type WeightedColor = { color: string; weight: number };

function buildWeightedPalette(palette: readonly string[], rng: () => number): WeightedColor[] {
  if (palette.length === 0) return [];
  // Shuffle a copy so dominant/accent roles rotate each composition
  const order = [...palette];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  // Exponential decay weights: first color ~55%, second ~25%, third ~12%, fourth ~8%
  // Plus a small jitter so successive shuffles differ even with the same order
  const base = [0.55, 0.25, 0.12, 0.08];
  const weights = order.map((_, i) => {
    const b = base[i] ?? 0.05;
    const jitter = 0.9 + rng() * 0.2; // 0.9–1.1
    return b * jitter;
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  return order.map((color, i) => ({ color, weight: weights[i] / sum }));
}

function sampleWeighted(weighted: WeightedColor[], rng: () => number): string {
  const r = rng();
  let acc = 0;
  for (const w of weighted) {
    acc += w.weight;
    if (r < acc) return w.color;
  }
  return weighted[weighted.length - 1].color;
}

function subdivide(
  blk: Block,
  depth: number,
  maxDepth: number,
  minSize: number,
  splitProb: number,
  bandOrient: BandOrient,
  rng: () => number,
  out: Block[],
): void {
  if (depth >= maxDepth || rng() > splitProb) {
    out.push(blk);
    return;
  }

  const axis = pickCutAxis(blk.w, blk.h, minSize, bandOrient, rng);
  if (axis === null) {
    out.push(blk);
    return;
  }

  const axisLen = axis === 'horizontal' ? blk.h : blk.w;
  const point = pickSplitPoint(axisLen, minSize, rng);
  if (point < 0) {
    out.push(blk);
    return;
  }

  if (axis === 'horizontal') {
    subdivide({ x: blk.x, y: blk.y, w: blk.w, h: point }, depth + 1, maxDepth, minSize, splitProb, bandOrient, rng, out);
    subdivide({ x: blk.x, y: blk.y + point, w: blk.w, h: blk.h - point }, depth + 1, maxDepth, minSize, splitProb, bandOrient, rng, out);
  } else {
    subdivide({ x: blk.x, y: blk.y, w: point, h: blk.h }, depth + 1, maxDepth, minSize, splitProb, bandOrient, rng, out);
    subdivide({ x: blk.x + point, y: blk.y, w: blk.w - point, h: blk.h }, depth + 1, maxDepth, minSize, splitProb, bandOrient, rng, out);
  }
}

function pickCutAxis(w: number, h: number, minSize: number, bandOrient: BandOrient, rng: () => number): Axis {
  const canCutX = w >= minSize * 2;
  const canCutY = h >= minSize * 2;

  if (bandOrient === 'horizontal') return canCutY ? 'horizontal' : null;
  if (bandOrient === 'vertical') return canCutX ? 'vertical' : null;

  if (canCutX && canCutY) {
    if (w >= 2 * h) return 'vertical';
    if (h >= 2 * w) return 'horizontal';
    return rng() < 0.5 ? 'horizontal' : 'vertical';
  }
  if (canCutX) return 'vertical';
  if (canCutY) return 'horizontal';
  return null;
}

function pickSplitPoint(n: number, minSize: number, rng: () => number): number {
  const step = minSize;
  const candidates = new Set<number>();
  for (const raw of [n / 2, n / 4, (3 * n) / 4]) {
    const snapped = Math.round(raw / step) * step;
    if (snapped >= minSize && n - snapped >= minSize) candidates.add(snapped);
  }
  const arr = [...candidates];
  if (arr.length === 0) return -1;
  return arr[Math.floor(rng() * arr.length)];
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
