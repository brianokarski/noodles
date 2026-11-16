import { describe, it, expect } from 'vitest';
import { isValidHex, normalizeHex, defaultPalette, pickColor, randomPalette, curatedPalettes } from './palette';
import { makeRng } from '../state/seed';

describe('palette', () => {
  it('validates hex colors', () => {
    expect(isValidHex('#FF00AA')).toBe(true);
    expect(isValidHex('FF00AA')).toBe(true);
    expect(isValidHex('#ff00aa')).toBe(true);
    expect(isValidHex('#FFF')).toBe(true);
    expect(isValidHex('hello')).toBe(false);
    expect(isValidHex('#GG0000')).toBe(false);
    expect(isValidHex('')).toBe(false);
  });

  it('normalizes hex to #RRGGBB lowercase', () => {
    expect(normalizeHex('FF00AA')).toBe('#ff00aa');
    expect(normalizeHex('#F0A')).toBe('#ff00aa');
    expect(normalizeHex('#ff00aa')).toBe('#ff00aa');
  });

  it('provides a default palette of 4 valid hex colors', () => {
    const p = defaultPalette();
    expect(p.length).toBe(4);
    p.forEach((c) => expect(isValidHex(c)).toBe(true));
  });

  it('picks a color by index, wrapping modulo palette length', () => {
    const p = ['#aaaaaa', '#bbbbbb', '#cccccc'];
    expect(pickColor(p, 0)).toBe('#aaaaaa');
    expect(pickColor(p, 2)).toBe('#cccccc');
    expect(pickColor(p, 3)).toBe('#aaaaaa');
    expect(pickColor(p, 5)).toBe('#cccccc');
  });

  it('curatedPalettes all contain exactly 4 valid hex colors', () => {
    expect(curatedPalettes.length).toBeGreaterThan(4);
    for (const p of curatedPalettes) {
      expect(p.length).toBe(4);
      for (const c of p) expect(isValidHex(c)).toBe(true);
    }
  });

  it('randomPalette returns 4 colors and is deterministic under the same seed', () => {
    const a = randomPalette(makeRng(0xfeed));
    const b = randomPalette(makeRng(0xfeed));
    expect(a.length).toBe(4);
    expect(a).toEqual(b);
  });

  it('randomPalette returns different palettes for different seeds', () => {
    const seen = new Set<string>();
    for (let s = 0; s < 32; s++) seen.add(randomPalette(makeRng(s)).join(','));
    // with 16 curated palettes and shuffled orders, we expect well over 5 distinct outputs
    expect(seen.size).toBeGreaterThan(5);
  });
});
