import { describe, it, expect } from 'vitest';
import { renderSvg, sceneToSvgString } from './svg';
import { DotScene } from '../generators/types';

const scene: DotScene = {
  dots: [
    { x: 10, y: 20, r: 5, color: '#ff0000' },
    { x: 30, y: 40, r: 7, color: '#00ff00' },
  ],
  edges: [{ a: 0, b: 1, dashed: true, stroke: '#000', width: 2 }],
};

describe('svg renderer', () => {
  it('renderSvg creates an <svg> element with correct viewBox', () => {
    const el = renderSvg(scene, { width: 200, height: 100 }, '#ffffff');
    expect(el.getAttribute('viewBox')).toBe('0 0 200 100');
    expect(el.getAttribute('width')).toBe('200');
    expect(el.getAttribute('height')).toBe('100');
  });

  it('renderSvg produces one <circle> per dot and one <line> per edge', () => {
    const el = renderSvg(scene, { width: 200, height: 100 }, '#ffffff');
    expect(el.querySelectorAll('circle').length).toBe(2);
    expect(el.querySelectorAll('line').length).toBe(1);
  });

  it('sceneToSvgString contains required tags', () => {
    const s = sceneToSvgString(scene, { width: 200, height: 100 }, '#ffffff');
    expect(s).toContain('<svg');
    expect(s).toContain('<circle');
    expect(s).toContain('<line');
    expect(s).toContain('stroke-dasharray');
  });

  it('renders curved edges as <path> with quadratic bezier when curve != 0', () => {
    const curved: DotScene = {
      dots: [
        { x: 0, y: 0, r: 5, color: '#000' },
        { x: 100, y: 0, r: 5, color: '#000' },
      ],
      edges: [{ a: 0, b: 1, stroke: '#000', width: 1, curve: 0.5 }],
    };
    const el = renderSvg(curved, { width: 200, height: 100 }, '#fff');
    const paths = el.querySelectorAll('path');
    expect(paths.length).toBe(1);
    expect(el.querySelectorAll('line').length).toBe(0);
    const d = paths[0].getAttribute('d') ?? '';
    expect(d).toMatch(/^M 0 0 Q /);
    expect(d).toMatch(/ 100 0$/);
    expect(paths[0].getAttribute('fill')).toBe('none');
  });
});
