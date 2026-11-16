// Totem generator — radial layered composition.
// Recipe: tilted plate -> jagged halo of motifs -> checker ring -> dot ring -> radial gradient -> pupil.

function drawTotem(p, rng, palette, w, h) {
  p.background(palette.bg);

  const cx = w / 2;
  const cy = h / 2;

  // ---- Plate (tilted background shape) ----
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

  // ---- Halo (ring of repeated little figurines, jaggedly placed) ----
  const haloColor = colorRng.pick(palette.accents.filter(c => c !== plateColor));
  const haloRadius = Math.min(w, h) * rng.range(0.26, 0.33);
  const haloCount = rng.int(48, 72);
  const figSize = haloRadius * 0.18;

  for (let i = 0; i < haloCount; i++) {
    const t = i / haloCount;
    const a = t * Math.PI * 2 + rng.range(-0.02, 0.02);
    const rJit = haloRadius * rng.range(0.9, 1.12);
    const x = cx + Math.cos(a) * rJit;
    const y = cy + Math.sin(a) * rJit;
    drawFigurine(p, x, y, figSize, palette.ink, palette.pop, a + Math.PI / 2);
  }

  // ---- Checker ring ----
  const checkRadius = Math.min(w, h) * rng.range(0.18, 0.24);
  const checkThickness = checkRadius * rng.range(0.35, 0.55);
  const checkCells = rng.int(36, 56);
  const checkA = colorRng.pick(palette.accents);
  const checkB = palette.ink;
  drawCheckerRing(p, cx, cy, checkRadius, checkThickness, checkCells, checkA, checkB);

  // ---- Dot ring ----
  const dotRadius = Math.min(w, h) * rng.range(0.11, 0.15);
  const dotCount = rng.int(16, 26);
  const dotSize = dotRadius * rng.range(0.2, 0.28);
  p.fill(palette.ink);
  p.noStroke();
  for (let i = 0; i < dotCount; i++) {
    const a = (i / dotCount) * Math.PI * 2;
    const x = cx + Math.cos(a) * dotRadius;
    const y = cy + Math.sin(a) * dotRadius;
    p.ellipse(x, y, dotSize, dotSize);
  }

  // ---- Radial gradient core ----
  const coreRadius = Math.min(w, h) * rng.range(0.06, 0.09);
  const innerColor = palette.pop;
  const outerColor = colorRng.pick(palette.accents);
  drawRadialGradient(p, cx, cy, coreRadius, innerColor, outerColor);

  // ---- Pupil ----
  p.fill(palette.ink);
  p.noStroke();
  p.ellipse(cx, cy, coreRadius * 0.18, coreRadius * 0.18);
}

// A jaggedly-perturbed n-gon, returns nothing (draws directly)
function drawJaggedShape(p, rng, cx, cy, radius, points, jitter) {
  p.beginShape();
  for (let i = 0; i < points; i++) {
    const t = i / points;
    const a = t * Math.PI * 2;
    const r = radius * (1 + (rng() * 2 - 1) * jitter);
    p.vertex(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  p.endShape(p.CLOSE);
}

// A tiny "figurine": skinny rect body + circle head, oriented along angle
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

// Checker pattern inside a ring (between innerR and innerR+thickness)
function drawCheckerRing(p, cx, cy, innerR, thickness, cells, colorA, colorB) {
  const outerR = innerR + thickness;
  const radialSteps = 3;
  p.noStroke();
  for (let i = 0; i < cells; i++) {
    const a0 = (i / cells) * Math.PI * 2;
    const a1 = ((i + 1) / cells) * Math.PI * 2;
    for (let j = 0; j < radialSteps; j++) {
      const r0 = innerR + (j / radialSteps) * thickness;
      const r1 = innerR + ((j + 1) / radialSteps) * thickness;
      const c = ((i + j) % 2 === 0) ? colorA : colorB;
      p.fill(c);
      p.beginShape();
      p.vertex(cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0);
      p.vertex(cx + Math.cos(a1) * r0, cy + Math.sin(a1) * r0);
      p.vertex(cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1);
      p.vertex(cx + Math.cos(a0) * r1, cy + Math.sin(a0) * r1);
      p.endShape(p.CLOSE);
    }
  }
}

// Concentric-ring radial gradient (works in SVG mode too, unlike drawingContext.gradient)
function drawRadialGradient(p, cx, cy, radius, innerHex, outerHex) {
  const steps = 40;
  const inner = p.color(innerHex);
  const outer = p.color(outerHex);
  p.noStroke();
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const c = p.lerpColor(inner, outer, t);
    p.fill(c);
    p.ellipse(cx, cy, radius * 2 * t + 2, radius * 2 * t + 2);
  }
}
