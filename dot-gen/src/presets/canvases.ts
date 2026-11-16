export type CanvasPreset = {
  key: string;
  label: string;
  width: number;
  height: number;
};

export const CANVAS_PRESETS: CanvasPreset[] = [
  { key: 'poster', label: 'Poster (A3)', width: 2480, height: 3508 },
  { key: 'square', label: 'Square', width: 2000, height: 2000 },
  { key: 'landscape', label: 'Landscape 16:9', width: 2560, height: 1440 },
  { key: 'tag', label: 'Tag', width: 1200, height: 600 },
  { key: 'sticker', label: 'Sticker', width: 1000, height: 1000 },
  { key: 'social-1x1', label: 'Social 1:1', width: 2048, height: 2048 },
  { key: 'social-9x16', label: 'Social 9:16', width: 2160, height: 3840 },
];

export function getCanvas(key: string): CanvasPreset {
  return CANVAS_PRESETS.find((p) => p.key === key) ?? CANVAS_PRESETS[0];
}
