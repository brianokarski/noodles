import type { Cell, Generator, GeneratorMeta, Grid } from './types';
import { pickColor } from '../palette/palette';

const run: Generator = ({ cols, rows, palette, params }) => {
  const stripeWidth = Math.max(1, Math.floor((params.stripeWidth as number) ?? 3));
  const cells: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      const stripeIdx = Math.floor(c / stripeWidth);
      row.push({ fill: { kind: 'solid', color: pickColor(palette, stripeIdx) } });
    }
    cells.push(row);
  }
  const grid: Grid = { cols, rows, cells };
  return grid;
};

export const columns: GeneratorMeta = {
  name: 'columns',
  label: 'Columns',
  defaultParams: { stripeWidth: 3 },
  paramSchema: [
    { key: 'stripeWidth', kind: 'number', min: 1, max: 12, step: 1, default: 3 },
  ],
  run,
};
