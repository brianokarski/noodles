// CONVERGENCE — many trails collapsing toward one point.
// Algorithm: starting positions distributed around the canvas, each traces a path
// pulled toward a shared centroid. Pixels along paths are filled.

function drawConvergence(p, rng, palette, w, h, grid) {
  const safeMargin = 3; // cells
  const target = {
    x: rng.range(0.42, 0.58) * grid.cols,
    y: rng.range(0.42, 0.58) * grid.rows,
  };

  // Mark which cells are "on a trail"
  const trail = new Map(); // "x,y" -> color
  const trailCount = rng.int(60, 110);

  // Keep origin ring inside bounds so the pattern doesn't clip harshly at edges.
  const edgeLimit = Math.max(2, Math.min(
    target.x - safeMargin,
    target.y - safeMargin,
    (grid.cols - 1 - safeMargin) - target.x,
    (grid.rows - 1 - safeMargin) - target.y
  ));
  const rMin = Math.min(edgeLimit * 0.55, 0.30 * Math.min(grid.cols, grid.rows));
  const rMax = Math.min(edgeLimit * 0.82, 0.42 * Math.min(grid.cols, grid.rows));

  for (let i = 0; i < trailCount; i++) {
    // Start far from target, on a perimeter ring
    const a = rng.range(0, Math.PI * 2);
    const r = rng.range(Math.max(1, rMin), Math.max(2, rMax));
    let x = target.x + Math.cos(a) * r;
    let y = target.y + Math.sin(a) * r;
    const color = colorRng.pick(palette.accents);
    const stepCount = rng.int(40, 90);

    for (let s = 0; s < stepCount; s++) {
      // step toward target with some wobble
      const dx = target.x - x;
      const dy = target.y - y;
      const d = Math.hypot(dx, dy) + 0.001;
      const speed = 0.5 + (s / stepCount) * 1.5; // accelerate as it converges
      x += (dx / d) * speed + rng.gauss() * 0.4;
      y += (dy / d) * speed + rng.gauss() * 0.4;

      // thicken trail near target
      const thickness = 1 + Math.floor((1 - d / r) * 2);
      for (let ty = -thickness; ty <= thickness; ty++) {
        for (let tx = -thickness; tx <= thickness; tx++) {
          const cx = Math.round(x + tx);
          const cy = Math.round(y + ty);
          if (
            cx >= safeMargin && cx < grid.cols - safeMargin &&
            cy >= safeMargin && cy < grid.rows - safeMargin
          ) {
            trail.set(`${cx},${cy}`, color);
          }
        }
      }
      if (d < 1.5) break;
    }
  }

  // Render
  const field = (x, y) => trail.get(`${x},${y}`) || null;
  renderField(p, grid, field, palette.ink);

  // Bright core at the target
  const tx = target.x * grid.cell;
  const ty = target.y * grid.cell;
  const coreSize = grid.cell * 6;
  p.noStroke();
  p.fill(palette.pop);
  p.rect(tx - coreSize / 2, ty - coreSize / 2, coreSize, coreSize);
  p.fill(palette.ink);
  p.rect(tx - coreSize * 0.2, ty - coreSize * 0.2, coreSize * 0.4, coreSize * 0.4);

  // Sparse debris far from center
  drawDebris(p, rng, grid, palette, { density: 0.03, pattern: 'sparse' });
}
