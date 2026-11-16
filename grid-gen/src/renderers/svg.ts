import type { Fill, Grid, PatternFill } from '../generators/types';

export type SvgOptions = {
  unitSize: number; // integer; px per 1x1 unit in the output viewBox
  seedUrl?: string;
};

export function renderSvg(grid: Grid, opts: SvgOptions): string {
  const u = Math.max(1, Math.floor(opts.unitSize));
  const w = grid.cols * u;
  const h = grid.rows * u;

  const defs: string[] = [];
  const body: string[] = [];

  let gradId = 0;

  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c];
      const x = c * u;
      const y = r * u;
      body.push(renderCell(cell.fill, x, y, u, defs, () => `g${gradId++}`));
    }
  }

  const seedComment = opts.seedUrl ? `<!-- ${opts.seedUrl} -->\n` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges">\n` +
    seedComment +
    (defs.length ? `<defs>${defs.join('')}</defs>\n` : '') +
    body.join('') +
    `</svg>`
  );
}

function renderCell(
  fill: Fill,
  x: number,
  y: number,
  u: number,
  defs: string[],
  nextId: () => string,
): string {
  if (fill.kind === 'solid') {
    return `<rect x="${x}" y="${y}" width="${u}" height="${u}" fill="${fill.color}"/>`;
  }

  if (fill.kind === 'gradient') {
    const id = nextId();
    const horizontal = fill.dir === 'h';
    const x2 = horizontal ? 1 : 0;
    const y2 = horizontal ? 0 : 1;
    defs.push(
      `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">` +
        `<stop offset="0%" stop-color="${fill.from}"/>` +
        `<stop offset="100%" stop-color="${fill.to}"/>` +
        `</linearGradient>`,
    );
    return `<rect x="${x}" y="${y}" width="${u}" height="${u}" fill="url(#${id})"/>`;
  }

  return renderPattern(fill, x, y, u);
}

function renderPattern(fill: PatternFill, x: number, y: number, u: number): string {
  const bg = `<rect x="${x}" y="${y}" width="${u}" height="${u}" fill="${fill.bg}"/>`;
  const step = Math.max(1, Math.floor(fill.scale));
  const sub: string[] = [bg];

  if (fill.pattern === 'stripe') {
    for (let sx = 0; sx < u; sx += step * 2) {
      const w = Math.min(step, u - sx);
      sub.push(`<rect x="${x + sx}" y="${y}" width="${w}" height="${u}" fill="${fill.fg}"/>`);
    }
  } else if (fill.pattern === 'checker') {
    for (let sy = 0; sy < u; sy += step) {
      for (let sx = 0; sx < u; sx += step) {
        const on = (Math.floor(sx / step) + Math.floor(sy / step)) % 2 === 0;
        if (!on) continue;
        const w = Math.min(step, u - sx);
        const h = Math.min(step, u - sy);
        sub.push(`<rect x="${x + sx}" y="${y + sy}" width="${w}" height="${h}" fill="${fill.fg}"/>`);
      }
    }
  } else {
    const d = Math.max(1, Math.floor(u / 2));
    const ox = x + Math.floor((u - d) / 2);
    const oy = y + Math.floor((u - d) / 2);
    sub.push(`<rect x="${ox}" y="${oy}" width="${d}" height="${d}" fill="${fill.fg}"/>`);
  }

  return sub.join('');
}
