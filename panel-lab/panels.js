// panel lab Panel System — Core Library
// Column-based grid layout

const PANELS = (() => {

  const DEFAULT_PALETTE = {
    background: '#0a0a0a',
    panels: ['#888888', '#6e6e6e', '#a0a0a0', '#555555'],
    holes: '#1a1a1a',
    connections: ['#00ff41', '#ffffff', '#ff6b00'],
  };

  // ─── Shape Types ──────────────────────────────────────────────────
  // Each draws into a bounding box of (w, h) pixels.

  const SHAPE_TYPES = {
    rect:     { label: 'Rectangle',     draw: drawRect },
    triangle: { label: 'Triangle',      draw: drawTriangle },
    circle:   { label: 'Circle',        draw: drawCircle },
    pill:     { label: 'Pill',          draw: drawPill },
    trapezoid:{ label: 'Trapezoid',     draw: drawTrapezoid },
    para:     { label: 'Parallelogram', draw: drawParallelogram },
    hexagon:  { label: 'Hexagon',       draw: drawHexagon },
  };

  const SHAPE_TYPE_KEYS = Object.keys(SHAPE_TYPES);

  function drawRect(w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    if (r === 0) return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
    // Squircle-style smooth corners: tangent points extend past r, cubic bezier handles
    const p = Math.min(r * 1.35, Math.min(w, h) / 2); // tangent start, extends into edge
    const c = p * 0.42; // cubic handle offset from tangent point
    return [
      `M ${p} 0 L ${w-p} 0`,
      `C ${w-c} 0 ${w} ${c} ${w} ${p}`,
      `L ${w} ${h-p}`,
      `C ${w} ${h-c} ${w-c} ${h} ${w-p} ${h}`,
      `L ${p} ${h}`,
      `C ${c} ${h} 0 ${h-c} 0 ${h-p}`,
      `L 0 ${p}`,
      `C 0 ${c} ${c} 0 ${p} 0 Z`,
    ].join(' ');
  }

  // Triangle reference SVGs per aspect ratio (from Figma exports)
  // Each includes path coords + Figma-placed hole positions
  const TRI_REFS = [
    { // 4x1 — very wide (aspect > 2.5)
      minAspect: 2.5, vw: 1667, vh: 452,
      ax: 817.603, ay: 3.49072, ac1x: 827.387, ac1y: -1.16356, ac2x: 838.747, ac2y: -1.16348, arx: 848.531, ary: 3.49072,
      rx: 1645.55, ry: 382.625, rc1x: 1680.2, rc1y: 399.109, rc2x: 1668.46, rc2y: 451.134, brx: 1630.08, bry: 451.134,
      bx: 36.0518, lc1x: -2.32096, lc1y: 451.134, lc2x: -14.0649, lc2y: 399.109, lx: 20.5869, ly: 382.625,
      holes: [{ hx: 832.6, hy: 67.8 }, { hx: 109.6, hy: 400.9 }, { hx: 1556.6, hy: 400.9 }],
    },
    { // 1x2 — wide (aspect > 1.3)
      minAspect: 1.3, vw: 836, vh: 441,
      ax: 392.534, ay: 10.1211, ac1x: 406.489, ac1y: -3.37381, ac2x: 428.631, ac2y: -3.37393, arx: 442.586, ary: 10.1211,
      rx: 824.073, ry: 379.041, rc1x: 847.338, rc1y: 401.539, rc2x: 831.412, rc2y: 440.92, brx: 799.048, bry: 440.92,
      bx: 36.0723, lc1x: 3.70833, lc1y: 440.92, lc2x: -12.2188, lc2y: 401.539, lx: 11.0459, ly: 379.041,
      holes: [{ hx: 417.6, hy: 79.6 }, { hx: 89.6, hy: 387.0 }, { hx: 745.6, hy: 387.0 }],
    },
    { // 2x2 — square (aspect > 0.95)
      minAspect: 0.95, vw: 897, vh: 894,
      ax: 416.035, ay: 19.8591, ac1x: 429.317, ac1y: -6.61975, ac2x: 467.111, ac2y: -6.61974, arx: 480.393, ary: 19.8591,
      rx: 892.561, ry: 841.566, rc1x: 904.568, rc1y: 865.505, rc2x: 887.163, rc2y: 893.707, brx: 860.382, bry: 893.707,
      bx: 36.0469, lc1x: 9.26511, lc1y: 893.707, lc2x: -8.13941, lc2y: 865.505, lx: 3.86816, ly: 841.566,
      holes: [{ hx: 448.3, hy: 102.3 }, { hx: 80.3, hy: 833.3 }, { hx: 816.3, hy: 833.3 }],
    },
    { // 1x1 — nearly square (aspect > 0.6)
      minAspect: 0.6, vw: 411, vh: 441,
      ax: 173.269, ay: 19.9243, ac1x: 186.549, ac1y: -6.64165, ac2x: 224.451, ac2y: -6.64165, arx: 237.731, ary: 19.9243,
      rx: 407.149, ry: 388.264, rc1x: 419.129, rc1y: 412.23, rc2x: 401.706, rc2y: 440.426, brx: 374.918, bry: 440.426,
      bx: 36.082, lc1x: 9.29402, lc1y: 440.426, lc2x: -8.12903, lc2y: 412.23, lx: 3.85059, ly: 388.264,
      holes: [{ hx: 204.6, hy: 79.1 }, { hx: 69.6, hy: 386.5 }, { hx: 341.6, hy: 386.1 }],
    },
    { // 2x1 — tall (aspect <= 0.6)
      minAspect: 0, vw: 436, vh: 895,
      ax: 182.756, ay: 27.5146, ac1x: 191.654, ac1y: -9.17157, ac2x: 243.83, ac2y: -9.17157, arx: 252.728, ary: 27.5146,
      rx: 434.452, ry: 849.78, rc1x: 439.948, rc1y: 872.439, rc2x: 422.783, rc2y: 894.266, brx: 399.467, bry: 894.266,
      bx: 36.0166, lc1x: 12.7006, lc1y: 894.265, lc2x: -4.46442, lc2y: 872.439, lx: 1.03125, ly: 849.78,
      holes: [{ hx: 217.9, hy: 102.9 }, { hx: 81.9, hy: 833.9 }, { hx: 353.9, hy: 833.9 }],
    },
  ];

  function getTriRef(w, h) {
    const aspect = w / h;
    for (const ref of TRI_REFS) {
      if (aspect >= ref.minAspect) return ref;
    }
    return TRI_REFS[TRI_REFS.length - 1];
  }

  function drawTriangle(w, h, _r) {
    const ref = getTriRef(w, h);
    const sx = w / ref.vw, sy = h / ref.vh;
    const p = (x, y) => `${x * sx} ${y * sy}`;
    return [
      `M ${p(ref.ax, ref.ay)}`,
      `C ${p(ref.ac1x, ref.ac1y)} ${p(ref.ac2x, ref.ac2y)} ${p(ref.arx, ref.ary)}`,
      `L ${p(ref.rx, ref.ry)}`,
      `C ${p(ref.rc1x, ref.rc1y)} ${p(ref.rc2x, ref.rc2y)} ${p(ref.brx, ref.bry)}`,
      `H ${ref.bx * sx}`,
      `C ${p(ref.lc1x, ref.lc1y)} ${p(ref.lc2x, ref.lc2y)} ${p(ref.lx, ref.ly)}`,
      `L ${p(ref.ax, ref.ay)} Z`,
    ].join(' ');
  }

  function drawRightTri(w, h, r) {
    return roundedPolygon([{ x: 0, y: 0 }, { x: w, y: h }, { x: 0, y: h }], r);
  }

  function drawCircle(w, h) {
    const rx = w / 2, ry = h / 2;
    return `M ${rx} 0 A ${rx} ${ry} 0 1 1 ${rx - 0.001} 0 Z`;
  }

  function drawPill(w, h) {
    const r = Math.min(w, h) / 2;
    return drawRect(w, h, r);
  }

  function drawTrapezoid(w, h, r) {
    const i = w * 0.12;
    return roundedPolygon([{ x: i, y: 0 }, { x: w - i, y: 0 }, { x: w, y: h }, { x: 0, y: h }], r);
  }

  function drawParallelogram(w, h, r) {
    const s = w * 0.15;
    return roundedPolygon([{ x: s, y: 0 }, { x: w, y: 0 }, { x: w - s, y: h }, { x: 0, y: h }], r);
  }

  function drawHexagon(w, h, r) {
    const cx = w / 2, cy = h / 2, rx = w / 2, ry = h / 2;
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (60 * i - 30);
      pts.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
    }
    return roundedPolygon(pts, r);
  }

  function roundedPolygon(pts, r) {
    const n = pts.length;
    let d = '';
    for (let i = 0; i < n; i++) {
      const prev = pts[(i - 1 + n) % n], curr = pts[i], next = pts[(i + 1) % n];
      const d1 = dist(curr, prev), d2 = dist(curr, next);
      const rr = Math.min(r, d1 / 2, d2 / 2);
      const t1x = curr.x + (prev.x - curr.x) / d1 * rr;
      const t1y = curr.y + (prev.y - curr.y) / d1 * rr;
      const t2x = curr.x + (next.x - curr.x) / d2 * rr;
      const t2y = curr.y + (next.y - curr.y) / d2 * rr;
      // Cubic bezier: control points blend toward vertex for squircle-style fullness
      const blend = 0.72;
      const c1x = t1x * (1 - blend) + curr.x * blend;
      const c1y = t1y * (1 - blend) + curr.y * blend;
      const c2x = t2x * (1 - blend) + curr.x * blend;
      const c2y = t2y * (1 - blend) + curr.y * blend;
      d += i === 0 ? `M ${t1x} ${t1y}` : ` L ${t1x} ${t1y}`;
      d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${t2x} ${t2y}`;
    }
    return d + ' Z';
  }

  function dist(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }

  // ─── Grid Math ────────────────────────────────────────────────────

  function colWidth(canvasW, cols, gap, margin) {
    return (canvasW - margin * 2 - (cols - 1) * gap) / cols;
  }

  function rowHeight(canvasH, rows, gap, margin) {
    return (canvasH - margin * 2 - (rows - 1) * gap) / rows;
  }

  function cellToPixel(gc, gr, cw, rh, gap, margin) {
    return {
      x: margin + gc * (cw + gap),
      y: margin + gr * (rh + gap),
    };
  }

  function spanToPixel(colSpan, rowSpan, cw, rh, gap) {
    return {
      w: colSpan * cw + (colSpan - 1) * gap,
      h: rowSpan * rh + (rowSpan - 1) * gap,
    };
  }

  function pixelToCell(px, py, cw, rh, gap, margin) {
    return {
      c: Math.max(0, Math.floor((px - margin + gap / 2) / (cw + gap))),
      r: Math.max(0, Math.floor((py - margin + gap / 2) / (rh + gap))),
    };
  }

  // ─── Holes ────────────────────────────────────────────────────────

  function computeHoles(w, h, inset) {
    return computeShapeHoles('rect', w, h, inset);
  }

  function computeShapeHoles(shapeType, w, h, inset) {
    const i = inset;
    let holes;

    switch (shapeType) {
      case 'triangle': {
        // Figma hole positions as baseline, adjusted by inset i
        const ref = getTriRef(w, h);
        const sx = w / ref.vw, sy = h / ref.vh;
        const th = ref.holes; // [top, bottom-left, bottom-right]
        // Default inset the Figma holes were designed for (~17px at reference scale)
        const baseInset = 17;
        const delta = i - baseInset;
        // Top hole: push down by delta
        // Bottom holes: push up and inward by delta
        const cx = w / 2;
        const tmX = th[0].hx * sx, tmY = th[0].hy * sy + delta;
        const blX = th[1].hx * sx, blY = th[1].hy * sy - delta;
        const brX = th[2].hx * sx, brY = th[2].hy * sy - delta;
        // Push bottom holes toward center by delta
        const blAdj = blX < cx ? blX + delta : blX - delta;
        const brAdj = brX > cx ? brX - delta : brX + delta;
        holes = [
          { x: tmX, y: tmY, id: 'tm' },
          { x: blAdj, y: blY, id: 'bl' },
          { x: brAdj, y: brY, id: 'br' },
        ];
        break;
      }

      case 'trapezoid': {
        // Vertices: (it, 0), (w-it, 0), (w, h), (0, h) — top is narrow, bottom is wide
        // The diagonal edge slopes inward, so at y=i the edge is at x≈it
        // At y=h-i the diagonal is at x = it*(i/h) from the corner
        const it = w * 0.12;
        const Lt = Math.sqrt(h * h + it * it); // diagonal edge length
        const bOff = i * Lt / h; // inset along bottom from diagonal edge
        holes = [
          { x: it + i,      y: i,     id: 'tl' },
          { x: w - it - i,  y: i,     id: 'tr' },
          { x: bOff,        y: h - i, id: 'bl' },
          { x: w - bOff,    y: h - i, id: 'br' },
        ];
        break;
      }

      case 'para': {
        // 4 holes: inset from edges, accounting for 15% skew on diagonal sides
        const s = w * 0.15;
        const Lp = Math.sqrt(h * h + s * s);
        const nearOff = i * Lp / h;  // inset along top/bottom from the sloped edge
        holes = [
          { x: s + nearOff,     y: i,     id: 'tl' },
          { x: w - nearOff,     y: i,     id: 'tr' },
          { x: nearOff,         y: h - i, id: 'bl' },
          { x: w - s - nearOff, y: h - i, id: 'br' },
        ];
        break;
      }

      case 'hexagon': {
        // Hex vertices scaled to (w, h): tips at left/right, flat edges top/bottom
        // Top-right vertex at (cx + rx*0.866, cy - ry*0.5)
        // Midpoint of top-right diagonal = between tip and top-right vertex
        const hcx = w / 2, hcy = h / 2, hrx = w / 2, hry = h / 2;
        const vtx = hrx * 0.866; // x from center to flat edge end
        const vty = hry * 0.5;   // y from center to flat edge
        // Diagonal midpoints: halfway between tip and flat edge vertex
        const dtlx = (hcx - hrx + hcx - vtx) / 2; // midpoint of top-left diagonal
        const dtly = (hcy + hcy - vty) / 2;
        const dtrx = (hcx + hrx + hcx + vtx) / 2;
        const dtry = dtly;
        const dblx = dtlx;
        const dbly = (hcy + hcy + vty) / 2;
        const dbrx = dtrx;
        const dbry = dbly;
        // Always 4 holes on diagonals, + tips on large
        holes = [
          { x: dtlx + i, y: dtly + i, id: 'tl' },
          { x: dtrx - i, y: dtry + i, id: 'tr' },
          { x: dblx + i, y: dbly - i, id: 'bl' },
          { x: dbrx - i, y: dbry - i, id: 'br' },
        ];
        if (w > 320) {
          holes.push({ x: i, y: hcy, id: 'ml' });
          holes.push({ x: w - i, y: hcy, id: 'mr' });
        }
        break;
      }

      case 'circle': {
        // 4 holes: cardinal points, fixed i from bounding box edge
        holes = [
          { x: w / 2, y: i,     id: 'tm' },
          { x: w / 2, y: h - i, id: 'bm' },
          { x: i,     y: h / 2, id: 'ml' },
          { x: w - i, y: h / 2, id: 'mr' },
        ];
        break;
      }

      case 'pill': {
        const pr = Math.min(w, h) / 2;
        const d45 = 0.707;
        if (w >= h) {
          // Horizontal pill
          const lcx = pr, lcy = pr;
          const rcx = w - pr, rcy = pr;
          const ir = pr - i;
          if (h <= 80) {
            // Short pill: just left/right center
            holes = [
              { x: i,     y: h / 2, id: 'ml' },
              { x: w - i, y: h / 2, id: 'mr' },
            ];
          } else if (h <= 160) {
            // Medium pill: endcap corners only (no middle points)
            holes = [
              { x: lcx - ir * d45, y: lcy - ir * d45, id: 'tl' },
              { x: rcx + ir * d45, y: rcy - ir * d45, id: 'tr' },
              { x: rcx + ir * d45, y: rcy + ir * d45, id: 'br' },
              { x: lcx - ir * d45, y: lcy + ir * d45, id: 'bl' },
            ];
          } else {
            // Large pill: endcap corners + cardinal points
            holes = [
              { x: lcx - ir * d45, y: lcy - ir * d45, id: 'tl' },
              { x: rcx + ir * d45, y: rcy - ir * d45, id: 'tr' },
              { x: rcx + ir * d45, y: rcy + ir * d45, id: 'br' },
              { x: lcx - ir * d45, y: lcy + ir * d45, id: 'bl' },
              { x: w / 2, y: i,     id: 'tm' },
              { x: w / 2, y: h - i, id: 'bm' },
              { x: i,     y: h / 2, id: 'ml' },
              { x: w - i, y: h / 2, id: 'mr' },
            ];
          }
        } else {
          // Vertical pill
          const tcx = pr, tcy = pr;
          const bcx = pr, bcy = h - pr;
          const ir = pr - i;
          if (w <= 80) {
            // Narrow pill: just top/bottom center
            holes = [
              { x: w / 2, y: i,     id: 'tm' },
              { x: w / 2, y: h - i, id: 'bm' },
            ];
          } else if (w <= 160) {
            // Medium pill: endcap corners only
            holes = [
              { x: tcx - ir * d45, y: tcy - ir * d45, id: 'tl' },
              { x: tcx + ir * d45, y: tcy - ir * d45, id: 'tr' },
              { x: bcx + ir * d45, y: bcy + ir * d45, id: 'br' },
              { x: bcx - ir * d45, y: bcy + ir * d45, id: 'bl' },
            ];
          } else {
            // Large pill: all 8
            holes = [
              { x: tcx - ir * d45, y: tcy - ir * d45, id: 'tl' },
              { x: tcx + ir * d45, y: tcy - ir * d45, id: 'tr' },
              { x: bcx + ir * d45, y: bcy + ir * d45, id: 'br' },
              { x: bcx - ir * d45, y: bcy + ir * d45, id: 'bl' },
              { x: w / 2, y: i,     id: 'tm' },
              { x: w / 2, y: h - i, id: 'bm' },
              { x: i,     y: h / 2, id: 'ml' },
              { x: w - i, y: h / 2, id: 'mr' },
            ];
          }
        }
        break;
      }

      default: // rect
        holes = [
          { x: i,       y: i,       id: 'tl' },
          { x: w - i,   y: i,       id: 'tr' },
          { x: w - i,   y: h - i,   id: 'br' },
          { x: i,       y: h - i,   id: 'bl' },
          { x: w / 2,   y: i,       id: 'tm' },
          { x: w / 2,   y: h - i,   id: 'bm' },
          { x: i,       y: h / 2,   id: 'ml' },
          { x: w - i,   y: h / 2,   id: 'mr' },
        ];
    }

    // Remove middle holes when shape is too small — only applies to rect (which has 8 holes)
    if (shapeType === 'rect') {
      return holes.filter(hole => {
        if ((hole.id === 'ml' || hole.id === 'mr') && h <= 140) return false;
        if ((hole.id === 'tm' || hole.id === 'bm') && (w <= 140 || h <= 140)) return false;
        return true;
      });
    }
    return holes;
  }

  // ─── Create Panel ─────────────────────────────────────────────────

  function createPanel(opts) {
    const { shapeType, gc, gr, colSpan, rowSpan, cw, rh, gap, margin, cornerRadius, holeInset, color } = opts;
    const def = SHAPE_TYPES[shapeType];
    if (!def) return null;
    const pos = cellToPixel(gc, gr, cw, rh, gap, margin);
    const size = spanToPixel(colSpan, rowSpan, cw, rh, gap);
    const d = def.draw(size.w, size.h, cornerRadius);
    const holes = computeShapeHoles(shapeType, size.w, size.h, holeInset);
    return {
      shapeType, d, holes,
      x: pos.x, y: pos.y, w: size.w, h: size.h,
      gc, gr, colSpan, rowSpan, color,
      id: null,
    };
  }

  // ─── SVG Renderer ─────────────────────────────────────────────────

  function renderSVG(panels, connections, config, svgEl) {
    const { width, height, palette = DEFAULT_PALETTE } = config;
    svgEl.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgEl.innerHTML = '';

    svgEl.appendChild(el('rect', { x: 0, y: 0, width, height, fill: palette.background }));

    const panelG = el('g', { class: 'panels' });
    panels.forEach(p => {
      const g = el('g', { transform: `translate(${p.x}, ${p.y})`, class: 'panel', 'data-id': p.id });
      g.appendChild(el('path', { d: p.d, fill: p.color }));
      p.holes.forEach(hole => {
        g.appendChild(el('circle', {
          cx: hole.x, cy: hole.y, r: 5,
          fill: palette.holes, stroke: palette.background, 'stroke-width': 1.5,
        }));
      });
      panelG.appendChild(g);
    });
    svgEl.appendChild(panelG);

    const connG = el('g', { class: 'connections-above' });
    connections.forEach((c, i) => connG.appendChild(renderConnection(c, i)));
    svgEl.appendChild(connG);
  }

  // ─── Connection Rendering ─────────────────────────────────────────

  function renderConnection(c, idx, opts) {
    const sw = (opts && opts.strokeWidth) || 2;
    const dotR = (opts && opts.dotRadius) || 3;
    const g = el('g', { class: `connection connection-${c.style}` });
    const dx = c.x2 - c.x1, dy = c.y2 - c.y1;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;

    switch (c.style) {
      case 'dashed':
        g.appendChild(el('line', {
          x1: c.x1, y1: c.y1, x2: c.x2, y2: c.y2,
          stroke: c.color, 'stroke-width': sw, 'stroke-dasharray': '8 6',
        }));
        break;

      case 'double':
        [-3, 3].forEach(off => {
          const nx = -dy / length * off, ny = dx / length * off;
          g.appendChild(el('line', {
            x1: c.x1 + nx, y1: c.y1 + ny, x2: c.x2 + nx, y2: c.y2 + ny,
            stroke: c.color, 'stroke-width': Math.max(sw * 0.75, 1),
          }));
        });
        break;

      case 'paracord': {
        const ux = dx / length, uy = dy / length;
        const nx = -uy, ny = ux;
        const cordW = 6;
        const patId = `cord-${idx}`;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        const defs = el('defs');
        const pat = el('pattern', {
          id: patId, patternUnits: 'userSpaceOnUse',
          width: 8, height: 8, patternTransform: `rotate(${angle})`,
        });
        pat.appendChild(el('rect', { width: 8, height: 8, fill: c.color }));
        const col2 = c.color === '#ffffff' ? '#888' : c.color === '#00ff41' ? '#005500' : c.color === '#ff6b00' ? '#993300' : '#333';
        const col3 = c.color === '#ffffff' ? '#ddd' : c.color === '#00ff41' ? '#66ff88' : c.color === '#ff6b00' ? '#ffaa55' : '#666';
        pat.appendChild(el('path', { d: 'M 0 0 L 4 4 M 4 0 L 8 4 M 0 4 L 4 8 M 4 4 L 8 8', stroke: col2, 'stroke-width': 1.5, fill: 'none', opacity: 0.7 }));
        pat.appendChild(el('path', { d: 'M 2 0 L 6 4 M 6 0 L 10 4 M -2 4 L 2 8 M 2 4 L 6 8', stroke: col3, 'stroke-width': 0.5, fill: 'none', opacity: 0.5 }));
        defs.appendChild(pat);
        g.appendChild(defs);
        g.appendChild(el('line', {
          x1: c.x1, y1: c.y1, x2: c.x2, y2: c.y2,
          stroke: `url(#${patId})`, 'stroke-width': cordW, 'stroke-linecap': 'round',
        }));
        [-cordW / 2, cordW / 2].forEach(off => {
          g.appendChild(el('line', {
            x1: c.x1 + nx * off, y1: c.y1 + ny * off,
            x2: c.x2 + nx * off, y2: c.y2 + ny * off,
            stroke: col2, 'stroke-width': 0.5, opacity: 0.4,
          }));
        });
        break;
      }

      case 'striped': {
        const sw = 6;
        g.appendChild(el('line', { x1: c.x1, y1: c.y1, x2: c.x2, y2: c.y2, stroke: '#00ff41', 'stroke-width': 4, 'stroke-dasharray': `${sw * 2} ${sw}` }));
        g.appendChild(el('line', { x1: c.x1, y1: c.y1, x2: c.x2, y2: c.y2, stroke: '#fff', 'stroke-width': 4, 'stroke-dasharray': `${sw} ${sw * 2}`, 'stroke-dashoffset': `-${sw}` }));
        break;
      }

      default:
        g.appendChild(el('line', { x1: c.x1, y1: c.y1, x2: c.x2, y2: c.y2, stroke: c.color, 'stroke-width': sw }));
    }

    [{ x: c.x1, y: c.y1 }, { x: c.x2, y: c.y2 }].forEach(pt => {
      g.appendChild(el('circle', { cx: pt.x, cy: pt.y, r: dotR, fill: c.color }));
    });
    return g;
  }

  function animateConnections(svgEl, duration = 1200) {
    svgEl.querySelectorAll('.connections-above line, .connections-above path').forEach((line, i) => {
      const len = line.getTotalLength ? line.getTotalLength() : 200;
      line.style.strokeDasharray = len;
      line.style.strokeDashoffset = len;
      line.style.transition = `stroke-dashoffset ${duration}ms ease ${i * 60}ms`;
      requestAnimationFrame(() => requestAnimationFrame(() => { line.style.strokeDashoffset = 0; }));
    });
  }

  function el(tag, attrs = {}) {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    return e;
  }

  function exportSVG(svgEl, filename = 'panel lab-panels.svg') {
    const blob = new Blob([new XMLSerializer().serializeToString(svgEl)], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  return {
    SHAPE_TYPES, SHAPE_TYPE_KEYS, DEFAULT_PALETTE,
    createPanel, computeHoles, computeShapeHoles,
    colWidth, rowHeight, cellToPixel, spanToPixel, pixelToCell,
    renderSVG, renderConnection, animateConnections, exportSVG, el,
  };
})();
