export type Dot = {
  x: number;
  y: number;
  r: number;
  color: string;
};

export type Edge = {
  a: number;
  b: number;
  dashed?: boolean;
  stroke?: string;
  width?: number;
  curve?: number;
};

export type DotScene = {
  dots: Dot[];
  edges?: Edge[];
};

export type RunContext = {
  canvas: { width: number; height: number };
  density: number;
  seed: number;
  palette: string[];
};

export type ParamKind = 'number' | 'int' | 'boolean' | 'select';

export type ParamSchemaEntry =
  | { kind: 'number'; label: string; default: number; min?: number; max?: number; step?: number }
  | { kind: 'int'; label: string; default: number; min?: number; max?: number; step?: number }
  | { kind: 'boolean'; label: string; default: boolean }
  | { kind: 'select'; label: string; default: string; options: string[] };

export type ParamSchema = Record<string, ParamSchemaEntry>;

export type GeneratorMeta<P extends Record<string, unknown> = Record<string, unknown>> = {
  id: string;
  label: string;
  defaultParams: P;
  paramSchema: ParamSchema;
  run: (params: P, ctx: RunContext) => DotScene;
};
