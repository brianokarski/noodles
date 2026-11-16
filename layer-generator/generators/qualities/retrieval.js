// RETRIEVAL — graph traversal.
// Algorithm: scatter nodes; build edges to k nearest neighbors; pick a start + end;
// BFS shortest path; render path nodes/edges in pop color, others muted.

function drawRetrieval(p, rng, palette, w, h, grid) {
  const { cols, rows, cell } = grid;
  const nodeCount = rng.int(28, 48);
  const nodes = [];
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      x: rng.range(0.08, 0.92) * cols,
      y: rng.range(0.08, 0.92) * rows,
    });
  }

  // Edges to k=3 nearest
  const edges = [];
  const adj = Array.from({ length: nodeCount }, () => []);
  for (let i = 0; i < nodeCount; i++) {
    const dists = nodes.map((n, j) => ({
      j, d: (n.x - nodes[i].x) ** 2 + (n.y - nodes[i].y) ** 2,
    })).filter(e => e.j !== i).sort((a, b) => a.d - b.d).slice(0, 3);
    for (const e of dists) {
      if (!adj[i].includes(e.j)) {
        adj[i].push(e.j);
        adj[e.j].push(i);
        edges.push([i, e.j]);
      }
    }
  }

  // BFS from leftmost to rightmost
  const start = nodes.reduce((a, b, j) => nodes[a].x < b.x ? a : j, 0);
  const end = nodes.reduce((a, b, j) => nodes[a].x > b.x ? a : j, 0);
  const prev = new Array(nodeCount).fill(-1);
  const visited = new Array(nodeCount).fill(false);
  const queue = [start];
  visited[start] = true;
  while (queue.length) {
    const u = queue.shift();
    if (u === end) break;
    for (const v of adj[u]) {
      if (!visited[v]) {
        visited[v] = true;
        prev[v] = u;
        queue.push(v);
      }
    }
  }
  const pathSet = new Set();
  let cur = end;
  while (cur !== -1) {
    pathSet.add(cur);
    cur = prev[cur];
  }

  // Render: rasterize edges into the pixel grid
  const trail = new Map(); // "x,y" -> color
  for (const [a, b] of edges) {
    const onPath = pathSet.has(a) && pathSet.has(b) && (prev[a] === b || prev[b] === a);
    const color = onPath ? palette.pop : colorRng.pick(palette.accents);
    rasterizeLine(trail, nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y, color, onPath ? 2 : 1);
  }

  const field = (x, y) => trail.get(`${x},${y}`) || null;
  renderField(p, grid, field, palette.ink);

  // Sparse outline debris
  drawDebris(p, rng, grid, palette, { density: 0.04, pattern: 'sparse' });

  // Hex nuclei on each node, brighter for path nodes
  for (let i = 0; i < nodes.length; i++) {
    const onPath = pathSet.has(i);
    drawHexNucleus(
      p, rng, nodes[i].x * cell, nodes[i].y * cell,
      cell * (onPath ? 2.6 : 1.6),
      onPath ? palette.pop : colorRng.pick(palette.accents),
      palette.ink,
      palette.pop
    );
  }
}

function rasterizeLine(map, x0, y0, x1, y1, color, thickness) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.ceil(Math.hypot(dx, dy));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(x0 + dx * t);
    const y = Math.round(y0 + dy * t);
    for (let ty = -thickness; ty <= thickness; ty++) {
      for (let tx = -thickness; tx <= thickness; tx++) {
        map.set(`${x + tx},${y + ty}`, color);
      }
    }
  }
}
