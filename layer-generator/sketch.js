// Main harness — wires up GUI, RNG, generators, export.

let state = {
  mode: 'dots',
  paletteGroup: 'final-green-system',
  quality: 'random',
  totemStyle: 'random',
  caption: false,
  fillStyle: 'solid',
  dotVariance: 0,
  dotCluster: 0,
  dotJitter: 0,
  dotDensity: 1,
  dotStroke: 0,
  bgHex: '',
  inkHex: '',
  popHex: '',
  accentsHex: '',
  randomizeVariance: false,
  randomizeCluster: false,
  randomizeJitter: false,
  randomizeDensity: false,
  randomizeStroke: false,
  seed: Math.floor(Math.random() * 1e9),
  colorSeed: Math.floor(Math.random() * 1e9),
  width: 1200,
  height: 1200,
  composerActiveIndex: 1,
  composerLayers: makeDefaultComposerLayers(),
};

let cnv;

function makeDefaultComposerLayers() {
  return [
    { type: 'hue', name: 'Hue layer', enabled: true, blend: 'hue', opacity: 0.35, color: '#7E95B7' },
    { type: 'generated', name: 'Generated A', enabled: true, mode: 'dots', quality: 'scale', totemStyle: 'random', paletteGroup: 'reference-aqua11', fillStyle: 'solid', scale: 1, seed: Math.floor(Math.random() * 1e9), colorSeed: Math.floor(Math.random() * 1e9), blend: 'overlay', opacity: 0.85 },
    { type: 'generated', name: 'Generated B', enabled: true, mode: 'totem', quality: 'random', totemStyle: 'flow', paletteGroup: 'reference-aqua11', fillStyle: 'solid', scale: 1, seed: Math.floor(Math.random() * 1e9), colorSeed: Math.floor(Math.random() * 1e9), blend: 'difference', opacity: 0.45 },
    { type: 'generated', name: 'Generated C', enabled: true, mode: 'dots', quality: 'latent', totemStyle: 'random', paletteGroup: 'reference-aqua11', fillStyle: 'isolated', scale: 1, seed: Math.floor(Math.random() * 1e9), colorSeed: Math.floor(Math.random() * 1e9), blend: 'multiply', opacity: 0.35 },
    { type: 'solid', name: 'Background', enabled: true, blend: 'source-over', opacity: 1, color: '#6B7737' },
  ];
}

function setup() {
  cnv = createCanvas(state.width, state.height);
  pixelDensity(2);
  noLoop();
  bindUI();
  render();
}

function validHex(s) {
  return /^#([0-9a-f]{6})$/i.test(String(s || '').trim());
}

function setColorInputValue(id, value, fallback = '#000000') {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = validHex(value) ? value : fallback;
}

function parseHexList(csv) {
  return String(csv || '').split(',').map(s => s.trim()).filter(validHex);
}

function applyPaletteOverrides(base) {
  const out = { ...base, accents: [...base.accents] };
  if (validHex(state.bgHex)) out.bg = state.bgHex;
  if (validHex(state.inkHex)) out.ink = state.inkHex;
  if (validHex(state.popHex)) out.pop = state.popHex;
  const acc = parseHexList(state.accentsHex);
  if (acc.length) out.accents = acc;
  return out;
}

