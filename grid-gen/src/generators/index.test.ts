import { describe, it, expect } from 'vitest';
import { generators, generatorByName } from './index';

describe('generator registry', () => {
  it('registers columns, bars, noise, cellular, stamps', () => {
    const names = generators.map((g) => g.name);
    expect(names).toContain('columns');
    expect(names).toContain('bars');
    expect(names).toContain('noise');
    expect(names).toContain('cellular');
    expect(names).toContain('stamps');
  });

  it('looks up generators by name', () => {
    expect(generatorByName('noise').name).toBe('noise');
  });

  it('throws on unknown generator', () => {
    expect(() => generatorByName('nope')).toThrow();
  });
});
