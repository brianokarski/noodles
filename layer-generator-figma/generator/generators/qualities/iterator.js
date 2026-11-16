// ITERATOR — repeated motif distributed along a closed curve.
// Same shape over and over, with rhythmic size/color variation.
// Curve options: circle, lemniscate, rose, ellipse.

function drawIterator(p, rng, palette, w, h, grid) {
  const cx = grid.cols / 2, cy = grid.rows / 2;
  const minDim = Math.min(grid.cols, grid.rows);
  const baseR = minDim * 0.35;
  const curveType = rng.pick(['circle', 'lemniscate', 'rose', 'ellipse']);
  const stamps = rng.int(50, 110);

  const path = (t) => {
    const a = t * Math.PI * 2;
    if (curveType === 'circle')      return [Math.cos(a) * baseR, Math.sin(a) * baseR];
    if (curveType === 'ellipse')     return [Math.cos(a) * baseR, Math.sin(a) * baseR * 0.55];
    if (curveType === 'lemniscate') {
      const s = Math.sin(a);
      const c = Math.cos(a);
      const denom = 1 + s * s;
      return [(c / denom) * baseR * 1.4, ((s * c) / denom) * baseR * 1.4];
    }
    if (curveType === 'rose') {
      const k = 3;
      const r = Math.cos(a * k) * baseR * 0.95;
      return [Math.cos(a) * r, Math.sin(a) * r];
    }
  };

  const stampList = [];
  for (let i = 0; i < stamps; i++) {
    const t = i / stamps;
    const [x, y] = path(t);
    const sizePulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * rng.int(1, 4));
    stampList.push({
      cx: cx + x,
      cy: cy + y,
      r: 2 + sizePulse * 5,
      color: colorRng.pick(palette.accents),
    });
  }

  const field = (xx, yy) => {
    let hit = null;
    for (const s of stampList) {
      const dx = xx - s.cx, dy = yy - s.cy;
      if (dx * dx + dy * dy < s.r * s.r) { hit = s.color; break; }
    }
    return hit;
  };
  renderField(p, grid, field, palette.ink);
}
