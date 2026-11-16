export type AppState = {
  generatorId: string;
  canvasKey: string;
  density: number;
  seed: string;
  palette: string[];
  params: Record<string, number | string | boolean>;
};

function b64UrlEncode(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64UrlDecode(s: string): string {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  return atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
}

export function encodeState(s: AppState): string {
  const params = new URLSearchParams();
  params.set('g', s.generatorId);
  params.set('c', s.canvasKey);
  params.set('d', String(s.density));
  params.set('s', s.seed);
  params.set('pal', s.palette.join(','));
  params.set('p', b64UrlEncode(JSON.stringify(s.params)));
  return '#' + params.toString();
}

export function decodeState(hash: string): AppState | null {
  if (!hash || hash === '#') return null;
  try {
    const raw = hash.startsWith('#') ? hash.slice(1) : hash;
    const q = new URLSearchParams(raw);
    const g = q.get('g');
    const c = q.get('c');
    const d = q.get('d');
    const s = q.get('s');
    const pal = q.get('pal');
    const p = q.get('p');
    if (!g || !c || !d || !s || !pal || !p) return null;
    const params = JSON.parse(b64UrlDecode(p));
    if (typeof params !== 'object' || params === null) return null;
    return {
      generatorId: g,
      canvasKey: c,
      density: Number(d),
      seed: s,
      palette: pal.split(',').filter(Boolean),
      params,
    };
  } catch {
    return null;
  }
}
