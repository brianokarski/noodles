import type { Cell, Generator, GeneratorMeta, Grid } from './types';
import { pickColor } from '../palette/palette';

function countAliveNeighbors(grid: number[][], r: number, c: number): number {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || rr >= grid.length || cc < 0 || cc >= grid[0].length) {
        count++;
        continue;
      }
      count += grid[rr][cc];
    }
  }
  return count;
}

const run: Generator = ({ cols, rows, palette, rng, params }) => {
  const fillChance = (params.fillChance as number) ?? 0.45;
  const iterations = Math.max(0, Math.floor((params.iterations as number) ?? 4));

  let grid: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) row.push(rng() < fillChance ? 1 : 0);
    grid.push(row);
  }

  for (let i = 0; i < iterations; i++) {
    const next: number[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: number[] = [];
      for (let c = 0; c < cols; c++) {
        const n = countAliveNeighbors(grid, r, c);
        row.push(n >= 4 ? 1 : 0);
      }
      next.push(row);
    }
    grid = next;
  }

  const cells: Cell[][] = grid.map((row) =>
    row.map((v) => ({ fill: { kind: 'solid', color: pickColor(palette, v) } })),
  );

  const out: Grid = { cols, rows, cells };
  return out;
};

export const cellular: GeneratorMeta = {
  name: 'cellular',
  label: 'Cellular',
  defaultParams: { fillChance: 0.45, iterations: 4 },
  paramSchema: [
    { key: 'fillChance', kind: 'number', min: 0.1, max: 0.9, step: 0.01, default: 0.45 },
    { key: 'iterations', kind: 'number', min: 0, max: 10, step: 1, default: 4 },
  ],
  run,
};
