// LATENT SPACE — Gaussian point clusters in implied dimensional space.
// No center, no path, no boundary — just the shape of meaning suggested
// by where the points are dense and where they aren't.

function drawLatentSpace(p, rng, palette, w, h, grid) {
  const clusterCount = rng.int(4, 8);
  const clusters = [];
  for (let i = 0; i < clusterCount; i++) {
    clusters.push({
      cx: rng.range(0.15, 0.85) * grid.cols,
      cy: rng.range(0.15, 0.85) * grid.rows,
      sx: rng.range(8, 22),
      sy: rng.range(8, 22),
      color: colorRng.pick(palette.accents),
    });
  }

  // Generate point cloud per cluster
  const points = [];
  for (const c of clusters) {
    const n = rng.int(80, 140);
    for (let i = 0; i < n; i++) {
      points.push({
        x: c.cx + rng.gauss() * c.sx,
        y: c.cy + rng.gauss() * c.sy,
        color: c.color,
      });
    }
  }

  // Coarse spatial bucketing to keep the per-pixel lookup fast
  const cellSize = 8;
  const gw = Math.ceil(grid.cols / cellSize);
  const gh = Math.ceil(grid.rows / cellSize);
  const buckets = Array.from({ length: gw * gh }, () => []);
  for (const pt of points) {
    const bx = Math.floor(pt.x / cellSize);
    const by = Math.floor(pt.y / cellSize);
    if (bx >= 0 && bx < gw && by >= 0 && by < gh) {
      buckets[by * gw + bx].push(pt);
    }
  }

  const maxR = 4;
  const maxR2 = maxR * maxR;
  const field = (x, y) => {
    const bx = Math.floor(x / cellSize);
    const by = Math.floor(y / cellSize);
    let best = null;
    let bestD = maxR2;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nbx = bx + dx, nby = by + dy;
        if (nbx < 0 || nbx >= gw || nby < 0 || nby >= gh) continue;
        for (const pt of buckets[nby * gw + nbx]) {
          const ex = pt.x - x, ey = pt.y - y;
          const d2 = ex * ex + ey * ey;
          if (d2 < bestD) { bestD = d2; best = pt; }
        }
      }
    }
    return best ? best.color : null;
  };
  renderField(p, grid, field, palette.ink);
}
