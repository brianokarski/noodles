// CONTAINER-IZER — recursive nested rectangular pods.
// Recursively split the canvas into containers, each with its own color.
// Deeper containers paint on top so nested pods are visible.

function drawContainerizer(p, rng, palette, w, h, grid) {
  const boxes = [];
  const minSplit = 18;

  function recurse(x0, y0, x1, y1, depth) {
    boxes.push({ x0, y0, x1, y1, depth, color: colorRng.pick(palette.accents) });
    if (depth >= 3) return;
    if ((x1 - x0) < minSplit && (y1 - y0) < minSplit) return;
    if (depth > 0 && rng() < 0.3) return;

    const splitX = (x1 - x0) > (y1 - y0);
    if (splitX && (x1 - x0) >= minSplit) {
      const m = rng.range(x0 + 8, x1 - 8);
      recurse(x0, y0, m, y1, depth + 1);
      recurse(m, y0, x1, y1, depth + 1);
    } else if ((y1 - y0) >= minSplit) {
      const m = rng.range(y0 + 8, y1 - 8);
      recurse(x0, y0, x1, m, depth + 1);
      recurse(x0, m, x1, y1, depth + 1);
    }
  }

  recurse(0, 0, grid.cols, grid.rows, 0);

  // Each pixel gets the deepest containing box's color
  const field = (x, y) => {
    let result = null;
    let maxDepth = -1;
    for (const b of boxes) {
      if (x >= b.x0 && x < b.x1 && y >= b.y0 && y < b.y1 && b.depth > maxDepth) {
        maxDepth = b.depth;
        result = b.color;
      }
    }
    return result;
  };
  renderField(p, grid, field, palette.ink);
}
