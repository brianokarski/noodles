figma.showUI(__html__, { width: 480, height: 860 });

function selectionFrames() {
  const sel = figma.currentPage.selection;
  if (!sel.length) return [];
  return sel.filter(
    (n) => n.type === 'FRAME' || n.type === 'COMPONENT' || n.type === 'INSTANCE'
  );
}

function blendModeFor(name) {
  const key = String(name || 'NORMAL').toUpperCase().replace(/[-\s]/g, '_');
  const valid = new Set([
    'PASS_THROUGH','NORMAL','DARKEN','MULTIPLY','LINEAR_BURN','COLOR_BURN',
    'LIGHTEN','SCREEN','LINEAR_DODGE','COLOR_DODGE','OVERLAY','SOFT_LIGHT','HARD_LIGHT',
    'DIFFERENCE','EXCLUSION','HUE','SATURATION','COLOR','LUMINOSITY'
  ]);
  return valid.has(key) ? key : 'NORMAL';
}

function toUint8Array(input) {
  if (!input) return null;
  if (input instanceof Uint8Array) return input;
  if (Array.isArray(input)) return new Uint8Array(input);
  return null;
}

function ensureBackgroundContainer(target, replaceExisting) {
  const name = '__LAYER_GENERATOR_BG__';
  let existing = target.findChild((c) => c.name === name);
  if (existing && replaceExisting) existing.remove();

  const container = figma.createFrame();
  container.name = name;
  container.resize(target.width, target.height);
  container.x = 0;
  container.y = 0;
  container.fills = [];
  container.clipsContent = true;

  target.insertChild(0, container);
  return container;
}

figma.ui.onmessage = async (msg) => {
  try {
    if (msg.type === 'get-context') {
      const frames = selectionFrames();
      const primary = frames[0];
      figma.ui.postMessage({
        type: 'context',
        width: primary ? Math.round(primary.width) : 2400,
        height: primary ? Math.round(primary.height) : 2400,
        selectionCount: frames.length,
      });
      return;
    }

    if (msg.type === 'apply-layers') {
      const frames = selectionFrames();
      if (!frames.length) {
        figma.notify('Select at least one frame/component/instance to apply layers.');
        return;
      }

      const layers = msg.layers;
      const replaceExisting = (typeof msg.replaceExisting === 'boolean') ? msg.replaceExisting : true;
      if (!layers || !layers.length) {
        figma.notify('No layers provided from UI.');
        return;
      }

      for (const target of frames) {
        const container = ensureBackgroundContainer(target, replaceExisting);

        for (const layer of layers) {
          if (!layer.enabled) continue;

          const bytes = toUint8Array(layer.pngBytes);
          if (!bytes || !bytes.length) continue;
          const image = figma.createImage(bytes);

          const rect = figma.createRectangle();
          rect.name = `layer_${layer.name || layer.quality || 'unnamed'}`;
          rect.resize(target.width, target.height);
          rect.x = 0;
          rect.y = 0;
          rect.fills = [{
            type: 'IMAGE',
            imageHash: image.hash,
            scaleMode: 'FILL'
          }];
          const layerOpacity = (layer.opacity === undefined || layer.opacity === null) ? 1 : Number(layer.opacity);
          rect.opacity = Math.max(0, Math.min(1, layerOpacity));
          rect.blendMode = blendModeFor(layer.blendMode);

          container.appendChild(rect);
        }
      }

      figma.notify(`Applied generated layers to ${frames.length} frame(s).`);
      return;
    }

    if (msg.type === 'close') {
      figma.closePlugin();
      return;
    }
  } catch (err) {
    console.error(err);
    figma.notify(`Plugin error: ${err.message || err}`);
  }
};
