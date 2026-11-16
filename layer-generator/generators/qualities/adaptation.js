// ADAPTATION — metaballs.
// Cells reach toward each other, fuse, split, mutate boundaries.
// Algorithm: sum of inverse-square radial fields, threshold to get metaball shapes.

function drawAdaptation(p, rng, palette, w, h, grid) {
  // Generate balls — varied sizes, varied positions
  const ballCount = rng.int(5, 9);
  const balls = [];
  for (let i = 0; i < ballCount; i++) {
    balls.push({
      x: rng.range(0.15, 0.85) * grid.cols,
      y: rng.range(0.15, 0.85) * grid.rows,
      r: rng.range(0.05, 0.13) * Math.min(grid.cols, grid.rows),
      group: rng.int(0, palette.accents.length - 1),
    });
  }

  // Field: at each pixel, sum strengths from all balls. If > threshold, it's "inside".
  // Color comes from the dominant ball.
  const threshold = 1.0;
  const field = (x, y) => {
    let total = 0;
    let dominant = null;
    let maxContrib = 0;
    for (const b of balls) {
      const dx = x - b.x;
      const dy = y - b.y;
      const d2 = dx * dx + dy * dy + 0.5;
      const contrib = (b.r * b.r) / d2;
      total += contrib;
      if (contrib > maxContrib) { maxContrib = contrib; dominant = b; }
    }
    if (total < threshold) return null;
    return palette.accents[dominant.group];
  };

  renderField(p, grid, field, palette.ink);

  // Sparse debris — adaptation has a quiet hum of mutation
  drawDebris(p, rng, grid, palette, { density: 0.05, pattern: 'outline' });

  // Nuclei on a few of the balls
  for (const b of balls) {
    if (rng() < 0.6) {
      drawHexNucleus(
        p, rng, b.x * grid.cell, b.y * grid.cell,
        b.r * grid.cell * 0.35,
        colorRng.pick(palette.accents),
        palette.ink,
        palette.pop
      );
    }
  }
}