function installPaletteCyclePick(rng, palette) {
  const originalPick = rng.pick.bind(rng);
  const paletteSet = new Set([palette.bg, palette.ink, palette.pop, ...palette.accents].map(c => String(c).toLowerCase()));
  const decks = new Map();

  rng.pick = (arr) => {
    if (Array.isArray(arr) && arr.length > 1 && arr.every(c => typeof c === 'string' && paletteSet.has(String(c).toLowerCase()))) {
      const key = arr.map(c => String(c).toLowerCase()).sort().join('|');
      let deck = decks.get(key);
      if (!deck || deck.length === 0) {
        deck = [...arr];
        for (let i = deck.length - 1; i > 0; i--) {
          const j = Math.floor(rng() * (i + 1));
          [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        decks.set(key, deck);
      }
      return deck.pop();
    }
    return originalPick(arr);
  };
}

function render(targetP = window) {
  if (state.mode === 'composer') {
    renderComposer(targetP);
    return;
  }

  const result = renderGeneratedLayer(
    targetP,
    {
      mode: state.mode,
      quality: state.quality,
      totemStyle: state.totemStyle,
      seed: state.seed,
      colorSeed: state.colorSeed,
      caption: state.caption,
      paletteGroup: state.paletteGroup,
      fillStyle: state.fillStyle,
    },
    true
  );

  document.getElementById('statusLabel').textContent =
    `palette: ${result.palette.name}${result.metaInfo}`;
}

function renderGeneratedLayer(targetP, layerLike, allowCaption = false, suppressBackground = false) {
  const rng = makeRNG(layerLike.seed);
  const colorRng = makeRNG(layerLike.colorSeed);
  const paletteGroup = layerLike.paletteGroup || state.paletteGroup;
  const palette = applyPaletteOverrides(pickPalette(colorRng, paletteGroup));
  installPaletteCyclePick(colorRng, palette);

  // Globals consumed by quality utilities
  window.colorRng = colorRng;
  window.fillStyle = layerLike.fillStyle || state.fillStyle;
  window.dotVariance = state.dotVariance;
  window.dotCluster = state.dotCluster;
  window.dotJitter = state.dotJitter;
  window.dotDensity = state.dotDensity;
  window.dotStroke = state.dotStroke;
  window.dotStrokeColor = palette.ink;

  let metaInfo = '';
  const opts = {
    quality: layerLike.quality,
    totemStyle: layerLike.totemStyle,
    caption: allowCaption ? state.caption : false,
    onMeta: (m) => { metaInfo = `  ·  ${m.label.toLowerCase()}`; },
  };

  const generators = { totem: drawTotem, dots: drawDots };
  const fn = generators[layerLike.mode];
  if (fn) {
    let originalBackground = null;
    if (suppressBackground && typeof targetP.background === 'function') {
      originalBackground = targetP.background;
      targetP.background = () => {};
      if (typeof targetP.clear === 'function') targetP.clear();
    }
    fn(targetP, rng, palette, state.width, state.height, opts);
    if (originalBackground) targetP.background = originalBackground;
  }

  return { metaInfo, palette };
}

function getRenderContext(targetP) {
  return (targetP && targetP.drawingContext) || (typeof drawingContext !== 'undefined' ? drawingContext : null);
}

function compositeGraphic(targetP, sourceG, blend = 'source-over', opacity = 1, scale = 1) {
  const ctx = getRenderContext(targetP);
  const drawImageFn = (targetP && targetP.image) || (typeof image === 'function' ? image : null);

  if (!ctx || !drawImageFn || !sourceG?.canvas) {
    if (drawImageFn) drawImageFn(sourceG, 0, 0);
    return;
  }

  ctx.save();
  ctx.globalCompositeOperation = blend;
  ctx.globalAlpha = opacity;
  ctx.translate(state.width / 2, state.height / 2);
  ctx.scale(scale, scale);
  ctx.drawImage(sourceG.canvas, -state.width / 2, -state.height / 2, state.width, state.height);
  ctx.restore();
}

function compositeFill(targetP, color, blend = 'source-over', opacity = 1) {
  const ctx = getRenderContext(targetP);
  const p = targetP || window;

  if (!ctx) {
    p.push();
    p.noStroke();
    p.fill(color);
    p.rect(0, 0, state.width, state.height);
    p.pop();
    return;
  }

  ctx.save();
  ctx.globalCompositeOperation = blend;
  ctx.globalAlpha = opacity;
  p.push();
  p.noStroke();
  p.fill(color);
  p.rect(0, 0, state.width, state.height);
  p.pop();
  ctx.restore();
}

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function knockOutColor(graphics, hex, tolerance = 10) {
  const c = hexToRgb(hex);
  if (!c || !graphics || typeof graphics.loadPixels !== 'function') return;
  graphics.loadPixels();
  const px = graphics.pixels;
  for (let i = 0; i < px.length; i += 4) {
    const dr = Math.abs(px[i] - c.r);
    const dg = Math.abs(px[i + 1] - c.g);
    const db = Math.abs(px[i + 2] - c.b);
    if (dr <= tolerance && dg <= tolerance && db <= tolerance) {
      px[i + 3] = 0;
    }
  }
  graphics.updatePixels();
}

function renderComposer(targetP = window) {
  if (targetP.clear) targetP.clear();
  const layers = state.composerLayers;

  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (!layer.enabled) continue;

    if (layer.type === 'solid') {
      compositeFill(targetP, validHex(layer.color) ? layer.color : '#000000', layer.blend || 'source-over', layer.opacity ?? 1);
      continue;
    }

    if (layer.type === 'hue') {
      compositeFill(targetP, validHex(layer.color) ? layer.color : '#7E95B7', layer.blend || 'hue', layer.opacity ?? 0.35);
      continue;
    }

    if (layer.type === 'generated') {
      const g = createGraphics(state.width, state.height);
      g.pixelDensity(1);
      const layerResult = renderGeneratedLayer(g, {
        mode: layer.mode,
        quality: layer.quality,
        totemStyle: layer.totemStyle,
        seed: layer.seed,
        colorSeed: layer.colorSeed,
      }, false, true);
      knockOutColor(g, layerResult.palette.bg, 10);
      compositeGraphic(targetP, g, layer.blend || 'source-over', layer.opacity ?? 1, layer.scale ?? 1);
    }
  }

  const active = state.composerLayers[state.composerActiveIndex];
  document.getElementById('statusLabel').textContent =
    `composer · ${active?.name || 'layer'} · palette: ${state.paletteGroup}`;
}

function rerollBackgroundColorFromPalette() {
  const probeRng = makeRNG(state.colorSeed);
  const pal = pickPalette(probeRng, state.paletteGroup);
  const candidates = [pal.bg, pal.pop, ...pal.accents];
  state.bgHex = candidates[Math.floor(Math.random() * candidates.length)];
  const bgInput = document.getElementById('bgHex');
  if (bgInput) bgInput.value = state.bgHex;

  const bgLayer = state.composerLayers.find(l => l.type === 'solid');
  if (bgLayer) bgLayer.color = state.bgHex;
}

function randomizeEnabledDials() {
  if (state.randomizeVariance) state.dotVariance = +random(0, 4).toFixed(2);
  if (state.randomizeCluster) state.dotCluster = +random(0, 4).toFixed(2);
  if (state.randomizeJitter) state.dotJitter = +random(0, 4).toFixed(2);
  if (state.randomizeDensity) state.dotDensity = +random(0.05, 1).toFixed(2);
  if (state.randomizeStroke) state.dotStroke = Math.round(random(0, 60));

  document.getElementById('dotVariance').value = state.dotVariance;
  document.getElementById('dotCluster').value = state.dotCluster;
  document.getElementById('dotJitter').value = state.dotJitter;
  document.getElementById('dotDensity').value = state.dotDensity;
  document.getElementById('dotStroke').value = state.dotStroke;
}

function rerollComposerGeneratedLayers() {
  state.composerLayers.forEach(layer => {
    if (layer.type === 'generated') {
      layer.seed = Math.floor(Math.random() * 1e9);
      layer.colorSeed = Math.floor(Math.random() * 1e9);
    }
  });
}

function bindComposerUI() {
  const layerList = document.getElementById('layerList');

  const qualityOptions = '<option value="random">Random</option><option value="scale">Scale</option><option value="adaptation">Adaptation</option><option value="flow">Flow</option><option value="convergence">Convergence</option><option value="emergence">Emergence</option><option value="iterator">Iterator</option><option value="gradient">Gradient Descender</option><option value="latent">Latent Space</option><option value="modulator">Modulator</option><option value="containerizer">Container-izer</option><option value="brancher">Brancher</option><option value="retrieval">Retrieval</option>';
  const totemOptions = '<option value="random">Random</option><option value="original">Original</option><option value="scale">Scale Totem</option><option value="adaptation">Adaptation Totem</option><option value="flow">Flow Totem</option><option value="convergence">Convergence Totem</option><option value="emergence">Emergence Totem</option><option value="retrieval">Retrieval Totem</option>';
  const blendOptions = '<option value="source-over">Normal</option><option value="multiply">Multiply</option><option value="screen">Screen</option><option value="overlay">Overlay</option><option value="hard-light">Hard Light</option><option value="soft-light">Soft Light</option><option value="difference">Difference</option><option value="exclusion">Exclusion</option><option value="hue">Hue</option><option value="color">Color</option><option value="luminosity">Luminosity</option>';
  const paletteOptions = document.getElementById('palette').innerHTML;

  const syncEditor = () => {
    layerList.innerHTML = '';

    state.composerLayers.forEach((layer, idx) => {
      const expanded = idx === state.composerActiveIndex;
      const card = document.createElement('div');
      card.className = `layer-item${expanded ? ' active' : ''}`;

      const header = document.createElement('button');
      header.type = 'button';
      header.className = 'layer-head';
      header.innerHTML = `<span>${layer.name}</span><span class="meta">${layer.type}</span>`;
      header.addEventListener('click', () => {
        state.composerActiveIndex = expanded ? -1 : idx;
        syncEditor();
      });
      card.appendChild(header);

      if (expanded) {
        const details = document.createElement('div');
        details.className = 'layer-details';
        details.innerHTML = `
          <div class="composer-grid"><div class="lbl">Enabled</div><input data-k="enabled" type="checkbox" ${layer.enabled ? 'checked' : ''} /></div>
          <div class="composer-grid"><div class="lbl">Blend</div><select data-k="blend">${blendOptions}</select></div>
          <div class="composer-grid"><div class="lbl">Opacity</div><input data-k="opacity" type="range" min="0" max="1" step="0.01" value="${layer.opacity ?? 1}" /></div>
        `;

        if (layer.type === 'generated') {
          const generated = document.createElement('div');
          generated.innerHTML = `
            <div class="composer-grid"><div class="lbl">Mode</div><select data-k="mode"><option value="dots">Dots</option><option value="totem">Totem</option></select></div>
            <div class="composer-grid"><div class="lbl">Palette</div><select data-k="paletteGroup">${paletteOptions}</select></div>
            <div class="composer-grid"><div class="lbl">Fill</div><select data-k="fillStyle"><option value="solid">Solid</option><option value="isolated">Isolated</option></select></div>
            <div class="composer-grid"><div class="lbl">Scale</div><input data-k="scale" type="range" min="0.25" max="2.5" step="0.01" value="${layer.scale ?? 1}" /></div>
            <div class="composer-grid"><div class="lbl">Quality</div><select data-k="quality">${qualityOptions}</select></div>
            <div class="composer-grid"><div class="lbl">Totem style</div><select data-k="totemStyle">${totemOptions}</select></div>
            <div class="actions"><button type="button" data-k="reroll" class="full">Reroll this layer</button></div>
          `;
          details.appendChild(generated);
        }

        if (layer.type === 'hue' || layer.type === 'solid') {
          const colorRow = document.createElement('div');
          colorRow.className = 'composer-grid';
          colorRow.innerHTML = `<div class="lbl">Color</div><input data-k="color" type="color" value="${validHex(layer.color) ? layer.color : '#7e95b7'}" />`;
          details.appendChild(colorRow);
        }

        details.querySelectorAll('select,input,button').forEach(el => {
          const k = el.getAttribute('data-k');
          if (!k) return;

          if (k === 'blend') el.value = layer.blend || 'source-over';
          if (k === 'mode') el.value = layer.mode || 'dots';
          if (k === 'paletteGroup') el.value = layer.paletteGroup || state.paletteGroup;
          if (k === 'fillStyle') el.value = layer.fillStyle || state.fillStyle;
          if (k === 'quality') el.value = layer.quality || 'random';
          if (k === 'totemStyle') el.value = layer.totemStyle || 'random';
          if (k === 'scale') el.value = layer.scale ?? 1;

          const evt = el.tagName === 'INPUT' && el.type === 'range' ? 'input' : 'change';
          if (k === 'reroll') {
            el.addEventListener('click', () => {
              layer.seed = Math.floor(Math.random() * 1e9);
              layer.colorSeed = Math.floor(Math.random() * 1e9);
              render();
            });
            return;
          }

          el.addEventListener(evt, (e) => {
            if (k === 'enabled') layer.enabled = e.target.checked;
            else if (k === 'opacity') layer.opacity = parseFloat(e.target.value);
            else if (k === 'scale') layer.scale = parseFloat(e.target.value);
            else if (k === 'mode') layer.mode = e.target.value;
            else if (k === 'blend') layer.blend = e.target.value;
            else if (k === 'quality') layer.quality = e.target.value;
            else if (k === 'totemStyle') {
              layer.totemStyle = e.target.value;
              if (layer.mode !== 'totem') layer.mode = 'totem';
            }
            else if (k === 'paletteGroup') layer.paletteGroup = e.target.value;
            else if (k === 'fillStyle') layer.fillStyle = e.target.value;
            else if (k === 'color') layer.color = e.target.value;
            render();
            syncEditor();
          });
        });

        card.appendChild(details);
      }

      layerList.appendChild(card);
    });
  };

  syncEditor();
  return { syncEditor };
}

let composerUI;

function bindUI() {
  document.getElementById('mode').value = state.mode;
  document.getElementById('palette').value = state.paletteGroup;
  document.getElementById('quality').value = state.quality;
  document.getElementById('totemStyle').value = state.totemStyle;
  document.getElementById('caption').checked = state.caption;
  document.getElementById('fillStyle').value = state.fillStyle;
  document.getElementById('dotVariance').value = state.dotVariance;
  document.getElementById('dotCluster').value = state.dotCluster;
  document.getElementById('dotJitter').value = state.dotJitter;
  document.getElementById('dotDensity').value = state.dotDensity;
  document.getElementById('dotStroke').value = state.dotStroke;
  setColorInputValue('bgHex', state.bgHex, '#bac0b4');
  setColorInputValue('inkHex', state.inkHex, '#000000');
  setColorInputValue('popHex', state.popHex, '#00ff73');
  document.getElementById('accentsHex').value = state.accentsHex;

  document.getElementById('randVariance').checked = state.randomizeVariance;
  document.getElementById('randCluster').checked = state.randomizeCluster;
  document.getElementById('randJitter').checked = state.randomizeJitter;
  document.getElementById('randDensity').checked = state.randomizeDensity;
  document.getElementById('randStroke').checked = state.randomizeStroke;

  composerUI = bindComposerUI();

  document.getElementById('mode').addEventListener('change', (e) => {
    state.mode = e.target.value;
    render();
  });
  document.getElementById('palette').addEventListener('change', (e) => {
    state.paletteGroup = e.target.value;
    render();
  });
  document.getElementById('quality').addEventListener('change', (e) => {
    state.quality = e.target.value;
    render();
  });
  document.getElementById('totemStyle').addEventListener('change', (e) => {
    state.totemStyle = e.target.value;
    state.mode = 'totem';
    document.getElementById('mode').value = 'totem';
    render();
  });
  document.getElementById('caption').addEventListener('change', (e) => {
    state.caption = e.target.checked;
    render();
  });
  document.getElementById('randomize').addEventListener('click', () => {
    state.seed = Math.floor(Math.random() * 1e9);
    state.colorSeed = Math.floor(Math.random() * 1e9);
    if (state.mode === 'composer') rerollComposerGeneratedLayers();
    randomizeEnabledDials();
    render();
    composerUI.syncEditor();
  });
  document.getElementById('rerollColors').addEventListener('click', () => {
    state.colorSeed = Math.floor(Math.random() * 1e9);
    if (state.mode === 'composer') {
      state.composerLayers.forEach(layer => {
        if (layer.type === 'generated') layer.colorSeed = Math.floor(Math.random() * 1e9);
      });
    }
    rerollBackgroundColorFromPalette();
    render();
    composerUI.syncEditor();
  });
  document.getElementById('fillStyle').addEventListener('change', (e) => {
    state.fillStyle = e.target.value;
    render();
  });
  document.getElementById('dotVariance').addEventListener('input', (e) => { state.dotVariance = parseFloat(e.target.value); render(); });
  document.getElementById('dotCluster').addEventListener('input', (e) => { state.dotCluster = parseFloat(e.target.value); render(); });
  document.getElementById('dotJitter').addEventListener('input', (e) => { state.dotJitter = parseFloat(e.target.value); render(); });
  document.getElementById('dotDensity').addEventListener('input', (e) => { state.dotDensity = parseFloat(e.target.value); render(); });
  document.getElementById('dotStroke').addEventListener('input', (e) => { state.dotStroke = parseFloat(e.target.value); render(); });
  document.getElementById('bgHex').addEventListener('change', (e) => { state.bgHex = e.target.value.trim(); render(); });
  document.getElementById('inkHex').addEventListener('change', (e) => { state.inkHex = e.target.value.trim(); render(); });
  document.getElementById('popHex').addEventListener('change', (e) => { state.popHex = e.target.value.trim(); render(); });
  document.getElementById('accentsHex').addEventListener('change', (e) => { state.accentsHex = e.target.value.trim(); render(); });

  document.getElementById('randVariance').addEventListener('change', (e) => { state.randomizeVariance = e.target.checked; });
  document.getElementById('randCluster').addEventListener('change', (e) => { state.randomizeCluster = e.target.checked; });
  document.getElementById('randJitter').addEventListener('change', (e) => { state.randomizeJitter = e.target.checked; });
  document.getElementById('randDensity').addEventListener('change', (e) => { state.randomizeDensity = e.target.checked; });
  document.getElementById('randStroke').addEventListener('change', (e) => { state.randomizeStroke = e.target.checked; });

  document.getElementById('exportPng').addEventListener('click', exportPNG);
  document.getElementById('exportSvg').addEventListener('click', exportSVG);
  document.getElementById('exportAll').addEventListener('click', exportAll);
  document.getElementById('exportRecipe').addEventListener('click', exportRecipeJSON);
}

// Render every quality × every palette as PNG, downloaded one after another.
async function exportAll() {
  const qualities = ['scale','adaptation','flow','convergence','emergence','iterator','gradient','latent','modulator','containerizer','brancher','retrieval'];
  const palettes  = ['big-green-system'];
  const saved = { quality: state.quality, paletteGroup: state.paletteGroup, mode: state.mode };

  const btn = document.getElementById('exportAll');
  btn.disabled = true;
  let i = 0;
  const total = qualities.length * palettes.length;

  state.mode = 'dots';
  document.getElementById('mode').value = 'dots';

  for (const q of qualities) {
    for (const pal of palettes) {
      i++;
      btn.textContent = `Exporting … ${i}/${total}`;
      state.quality = q;
      state.paletteGroup = pal;
      render();
      await new Promise(r => setTimeout(r, 60));
      const filename = `${q}_${pal}_${state.mode}_4x.png`;
      exportPNGLarge(4, filename);
      await new Promise(r => setTimeout(r, 500));
    }
  }

  state.quality = saved.quality;
  state.paletteGroup = saved.paletteGroup;
  state.mode = saved.mode;
  document.getElementById('quality').value = state.quality;
  document.getElementById('palette').value = state.paletteGroup;
  document.getElementById('mode').value = state.mode;
  render();
  btn.disabled = false;
  btn.textContent = 'Export ALL (every quality × every palette)';
}

function keyPressed() {
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

  if (key === 'r' || key === 'R') {
    state.seed = Math.floor(Math.random() * 1e9);
    state.colorSeed = Math.floor(Math.random() * 1e9);
    if (state.mode === 'composer') rerollComposerGeneratedLayers();
    randomizeEnabledDials();
    render();
    composerUI?.syncEditor();
  } else if (key === 'c' || key === 'C') {
    state.colorSeed = Math.floor(Math.random() * 1e9);
    rerollBackgroundColorFromPalette();
    render();
    composerUI?.syncEditor();
  } else if (key === 'p' || key === 'P') {
    exportPNG();
  } else if (key === 's' || key === 'S') {
    exportSVG();
  }
}

function downloadCanvasAsPNG(canvas, filename) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

function exportPNGLarge(scale = 4, filename = 'export.png') {
  const oldW = state.width;
  const oldH = state.height;
  const newW = Math.round(oldW * scale);
  const newH = Math.round(oldH * scale);

  state.width = newW;
  state.height = newH;

  try {
    const g = createGraphics(newW, newH);
    g.pixelDensity(1);
    render(g);
    downloadCanvasAsPNG(g.canvas, filename);
  } finally {
    state.width = oldW;
    state.height = oldH;
    resizeCanvas(oldW, oldH);
    render();
  }
}

function exportPNG() {
  const baseName = state.mode === 'composer'
    ? `composer_${state.paletteGroup}`
    : `${state.mode === 'totem' ? (state.totemStyle !== 'random' ? state.totemStyle : 'totem') : (state.quality !== 'random' ? state.quality : 'random')}_${state.paletteGroup}_${state.mode}`;
  exportPNGLarge(4, `${baseName}_4x.png`);
}

function exportSVG() {
  if (state.mode === 'composer') {
    alert('SVG export for Composer mode is not supported yet. Use Export PNG or Export recipe JSON.');
    return;
  }
  const recorder = makeSVGRecorder(state.width, state.height);
  const proxy = makeP5Proxy(recorder);
  render(proxy);

  const q = state.mode === 'totem'
    ? (state.totemStyle !== 'random' ? state.totemStyle : 'totem')
    : (state.quality !== 'random' ? state.quality : 'random');
  const filename = `${q}_${state.paletteGroup}_${state.mode}.svg`;
  downloadSVG(recorder, filename);
}

function exportRecipeJSON() {
  const payload = {
    width: state.width,
    height: state.height,
    paletteGroup: state.paletteGroup,
    dotDials: {
      fillStyle: state.fillStyle,
      dotVariance: state.dotVariance,
      dotCluster: state.dotCluster,
      dotJitter: state.dotJitter,
      dotDensity: state.dotDensity,
      dotStroke: state.dotStroke,
    },
    layers: state.composerLayers.map(l => {
      const out = { ...l };
      delete out.seed;
      delete out.colorSeed;
      return out;
    }),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `composer_recipe_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function makeP5Proxy(g) {
  const overrides = Object.create(null);
  return new Proxy({}, {
    get(_, prop) {
      if (prop in overrides) return overrides[prop];
      if (prop in g) {
        const v = g[prop];
        return typeof v === 'function' ? v.bind(g) : v;
      }
      const w = window[prop];
      return typeof w === 'function' ? w.bind(window) : w;
    },
    set(_, prop, value) {
      overrides[prop] = value;
      return true;
    },
    has(_, prop) {
      return (prop in overrides) || (prop in g) || (prop in window);
    },
    deleteProperty(_, prop) {
      delete overrides[prop];
      return true;
    },
  });
}
