import { describe, it, expect } from 'vitest';
import { renderSvg } from './svg';
import type { Grid } from '../generators/types';

const tinyGrid: Grid = {
  cols: 2,
  rows: 2,
  cells: [
    [{ fill: { kind: 'solid', color: '#ff0000' } }, { fill: { kind: 'solid', color: '#00ff00' } }],
    [
      { fill: { kind: 'gradient', from: '#000000', to: '#ffffff', dir: 'v' } },
      { fill: { kind: 'pattern', pattern: 'stripe', fg: '#ffffff', bg: '#000000', scale: 1 } },
    ],
  ],
};

describe('svg renderer', () => {
  it('returns a valid SVG string with correct viewBox', () => {
    const out = renderSvg(tinyGrid, { unitSize: 10 });
    expect(out).toMatch(/^<svg /);
    expect(out).toContain('viewBox="0 0 20 20"');
    expect(out).toContain('</svg>');
  });

  it('emits a rect for each solid cell', () => {
    const out = renderSvg(tinyGrid, { unitSize: 10 });
    expect(out).toMatch(/<rect[^>]*fill="#ff0000"/);
    expect(out).toMatch(/<rect[^>]*fill="#00ff00"/);
  });

  it('defines a linearGradient for gradient fills', () => {
    const out = renderSvg(tinyGrid, { unitSize: 10 });
    expect(out).toContain('<linearGradient');
    expect(out).toMatch(/stop-color="#000000"/);
    expect(out).toMatch(/stop-color="#ffffff"/);
  });

  it('embeds pattern fills by inlining sub-rects', () => {
    const out = renderSvg(tinyGrid, { unitSize: 10 });
    expect(out.match(/<rect/g)!.length).toBeGreaterThan(3);
  });

  it('includes the seed URL as a comment when provided', () => {
    const out = renderSvg(tinyGrid, { unitSize: 10, seedUrl: 'https://example.com/#abc' });
    expect(out).toContain('<!-- https://example.com/#abc -->');
  });

  it('uses integer-aligned coordinates', () => {
    const out = renderSvg(tinyGrid, { unitSize: 10 });
    expect(out).not.toMatch(/x="\d+\.\d/);
    expect(out).not.toMatch(/y="\d+\.\d/);
  });
});
