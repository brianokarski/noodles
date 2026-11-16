import { createNoise2D } from 'simplex-noise';
import type { Cell, Generator, GeneratorMeta, Grid } from './types';
import { pickColor } from '../palette/palette';

const run: Generator = ({ cols, rows, palette, rng, params }) => {
  const scale = (params.scale as number) ?? 0.15;
  const noise2D = createNoise2D(rng);

  const cells: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      const n = (noise2D(c * scale, r * scale) + 1) / 2;
      const idx = Math.min(palette.length - 1, Math.floor(n * palette.length));
      row.push({ fill: { kind: 'solid', color: pickColor(palette, idx) } });
    }
    cells.push(row);
  }

  const grid: Grid = { cols, rows, cells };
  return grid;
};

export const noise: GeneratorMeta = {
  name: 'noise',
  label: 'Noise',
  defaultParams: { scale: 0.15 },
  paramSchema: [{ key: 'scale', kind: 'number', min: 0.02, max: 0.6, step: 0.01, default: 0.15 }],
  run,
};
