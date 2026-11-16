import type { Hex } from '../generators/types';
import type { DensityLevel } from '../presets/canvases';
import { defaultPalette } from '../palette/palette';
import { randomSeed } from './seed';

export type AppState = {
  version: 1;
  generator: string;
  preset: string;
  density: DensityLevel;
  palette: Hex[];
  seed: string; // hex
  params: Record<string, unknown>;
};

export function defaultState(): AppState {
  return {
    version: 1,
    generator: 'blocks',
    preset: 'poster',
    density: 2,
    palette: defaultPalette(),
    seed: randomSeed(),
    params: { splitProb: 0.7, minSize: 1, bandOrient: 'mixed' },
  };
}

export function cloneState(s: AppState): AppState {
  return {
    ...s,
    palette: [...s.palette],
    params: { ...s.params },
  };
}
