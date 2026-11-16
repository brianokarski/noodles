import type { Hex } from '../generators/types';

const HEX_RE = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isValidHex(s: string): boolean {
  return HEX_RE.test(s);
}

export function normalizeHex(s: string): Hex {
  if (!isValidHex(s)) throw new Error(`invalid hex: ${s}`);
  let body = s.startsWith('#') ? s.slice(1) : s;
  if (body.length === 3) {
    body = body.split('').map((c) => c + c).join('');
  }
  return `#${body.toLowerCase()}`;
}

export function defaultPalette(): Hex[] {
  return ['#111111', '#eeeeee', '#ff00aa', '#00ffaa'];
}

export function pickColor(palette: Hex[], i: number): Hex {
  if (palette.length === 0) throw new Error('empty palette');
  const idx = ((i % palette.length) + palette.length) % palette.length;
  return palette[idx];
}

// Curated 4-color palettes. Editorial / Pantone poster energy — high-contrast
// anchors with one accent. Each is hand-picked for print-first blocky layouts.
export const curatedPalettes: Hex[][] = [
  ['#111111', '#f4f1e8', '#ff4b1f', '#ffb703'], // ink / bone / vermilion / amber
  ['#0a1f44', '#f2f2f2', '#e63946', '#ffd166'], // midnight / paper / red / mustard
  ['#1b1b1b', '#ededed', '#ff6b6b', '#4ecdc4'], // coal / chalk / coral / mint
  ['#0d0d0d', '#f5e6d3', '#c1272d', '#f7b32b'], // black / cream / brick / saffron
  ['#1a1423', '#f3e9dc', '#e63946', '#2a9d8f'], // plum / sand / red / teal
  ['#000000', '#ffffff', '#ff3e00', '#007aff'], // mono / orange / electric blue
  ['#2d1b00', '#fff3b0', '#e63946', '#588157'], // espresso / butter / red / moss
  ['#0f0e17', '#fffffe', '#ff8906', '#f25f4c'], // ink / white / marigold / tomato
  ['#161a1d', '#f4e3b2', '#d62828', '#003049'], // carbon / wheat / red / navy
  ['#202020', '#e0e1dd', '#fca311', '#14213d'], // soot / stone / amber / indigo
  ['#1a1a2e', '#eaeaea', '#ff2e63', '#08d9d6'], // night / silver / hot pink / cyan
  ['#0b090a', '#edf2f4', '#d90429', '#8d99ae'], // pitch / paper / crimson / slate
  ['#231942', '#f5e3e0', '#e0b1cb', '#9f86c0'], // aubergine / blush / rose / lilac
  ['#0a0908', '#f2f4f3', '#a4161a', '#ba181b'], // mono + two reds (duotone)
  ['#1d3557', '#f1faee', '#e63946', '#a8dadc'], // prussian / ivory / red / powder
  ['#22223b', '#f2e9e4', '#c9ada7', '#9a8c98'], // muted editorial
];

export function randomPalette(rng: () => number): Hex[] {
  const idx = Math.floor(rng() * curatedPalettes.length);
  // Clone and shuffle color order so the same base palette reads as new compositions
  const base = [...curatedPalettes[idx]];
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  return base;
}
