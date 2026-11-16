import { describe, it, expect, vi } from 'vitest';
import { createStore } from './store';
import { AppState } from './hash';

const init: AppState = {
  generatorId: 'grid-cluster',
  canvasKey: 'square',
  density: 1,
  seed: 'start',
  palette: ['#000000', '#ffffff'],
  params: { cols: 4, rows: 4 },
};

describe('store', () => {
  it('returns initial state via get()', () => {
    const store = createStore(init);
    expect(store.get()).toEqual(init);
  });

  it('update() merges patches and notifies subscribers', () => {
    const store = createStore(init);
    const cb = vi.fn();
    store.subscribe(cb);
    store.update({ seed: 'next' });
    expect(store.get().seed).toBe('next');
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('update() deep-replaces params when passed', () => {
    const store = createStore(init);
    store.update({ params: { a: 1 } });
    expect(store.get().params).toEqual({ a: 1 });
  });
});
