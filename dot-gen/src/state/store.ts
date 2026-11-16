import { AppState } from './hash';

export type Store = {
  get(): AppState;
  update(patch: Partial<AppState>): void;
  subscribe(fn: (s: AppState) => void): () => void;
};

export function createStore(initial: AppState): Store {
  let state = initial;
  const subs = new Set<(s: AppState) => void>();
  return {
    get() {
      return state;
    },
    update(patch) {
      state = { ...state, ...patch };
      subs.forEach((fn) => fn(state));
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}
