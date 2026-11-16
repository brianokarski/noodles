/* ============================================================
   WT-SERIES APP — audio engine + unit UI
   ============================================================ */

const AC = new (window.AudioContext || window.webkitAudioContext)();
let SOURCE = null;        // Float32Array mono
let SOURCE_SR = 44100;
let SOURCE_NAME = '—';

// ---------- unit definitions ----------
const UNITS = [
  {
    id: 'chop', code: 'WT–01', name: 'spectral chop', accent: 'orange',
    desc: 'slices where the timbre shifts, not where the hits land. rebuilds on a probability grid.',
    knobs: [
      { key: 'sens',      label: 'sense',  min: 0,    max: 1,   def: 0.6,  fmt: v => v.toFixed(2) },
      { key: 'slots',     label: 'slots',  min: 4,    max: 32,  def: 16,   step: 1, fmt: v => Math.round(v) },
      { key: 'revProb',   label: 'rev',    min: 0,    max: 1,   def: 0.2,  fmt: v => pct(v) },
      { key: 'stutProb',  label: 'stut',   min: 0,    max: 1,   def: 0.25, fmt: v => pct(v) },
      { key: 'pitchProb', label: 'pitch',  min: 0,    max: 1,   def: 0.15, fmt: v => pct(v) },
      { key: 'seed',      label: 'seed',   min: 1,    max: 999, def: 42,   step: 1, fmt: v => String(Math.round(v)).padStart(3, '0') },
    ],
  },
  {
    id: 'ratchet', code: 'WT–02', name: 'ratchet delay', accent: 'orange',
    desc: 'repeats accelerate into ratchets with cumulative pitch drift. echoes that fall down stairs.',
    knobs: [
      { key: 'time',    label: 'time',   min: 0.05, max: 1.0, def: 0.35, fmt: v => v.toFixed(2) + 's' },
      { key: 'repeats', label: 'rpts',   min: 2,    max: 16,  def: 8,    step: 1, fmt: v => Math.round(v) },
      { key: 'drift',   label: 'drift',  min: -7,   max: 7,   def: 1.5,  fmt: v => v.toFixed(1) + 'st' },
      { key: 'ratchet', label: 'accel',  min: 0,    max: 1,   def: 0.4,  fmt: v => pct(v) },
      { key: 'fb',      label: 'fdbk',   min: 0.3,  max: 0.98,def: 0.75, fmt: v => pct(v) },
      { key: 'mix',     label: 'mix',    min: 0,    max: 1,   def: 0.8,  fmt: v => pct(v) },
    ],
  },
  {
    id: 'freeze', code: 'WT–03', name: 'freeze delay', accent: 'blue',
    desc: 'the feedback path contains an fft freeze. each pass more bins calcify into drones.',
    knobs: [
      { key: 'time',      label: 'time',  min: 0.1, max: 1.2, def: 0.45, fmt: v => v.toFixed(2) + 's' },
      { key: 'repeats',   label: 'rpts',  min: 2,   max: 12,  def: 6,    step: 1, fmt: v => Math.round(v) },
      { key: 'freezeAmt', label: 'frz',   min: 0,   max: 1,   def: 0.5,  fmt: v => pct(v) },
      { key: 'fb',        label: 'fdbk',  min: 0.3, max: 0.98,def: 0.8,  fmt: v => pct(v) },
      { key: 'mix',       label: 'mix',   min: 0,   max: 1,   def: 0.8,  fmt: v => pct(v) },
      { key: 'seed',      label: 'seed',  min: 1,   max: 999, def: 7,    step: 1, fmt: v => String(Math.round(v)).padStart(3, '0') },
    ],
  },
  {
    id: 'corridor', code: 'WT–04', name: 'corridor delay', accent: 'blue',
    desc: 'every repeat squeezes through a narrower resonant band on shrinking tape. echoes collapse to a tone.',
    knobs: [
      { key: 'time',    label: 'time',   min: 0.1,  max: 1.0,  def: 0.4,  fmt: v => v.toFixed(2) + 's' },
      { key: 'repeats', label: 'rpts',   min: 2,    max: 14,   def: 8,    step: 1, fmt: v => Math.round(v) },
      { key: 'center',  label: 'freq',   min: 200,  max: 4000, def: 900,  fmt: v => Math.round(v) + 'hz' },
      { key: 'narrow',  label: 'narrow', min: 0,    max: 1,    def: 0.5,  fmt: v => pct(v) },
      { key: 'shrink',  label: 'shrink', min: 0,    max: 1,    def: 0.4,  fmt: v => pct(v) },
      { key: 'fb',      label: 'fdbk',   min: 0.3,  max: 0.98, def: 0.78, fmt: v => pct(v) },
      { key: 'mix',     label: 'mix',    min: 0,    max: 1,    def: 0.85, fmt: v => pct(v) },
    ],
  },
  {
    id: 'scramble', code: 'WT–05', name: 'feedback chopper', accent: 'gray',
    desc: 'the feedback loop reorders the buffer every repetition. echo three is echo one, backwards, in pieces.',
    knobs: [
      { key: 'time',    label: 'time',  min: 0.1, max: 1.2, def: 0.5,  fmt: v => v.toFixed(2) + 's' },
      { key: 'repeats', label: 'rpts',  min: 2,   max: 12,  def: 6,    step: 1, fmt: v => Math.round(v) },
      { key: 'chunks',  label: 'chop',  min: 2,   max: 32,  def: 8,    step: 1, fmt: v => Math.round(v) },
      { key: 'revProb', label: 'rev',   min: 0,   max: 1,   def: 0.3,  fmt: v => pct(v) },
      { key: 'fb',      label: 'fdbk',  min: 0.3, max: 0.98,def: 0.72, fmt: v => pct(v) },
      { key: 'mix',     label: 'mix',   min: 0,   max: 1,   def: 0.8,  fmt: v => pct(v) },
      { key: 'seed',    label: 'seed',  min: 1,   max: 999, def: 11,   step: 1, fmt: v => String(Math.round(v)).padStart(3, '0') },
    ],
  },
  {
    id: 'confield', code: 'WT–07', name: 'confield system', accent: 'orange', dark: true, wide: true,
    desc: 'a generative system, not an effect. three voices play your slice pool by rules — an evolving euclidean low end, an lfo-gated markov percussion walk, and a chaos-heated glitch voice with ratchets — over an elastic, warping clock. plus frozen-texture drones. every bar it rewrites its own rules. you steer, it plays.',
    knobs: [
      { key: 'sens',    label: 'sense',  min: 0,   max: 1,   def: 0.65, fmt: v => v.toFixed(2) },
      { key: 'bars',    label: 'bars',   min: 2,   max: 16,  def: 4,    step: 1, fmt: v => Math.round(v) + 'x' },
      { key: 'warp',    label: 'warp',   min: 0,   max: 1,   def: 0.4,  fmt: v => pct(v) },
      { key: 'density', label: 'dens',   min: 0,   max: 1,   def: 0.6,  fmt: v => pct(v) },
      { key: 'ratchet', label: 'ratch',  min: 0,   max: 1,   def: 0.5,  fmt: v => pct(v) },
      { key: 'chaos',   label: 'chaos',  min: 0,   max: 1,   def: 0.5,  fmt: v => pct(v) },
      { key: 'seed',    label: 'seed',   min: 1,   max: 999, def: 271,  step: 1, fmt: v => String(Math.round(v)).padStart(3, '0') },
    ],
  },
  {
    id: 'mutate', code: 'WT–06', name: 'markov mutator', accent: 'gray',
    desc: 'learns how your loop moves, then generates non-repeating variations that stay in the family.',
    knobs: [
      { key: 'sens',  label: 'sense', min: 0, max: 1,   def: 0.6, fmt: v => v.toFixed(2) },
      { key: 'bars',  label: 'len',   min: 1, max: 8,   def: 2,   step: 1, fmt: v => Math.round(v) + 'x' },
      { key: 'chaos', label: 'chaos', min: 0, max: 1,   def: 0.5, fmt: v => pct(v) },
      { key: 'seed',  label: 'seed',  min: 1, max: 999, def: 99,  step: 1, fmt: v => String(Math.round(v)).padStart(3, '0') },
    ],
  },
];

