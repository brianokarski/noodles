// Shared utilities for all quality generators.
// Every quality renders through a pixel grid: a function field(x,y) -> { color, value }
// is sampled at each cell, then debris/nuclei/captions are layered on top.

function makeCanvas(p, palette, w, h) {
  p.background(palette.bg);
  const cell = Math.max(8, Math.floor(Math.min(w, h) / 120));
  return {
    cell,
    cols: Math.floor(w / cell),
    rows: Math.floor(h / cell),
  };
}

// Render the pixel grid using a field function: (x,y) -> color string or null
// If field returns null, the cell uses bgFill (defaults to ink for high-contrast composition,
// or palette.bg for clean backgrounds — passed by caller).
function renderField(p, grid, field, bgFill) {
  const { cell, cols, rows } = grid;
  const isolated = window.fillStyle === 'isolated';
  p.noStroke();
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const c = field(x, y);
      if (c == null && isolated) continue;
      p.fill(c == null ? bgFill : c);
      p.rect(x * cell, y * cell, cell, cell);
    }
  }
}

// Debris overlay — small accent rectangles scattered everywhere.
// pattern: 'outline' | 'fill' | 'tile' | 'directional' | 'sparse' | 'none'
function drawDebris(p, rng, grid, palette, opts = {}) {
  const density = opts.density ?? 0.06;
  const color = opts.color ?? palette.pop;
  const pattern = opts.pattern ?? 'outline';
  if (pattern === 'none' || density <= 0) return;

  const { cell, cols, rows } = grid;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (rng() < density) {
        const px = x * cell;
        const py = y * cell;
        if (pattern === 'fill') {
          p.noStroke();
          p.fill(color);
          const s = cell * rng.range(0.4, 0.8);
          p.rect(px + (cell - s) / 2, py + (cell - s) / 2, s, s);
        } else if (pattern === 'tile') {
          p.noFill();
          p.stroke(color);
          p.strokeWeight(Math.max(1, cell * 0.1));
          p.rect(px + 1, py + 1, cell - 2, cell - 2);
        } else if (pattern === 'directional') {
          p.noStroke();
          p.fill(color);
          const sw = cell * rng.range(0.6, 1.0);
          const sh = cell * rng.range(0.18, 0.3);
          p.rect(px, py + (cell - sh) / 2, sw, sh);
        } else if (pattern === 'sparse') {
          p.noFill();
          p.stroke(color);
          p.strokeWeight(Math.max(1, cell * 0.1));
          const s = cell * 0.45;
          p.rect(px + (cell - s) / 2, py + (cell - s) / 2, s, s);
        } else {
          // outline (default)
          p.noFill();
          p.stroke(color);
          p.strokeWeight(Math.max(1, cell * 0.12));
          const s = cell * rng.range(0.3, 0.7);
          p.rect(px + (cell - s) / 2, py + (cell - s) / 2, s, s);
        }
      }
    }
  }
  p.noStroke();
}

// Hexagonal nucleus — small textured pattern centered at (x,y) in pixels.
// In dots mode, renders as a single solid circle with a pop-color center dot.
function drawHexNucleus(p, rng, cx, cy, size, fillColor, lineColor, dotColor) {
  const r = size;
  p.noStroke();

  if (window.shapeMode === 'dots') {
    p.fill(fillColor);
    p.ellipse(cx, cy, r * 2, r * 2);
    p.fill(dotColor);
    p.ellipse(cx, cy, r * 0.4, r * 0.4);
    return;
  }

  const step = Math.max(3, size / 7);
  p.fill(fillColor);
  p.beginShape();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    p.vertex(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  p.endShape(p.CLOSE);

  p.fill(lineColor);
  for (let yy = -r; yy <= r; yy += step) {
    for (let xx = -r; xx <= r; xx += step) {
      if (Math.abs(xx) + Math.abs(yy) * 0.6 < r * 0.95 && Math.hypot(xx, yy) < r) {
        if (rng() < 0.85) p.rect(cx + xx - step * 0.25, cy + yy - step * 0.4, step * 0.5, step * 0.8);
      }
    }
  }
  p.fill(dotColor);
  p.rect(cx - step * 0.3, cy - step * 0.3, step * 0.6, step * 0.6);
}

function drawEdgeChips(p, rng, w, h, cell, palette) {
  if (window.fillStyle === 'isolated') return;
  const chipW = cell * 4;
  const chipH = cell * 2;
  p.noStroke();
  for (let x = 0; x < w; x += chipW) {
    p.fill(colorRng.pick(palette.accents));
    p.rect(x, 0, chipW, chipH);
    p.fill(colorRng.pick(palette.accents));
    p.rect(x, h - chipH, chipW, chipH);
  }
  for (let y = 0; y < w; y += chipW) {
    p.fill(colorRng.pick(palette.accents));
    p.rect(0, y, chipH, chipW);
    p.fill(colorRng.pick(palette.accents));
    p.rect(w - chipH, y, chipH, chipW);
  }
}

function drawCaption(p, w, h, label, def, key, palette) {
  const padX = w * 0.04;
  const padY = h * 0.035;
  const labelSize = Math.max(18, w * 0.022);
  const defSize = Math.max(11, w * 0.011);

  p.noStroke();
  p.fill(palette.ink);
  p.textFont('Helvetica');
  p.textStyle(p.BOLD);
  p.textSize(labelSize);
  p.textAlign(p.LEFT, p.TOP);
  p.text(label.toUpperCase(), padX, padY);

  p.textStyle(p.NORMAL);
  p.textSize(defSize);
  p.textAlign(p.LEFT, p.BOTTOM);
  p.text(def, padX, h - padY, w - padX * 2);

  p.textAlign(p.RIGHT, p.TOP);
  p.textSize(defSize);
  p.fill(palette.ink);
  p.text(key, w - padX, padY + 4);
}
