// Minimal SVG renderer with the subset of the p5 drawing API we use.
// Implements the same method names as p5/p5.Graphics so the generators can
// render to it transparently. No external dependencies.
//
// Supported:
//   background, fill, stroke, noStroke, noFill, strokeWeight
//   rect, ellipse, line
//   beginShape / vertex / endShape (for hexagons + polygons)
//   text + textSize, textFont, textStyle, textAlign
//   noise (delegates to p5 if available, falls back to a deterministic stub)
//   color, lerpColor (delegates to p5 if available)
//
// Constants exposed: LEFT, RIGHT, CENTER, TOP, BOTTOM, BASELINE, BOLD, NORMAL, ITALIC, CLOSE

function makeSVGRecorder(width, height) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('xmlns', ns);
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  // p5 constants — identical to p5's
  const C = {
    LEFT: 'left', RIGHT: 'right', CENTER: 'center',
    TOP: 'top', BOTTOM: 'bottom', BASELINE: 'alphabetic',
    BOLD: 'bold', NORMAL: 'normal', ITALIC: 'italic',
    CLOSE: 'close',
  };

  // Render state
  const state = {
    fill: '#000000',
    stroke: null,
    strokeWeight: 1,
    fontSize: 12,
    fontFamily: 'sans-serif',
    fontStyle: 'normal',
    fontWeight: 'normal',
    hAlign: 'left',
    vAlign: 'baseline',
    shape: null, // current beginShape buffer
  };

  const toCss = (c) => {
    if (c == null) return 'none';
    if (typeof c === 'string') return c;
    // p5.Color object — try toString
    if (c.toString) return c.toString();
    return '#000';
  };

  const sanitizeColorKey = (s) => String(s || 'none').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const colorGroups = new Map();

  const getColorGroup = (fillCss, strokeCss) => {
    const main = fillCss && fillCss !== 'none' ? fillCss : (strokeCss && strokeCss !== 'none' ? strokeCss : 'none');
    const key = sanitizeColorKey(main);
    if (colorGroups.has(key)) return colorGroups.get(key);

    const g = document.createElementNS(ns, 'g');
    g.setAttribute('id', `color-${key}`);
    g.setAttribute('data-color', main);
    g.setAttribute('data-layer', `color-${main}`);
    svg.appendChild(g);
    colorGroups.set(key, g);
    return g;
  };

  const appendToColorLayer = (el, fillCss, strokeCss) => {
    const group = getColorGroup(fillCss, strokeCss);
    group.appendChild(el);
  };

  const applyShapeAttrs = (el) => {
    const fillCss = toCss(state.fill);
    const strokeCss = state.stroke == null ? 'none' : toCss(state.stroke);
    el.setAttribute('fill', fillCss);
    if (state.stroke == null) {
      el.setAttribute('stroke', 'none');
    } else {
      el.setAttribute('stroke', strokeCss);
      el.setAttribute('stroke-width', state.strokeWeight);
    }
    appendToColorLayer(el, fillCss, strokeCss);
  };

  const r = {
    _svg: svg,
    elt: svg,
    width,
    height,
    ...C,

    // Lifecycle no-ops
    remove() {},

    // Background
    background(c) {
      // Replace any existing background rect
      const bg = svg.querySelector('rect.__bg');
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('class', '__bg');
      rect.setAttribute('x', 0);
      rect.setAttribute('y', 0);
      rect.setAttribute('width', width);
      rect.setAttribute('height', height);
      rect.setAttribute('fill', toCss(c));
      if (bg) bg.replaceWith(rect);
      else svg.insertBefore(rect, svg.firstChild);
    },

    // State setters
    fill(c) { state.fill = c; },
    noFill() { state.fill = null; },
    stroke(c) { state.stroke = c; },
    noStroke() { state.stroke = null; },
    strokeWeight(w) { state.strokeWeight = w; },

    // Shape primitives
    rect(x, y, w, h) {
      const el = document.createElementNS(ns, 'rect');
      el.setAttribute('x', x);
      el.setAttribute('y', y);
      el.setAttribute('width', w);
      el.setAttribute('height', h);
      applyShapeAttrs(el);
    },
    ellipse(cx, cy, w, h) {
      const el = document.createElementNS(ns, 'ellipse');
      el.setAttribute('cx', cx);
      el.setAttribute('cy', cy);
      el.setAttribute('rx', w / 2);
      el.setAttribute('ry', h / 2);
      applyShapeAttrs(el);
    },
    line(x1, y1, x2, y2) {
      const el = document.createElementNS(ns, 'line');
      el.setAttribute('x1', x1); el.setAttribute('y1', y1);
      el.setAttribute('x2', x2); el.setAttribute('y2', y2);
      const strokeCss = toCss(state.stroke ?? '#000');
      el.setAttribute('stroke', strokeCss);
      el.setAttribute('stroke-width', state.strokeWeight);
      el.setAttribute('fill', 'none');
      appendToColorLayer(el, 'none', strokeCss);
    },

    // beginShape / vertex / endShape
    beginShape() { state.shape = []; },
    vertex(x, y) { if (state.shape) state.shape.push([x, y]); },
    endShape(close) {
      if (!state.shape) return;
      const pts = state.shape.map(([x, y]) => `${x},${y}`).join(' ');
      const tag = (close === C.CLOSE || close === 'close') ? 'polygon' : 'polyline';
      const el = document.createElementNS(ns, tag);
      el.setAttribute('points', pts);
      applyShapeAttrs(el);
      state.shape = null;
    },

    // Text
    text(str, x, y, maxW) {
      const el = document.createElementNS(ns, 'text');
      el.setAttribute('x', x);
      el.setAttribute('y', y + state.fontSize); // approximate baseline
      el.setAttribute('font-size', state.fontSize);
      el.setAttribute('font-family', state.fontFamily);
      el.setAttribute('font-weight', state.fontWeight);
      el.setAttribute('font-style', state.fontStyle);
      el.setAttribute('fill', toCss(state.fill));
      // Map p5 alignments to SVG
      const anchor = state.hAlign === 'center' ? 'middle'
                   : state.hAlign === 'right' ? 'end' : 'start';
      el.setAttribute('text-anchor', anchor);
      el.textContent = String(str);
      appendToColorLayer(el, toCss(state.fill), 'none');
    },
    textSize(s) { state.fontSize = s; },
    textFont(f) { state.fontFamily = f; },
    textStyle(s) {
      if (s === C.BOLD) { state.fontWeight = 'bold'; state.fontStyle = 'normal'; }
      else if (s === C.ITALIC) { state.fontStyle = 'italic'; state.fontWeight = 'normal'; }
      else { state.fontWeight = 'normal'; state.fontStyle = 'normal'; }
    },
    textAlign(h, v) { state.hAlign = h; if (v) state.vAlign = v; },

    // Color helpers — delegate to p5 if global
    color(...args) {
      if (typeof window.color === 'function') return window.color(...args);
      return args[0];
    },
    lerpColor(a, b, t) {
      if (typeof window.lerpColor === 'function') return window.lerpColor(a, b, t);
      return t < 0.5 ? a : b;
    },
    noise(...args) {
      if (typeof window.noise === 'function') return window.noise(...args);
      return 0.5;
    },
  };

  return r;
}

function downloadSVG(recorder, filename) {
  const xml = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' + recorder._svg.outerHTML;
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
