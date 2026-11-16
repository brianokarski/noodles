// EMERGENCE — cellular automata growth.
// Algorithm: seed a grid with a few live cells, run a few generations of
// a smoothing/growing CA rule. Result: organic, unpredictable shapes from simple rules.

function drawEmergence(p, rng, palette, w, h, grid) {
  const { cols, rows } = grid;

  // Step 1: random initial seeding (~45% alive)
  let live = new Uint8Array(cols * rows);
  for (let i = 0; i < live.length; i++) live[i] = rng() < 0.45 ? 1 : 0;
  const at = (x, y, arr) => {
    if (x < 0 || x >= cols || y < 0 || y >= rows) return 0;
    return arr[y * cols + x];
  };

  // Step 2: cave-generation CA — cell becomes alive if 5+ neighbors (incl self) are alive
  const generations = 4;
  for (let g = 0; g < generations; g++) {
    const next = new Uint8Array(live.length);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            n += at(x + dx, y + dy, live);
          }
        }
        next[y * cols + x] = n >= 5 ? 1 : 0;
      }
    }
    live = next;
  }

  // Step 3: flood fill regions, color by region
  const region = new Int32Array(cols * rows).fill(-1);
  const regionColor = [];
  let nextId = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (live[y * cols + x] && region[y * cols + x] === -1) {
        const id = nextId++;
        regionColor[id] = colorRng.pick(palette.accents);
        // BFS
        const stack = [[x, y]];
        while (stack.length) {
          const [cx, cy] = stack.pop();
          if (cx < 0 || cx >= cols || cy < 0 || cy >= rows) continue;
          if (region[cy * cols + cx] !== -1) continue;
          if (!live[cy * cols + cx]) continue;
          region[cy * cols + cx] = id;
          stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
        }
      }
    }
  }

  const field = (x, y) => {
    const id = region[y * cols + x];
    return id === -1 ? null : regionColor[id];
  };
  renderField(p, grid, field, palette.ink);

  // Heavy debris — emergence is busy, lots of small structure
  drawDebris(p, rng, grid, palette, { density: 0.1, pattern: 'fill' });

  // Place a few nuclei at large-region centroids
  const centroids = {};
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const id = region[y * cols + x];
      if (id === -1) continue;
      if (!centroids[id]) centroids[id] = { sx: 0, sy: 0, n: 0 };
      centroids[id].sx += x;
      centroids[id].sy += y;
      centroids[id].n++;
    }
  }
  const sorted = Object.entries(centroids).sort((a, b) => b[1].n - a[1].n).slice(0, 4);
  for (const [, c] of sorted) {
    drawHexNucleus(
      p, rng, (c.sx / c.n) * grid.cell, (c.sy / c.n) * grid.cell,
      grid.cell * rng.range(2.5, 4),
      colorRng.pick(palette.accents),
      palette.ink,
      palette.pop
    );
  }
}
