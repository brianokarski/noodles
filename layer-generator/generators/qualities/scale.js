// SCALE — mass hierarchy.
// A few giant blobs, more medium blobs, many small blobs. Power-law spread.
// Smaller blobs paint on top of larger so the hierarchy reads visually.

function drawScale(p, rng, palette, w, h, grid) {
  const minDim = Math.min(grid.cols, grid.rows);
  const tiers = [
    { count: rng.int(2, 4),   r: 0.20 },
    { count: rng.int(6, 10),  r: 0.075 },
    { count: rng.int(20, 35), r: 0.025 },
  ];

  const blobs = [];
  for (const t of tiers) {
    for (let i = 0; i < t.count; i++) {
      const r = t.r * minDim * rng.range(0.7, 1.3);
      // Keep each blob fully inside the canvas so large masses don't clip.
      const cxMin = Math.max(r, 0.5);
      const cxMax = Math.min(grid.cols - r, grid.cols - 0.5);
      const cyMin = Math.max(r, 0.5);
      const cyMax = Math.min(grid.rows - r, grid.rows - 0.5);
      blobs.push({
        cx: cxMin <= cxMax ? rng.range(cxMin, cxMax) : grid.cols * 0.5,
        cy: cyMin <= cyMax ? rng.range(cyMin, cyMax) : grid.rows * 0.5,
        r,
        color: colorRng.pick(palette.accents),
      });
    }
  }

  const field = (x, y) => {
    let result = null;
    let smallest = Infinity;
    for (const b of blobs) {
      const dx = x - b.cx, dy = y - b.cy;
      if (dx * dx + dy * dy < b.r * b.r && b.r < smallest) {
        smallest = b.r;
        result = b.color;
      }
    }
    return result;
  };
  renderField(p, grid, field, palette.ink);
}
