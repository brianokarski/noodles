import { Pane } from 'tweakpane';
import { Store } from '../state/store';
import { AppState } from '../state/hash';
import { GENERATORS, getGenerator } from '../generators/index';
import { CANVAS_PRESETS } from '../presets/canvases';
import { ParamSchema } from '../generators/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PaneApi = any;

export function buildPane(host: HTMLElement, store: Store): void {
  host.innerHTML = '';
  const pane: PaneApi = new Pane({ container: host, title: 'dot-gen' });

  const canvasFolder: PaneApi = pane.addFolder({ title: 'Canvas' });
  const canvasProxy = {
    canvasKey: store.get().canvasKey,
    density: store.get().density,
  };
  canvasFolder.addBinding(canvasProxy, 'canvasKey', {
    label: 'Preset',
    options: Object.fromEntries(CANVAS_PRESETS.map((p) => [p.label, p.key])),
  }).on('change', (e: PaneApi) => store.update({ canvasKey: e.value }));
  canvasFolder.addBinding(canvasProxy, 'density', {
    label: 'Density',
    options: { '×1': 1, '×2': 2, '×4': 4 },
  }).on('change', (e: PaneApi) => store.update({ density: e.value }));

  const genFolder: PaneApi = pane.addFolder({ title: 'Generator' });
  const genProxy = { generatorId: store.get().generatorId };
  genFolder.addBinding(genProxy, 'generatorId', {
    label: 'Kind',
    options: Object.fromEntries(GENERATORS.map((g) => [g.label, g.id])),
  }).on('change', (e: PaneApi) => {
    const g = getGenerator(e.value);
    store.update({ generatorId: e.value, params: g.defaultParams as Record<string, string | number | boolean> });
    rebuildParams();
  });

  const paramsFolder: PaneApi = pane.addFolder({ title: 'Params' });
  let paramProxy: Record<string, unknown> = {};
  function rebuildParams() {
    paramsFolder.children.slice().forEach((c: PaneApi) => c.dispose());
    const g = getGenerator(store.get().generatorId);
    paramProxy = { ...(store.get().params as Record<string, unknown>) };
    const schema: ParamSchema = g.paramSchema;
    for (const [key, entry] of Object.entries(schema)) {
      if (entry.kind === 'select') {
        paramsFolder.addBinding(paramProxy, key, {
          label: entry.label,
          options: Object.fromEntries(entry.options.map((o) => [o, o])),
        }).on('change', (e: PaneApi) => {
          const next = { ...(store.get().params as Record<string, string | number | boolean>), [key]: e.value as string };
          store.update({ params: next });
        });
      } else if (entry.kind === 'boolean') {
        paramsFolder.addBinding(paramProxy, key, { label: entry.label })
          .on('change', (e: PaneApi) => {
            const next = { ...(store.get().params as Record<string, string | number | boolean>), [key]: e.value as boolean };
            store.update({ params: next });
          });
      } else {
        paramsFolder.addBinding(paramProxy, key, {
          label: entry.label,
          min: entry.min,
          max: entry.max,
          step: entry.kind === 'int' ? (entry.step ?? 1) : entry.step,
        }).on('change', (e: PaneApi) => {
          const next = { ...(store.get().params as Record<string, string | number | boolean>), [key]: e.value as number };
          store.update({ params: next });
        });
      }
    }
  }
  rebuildParams();

  const palFolder: PaneApi = pane.addFolder({ title: 'Palette' });
  function rebuildPalette() {
    palFolder.children.slice().forEach((c: PaneApi) => c.dispose());
    const pal = [...store.get().palette];
    const proxy: Record<string, string> = {};
    pal.forEach((hex, i) => (proxy[`c${i}`] = hex));
    pal.forEach((_, i) => {
      palFolder.addBinding(proxy, `c${i}`, { label: `Color ${i + 1}`, view: 'color' })
        .on('change', (e: PaneApi) => {
          const next = [...store.get().palette];
          next[i] = e.value as string;
          store.update({ palette: next });
        });
    });
    palFolder.addButton({ title: '+ Add color' }).on('click', () => {
      if (store.get().palette.length >= 8) return;
      store.update({ palette: [...store.get().palette, '#888888'] });
      rebuildPalette();
    });
    palFolder.addButton({ title: '- Remove last' }).on('click', () => {
      if (store.get().palette.length <= 2) return;
      store.update({ palette: store.get().palette.slice(0, -1) });
      rebuildPalette();
    });
  }
  rebuildPalette();

  const seedFolder: PaneApi = pane.addFolder({ title: 'Seed' });
  const seedProxy = { seed: store.get().seed };
  seedFolder.addBinding(seedProxy, 'seed', { label: 'Seed' })
    .on('change', (e: PaneApi) => store.update({ seed: String(e.value) }));
  seedFolder.addButton({ title: '🎲 Randomize' }).on('click', () => {
    const rand = Math.random().toString(36).slice(2, 8);
    const g = getGenerator(store.get().generatorId);
    const params: Record<string, string | number | boolean> = {};
    for (const [key, entry] of Object.entries(g.paramSchema)) {
      if (entry.kind === 'select') {
        params[key] = entry.options[Math.floor(Math.random() * entry.options.length)];
      } else if (entry.kind === 'boolean') {
        params[key] = Math.random() < 0.5;
      } else {
        const min = entry.min ?? 0;
        const max = entry.max ?? 1;
        const v = min + Math.random() * (max - min);
        params[key] = entry.kind === 'int' ? Math.round(v) : v;
      }
    }
    seedProxy.seed = rand;
    store.update({ seed: rand, params });
    rebuildParams();
    pane.refresh();
  });

  store.subscribe((s: AppState) => {
    canvasProxy.canvasKey = s.canvasKey;
    canvasProxy.density = s.density;
    genProxy.generatorId = s.generatorId;
    seedProxy.seed = s.seed;
    pane.refresh();
  });
}
