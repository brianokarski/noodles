export type Hex = string; // e.g. "#FF00AA"

export type SolidFill = { kind: 'solid'; color: Hex };
export type GradientFill = { kind: 'gradient'; from: Hex; to: Hex; dir: 'h' | 'v' };
export type PatternFill = {
  kind: 'pattern';
  pattern: 'stripe' | 'checker' | 'dot';
  fg: Hex;
  bg: Hex;
  scale: number; // integer; units per sub-cell
};

export type Fill = SolidFill | GradientFill | PatternFill;

export type Cell = { fill: Fill };

export type Grid = {
  cols: number;
  rows: number;
  cells: Cell[][]; // cells[row][col]
};

export type Rng = () => number;

export type GeneratorInput = {
  cols: number;
  rows: number;
  palette: Hex[];
  rng: Rng;
  params: Record<string, unknown>;
};

export type Generator = (input: GeneratorInput) => Grid;

export type GeneratorMeta = {
  name: string;
  label: string;
  defaultParams: Record<string, unknown>;
  paramSchema: ParamSchema[];
  run: Generator;
};

export type ParamSchema =
  | { key: string; kind: 'number'; min: number; max: number; step: number; default: number }
  | { key: string; kind: 'boolean'; default: boolean }
  | { key: string; kind: 'select'; options: string[]; default: string };
