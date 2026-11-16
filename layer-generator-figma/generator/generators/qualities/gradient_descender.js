// GRADIENT DESCENDER — topographic landscape with a descent path.
// Quantized noise field forms contour-like elevation bands. A trajectory
// follows the gradient downhill, leaving a visible path of pop-color marks.

function drawGradientDescender(p, rng, palette, w, h, grid) {
  const seed = rng.range(0, 1000);
  const scale = rng.range(0.025, 0.045);
  const elev = (x, y) => {
    const n1 = p.noise(x * scale + seed,         y * scale + seed);
    const n2 = p.noise(x * scale * 2.3 + seed,   y * scale * 2.3 + seed);
    return n1 * 0.7 + n2 * 0.3;
  };

  const bandColors = palette.accents;
  const bandCount = bandColors.length;
  const field = (x, y) => {
    let e = elev(x, y);
    e = Math.max(0, Math.min(0.999, (e - 0.25) / 0.5));
    const idx = Math.floor(e * bandCount);
    return bandColors[Math.min(bandCount - 1, idx)];
  };
  renderField(p, grid, field, palette.ink);

  // Descent path
  let px = rng.range(0.15, 0.85) * grid.cols;
  let py = rng.range(0.15, 0.85) * grid.rows;
  const path = [{ x: px, y: py }];
  for (let i = 0; i < 200; i++) {
    const e0 = elev(px, py);
    const eX = elev(px + 1, py);
    const eY = elev(px, py + 1);
    const gx = eX - e0;
    const gy = eY - e0;
    const m = Math.hypot(gx, gy);
    if (m < 0.0005) break;
    px -= (gx / m) * 1.2;
    py -= (gy / m) * 1.2;
    if (px < 0 || px > grid.cols || py < 0 || py > grid.rows) break;
    path.push({ x: px, y: py });
  }

  // Render path as pop-color squares (become circles in dots mode)
  p.noStroke();
  p.fill(palette.pop);
  for (let i = 0; i < path.length; i++) {
    const pt = path[i];
    const t = i / path.length;
    const r = grid.cell * (0.6 + t * 0.8);
    p.rect(pt.x * grid.cell - r, pt.y * grid.cell - r, r * 2, r * 2);
  }
}
