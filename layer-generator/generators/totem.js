// Totem generator family — bold, graphic, lower-frequency forms.
// Styles are intentionally large-stroke and high-contrast vs dots mode.

const TOTEM_META = {
  original:     { label: 'Totem Original', fn: drawTotemOriginal },
  scale:        { label: 'Scale Totem', fn: drawTotemScale },
  adaptation:   { label: 'Adaptation Totem', fn: drawTotemAdaptation },
  flow:         { label: 'Flow Totem', fn: drawTotemFlow },
  convergence:  { label: 'Convergence Totem', fn: drawTotemConvergence },
  emergence:    { label: 'Emergence Totem', fn: drawTotemEmergence },
  retrieval:    { label: 'Retrieval Totem', fn: drawTotemRetrieval },
};

function drawTotem(p, rng, palette, w, h, opts = {}) {
  const key = opts.totemStyle && opts.totemStyle !== 'random' && TOTEM_META[opts.totemStyle]
    ? opts.totemStyle
    : rng.pick(Object.keys(TOTEM_META));
  const meta = TOTEM_META[key];

  if (opts.onMeta) opts.onMeta({ quality: key, label: meta.label });
  meta.fn(p, rng, palette, w, h, opts);

  if (opts.caption) {
    drawCaption(p, w, h, meta.label, 'Bold symbolic system forms', `totem · ${key}`, palette);
  }
}

// -------- Original --------
function drawTotemOriginal(p, rng, palette, w, h) {
  p.background(palette.bg);
  const cx = w / 2;
  const cy = h / 2;

  const plateColor = colorRng.pick(palette.accents);
  const plateRotation = rng.range(-0.25, 0.25);
  const plateRadius = Math.min(w, h) * rng.range(0.32, 0.42);

  p.push();
  p.translate(cx, cy);
  p.rotate(plateRotation);
  p.noStroke();
  p.fill(plateColor);
  drawJaggedShape(p, rng, 0, 0, plateRadius, 18, 0.18);
  p.pop();

  const haloRadius = Math.min(w, h) * rng.range(0.26, 0.33);
  const haloCount = rng.int(36, 56);
  const figSize = haloRadius * 0.18;
  for (let i = 0; i < haloCount; i++) {
    const t = i / haloCount;
    const a = t * Math.PI * 2 + rng.range(-0.02, 0.02);
    const rJit = haloRadius * rng.range(0.9, 1.1);
    const x = cx + Math.cos(a) * rJit;
    const y = cy + Math.sin(a) * rJit;
    drawFigurine(p, x, y, figSize, palette.ink, palette.pop, a + Math.PI / 2);
  }

  drawCheckerRing(
    p, cx, cy,
    Math.min(w, h) * 0.19,
    Math.min(w, h) * 0.1,
    rng.int(28, 42),
    colorRng.pick(palette.accents),
    palette.ink
  );

  drawRadialGradient(p, cx, cy, Math.min(w, h) * 0.09, palette.pop, colorRng.pick(palette.accents));
  p.fill(palette.ink);
  p.noStroke();
  p.circle(cx, cy, Math.min(w, h) * 0.018);
}

// -------- New variants --------

function drawTotemScale(p, rng, palette, w, h) {
  p.background(palette.bg);
  const cx = w / 2, cy = h / 2;
  const bands = rng.int(4, 6);

  // Safe base so rotated outer band stays inside frame.
  const outerHalfW = 1.1;
  const outerHalfH = 0.575;
  const rotationPad = 1.08; // accounts for slight rotation jitter
  const maxExtent = Math.max(outerHalfW, outerHalfH) * rotationPad;
  const base = (Math.min(w, h) * 0.5 * 0.92) / maxExtent;

  p.noStroke();
  for (let i = bands; i >= 1; i--) {
    const r = base * (i / bands);
    p.fill(i % 2 ? colorRng.pick(palette.accents) : palette.ink);
    p.push();
    p.translate(cx, cy);
    p.rotate((i - bands / 2) * 0.04);
    p.rectMode(p.CENTER);
    p.rect(0, 0, r * 2.2, r * 1.15, r * 0.12);
    p.pop();
  }

  p.fill(palette.pop);
  p.circle(cx, cy, base * 0.26);
  p.fill(palette.ink);
  p.circle(cx, cy, base * 0.08);
}

