import { describe, it, expect } from 'vitest';
import { defaultState } from './state';
import { stateToHash, hashToState, stateToJson, jsonToState } from './serialize';

describe('state serialization', () => {
  it('URL hash round-trips state', () => {
    const s = { ...defaultState(), seed: 'abc123', density: 4 as const };
    s.params = { scale: 0.33 };
    const hash = stateToHash(s);
    expect(hash.startsWith('#')).toBe(true);
    const restored = hashToState(hash);
    expect(restored).toEqual(s);
  });

  it('JSON round-trips state', () => {
    const s = defaultState();
    const json = stateToJson(s);
    const restored = jsonToState(json);
    expect(restored).toEqual(s);
  });

  it('rejects malformed hash', () => {
    expect(() => hashToState('#notjson')).toThrow();
  });

  it('rejects wrong version', () => {
    const badJson = JSON.stringify({ ...defaultState(), version: 99 });
    expect(() => jsonToState(badJson)).toThrow();
  });
});
