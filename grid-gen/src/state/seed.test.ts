import { describe, it, expect } from 'vitest';
import { makeRng, parseSeed, formatSeed, randomSeed } from './seed';

describe('seeded RNG', () => {
  it('produces deterministic sequences for the same seed', () => {
    const a = makeRng(parseSeed('a7c3f2'));
    const b = makeRng(parseSeed('a7c3f2'));
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = makeRng(parseSeed('a7c3f2'));
    const b = makeRng(parseSeed('b7c3f2'));
    expect(a()).not.toBe(b());
  });

  it('returns numbers in [0, 1)', () => {
    const r = makeRng(parseSeed('000001'));
    for (let i = 0; i < 100; i++) {
      const n = r();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });

  it('round-trips seed hex format', () => {
    const n = parseSeed('a7c3f2');
    expect(formatSeed(n)).toBe('a7c3f2');
  });

  it('generates a valid hex seed', () => {
    const s = randomSeed();
    expect(s).toMatch(/^[0-9a-f]{6}$/);
    expect(parseSeed(s)).toBeGreaterThanOrEqual(0);
  });
});
