// Hue Herder — shift every color in the selection together, preserving
// their HSL relationships. Hue rotates, saturation scales, lightness shifts.

figma.showUI(__html__, { width: 300, height: 640 });

/* ---------- color math ---------- */
function rgb2hsl(r, g, b) {
  const mx = Math.max(r, g, b),
    mn = Math.min(r, g, b),
    d = mx - mn;
  let h = 0;
  if (d > 0) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (mx + mn) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return [h, s, l];
}
function hsl2rgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return [r + m, g + m, b + m];
}
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/* ---------- capture ---------- */
// entries: {node, prop, paintIndex, stopIndex|-1, h,s,l, opacity}
let entries = [];

function capturePaint(node, prop, paints, out) {
  if (!Array.isArray(paints)) return; // figma.mixed
  paints.forEach(function (p, pi) {
    if (p.type === "SOLID") {
      const hsl = rgb2hsl(p.color.r, p.color.g, p.color.b);
      out.push({
        node: node,
        prop: prop,
        paintIndex: pi,
        stopIndex: -1,
        h: hsl[0],
        s: hsl[1],
        l: hsl[2],
      });
    } else if (p.gradientStops) {
      p.gradientStops.forEach(function (st, si) {
        const hsl = rgb2hsl(st.color.r, st.color.g, st.color.b);
        out.push({
          node: node,
          prop: prop,
          paintIndex: pi,
          stopIndex: si,
          h: hsl[0],
          s: hsl[1],
          l: hsl[2],
        });
      });
    }
  });
}

function collect(n, out) {
  out.push(n);
  if ("children" in n) {
    try {
      n.children.forEach(function (c) {
        collect(c, out);
      });
    } catch (e) {}
  }
}
function captureNode(n, out) {
  // text with mixed colors: capture per styled segment
  if (n.type === "TEXT" && n.fills === figma.mixed) {
    try {
      n.getStyledTextSegments(["fills"]).forEach(function (seg) {
        seg.fills.forEach(function (p, pi) {
          if (p.type !== "SOLID") return;
          const hsl = rgb2hsl(p.color.r, p.color.g, p.color.b);
          out.push({
            node: n, prop: "range", paintIndex: pi, stopIndex: -1,
            start: seg.start, end: seg.end,
            fills: seg.fills,
            h: hsl[0], s: hsl[1], l: hsl[2],
          });
        });
      });
    } catch (e) {}
  } else if ("fills" in n) {
    capturePaint(n, "fills", n.fills, out);
  }
  if ("strokes" in n) capturePaint(n, "strokes", n.strokes, out);
}
function capture() {
  entries = [];
  const sel = figma.currentPage.selection;
  const nodes = [];
  sel.forEach(function (n) {
    collect(n, nodes);
  });
  nodes.forEach(function (n) {
    captureNode(n, entries);
  });

  // distinct chips for the UI (rounded to avoid float noise)
  const seen = {};
  const chips = [];
  entries.forEach(function (e) {
    const key =
      Math.round(e.h) + "/" + Math.round(e.s * 100) + "/" + Math.round(e.l * 100);
    if (!seen[key]) {
      seen[key] = true;
      chips.push({ h: e.h, s: e.s, l: e.l });
    }
  });
  chips.sort(function (a, b) {
    return a.l - b.l;
  });
  figma.ui.postMessage({
    type: "captured",
    chips: chips.slice(0, 12),
    count: entries.length,
    nodes: sel.length,
  });
}

/* ---------- apply ---------- */
function apply(dh, ds, dl) {
  const touched = new Map(); // node -> {fills:[...], strokes:[...]}
  entries.forEach(function (e) {
    if (e.prop === "range") {
      // mixed text segment
      const h = e.h + dh;
      const s = clamp01(e.s * (1 + ds));
      const l = clamp01(e.l + dl);
      const rgb = hsl2rgb(h, s, l);
      const fills = JSON.parse(JSON.stringify(e.fills));
      if (fills[e.paintIndex] && fills[e.paintIndex].type === "SOLID")
        fills[e.paintIndex].color = { r: rgb[0], g: rgb[1], b: rgb[2] };
      try {
        e.node.setRangeFills(e.start, e.end, fills);
      } catch (err) {}
      return;
    }
    let rec = touched.get(e.node);
    if (!rec) {
      rec = {};
      touched.set(e.node, rec);
    }
    if (!rec[e.prop]) {
      try {
        rec[e.prop] = JSON.parse(JSON.stringify(e.node[e.prop]));
      } catch (err) {
        return;
      }
    }
    const paints = rec[e.prop];
    if (!Array.isArray(paints) || !paints[e.paintIndex]) return;

    const h = e.h + dh;
    const s = clamp01(e.s * (1 + ds));
    const l = clamp01(e.l + dl);
    const rgb = hsl2rgb(h, s, l);
    const col = { r: rgb[0], g: rgb[1], b: rgb[2] };

    const p = paints[e.paintIndex];
    if (e.stopIndex < 0) {
      if (p.type === "SOLID") p.color = col;
    } else if (p.gradientStops && p.gradientStops[e.stopIndex]) {
      p.gradientStops[e.stopIndex].color = {
        r: col.r,
        g: col.g,
        b: col.b,
        a: p.gradientStops[e.stopIndex].color.a,
      };
    }
  });
  touched.forEach(function (rec, node) {
    try {
      if (rec.fills) node.fills = rec.fills;
      if (rec.strokes) node.strokes = rec.strokes;
    } catch (err) {
      /* locked / readonly — skip */
    }
  });
}