function pct(v) { return Math.round(v * 100) + '%'; }

// ---------- playback ----------
let playing = null; // { node, unitId }
function stopAll() {
  if (playing) { try { playing.node.stop(); } catch (e) {} playing = null; }
  document.querySelectorAll('.led').forEach(l => l.classList.remove('on'));
  document.querySelectorAll('[data-play]').forEach(b => b.classList.remove('active'));
}
function playBuffer(data, sr, ledEl, btnEl, loop) {
  stopAll();
  AC.resume();
  const buf = AC.createBuffer(1, data.length, sr);
  buf.copyToChannel(data instanceof Float32Array ? data : new Float32Array(data), 0);
  const node = AC.createBufferSource();
  node.buffer = buf;
  node.loop = !!loop;
  node.connect(AC.destination);
  node.onended = () => { if (playing && playing.node === node) stopAll(); };
  node.start();
  playing = { node };
  if (ledEl) ledEl.classList.add('on');
  if (btnEl) btnEl.classList.add('active');
}

// ---------- waveform drawing ----------
function drawWave(canvas, data, color) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);
  if (!data) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.font = '9px "IBM Plex Mono", monospace';
    ctx.fillText('no signal', 8, h / 2 + 3);
    return;
  }
  const bars = Math.floor(w / 3);
  const step = Math.floor(data.length / bars);
  ctx.fillStyle = color || '#1a1a1a';
  for (let b = 0; b < bars; b++) {
    let peak = 0;
    const off = b * step;
    for (let i = 0; i < step; i += 16) peak = Math.max(peak, Math.abs(data[off + i] || 0));
    const bh = Math.max(1, peak * (h - 4));
    ctx.fillRect(b * 3, (h - bh) / 2, 2, bh);
  }
}

