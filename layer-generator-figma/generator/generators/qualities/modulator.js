// MODULATOR — modular tile assemblies.
// Coarse module grid; adjacent modules grow into shapes via random walk.
// Each shape gets one color. Visible joinery between shapes.

function drawModulator(p, rng, palette, w, h, grid) {
  const modSize = 6;
  const mCols = Math.ceil(grid.cols / modSize);
  const mRows = Math.ceil(grid.rows / modSize);

  const map = new Int32Array(mCols * mRows).fill(-1);
  const shapeColors = [];
  let nextId = 0;

  for (let i = 0; i < mCols * mRows; i++) {
    if (map[i] !== -1) continue;
    const id = nextId++;
    shapeColors[id] = colorRng.pick(palette.accents);

    let target = rng.int(3, 14);
    let painted = 0;
    const queue = [i];
    while (queue.length && painted < target) {
      const j = queue.shift();
      if (j < 0 || j >= map.length || map[j] !== -1) continue;
      map[j] = id;
      painted++;
      const mx = j % mCols, my = Math.floor(j / mCols);
      const neighbors = [];
      if (mx > 0)         neighbors.push(j - 1);
      if (mx < mCols - 1) neighbors.push(j + 1);
      if (my > 0)         neighbors.push(j - mCols);
      if (my < mRows - 1) neighbors.push(j + mCols);
      // shuffle so growth feels organic
      for (let k = neighbors.length - 1; k > 0; k--) {
        const swap = Math.floor(rng() * (k + 1));
        [neighbors[k], neighbors[swap]] = [neighbors[swap], neighbors[k]];
      }
      for (const n of neighbors) queue.push(n);
    }
  }

  const field = (x, y) => {
    const mx = Math.floor(x / modSize);
    const my = Math.floor(y / modSize);
    if (mx < 0 || mx >= mCols || my < 0 || my >= mRows) return null;
    const id = map[my * mCols + mx];
    return id === -1 ? null : shapeColors[id];
  };
  renderField(p, grid, field, palette.ink);
}
