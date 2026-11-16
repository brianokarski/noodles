function el(id) { return document.getElementById(id); }
function randomSeed() { return Math.floor(Math.random() * 1e9); }
function setStatus(msg, isError) {
  var s = el('status');
  if (!s) return;
  s.textContent = msg;
  s.style.color = isError ? '#ff8f8f' : '#9ecbff';
}

var state = {
  width: 2400,
  height: 2400,
  mode: 'dots',
  quality: 'random',
  palettePreset: 'olive',
  fillStyle: 'solid',
  seed: randomSeed(),
  colorSeed: randomSeed(),
  dotVariance: 0,
  dotCluster: 0,
  dotJitter: 0,
  dotDensity: 1,
  dotStroke: 0,
  p5: null,
  p5Canvas: null,
  renderedCanvas: null
};

function ensureP5() {
  if (state.p5) return state.p5;
  state.p5 = new p5(function(p) {
    p.setup = function() {
      var c = p.createCanvas(state.width, state.height);
      c.style('display', 'none');
      p.pixelDensity(1);
      p.noLoop();
      state.p5Canvas = c.elt;
    };
  });
  return state.p5;
}

function getPresetPalette(name) {
  var arr = (window.PALETTES && window.PALETTES.brand) ? window.PALETTES.brand : [];
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].name === name) return arr[i];
  }
  return arr.length ? arr[0] : { name:'fallback', bg:'#7d7d3f', ink:'#1c1c34', pop:'#dde6cc', accents:['#a290e0'] };
}

function readStateFromUI() {
  state.width = Number(el('w').value || 2400);
  state.height = Number(el('h').value || 2400);
  state.mode = el('mode').value;
  state.quality = el('quality').value;
  state.palettePreset = el('palettePreset').value;
  state.fillStyle = el('fillStyle').value;
  state.seed = Number(el('seed').value || randomSeed());
  state.colorSeed = Number(el('colorSeed').value || randomSeed());
  state.dotVariance = Number(el('dotVariance').value || 0);
  state.dotCluster = Number(el('dotCluster').value || 0);
  state.dotJitter = Number(el('dotJitter').value || 0);
  state.dotDensity = Number(el('dotDensity').value || 1);
  state.dotStroke = Number(el('dotStroke').value || 0);
}

function drawToCanvas() {
  readStateFromUI();

  if (typeof makeRNG !== 'function') throw new Error('makeRNG not loaded');
  if (state.mode === 'dots' && typeof drawDots !== 'function') throw new Error('drawDots not loaded');
  if (state.mode === 'totem' && typeof drawTotem !== 'function') throw new Error('drawTotem not loaded');

  var palette = getPresetPalette(state.palettePreset);
  var p = ensureP5();
  p.resizeCanvas(state.width, state.height);

  var rng = makeRNG(state.seed);
  var colorRng = makeRNG(state.colorSeed);

  window.colorRng = colorRng;
  window.fillStyle = state.fillStyle;
  window.dotVariance = state.dotVariance;
  window.dotCluster = state.dotCluster;
  window.dotJitter = state.dotJitter;
  window.dotDensity = state.dotDensity;
  window.dotStroke = state.dotStroke;
  window.dotStrokeColor = palette.ink;

  p.clear();
  if (state.mode === 'totem') {
    drawTotem(p, rng, palette, state.width, state.height, {});
  } else {
    drawDots(p, rng, palette, state.width, state.height, {
      quality: state.quality,
      caption: false,
      onMeta: function() {}
    });
  }

  var copy = document.createElement('canvas');
  copy.width = state.width;
  copy.height = state.height;
  copy.getContext('2d').drawImage(state.p5Canvas, 0, 0);
  state.renderedCanvas = copy;

  var preview = el('preview');
  preview.width = state.width;
  preview.height = state.height;
  var ctx = preview.getContext('2d');
  ctx.clearRect(0, 0, state.width, state.height);
  ctx.drawImage(copy, 0, 0);
  setStatus('Rendered ' + state.mode + ' / ' + state.quality + ' (' + state.width + '×' + state.height + ')', false);
}

function dataUrlToBytes(dataUrl) {
  var base64 = dataUrl.split(',')[1] || '';
  var bin = atob(base64);
  var bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return Array.from(bytes);
}

function applyToSelection() {
  if (!state.renderedCanvas) drawToCanvas();
  if (!state.renderedCanvas) return;

  var dataUrl = state.renderedCanvas.toDataURL('image/png');
  var bytes = dataUrlToBytes(dataUrl);

  parent.postMessage({
    pluginMessage: {
      type: 'apply-layers',
      replaceExisting: true,
      layers: [{
        enabled: true,
        name: state.mode + '_' + state.quality,
        quality: state.quality,
        opacity: 1,
        blendMode: 'NORMAL',
        pngBytes: bytes
      }]
    }
  }, '*');
}

function initPaletteSelect() {
  var select = el('palettePreset');
  var arr = (window.PALETTES && window.PALETTES.brand) ? window.PALETTES.brand : [];
  select.innerHTML = '';
  for (var i = 0; i < arr.length; i++) {
    var opt = document.createElement('option');
    opt.value = arr[i].name;
    opt.textContent = arr[i].name;
    select.appendChild(opt);
  }
  select.value = state.palettePreset;
}

function bind() {
  el('syncSel').addEventListener('click', function() {
    parent.postMessage({ pluginMessage: { type: 'get-context' } }, '*');
  });

  el('randomize').addEventListener('click', function() {
    state.seed = randomSeed();
    state.colorSeed = randomSeed();
    el('seed').value = state.seed;
    el('colorSeed').value = state.colorSeed;
    drawToCanvas();
  });

  el('render').addEventListener('click', function() {
    try { drawToCanvas(); } catch (e) { console.error(e); setStatus('Render failed: ' + (e && e.message ? e.message : e), true); }
  });

  el('apply').addEventListener('click', function() {
    try { applyToSelection(); setStatus('Inserted into selected frame(s).', false); } catch (e) { console.error(e); setStatus('Insert failed: ' + (e && e.message ? e.message : e), true); }
  });

  el('close').addEventListener('click', function() {
    parent.postMessage({ pluginMessage: { type: 'close' } }, '*');
  });

  var ids = ['w','h','mode','quality','palettePreset','fillStyle','seed','colorSeed','dotVariance','dotCluster','dotJitter','dotDensity','dotStroke'];
  for (var i = 0; i < ids.length; i++) {
    el(ids[i]).addEventListener('change', function() {
      try { drawToCanvas(); } catch (e) { console.error(e); setStatus('Render failed: ' + (e && e.message ? e.message : e), true); }
    });
  }

  window.onmessage = function(event) {
    var msg = event.data.pluginMessage;
    if (!msg) return;
    if (msg.type === 'context') {
      el('w').value = msg.width;
      el('h').value = msg.height;
      el('selInfo').textContent = 'Selection: ' + msg.selectionCount;
      try { drawToCanvas(); } catch (e) { console.error(e); setStatus('Render failed: ' + (e && e.message ? e.message : e), true); }
    }
  };
}

function init() {
  initPaletteSelect();
  el('seed').value = state.seed;
  el('colorSeed').value = state.colorSeed;
  bind();
  parent.postMessage({ pluginMessage: { type: 'get-context' } }, '*');
  setTimeout(function(){
    try { drawToCanvas(); } catch (e) { console.error(e); setStatus('Render failed: ' + (e && e.message ? e.message : e), true); }
  }, 30);
}

init();