function drawTotemAdaptation(p, rng, palette, w, h) {
  p.background(palette.bg);
  const count = rng.int(12, 18);
  const nodes = [];
  for (let i = 0; i < count; i++) {
    nodes.push({
      x: rng.range(0.08, 0.92) * w,
      y: rng.range(0.08, 0.92) * h,
      r: rng.range(0.05, 0.12) * Math.min(w, h),
      c: colorRng.pick(palette.accents),
    });
  }

  p.noStroke();
  for (const n of nodes) {
    p.fill(n.c);
    p.circle(n.x, n.y, n.r * 2);
  }

  p.stroke(palette.ink);
  p.strokeWeight(Math.min(w, h) * 0.01);
  p.noFill();
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i], b = nodes[i + 1];
    if (rng() < 0.7) p.line(a.x, a.y, b.x, b.y);
  }
  p.noStroke();
}

function drawTotemFlow(p, rng, palette, w, h) {
  p.background(palette.bg);
  p.noStroke();

  const stripeCount = rng.int(5, 8);
  for (let i = 0; i < stripeCount; i++) {
    const y = (i + 0.5) * (h / stripeCount);
    const amp = rng.range(0.06, 0.14) * h;
    const thickness = rng.range(0.09, 0.16) * h;
    p.fill(i % 2 ? palette.ink : colorRng.pick(palette.accents));

    p.beginShape();
    for (let x = -w * 0.1; x <= w * 1.1; x += w / 28) {
      const yy = y + Math.sin((x / w) * Math.PI * 2 + i * 0.9) * amp;
      p.vertex(x, yy - thickness * 0.5);
    }
    for (let x = w * 1.1; x >= -w * 0.1; x -= w / 28) {
      const yy = y + Math.sin((x / w) * Math.PI * 2 + i * 0.9) * amp;
      p.vertex(x, yy + thickness * 0.5);
    }
    p.endShape(p.CLOSE);
  }

  p.fill(palette.pop);
  p.circle(w * 0.5, h * 0.5, Math.min(w, h) * 0.1);
}

function drawTotemConvergence(p, rng, palette, w, h) {
  p.background(palette.bg);
  const cx = w / 2, cy = h / 2;

  const arms = rng.int(6, 10);
  const outer = Math.min(w, h) * 0.46; // keep radial wedges inside frame
  for (let i = 0; i < arms; i++) {
    const a0 = (i / arms) * Math.PI * 2;
    const a1 = ((i + 0.6) / arms) * Math.PI * 2;
    const inner = Math.min(w, h) * rng.range(0.1, 0.2);

    p.fill(i % 2 ? palette.ink : colorRng.pick(palette.accents));
    p.noStroke();
    p.beginShape();
    p.vertex(cx + Math.cos(a0) * outer, cy + Math.sin(a0) * outer);
    p.vertex(cx + Math.cos(a1) * outer, cy + Math.sin(a1) * outer);
    p.vertex(cx + Math.cos(a1) * inner, cy + Math.sin(a1) * inner);
    p.vertex(cx + Math.cos(a0) * inner, cy + Math.sin(a0) * inner);
    p.endShape(p.CLOSE);
  }

  p.fill(palette.pop);
  p.circle(cx, cy, Math.min(w, h) * 0.2);
  p.fill(palette.ink);
  p.circle(cx, cy, Math.min(w, h) * 0.05);
}

