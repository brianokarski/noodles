import type { Cell, Generator, GeneratorMeta, Grid, Hex, PatternFill } from './types';
import { normalizeHex, pickColor } from '../palette/palette';

const run: Generator = ({ cols, rows, palette, rng, params }) => {
  const background = normalizeHex((params.background as Hex) ?? '#111111');
  const stampCount = Math.max(0, Math.floor((params.stampCount as number) ?? 5));
  const stampSize = Math.max(1, Math.floor((params.stampSize as number) ?? 4));
  const pattern = (params.pattern as 'stripe' | 'checker' | 'dot') ?? 'stripe';

  const cells: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({ fill: { kind: 'solid', color: background } });
    }
    cells.push(row);
  }

  for (let s = 0; s < stampCount; s++) {
    const x0 = Math.floor(rng() * Math.max(1, cols - stampSize));
    const y0 = Math.floor(rng() * Math.max(1, rows - stampSize));
    const fg = pickColor(palette, s);
    const bg = pickColor(palette, s + 1);
    const fill: PatternFill = { kind: 'pattern', pattern, fg, bg, scale: 1 };
    for (let r = y0; r < Math.min(rows, y0 + stampSize); r++) {
      for (let c = x0; c < Math.min(cols, x0 + stampSize); c++) {
        cells[r][c] = { fill };
      }
    }
  }

  const grid: Grid = { cols, rows, cells };
  return grid;
};

export const stamps: GeneratorMeta = {
  name: 'stamps',
  label: 'Stamps',
  defaultParams: {
    background: '#111111',
    stampCount: 6,
    stampSize: 4,
    pattern: 'stripe',
  },
  paramSchema: [
    { key: 'stampCount', kind: 'number', min: 0, max: 40, step: 1, default: 6 },
    { key: 'stampSize', kind: 'number', min: 1, max: 16, step: 1, default: 4 },
    {
      key: 'pattern',
      kind: 'select',
      options: ['stripe', 'checker', 'dot'],
      default: 'stripe',
    },
  ],
  run,
};
