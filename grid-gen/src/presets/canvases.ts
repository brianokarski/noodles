export type DensityLevel = 1 | 2 | 4 | 8;

export type CanvasPreset = {
  name: 'poster' | 'square' | 'landscape' | 'tag';
  label: string;
  baseCols: number;
  baseRows: number;
};

export const canvasPresets: CanvasPreset[] = [
  { name: 'poster', label: 'Poster (2:3)', baseCols: 24, baseRows: 36 },
  { name: 'square', label: 'Square (1:1)', baseCols: 24, baseRows: 24 },
  { name: 'landscape', label: 'Landscape (3:2)', baseCols: 36, baseRows: 24 },
  { name: 'tag', label: 'Tag (1:3)', baseCols: 12, baseRows: 36 },
];

export function gridFor(
  preset: CanvasPreset,
  density: DensityLevel,
): { cols: number; rows: number } {
  return { cols: preset.baseCols * density, rows: preset.baseRows * density };
}

export function presetByName(name: string): CanvasPreset {
  const p = canvasPresets.find((c) => c.name === name);
  if (!p) throw new Error(`unknown preset: ${name}`);
  return p;
}
