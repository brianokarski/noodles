// ITERATOR — repeated motif distributed along a closed curve.
// Same shape over and over, with rhythmic size/color variation.
// Curve options: circle, lemniscate, rose, ellipse.

function drawIterator(p, rng, palette, w, h, grid) {
  const cx = grid.cols / 2, cy = grid.rows / 2;

  // Account for dots-mode inflation (variance/jitter/stroke) so motifs don't clip.
  const variance = Math.max(0, window.dotVariance ?? 0);
  const jitter = Math.max(0, window.dotJitter ?? 0);
  const strokePx = Math.max(0, window.dotStroke ?? 0);

  const maxS = variance > 0 ? (Math.max(0.05, 1 - variance * 0.3) + variance * 12) : 1;
  const maxDotRadiusCells = (maxS * 0.5) + (jitter * 4) + (strokePx / Math.max(1, grid.cell));

  // Keep motifs inside bounds across all curve types (lemniscate is widest at ~1.4x).
  const maxCurveScale = 1.4;
  const maxStampR = 7; // from r: 2 + sizePulse * 5
  const edgeMargin = maxStampR + maxDotRadiusCells + 2;
  const halfMin = Math.min(grid.cols, grid.rows) * 0.5;
  const baseR = Math.max(3, (halfMin - edgeMargin) / maxCurveScale);
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

  const safeEdge = Math.ceil(edgeMargin);
  const field = (xx, yy) => {
    // Hard edge guard to prevent visible clipping at canvas bounds.
    if (xx < safeEdge || yy < safeEdge || xx > grid.cols - 1 - safeEdge || yy > grid.rows - 1 - safeEdge) {
      return null;
    }
    let hit = null;
    for (const s of stampList) {
      const dx = xx - s.cx, dy = yy - s.cy;
      if (dx * dx + dy * dy < s.r * s.r) { hit = s.color; break; }
    }
    return hit;
  };
  renderField(p, grid, field, palette.ink);
}
