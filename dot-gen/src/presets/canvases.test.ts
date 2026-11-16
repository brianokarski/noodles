import { describe, it, expect } from 'vitest';
import { CANVAS_PRESETS, getCanvas } from './canvases';

describe('canvases', () => {
  it('exposes all 7 presets', () => {
    const keys = CANVAS_PRESETS.map((p) => p.key);
    expect(keys).toEqual(['poster', 'square', 'landscape', 'tag', 'sticker', 'social-1x1', 'social-9x16']);
  });

  it('getCanvas returns the matching preset', () => {
    const c = getCanvas('poster');
    expect(c.width).toBe(2480);
    expect(c.height).toBe(3508);
  });

  it('getCanvas falls back to poster for unknown keys', () => {
    const c = getCanvas('does-not-exist');
    expect(c.key).toBe('poster');
  });
});
