import type { AppState } from './state';

export function stateToJson(s: AppState): string {
  return JSON.stringify(s);
}

export function jsonToState(json: string): AppState {
  const parsed = JSON.parse(json);
  if (parsed?.version !== 1) throw new Error(`unsupported state version: ${parsed?.version}`);
  return parsed as AppState;
}

export function stateToHash(s: AppState): string {
  const encoded = encodeURIComponent(stateToJson(s));
  return `#${encoded}`;
}

export function hashToState(hash: string): AppState {
  if (!hash.startsWith('#')) throw new Error('hash must start with #');
  const decoded = decodeURIComponent(hash.slice(1));
  return jsonToState(decoded);
}
