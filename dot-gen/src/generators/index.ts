import { GeneratorMeta } from './types';
import { gridCluster } from './grid-cluster';
import { radial } from './radial';
import { particlePath } from './particle-path';
import { network } from './network';

export const GENERATORS: GeneratorMeta[] = [
  gridCluster as unknown as GeneratorMeta,
  radial as unknown as GeneratorMeta,
  particlePath as unknown as GeneratorMeta,
  network as unknown as GeneratorMeta,
];

export function getGenerator(id: string): GeneratorMeta {
  return GENERATORS.find((g) => g.id === id) ?? GENERATORS[0];
}
