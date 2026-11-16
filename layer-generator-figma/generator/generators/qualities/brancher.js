// BRANCHER — recursive tree from a root.
// Each branch spawns 1-3 children with random angle deltas and shrinking length.
// Segments rasterize into the field as paths of color.

function drawBrancher(p, rng, palette, w, h, grid) {
  const segments = [];

  function branch(x, y, angle, length, depth) {
    if (depth >= 7 || length < 2) return;
    const x2 = x + Math.cos(angle) * length;
    const y2 = y + Math.sin(angle) * length;
    segments.push({
      x1: x, y1: y, x2, y2,
      depth,
      color: colorRng.pick(palette.accents),
    });

    const branches = depth < 2 ? rng.int(2, 3) : rng.int(1, 3);
    for (let i = 0; i < branches; i++) {
      const dAngle = rng.range(-Math.PI / 3, Math.PI / 3);
      const dLen = length * rng.range(0.55, 0.85);
      branch(x2, y2, angle + dAngle, dLen, depth + 1);
    }
  }

  // Root direction — could be down, up, side
  const dir = rng.pick([Math.PI / 2, -Math.PI / 2, 0, Math.PI]);
  let startX = grid.cols / 2, startY = grid.rows / 2;
  if (dir === Math.PI / 2)     startY = 4;
  else if (dir === -Math.PI / 2) startY = grid.rows - 4;
  else if (dir === 0)            startX = 4;
  else                            startX = grid.cols - 4;

  branch(startX, startY, dir, Math.min(grid.cols, grid.rows) * 0.28, 0);

  // Rasterize into a trail map
  const trail = new Map();
  for (const s of segments) {
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
    const steps = Math.ceil(Math.hypot(dx, dy));
    const thickness = Math.max(0, 3 - s.depth);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.round(s.x1 + dx * t);
      const y = Math.round(s.y1 + dy * t);
      for (let ty = -thickness; ty <= thickness; ty++) {
        for (let tx = -thickness; tx <= thickness; tx++) {
          trail.set(`${x + tx},${y + ty}`, s.color);
        }
      }
    }
  }

  const field = (x, y) => trail.get(`${x},${y}`) || null;
  renderField(p, grid, field, palette.ink);
}
