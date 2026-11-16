import type { Cell, Fill, GeneratorMeta, Grid } from './types';

type Region = { x: number; y: number; w: number; h: number };
type Orient = 'mixed' | 'horizontal' | 'vertical';
type Axis = 'horizontal' | 'vertical' | null;

export const bars: GeneratorMeta = {
  name: 'bars',
  label: 'Bars',
  defaultParams: {
    splitProb: 0.8,
    minRegion: 6,
    stripeMin: 1,
    stripeMax: 3,
    orient: 'mixed',
  },
  paramSchema: [
    { key: 'splitProb', kind: 'number', min: 0, max: 1, step: 0.01, default: 0.8 },
    { key: 'minRegion', kind: 'number', min: 2, max: 24, step: 1, default: 6 },
    { key: 'stripeMin', kind: 'number', min: 1, max: 8, step: 1, default: 1 },
    { key: 'stripeMax', kind: 'number', min: 1, max: 12, step: 1, default: 3 },
    { key: 'orient', kind: 'select', options: ['mixed', 'horizontal', 'vertical'], default: 'mixed' },
  ],
  run: ({ cols, rows, palette, rng, params }): Grid => {
    const splitProb = clamp01(Number(params.splitProb ?? 0.8));
    const minRegion = Math.max(2, Math.floor(Number(params.minRegion ?? 6)));
    const stripeMin = Math.max(1, Math.floor(Number(params.stripeMin ?? 1)));
    const stripeMaxRaw = Math.max(stripeMin, Math.floor(Number(params.stripeMax ?? 3)));
    const orient = (params.orient as Orient) ?? 'mixed';
    const maxDepth = 18;

    const regions: Region[] = [];
    subdivide({ x: 0, y: 0, w: cols, h: rows }, 0, maxDepth, minRegion, splitProb, rng, regions);

    // Per-composition shuffled palette: ensures each leaf gets distinct fg/bg
    // and the composition reads as intentional (not random noise).
    const shuffled = [...palette];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const cells: Cell[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, (): Cell => ({ fill: { kind: 'solid', color: palette[0] } })),
    );

    let paletteOffset = 0;
    for (const region of regions) {
      const stripeAxis = pickStripeAxis(orient, rng);
      const thickness = Math.max(
        stripeMin,
        stripeMin + Math.floor(rng() * (stripeMaxRaw - stripeMin + 1)),
      );
      // Pick two palette colors that differ. Rotate through shuffled palette
      // so adjacent regions favor different color pairs.
      const fg = shuffled[paletteOffset % shuffled.length];
      const bg = shuffled[(paletteOffset + 1) % shuffled.length];
      paletteOffset += 1 + Math.floor(rng() * 2); // 1 or 2 steps forward
      fillRegionWithStripes(cells, region, stripeAxis, thickness, fg, bg);
    }

    return { cols, rows, cells };
  },
};

function subdivide(
  r: Region,
  depth: number,
  maxDepth: number,
  minRegion: number,
  splitProb: number,
  rng: () => number,
  out: Region[],
): void {
  if (depth >= maxDepth || rng() > splitProb) {
    out.push(r);
    return;
  }
  const axis = pickCutAxis(r.w, r.h, minRegion, rng);
  if (axis === null) {
    out.push(r);
    return;
  }
  const axisLen = axis === 'horizontal' ? r.h : r.w;
  const point = pickSplitPoint(axisLen, minRegion, rng);
  if (point < 0) {
    out.push(r);
    return;
  }
  if (axis === 'horizontal') {
    subdivide({ x: r.x, y: r.y, w: r.w, h: point }, depth + 1, maxDepth, minRegion, splitProb, rng, out);
    subdivide({ x: r.x, y: r.y + point, w: r.w, h: r.h - point }, depth + 1, maxDepth, minRegion, splitProb, rng, out);
  } else {
    subdivide({ x: r.x, y: r.y, w: point, h: r.h }, depth + 1, maxDepth, minRegion, splitProb, rng, out);
    subdivide({ x: r.x + point, y: r.y, w: r.w - point, h: r.h }, depth + 1, maxDepth, minRegion, splitProb, rng, out);
  }
}

function pickCutAxis(w: number, h: number, minRegion: number, rng: () => number): Axis {
  const canCutX = w >= minRegion * 2;
  const canCutY = h >= minRegion * 2;
  if (canCutX && canCutY) {
    // Prefer cutting the longer axis for better aspect variety
    if (w >= 1.5 * h) return 'vertical';
    if (h >= 1.5 * w) return 'horizontal';
    return rng() < 0.5 ? 'horizontal' : 'vertical';
  }
  if (canCutX) return 'vertical';
  if (canCutY) return 'horizontal';
  return null;
}

function pickSplitPoint(n: number, minRegion: number, rng: () => number): number {
  // Candidates at thirds and halves, snapped so both halves respect minRegion
  const candidates = new Set<number>();
  for (const frac of [0.33, 0.5, 0.66]) {
    const p = Math.round(n * frac);
    if (p >= minRegion && n - p >= minRegion) candidates.add(p);
  }
  const arr = [...candidates];
  if (arr.length === 0) return -1;
  return arr[Math.floor(rng() * arr.length)];
}

function pickStripeAxis(orient: Orient, rng: () => number): 'horizontal' | 'vertical' {
  if (orient === 'horizontal') return 'horizontal';
  if (orient === 'vertical') return 'vertical';
  return rng() < 0.5 ? 'horizontal' : 'vertical';
}

function fillRegionWithStripes(
  cells: Cell[][],
  r: Region,
  axis: 'horizontal' | 'vertical',
  thickness: number,
  fg: string,
  bg: string,
): void {
  const fgFill: Fill = { kind: 'solid', color: fg };
  const bgFill: Fill = { kind: 'solid', color: bg };
  for (let dy = 0; dy < r.h; dy++) {
    for (let dx = 0; dx < r.w; dx++) {
      const tick = axis === 'horizontal' ? dy : dx;
      const inFg = Math.floor(tick / thickness) % 2 === 0;
      cells[r.y + dy][r.x + dx] = { fill: inFg ? fgFill : bgFill };
    }
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
