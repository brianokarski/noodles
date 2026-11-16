import type { Fill, Grid, PatternFill } from '../generators/types';

export type CanvasOptions = {
  unitSize: number;
  backgroundColor?: string;
};

export function renderCanvas(
  canvas: HTMLCanvasElement,
  grid: Grid,
  opts: CanvasOptions,
): void {
  const u = Math.max(1, Math.floor(opts.unitSize));
  const w = grid.cols * u;
  const h = grid.rows * u;
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');

  ctx.imageSmoothingEnabled = false;
  if (opts.backgroundColor) {
    ctx.fillStyle = opts.backgroundColor;
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.clearRect(0, 0, w, h);
  }

  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const x = c * u;
      const y = r * u;
      paintCell(ctx, grid.cells[r][c].fill, x, y, u);
    }
  }
}

function paintCell(
  ctx: CanvasRenderingContext2D,
  fill: Fill,
  x: number,
  y: number,
  u: number,
): void {
  if (fill.kind === 'solid') {
    ctx.fillStyle = fill.color;
    ctx.fillRect(x, y, u, u);
    return;
  }

  if (fill.kind === 'gradient') {
    const horizontal = fill.dir === 'h';
    const grad = ctx.createLinearGradient(
      x,
      y,
      horizontal ? x + u : x,
      horizontal ? y : y + u,
    );
    grad.addColorStop(0, fill.from);
    grad.addColorStop(1, fill.to);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, u, u);
    return;
  }

  paintPattern(ctx, fill, x, y, u);
}

function paintPattern(
  ctx: CanvasRenderingContext2D,
  fill: PatternFill,
  x: number,
  y: number,
  u: number,
): void {
  ctx.fillStyle = fill.bg;
  ctx.fillRect(x, y, u, u);
  const step = Math.max(1, Math.floor(fill.scale));
  ctx.fillStyle = fill.fg;

  if (fill.pattern === 'stripe') {
    for (let sx = 0; sx < u; sx += step * 2) {
      const w = Math.min(step, u - sx);
      ctx.fillRect(x + sx, y, w, u);
    }
  } else if (fill.pattern === 'checker') {
    for (let sy = 0; sy < u; sy += step) {
      for (let sx = 0; sx < u; sx += step) {
        const on = (Math.floor(sx / step) + Math.floor(sy / step)) % 2 === 0;
        if (!on) continue;
        const w = Math.min(step, u - sx);
        const h = Math.min(step, u - sy);
        ctx.fillRect(x + sx, y + sy, w, h);
      }
    }
  } else {
    const d = Math.max(1, Math.floor(u / 2));
    const ox = x + Math.floor((u - d) / 2);
    const oy = y + Math.floor((u - d) / 2);
    ctx.fillRect(ox, oy, d, d);
  }
}