// ---------- knob component ----------
function makeKnob(spec, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'knob-wrap';
  wrap.innerHTML = `
    <div class="knob" tabindex="0"><div class="knob-face"><div class="knob-tick"></div></div></div>
    <div class="knob-val"></div>
    <div class="knob-label">${spec.label}</div>`;
  const knob = wrap.querySelector('.knob');
  const face = wrap.querySelector('.knob-face');
  const val = wrap.querySelector('.knob-val');
  let value = spec.def;

  function render() {
    const t = (value - spec.min) / (spec.max - spec.min);
    face.style.transform = `rotate(${-135 + t * 270}deg)`;
    val.textContent = spec.fmt(value);
  }
  function set(v) {
    v = Math.min(spec.max, Math.max(spec.min, v));
    if (spec.step) v = Math.round(v / spec.step) * spec.step;
    value = v; render(); onChange();
  }
  let dragY = null, dragStart = null;
  knob.addEventListener('pointerdown', e => {
    dragY = e.clientY; dragStart = value;
    knob.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  knob.addEventListener('pointermove', e => {
    if (dragY === null) return;
    const range = spec.max - spec.min;
    set(dragStart + (dragY - e.clientY) * range / 160);
  });
  knob.addEventListener('pointerup', () => { dragY = null; });
  knob.addEventListener('dblclick', () => set(spec.def));
  render();
  return { el: wrap, get: () => spec.step ? Math.round(value) : value };
}

// ---------- unit renderer ----------
const unitState = {}; // id -> { result, knobs }

function buildUnit(u) {
  const el = document.createElement('section');
  el.className = `unit accent-${u.accent}${u.dark ? ' unit-dark' : ''}${u.wide ? ' unit-wide' : ''}`;
  el.innerHTML = `
    <header class="unit-head">
      <div class="unit-id">
        <span class="unit-code">${u.code}</span>
        <span class="led" data-led></span>
      </div>
      <h2 class="unit-name">${u.name}</h2>
      <p class="unit-desc">${u.desc}</p>
    </header>
    <div class="knob-row" data-knobs></div>
    <canvas class="wave" data-wave></canvas>
    <div class="btn-row">
      <button class="btn btn-run" data-run>run</button>
      <button class="btn" data-play disabled>play</button>
      <button class="btn" data-stop>stop</button>
      <button class="btn btn-ghost" data-export disabled>.wav</button>
      <span class="unit-status" data-status>idle</span>
    </div>`;

  const knobRow = el.querySelector('[data-knobs]');
  const wave = el.querySelector('[data-wave]');
  const led = el.querySelector('[data-led]');
  const runBtn = el.querySelector('[data-run]');
  const playBtn = el.querySelector('[data-play]');
  const stopBtn = el.querySelector('[data-stop]');
  const expBtn = el.querySelector('[data-export]');
  const status = el.querySelector('[data-status]');

  const knobs = u.knobs.map(spec => {
    const k = makeKnob(spec, () => { status.textContent = 'edited'; });
    knobRow.appendChild(k.el);
    return { key: spec.key, get: k.get };
  });
  unitState[u.id] = { result: null };

  runBtn.addEventListener('click', () => {
    if (!SOURCE) { status.textContent = 'load source first'; return; }
    status.textContent = 'processing…';
    runBtn.disabled = true;
    setTimeout(() => {
      try {
        const params = {};
        knobs.forEach(k => params[k.key] = k.get());
        const t0 = performance.now();
        const result = TOOL_PROCESSORS[u.id](SOURCE, SOURCE_SR, params);
        unitState[u.id].result = result;
        drawWave(wave, result, getComputedStyle(el).getPropertyValue('--accent').trim());
        playBtn.disabled = false;
        expBtn.disabled = false;
        status.textContent = `${(result.length / SOURCE_SR).toFixed(1)}s · ${Math.round(performance.now() - t0)}ms`;
      } catch (err) {
        status.textContent = 'error: ' + err.message;
        console.error(err);
      }
      runBtn.disabled = false;
    }, 30);
  });
  playBtn.addEventListener('click', () => {
    const r = unitState[u.id].result;
    if (r) playBuffer(r, SOURCE_SR, led, playBtn, false);
  });
  stopBtn.addEventListener('click', stopAll);
  expBtn.addEventListener('click', () => {
    const r = unitState[u.id].result;
    if (!r) return;
    const blob = encodeWav(r, SOURCE_SR);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${u.code.replace('–', '')}-${u.id}.wav`;
    a.click();
  });

  drawWave(wave, null);
  return el;
}

// ---------- source loading ----------
async function loadArrayBuffer(ab, name) {
  const audioBuf = await AC.decodeAudioData(ab);
  // mixdown to mono
  const n = audioBuf.length;
  const mono = new Float32Array(n);
  for (let c = 0; c < audioBuf.numberOfChannels; c++) {
    const ch = audioBuf.getChannelData(c);
    for (let i = 0; i < n; i++) mono[i] += ch[i] / audioBuf.numberOfChannels;
  }
  SOURCE = mono;
  SOURCE_SR = audioBuf.sampleRate;
  SOURCE_NAME = name;
  document.getElementById('src-name').textContent = name;
  document.getElementById('src-meta').textContent =
    `${(n / SOURCE_SR).toFixed(1)}s · ${SOURCE_SR}hz · mono mixdown`;
  document.getElementById('src-play').disabled = false;
  drawWave(document.getElementById('src-wave'), mono, '#f24405');
  document.getElementById('src-led').classList.add('loaded');
}

async function loadDemo() {
  const st = document.getElementById('src-name');
  st.textContent = 'loading demo…';
  try {
    const res = await fetch('demo-loop.mp3');
    if (!res.ok) throw new Error('http ' + res.status);
    await loadArrayBuffer(await res.arrayBuffer(), 'demo-loop.mp3');
  } catch (e) {
    st.textContent = 'demo failed — serve over http (python3 -m http.server)';
  }
}

function initSource() {
  const drop = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');

  drop.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files[0];
    if (f) await loadArrayBuffer(await f.arrayBuffer(), f.name);
  });
  ['dragover', 'dragenter'].forEach(ev =>
    drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev =>
    drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', async e => {
    const f = e.dataTransfer.files[0];
    if (f) await loadArrayBuffer(await f.arrayBuffer(), f.name);
  });

  document.getElementById('demo-btn').addEventListener('click', loadDemo);
  document.getElementById('src-play').addEventListener('click', function () {
    if (SOURCE) playBuffer(SOURCE, SOURCE_SR, document.getElementById('src-led-play'), this, true);
  });
  document.getElementById('src-stop').addEventListener('click', stopAll);
}

// ---------- boot ----------
window.addEventListener('DOMContentLoaded', () => {
  initSource();
  const grid = document.getElementById('units');
  UNITS.forEach(u => grid.appendChild(buildUnit(u)));
  drawWave(document.getElementById('src-wave'), null);
});