/* ---------- shift a subtree in place (for variants) ---------- */
function shiftPaints(paints, dh) {
  if (!Array.isArray(paints)) return null;
  const out = JSON.parse(JSON.stringify(paints));
  out.forEach(function (p) {
    if (p.type === "SOLID") {
      const hsl = rgb2hsl(p.color.r, p.color.g, p.color.b);
      const rgb = hsl2rgb(hsl[0] + dh, hsl[1], hsl[2]);
      p.color = { r: rgb[0], g: rgb[1], b: rgb[2] };
    } else if (p.gradientStops) {
      p.gradientStops.forEach(function (st) {
        const hsl = rgb2hsl(st.color.r, st.color.g, st.color.b);
        const rgb = hsl2rgb(hsl[0] + dh, hsl[1], hsl[2]);
        st.color = { r: rgb[0], g: rgb[1], b: rgb[2], a: st.color.a };
      });
    }
  });
  return out;
}
function shiftNodeTree(root, dh) {
  const nodes = [];
  collect(root, nodes);
  nodes.forEach(function (n) {
    try {
      if (n.type === "TEXT" && n.fills === figma.mixed) {
        n.getStyledTextSegments(["fills"]).forEach(function (seg) {
          const f = shiftPaints(seg.fills, dh);
          if (f) n.setRangeFills(seg.start, seg.end, f);
        });
      } else if ("fills" in n) {
        const f = shiftPaints(n.fills, dh);
        if (f) n.fills = f;
      }
      if ("strokes" in n) {
        const s = shiftPaints(n.strokes, dh);
        if (s) n.strokes = s;
      }
    } catch (e) { /* locked / readonly */ }
  });
}

/* ---------- variant row ---------- */
function buildVariants(count, step) {
  const sel = figma.currentPage.selection.filter(function (n) {
    return "clone" in n;
  });
  if (!sel.length) {
    figma.notify("Select a frame (or frames) first");
    return;
  }
  const made = [];
  sel.forEach(function (src) {
    const gapX = Math.max(40, Math.round(src.width * 0.06));
    for (let k = 1; k < count; k++) {
      const dup = src.clone();
      if (src.parent && src.parent.appendChild) src.parent.appendChild(dup);
      dup.x = src.x + (src.width + gapX) * k;
      dup.y = src.y;
      dup.name = src.name + " · +" + Math.round(step * k) + "°";
      shiftNodeTree(dup, step * k);
      made.push(dup);
    }
  });
  if (made.length) {
    figma.currentPage.selection = sel.concat(made);
    figma.viewport.scrollAndZoomIntoView(sel.concat(made));
    figma.notify(
      "Built " + (count - 1) + " spun variant(s) per frame (" +
        Math.round(step) + "° apart)",
    );
  }
}

/* ---------- messages ---------- */
figma.ui.onmessage = function (msg) {
  if (msg.type === "shift") apply(msg.dh, msg.ds, msg.dl);
  else if (msg.type === "variants") buildVariants(msg.count, msg.step);
  else if (msg.type === "capture") capture();
  else if (msg.type === "commit") {
    // current state becomes the new baseline
    capture();
    figma.notify("Committed — sliders rebased");
  } else if (msg.type === "reset") {
    apply(0, 0, 0);
    figma.notify("Restored original colors");
  } else if (msg.type === "close") figma.closePlugin();
};

figma.on("selectionchange", function () {
  figma.ui.postMessage({ type: "selchange" });
});

capture();
