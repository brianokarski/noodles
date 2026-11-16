import { describe, it, expect } from 'vitest';
import { GENERATORS, getGenerator } from './index';

describe('generator registry', () => {
  it('exposes 4 generators with unique ids', () => {
    expect(GENERATORS.length).toBe(4);
    const ids = GENERATORS.map((g) => g.id);
    expect(new Set(ids).size).toBe(4);
  });

  it('includes the four expected ids', () => {
    const ids = GENERATORS.map((g) => g.id).sort();
    expect(ids).toEqual(['grid-cluster', 'network', 'particle-path', 'radial']);
  });

  it('getGenerator falls back to the first generator for unknown ids', () => {
    const g = getGenerator('nope');
    expect(g.id).toBe(GENERATORS[0].id);
  });
});
