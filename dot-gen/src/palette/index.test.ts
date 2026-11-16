import { describe, it, expect } from 'vitest';
import { pickByIndex, pickRandom, DEFAULT_PALETTE, mixHex } from './index';
import { mulberry32 } from '../state/rng';

describe('palette', () => {
  it('DEFAULT_PALETTE is black on white', () => {
    expect(DEFAULT_PALETTE).toEqual(['#000000', '#ffffff']);
  });

  it('pickByIndex cycles with modulo', () => {
    const p = ['#a', '#b', '#c'];
    expect(pickByIndex(p, 0)).toBe('#a');
    expect(pickByIndex(p, 3)).toBe('#a');
    expect(pickByIndex(p, 7)).toBe('#b');
  });

  it('pickRandom returns a palette member and is deterministic with a seeded rng', () => {
    const p = ['#a', '#b', '#c'];
    const rng1 = mulberry32(1);
    const rng2 = mulberry32(1);
    expect(pickRandom(p, rng1)).toBe(pickRandom(p, rng2));
    expect(p).toContain(pickRandom(p, mulberry32(99)));
  });

  it('mixHex at t=0 returns the first color; at t=1 returns the second', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
  });

  it('mixHex at t=0.5 returns the midpoint', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
  });

  it('mixHex toward #808080 produces distinct greys for black at 0.25 and 0.5', () => {
    const a = mixHex('#000000', '#808080', 0.25);
    const b = mixHex('#000000', '#808080', 0.5);
    expect(a).not.toBe('#000000');
    expect(b).not.toBe('#000000');
    expect(a).not.toBe(b);
  });
});
