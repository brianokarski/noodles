// Dots — dispatcher for all quality generators, rendered as ellipses with
// per-position size variance, jitter, density, and silhouette stroke.

const QUALITY_META = {
  scale:        { label: 'Scale',         def: 'Hierarchies of mass. Big systems made of smaller systems.',          fn: 'drawScale' },
  adaptation:   { label: 'Adaptation',    def: 'Cells reach, fuse, and split. Fine-tuning to neighbors.',           fn: 'drawAdaptation' },
  flow:         { label: 'Flow',          def: 'Currents of work moving through. Pipelines, automations.',          fn: 'drawFlow' },
  convergence:  { label: 'Convergence',   def: 'Many paths collapse into one. Gradient descent. Consensus.',        fn: 'drawConvergence' },
  emergence:    { label: 'Emergence',     def: 'Simple rules, complex behavior. Agents, automata.',                 fn: 'drawEmergence' },
  iterator:     { label: 'Iterator',      def: 'Repetition with rhythm. each, map, training loops.',                fn: 'drawIterator' },
  gradient:     { label: 'Gradient Descender', def: 'A descent path through a loss landscape. Optimization made visible.', fn: 'drawGradientDescender' },
  latent:       { label: 'Latent Space',  def: 'The shape of meaning. Clusters of similarity in implied dimensions.', fn: 'drawLatentSpace' },
  modulator:    { label: 'Modulator',     def: 'Modular parts assembling. Mixins, components, protocols.',          fn: 'drawModulator' },
  containerizer:{ label: 'Container-izer',def: 'Encapsulation. Pods, sandboxes, worlds inside worlds.',             fn: 'drawContainerizer' },
  brancher:     { label: 'Brancher',      def: 'Divergence and parallel paths. Trees, forks, version histories.',   fn: 'drawBrancher' },
  retrieval:    { label: 'Retrieval',     def: 'A path traced through the graph. Breadth-first GraphQL.',           fn: 'drawRetrieval' },
};

function drawDots(p, rng, palette, w, h, opts = {}) {
  // Every rect becomes an ellipse. Dials:
  //   variance (0–4) — size spread
  //   cluster  (0–4) — patches of similar sizes
  //   jitter   (0–4) — off-grid wander
  //   density  (0–1) — fraction drawn
  //   stroke   (px)  — silhouette outline around the *union* of all dots
  //                    (rendered as a halo behind a normal-dot pass)
  const variance = window.dotVariance ?? 0;
  const cluster  = window.dotCluster  ?? 0;
  const jitter   = window.dotJitter   ?? 0;
  const density  = window.dotDensity  ?? 1;
  const stroke   = window.dotStroke   ?? 0;
  const strokeColor = window.dotStrokeColor || '#000';

  const chaosSeed = (Math.imul(rng.int(0, 1e9), 16807) ^ 0x9e3779b9) >>> 0;
  const phash = (x, y) => {
    const h = ((Math.round(x) * 73856093) ^ (Math.round(y) * 19349663) ^ chaosSeed) >>> 0;
    return h / 4294967295;
  };
  const noiseAt = (x, y) => {
    const o1 = p.noise(x * 0.04 + chaosSeed * 0.001, y * 0.04 + chaosSeed * 0.0013);
    const o2 = p.noise(x * 0.11 + chaosSeed * 0.002, y * 0.11 + chaosSeed * 0.0027);
    let n = o1 * 0.7 + o2 * 0.3;
    n = (n - 0.3) / 0.4;
    return Math.max(0, Math.min(1, n));
  };
  const sigmoid = (v, k) => 1 / (1 + Math.exp(-k * (v - 0.5)));

  const dotGeom = (cx, cy, rw, rh) => {
    if (density < 1 && phash(cx + 13, cy + 7) > density) return null;
    let s = 1;
    if (variance > 0) {
      const rand = phash(cx, cy);
      const noise = noiseAt(cx, cy);
      const blend = Math.min(1, cluster);
      let mixed = (1 - blend) * rand + blend * noise;
      if (cluster > 1) mixed = sigmoid(mixed, cluster * 3);
      const skew = Math.pow(mixed, 2);
      const baseSize = Math.max(0.05, 1 - variance * 0.3);
      s = baseSize + variance * skew * 12;
    }
    let dx = 0, dy = 0;
    if (jitter > 0) {
      dx = (phash(cx + 1, cy) - 0.5) * jitter * rw * 8;
      dy = (phash(cx, cy + 1) - 0.5) * jitter * rh * 8;
    }
    return { cx: cx + dx, cy: cy + dy, w: rw * s, h: rh * s };
  };

  const origRect = p.rect.bind(p);
  const origBg = p.background.bind(p);
  window.shapeMode = 'dots';

  const rngSnap = rng.snapshot();
  const colorSnap = window.colorRng.snapshot();

  const runPass = (rectFn, blockBg) => {
    p.rect = rectFn;
    if (blockBg) p.background = () => {};
    try {
      runDotsDispatcher(p, rng, palette, w, h, opts);
    } finally {
      if (blockBg) p.background = origBg;
    }
  };

  try {
    if (stroke > 0) {
      // Pass 1: halo
      runPass((x, y, rw, rh) => {
        const g = dotGeom(x + rw / 2, y + rh / 2, rw, rh);
        if (!g) return;
        p.noStroke();
        p.fill(strokeColor);
        p.ellipse(g.cx, g.cy, g.w + stroke * 2, g.h + stroke * 2);
      }, false);

      // Restore RNGs so pass 2 paints the same layout
      rng.restore(rngSnap);
      window.colorRng.restore(colorSnap);

      // Pass 2: normal dots, bg blocked so halo stays visible
      runPass((x, y, rw, rh) => {
        const g = dotGeom(x + rw / 2, y + rh / 2, rw, rh);
        if (!g) return;
        p.noStroke();
        p.ellipse(g.cx, g.cy, g.w, g.h);
      }, true);
    } else {
      runPass((x, y, rw, rh) => {
        const g = dotGeom(x + rw / 2, y + rh / 2, rw, rh);
        if (!g) return;
        p.noStroke();
        p.ellipse(g.cx, g.cy, g.w, g.h);
      }, false);
    }
  } finally {
    p.rect = origRect;
    p.background = origBg;
    window.shapeMode = null;
  }
}

function runDotsDispatcher(p, rng, palette, w, h, opts) {
  const qualityKey = opts.quality && opts.quality !== 'random' && QUALITY_META[opts.quality]
    ? opts.quality
    : rng.pick(Object.keys(QUALITY_META));
  const meta = QUALITY_META[qualityKey];

  // Surface the active quality up front so we can see it even on failure
  if (opts.onMeta) opts.onMeta({ quality: qualityKey, label: meta.label });

  const grid = makeCanvas(p, palette, w, h);

  const fn = window[meta.fn];
  if (typeof fn !== 'function') {
    console.error(`Quality function not found: ${meta.fn}`);
    return;
  }
  try {
    fn(p, rng, palette, w, h, grid);
  } catch (err) {
    console.error(`[${qualityKey}] threw:`, err);
    // Also paint the error onto the canvas so it can't be missed
    p.noStroke();
    p.fill('#ff3366');
    p.rect(0, 0, w, 40);
    p.fill('#fff');
    p.textFont('Helvetica');
    p.textSize(14);
    p.textAlign(p.LEFT, p.CENTER);
    p.text(`${qualityKey} crashed: ${err.message}`, 16, 20);
  }

  if (opts.caption !== false) {
    drawCaption(p, w, h, meta.label, meta.def, `dots · ${qualityKey}`, palette);
  }
}
