import { Pane } from 'tweakpane';
import type { AppState } from '../state/state';
import { canvasPresets } from '../presets/canvases';
import { generators } from '../generators/index';
import { randomSeed } from '../state/seed';
import type { ParamSchema } from '../generators/types';

export type ControlCallbacks = {
  onChange: (state: AppState) => void;
  onShuffle: () => void;
  onShufflePalette: () => void;
  onExportSvg: () => void;
  onExportPng: (scale: 1 | 2 | 4) => void;
  onCopyLink: () => void;
  onSaveJson: () => void;
  onLoadJson: () => void;
};

export function buildControls(
  container: HTMLElement,
  state: AppState,
  cb: ControlCallbacks,
): { rebuildParams: () => void; rebuildPalette: () => void; refresh: () => void } {
  const pane = new Pane({ container, title: 'grid-gen' }) as any;

  pane
    .addBinding(state, 'generator', {
      options: Object.fromEntries(generators.map((g) => [g.label, g.name])),
    })
    .on('change', () => {
      state.params = { ...(generators.find((g) => g.name === state.generator)!.defaultParams) };
      cb.onChange(state);
      rebuildParams();
    });

  pane
    .addBinding(state, 'preset', {
      options: Object.fromEntries(canvasPresets.map((p) => [p.label, p.name])),
    })
    .on('change', () => cb.onChange(state));

  pane
    .addBinding(state, 'density', {
      options: { '×1': 1, '×2': 2, '×4': 4, '×8': 8 },
    })
    .on('change', () => cb.onChange(state));

  // Palette swatches (rebuildable when palette is shuffled)
  let paletteFolder = pane.addFolder({ title: 'Palette' });
  const rebuildPalette = () => {
    paletteFolder.dispose();
    paletteFolder = pane.addFolder({ title: 'Palette' });
    const paletteProxy: Record<string, string> = {};
    state.palette.forEach((c, i) => (paletteProxy[`c${i}`] = c));
    state.palette.forEach((_, i) => {
      paletteFolder
        .addBinding(paletteProxy, `c${i}`, { view: 'color' })
        .on('change', (ev: { value: string }) => {
          state.palette[i] = ev.value;
          cb.onChange(state);
        });
    });
    paletteFolder.addButton({ title: 'Shuffle palette' }).on('click', () => cb.onShufflePalette());
  };
  rebuildPalette();

  // Seed
  pane
    .addBinding(state, 'seed')
    .on('change', () => cb.onChange(state));

  pane
    .addButton({ title: 'Shuffle seed' })
    .on('click', () => {
      state.seed = randomSeed();
      cb.onShuffle();
    });

  // Generator params folder (rebuilt when generator changes)
  let paramsFolder = pane.addFolder({ title: 'Params' });
  const rebuildParams = () => {
    paramsFolder.dispose();
    paramsFolder = pane.addFolder({ title: 'Params' });
    const meta = generators.find((g) => g.name === state.generator)!;
    meta.paramSchema.forEach((schema) => bindParam(paramsFolder, state, schema, cb));
  };
  rebuildParams();

  // Export buttons
  const exportFolder = pane.addFolder({ title: 'Export' });
  exportFolder.addButton({ title: 'Copy link' }).on('click', () => cb.onCopyLink());
  exportFolder.addButton({ title: 'Download SVG' }).on('click', () => cb.onExportSvg());
  exportFolder.addButton({ title: 'Download PNG ×1' }).on('click', () => cb.onExportPng(1));
  exportFolder.addButton({ title: 'Download PNG ×2' }).on('click', () => cb.onExportPng(2));
  exportFolder.addButton({ title: 'Download PNG ×4' }).on('click', () => cb.onExportPng(4));
  exportFolder.addButton({ title: 'Save JSON' }).on('click', () => cb.onSaveJson());
  exportFolder.addButton({ title: 'Load JSON' }).on('click', () => cb.onLoadJson());

  return {
    rebuildParams,
    rebuildPalette,
    refresh: () => pane.refresh(),
  };
}

function bindParam(
  folder: any,
  state: AppState,
  schema: ParamSchema,
  cb: ControlCallbacks,
): void {
  if (schema.kind === 'number') {
    if (!(schema.key in state.params)) state.params[schema.key] = schema.default;
    folder
      .addBinding(state.params, schema.key, {
        min: schema.min,
        max: schema.max,
        step: schema.step,
      })
      .on('change', () => cb.onChange(state));
  } else if (schema.kind === 'boolean') {
    if (!(schema.key in state.params)) state.params[schema.key] = schema.default;
    folder.addBinding(state.params, schema.key).on('change', () => cb.onChange(state));
  } else {
    if (!(schema.key in state.params)) state.params[schema.key] = schema.default;
    folder
      .addBinding(state.params, schema.key, {
        options: Object.fromEntries(schema.options.map((o) => [o, o])),
      })
      .on('change', () => cb.onChange(state));
  }
}

// Loader for JSON upload
export function promptLoadJsonFile(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error('no file selected'));
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    };
    input.click();
  });
}
