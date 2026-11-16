import type { Rng } from '../generators/types';

// mulberry32 — tiny, fast, deterministic PRNG
export function makeRng(seed: number): Rng {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function parseSeed(hex: string): number {
  const clean = hex.trim().toLowerCase();
  if (!/^[0-9a-f]{1,8}$/.test(clean)) {
    throw new Error(`invalid seed hex: ${hex}`);
  }
  return parseInt(clean, 16) >>> 0;
}

export function formatSeed(n: number): string {
  return (n >>> 0).toString(16).padStart(6, '0');
}

export function randomSeed(): string {
  const n = Math.floor(Math.random() * 0x1000000);
  return formatSeed(n);
}
