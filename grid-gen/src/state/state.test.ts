import { describe, it, expect } from 'vitest';
import { defaultState, cloneState } from './state';

describe('app state', () => {
  it('provides a default state with all required fields', () => {
    const s = defaultState();
    expect(s.generator).toBe('blocks');
    expect(s.preset).toBe('poster');
    expect(s.density).toBe(2);
    expect(s.palette.length).toBeGreaterThan(1);
    expect(s.seed).toMatch(/^[0-9a-f]{1,8}$/);
    expect(typeof s.params).toBe('object');
  });

  it('cloneState produces an independent copy', () => {
    const a = defaultState();
    const b = cloneState(a);
    b.palette.push('#000000');
    expect(a.palette.length).not.toBe(b.palette.length);
  });
});
