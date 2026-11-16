import { AppState, encodeState, decodeState } from './state/hash';
import { createStore } from './state/store';
import { getGenerator, GENERATORS } from './generators/index';
import { getCanvas } from './presets/canvases';
import { renderSvg, sceneToSvgString } from './renderers/svg';
import { seedFromString } from './state/rng';
import { DEFAULT_PALETTE } from './palette/index';
import { buildPane } from './ui/pane';
import { buildToolbar } from './ui/toolbar';

function initialState(): AppState {
  const fromHash = decodeState(location.hash);
  if (fromHash) return fromHash;
  const first = GENERATORS[0];
  return {
    generatorId: first.id,
    canvasKey: 'poster',
    density: 1,
    seed: 'hello',
    palette: [...DEFAULT_PALETTE],
    params: first.defaultParams as Record<string, number | string | boolean>,
  };
}

const store = createStore(initialState());

const stage = document.getElementById('stage')!;
const controls = document.getElementById('controls')!;
const toolbar = document.getElementById('toolbar')!;

function render() {
  const s = store.get();
  const canvas = getCanvas(s.canvasKey);
  const gen = getGenerator(s.generatorId);
  const scene = gen.run(s.params as never, {
    canvas: { width: canvas.width, height: canvas.height },
    density: s.density,
    seed: seedFromString(s.seed),
    palette: s.palette,
  });
  const bg = s.palette[1] ?? '#ffffff';
  stage.innerHTML = '';
  const svg = renderSvg(scene, { width: canvas.width, height: canvas.height }, bg);
  stage.appendChild(svg);
}

function pushHash() {
  const s = store.get();
  const newHash = encodeState(s);
  if (location.hash !== newHash) history.replaceState(null, '', newHash);
}

buildPane(controls, store);
buildToolbar(toolbar, {
  getSvgString: () => {
    const s = store.get();
    const canvas = getCanvas(s.canvasKey);
    const gen = getGenerator(s.generatorId);
    const scene = gen.run(s.params as never, {
      canvas: { width: canvas.width, height: canvas.height },
      density: s.density,
      seed: seedFromString(s.seed),
      palette: s.palette,
    });
    const bg = s.palette[1] ?? '#ffffff';
    return sceneToSvgString(scene, { width: canvas.width, height: canvas.height }, bg);
  },
  getCanvasSize: () => {
    const c = getCanvas(store.get().canvasKey);
    return { width: c.width, height: c.height };
  },
  getFilenameBase: () => {
    const s = store.get();
    return `dot-gen-${s.generatorId}-${s.seed}`;
  },
});

store.subscribe(() => {
  pushHash();
  render();
});

render();
pushHash();
