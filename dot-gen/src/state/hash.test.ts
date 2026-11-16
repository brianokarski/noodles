import { describe, it, expect } from 'vitest';
import { encodeState, decodeState, AppState } from './hash';

const sample: AppState = {
  generatorId: 'radial',
  canvasKey: 'poster',
  density: 2,
  seed: 'abc123',
  palette: ['#000000', '#ffffff', '#ff0000'],
  params: { ringCount: 24, baseDots: 12, perspective: 0.4 },
};

describe('hash state', () => {
  it('round-trips a full state', () => {
    const s = encodeState(sample);
    const back = decodeState(s);
    expect(back).toEqual(sample);
  });

  it('decodes empty string to null', () => {
    expect(decodeState('')).toBeNull();
    expect(decodeState('#')).toBeNull();
  });

  it('decodes garbage to null without throwing', () => {
    expect(decodeState('#not-a-real-hash')).toBeNull();
  });
});
