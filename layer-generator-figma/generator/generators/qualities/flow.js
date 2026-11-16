// FLOW — broad ribbons across the field.
// Pick a flow direction. Generate parallel-ish bands with sine-wave modulation
// so they curve. The field reads as currents, not streamlines.

function drawFlow(p, rng, palette, w, h, grid) {
  const dir = rng.range(0, Math.PI * 2);
  const dx = Math.cos(dir), dy = Math.sin(dir);
  const px = -dy, py = dx;
  const totalLen = Math.max(grid.cols, grid.rows);
  const cx = grid.cols / 2, cy = grid.rows / 2;

  const bandCount = rng.int(5, 9);
  const bands = [];
  for (let i = 0; i < bandCount; i++) {
    bands.push({
      offset: (i / (bandCount - 1) - 0.5) * totalLen * 1.4 + rng.range(-12, 12),
      width:  (totalLen / bandCount) * rng.range(0.55, 1.0),
      amp:    rng.range(8, 30),
      freq:   rng.range(0.005, 0.018),
      phase:  rng.range(0, Math.PI * 2),
      color:  colorRng.pick(palette.accents),
    });
  }

  // sort wider first so narrow bands paint on top
  bands.sort((a, b) => b.width - a.width);

  const field = (x, y) => {
    const rx = x - cx, ry = y - cy;
    const along = rx * dx + ry * dy;
    const across = rx * px + ry * py;
    let result = null;
    for (const b of bands) {
      const wave = Math.sin(along * b.freq + b.phase) * b.amp;
      const dist = Math.abs(across - b.offset - wave);
      if (dist < b.width / 2) result = b.color;
    }
    return result;
  };
  renderField(p, grid, field, palette.ink);
}