function drawTotemEmergence(p, rng, palette, w, h) {
  p.background(palette.bg);
  const cols = rng.int(4, 6);
  const rows = rng.int(3, 5);
  const cw = w / cols;
  const rh = h / rows;

  p.noStroke();
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cx = (x + 0.5) * cw;
      const cy = (y + 0.5) * rh;
      const s = Math.min(cw, rh) * rng.range(0.45, 0.85);
      p.fill(rng() < 0.45 ? palette.ink : colorRng.pick(palette.accents));
      if (rng() < 0.5) {
        p.circle(cx, cy, s);
      } else {
        p.rectMode(p.CENTER);
        p.rect(cx, cy, s * 1.1, s * 0.72, s * 0.2);
      }
    }
  }

  p.stroke(palette.pop);
  p.strokeWeight(Math.min(w, h) * 0.008);
  for (let i = 0; i < 8; i++) {
    p.line(rng.range(0, w), rng.range(0, h), rng.range(0, w), rng.range(0, h));
  }
  p.noStroke();
}

function drawTotemRetrieval(p, rng, palette, w, h) {
  p.background(palette.bg);
  const nodes = [];
  const count = rng.int(8, 12);

  for (let i = 0; i < count; i++) {
    nodes.push({ x: rng.range(0.1, 0.9) * w, y: rng.range(0.1, 0.9) * h, r: rng.range(0.03, 0.08) * Math.min(w, h) });
  }

  p.stroke(palette.ink);
  p.strokeWeight(Math.min(w, h) * 0.02);
  p.noFill();
  p.beginShape();
  for (const n of nodes) p.vertex(n.x, n.y);
  p.endShape();

  p.noStroke();
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    p.fill(i % 2 ? colorRng.pick(palette.accents) : palette.pop);
    p.circle(n.x, n.y, n.r * 2);
    p.fill(palette.ink);
    p.circle(n.x, n.y, n.r * 0.5);
  }
}

// -------- helpers --------
function drawJaggedShape(p, rng, cx, cy, radius, points, jitter) {
  p.beginShape();
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const r = radius * (1 + (rng() * 2 - 1) * jitter);
    p.vertex(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  p.endShape(p.CLOSE);
}

function drawFigurine(p, x, y, size, bodyColor, headColor, angle) {
  p.push();
  p.translate(x, y);
  p.rotate(angle);
  p.noStroke();
  p.fill(bodyColor);
  p.rectMode(p.CENTER);
  p.rect(0, 0, size * 0.35, size * 1.2);
  p.fill(headColor);
  p.ellipse(0, -size * 0.55, size * 0.5, size * 0.5);
  p.pop();
}

function drawCheckerRing(p, cx, cy, innerR, thickness, cells, colorA, colorB) {
  const radialSteps = 3;
  p.noStroke();
  for (let i = 0; i < cells; i++) {
    const a0 = (i / cells) * Math.PI * 2;
    const a1 = ((i + 1) / cells) * Math.PI * 2;
    for (let j = 0; j < radialSteps; j++) {
      const r0 = innerR + (j / radialSteps) * thickness;
      const r1 = innerR + ((j + 1) / radialSteps) * thickness;
      p.fill(((i + j) % 2 === 0) ? colorA : colorB);
      p.beginShape();
      p.vertex(cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0);
      p.vertex(cx + Math.cos(a1) * r0, cy + Math.sin(a1) * r0);
      p.vertex(cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1);
      p.vertex(cx + Math.cos(a0) * r1, cy + Math.sin(a0) * r1);
      p.endShape(p.CLOSE);
    }
  }
}

function drawRadialGradient(p, cx, cy, radius, innerHex, outerHex) {
  const steps = 36;
  const inner = p.color(innerHex);
  const outer = p.color(outerHex);
  p.noStroke();
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    p.fill(p.lerpColor(inner, outer, t));
    p.ellipse(cx, cy, radius * 2 * t + 2, radius * 2 * t + 2);
  }
}
