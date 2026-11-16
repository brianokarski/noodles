import type { GeneratorMeta } from './types';
import { blocks } from './blocks';
import { columns } from './columns';
import { bars } from './bars';
import { noise } from './noise';
import { cellular } from './cellular';
import { stamps } from './stamps';

export const generators: GeneratorMeta[] = [blocks, columns, bars, noise, cellular, stamps];

export function generatorByName(name: string): GeneratorMeta {
  const g = generators.find((x) => x.name === name);
  if (!g) throw new Error(`unknown generator: ${name}`);
  return g;
}
