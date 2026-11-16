import { buildControls, promptLoadJsonFile } from './ui/controls';
import { defaultState, cloneState, type AppState } from './state/state';
import { stateToHash, hashToState, stateToJson, jsonToState } from './state/serialize';
import { makeRng, parseSeed } from './state/seed';
import { generatorByName } from './generators/index';
import { presetByName, gridFor, type DensityLevel } from './presets/canvases';
import { renderCanvas } from './renderers/canvas';
import { renderSvg } from './renderers/svg';
import type { Grid } from './generators/types';
import { downloadSvg, downloadPngFromCanvas, copyToClipboard } from './ui/exports';
import { randomPalette } from './palette/palette';

const canvas = requireCanvas('preview');
const controlsRoot = requireElement('controls');
const stage = requireElement('stage');

let state: AppState = loadInitialState();
let lastGrid: Grid = generate(state);

const ui = buildControls(controlsRoot, state, {
  onChange: () => {
    pushHash();
    regenerate();
  },
  onShuffle: () => {
    pushHash();
    regenerate();
    ui.refresh();
  },
  onShufflePalette: () => {
    // Use a fresh non-deterministic seed so each click yields a new palette
    const rng = makeRng((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
    state.palette = randomPalette(rng);
    pushHash();
    regenerate();
    ui.rebuildPalette();
  },
  onExportSvg: () => {
    downloadSvg(renderSvg(lastGrid, { unitSize: 10, seedUrl: currentUrl() }), `grid-gen-${state.seed}.svg`);
  },
  onExportPng: (scale) => {
    downloadPngFromCanvas(canvas, `grid-gen-${state.seed}@${scale}x.png`, scale);
  },
  onCopyLink: async () => {
    await copyToClipboard(currentUrl());
  },
  onSaveJson: () => {
    const blob = new Blob([stateToJson(state)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `grid-gen-${state.seed}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 0);
  },
  onLoadJson: async () => {
    try {
      const text = await promptLoadJsonFile();
      state = jsonToState(text);
      pushHash();
      regenerate();
      ui.refresh();
      ui.rebuildParams();
      ui.rebuildPalette();
    } catch (err) {
      console.error('failed to load state', err);
    }
  },
});

window.addEventListener('hashchange', () => {
  try {
    const next = hashToState(window.location.hash);
    state = cloneState(next);
    regenerate();
    ui.refresh();
    ui.rebuildParams();
    ui.rebuildPalette();
  } catch (err) {
    console.warn('ignoring invalid hash:', err);
    pushHash();
  }
});

repaint();

function generate(s: AppState): Grid {
  const preset = presetByName(s.preset);
  const { cols, rows } = gridFor(preset, s.density as DensityLevel);
  const rng = makeRng(parseSeed(s.seed));
  const gen = generatorByName(s.generator);
  return gen.run({ cols, rows, palette: s.palette, rng, params: s.params });
}

function regenerate(): void {
  lastGrid = generate(state);
  repaint();
}

function repaint(): void {
  const unitSize = computeUnitSize(lastGrid.cols, lastGrid.rows);
  renderCanvas(canvas, lastGrid, { unitSize, backgroundColor: '#000000' });
}

function computeUnitSize(cols: number, rows: number): number {
  const pad = 48;
  const availW = stage.clientWidth - pad;
  const availH = stage.clientHeight - pad;
  return Math.max(1, Math.floor(Math.min(availW / cols, availH / rows)));
}

function loadInitialState(): AppState {
  if (window.location.hash && window.location.hash.length > 1) {
    try {
      return hashToState(window.location.hash);
    } catch {
      /* fall through */
    }
  }
  return defaultState();
}

function pushHash(): void {
  history.replaceState(null, '', stateToHash(state));
}

function currentUrl(): string {
  return window.location.origin + window.location.pathname + stateToHash(state);
}

function requireCanvas(id: string): HTMLCanvasElement {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLCanvasElement)) throw new Error(`missing <canvas id="${id}">`);
  return el;
}

function requireElement(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLElement)) throw new Error(`missing #${id} element`);
  return el;
}

window.addEventListener('resize', repaint);
