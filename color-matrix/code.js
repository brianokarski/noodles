// COLOR MATRIX: test a palette for contrast, overlaps and triads.
// Colour model: HSL, same as HUEHUEHUE. Spinning hue holds saturation and
// lightness, so colours stay vivid. Perceptual lightness is reported as
// information only — it never changes the result.

figma.showUI(__html__, { width: 340, height: 760 });

/* ---------------- HSL (the working model) ---------------- */
function hex2rgb(h) {
  h = h.replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgb2hex(r, g, b) {
  function p(v) {
    var s = Math.round(Math.max(0, Math.min(255, v))).toString(16).toUpperCase();
    return s.length === 1 ? "0" + s : s;
  }
  return "#" + p(r) + p(g) + p(b);
}
function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0;
  if (d > 0) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  var l = (mx + mn) / 2;
  var s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h: h, s: s, l: l };
}
function hsl2hex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  var c = (1 - Math.abs(2 * l - 1)) * s;
  var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  var m = l - c / 2, r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  return rgb2hex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/* ---------------- readouts only: luminance + OKLab ---------------- */
function s2l(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function relLum(hex) {
  var c = hex2rgb(hex);
  return 0.2126 * s2l(c[0]) + 0.7152 * s2l(c[1]) + 0.0722 * s2l(c[2]);
}
function contrast(a, b) {
  var x = relLum(a), y = relLum(b);
  if (x < y) { var t = x; x = y; y = t; }
  return (x + 0.05) / (y + 0.05);
}
function okL(hex) {
  var c = hex2rgb(hex);
  var R = s2l(c[0]), G = s2l(c[1]), B = s2l(c[2]);
  var l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  var m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  var s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
}
function okLab(hex) {
  var c = hex2rgb(hex);
  var R = s2l(c[0]), G = s2l(c[1]), B = s2l(c[2]);
  var l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  var m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  var s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
          1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
          0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
function deltaE(a, b) {
  var A = okLab(a), B = okLab(b);
  return Math.sqrt(Math.pow(A[0]-B[0],2) + Math.pow(A[1]-B[1],2) + Math.pow(A[2]-B[2],2));
}

/* ---------------- palette ---------------- */
var PALETTE = [
  { hex: "#E8D8B0", name: "Sand" },  { hex: "#DCE3EA", name: "Mist" },
  { hex: "#F2B134", name: "Sage" },  { hex: "#F3D9CF", name: "Shell" },
  { hex: "#D98E73", name: "Clay" },  { hex: "#F2994A", name: "Amber" },
  { hex: "#B5523B", name: "Brick" },  { hex: "#2F5D9B", name: "Cobalt" },
  { hex: "#E4572E", name: "Vermilion" },   { hex: "#4B3A2A", name: "Umber" },
  { hex: "#1C1C1A", name: "Ink" },   { hex: "#000000", name: "Black" },
];
var INK = "#1C1C1A", HAZE = "#DCE3EA", BLACK = "#000000";

function rungOf(L) {
  if (L >= 0.86) return 1;
  if (L >= 0.66) return 2;
  if (L >= 0.40) return 3;
  if (L >= 0.15) return 4;
  return 5;
}
function nearest(hex) {
  var best = null, bd = 1e9;
  for (var i = 0; i < PALETTE.length; i++) {
    var d = deltaE(hex, PALETTE[i].hex);
    if (d < bd) { bd = d; best = PALETTE[i]; }
  }
  return { name: best.name, hex: best.hex, d: bd };
}
function report(hex) {
  var hsl = rgb2hsl.apply(null, hex2rgb(hex));
  var n = nearest(hex);
  return {
    hex: hex,
    h: hsl.h, s: hsl.s, l: hsl.l,
    percL: okL(hex),
    rung: rungOf(okL(hex)),
    onInk: contrast(hex, INK),
    onHaze: contrast(hex, HAZE),
    onBlack: contrast(hex, BLACK),
    nearName: n.name, nearHex: n.hex, nearD: n.d,
  };
}

/* ---------------- selection ---------------- */
function firstSolid(n) {
  if ("fills" in n && Array.isArray(n.fills)) {
    for (var i = 0; i < n.fills.length; i++) {
      var f = n.fills[i];
      if (f.type === "SOLID" && f.visible !== false)
        return rgb2hex(f.color.r * 255, f.color.g * 255, f.color.b * 255);
    }
  }
  return null;
}
function pushSelection() {
  var sel = figma.currentPage.selection, hex = null;
  for (var i = 0; i < sel.length; i++) { hex = firstSolid(sel[i]); if (hex) break; }
  figma.ui.postMessage({
    type: "selection", hex: hex, report: hex ? report(hex) : null, count: sel.length,
  });
}

/* ---------------- canvas row ---------------- */
async function buildRow(items, label) {
  try { await figma.loadFontAsync({ family: "Inter", style: "Medium" }); } catch (e) {}
  var W = 132, H = 168;
  var row = figma.createFrame();
  row.name = label || "COLOR MATRIX row";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "AUTO";
  row.counterAxisSizingMode = "AUTO";
  row.itemSpacing = 10;
  row.paddingTop = 18; row.paddingBottom = 18; row.paddingLeft = 18; row.paddingRight = 18;
  row.cornerRadius = 10;
  row.fills = [{ type: "SOLID", color: { r: 0.07, g: 0.07, b: 0.07 } }];
  figma.currentPage.appendChild(row);
  for (var i = 0; i < items.length; i++) {
    var it = items[i], c = hex2rgb(it.hex);
    var cell = figma.createFrame();
    cell.name = it.hex + (it.note ? "  " + it.note : "");
    cell.resize(W, H); cell.cornerRadius = 6;
    cell.fills = [{ type: "SOLID", color: { r: c[0]/255, g: c[1]/255, b: c[2]/255 } }];
    row.appendChild(cell);
    try {
      var t = figma.createText();
      t.fontName = { family: "Inter", style: "Medium" };
      t.characters = it.hex.replace("#", "") + (it.note ? "\n" + it.note : "");
      t.fontSize = 10;
      var dark = relLum(it.hex) > 0.35;
      t.fills = [{ type: "SOLID", color: dark ? { r:0,g:0,b:0 } : { r:1,g:1,b:1 } }];
      cell.appendChild(t); t.x = 12; t.y = H - 34;
    } catch (e) {}
  }
  var vp = figma.viewport.center;
  row.x = Math.round(vp.x - row.width / 2);
  row.y = Math.round(vp.y - row.height / 2);
  figma.currentPage.selection = [row];
  figma.viewport.scrollAndZoomIntoView([row]);
}
function applyToSelection(hex) {
  var c = hex2rgb(hex), col = { r: c[0]/255, g: c[1]/255, b: c[2]/255 }, n = 0;
  figma.currentPage.selection.forEach(function (node) {
    try {
      if ("fills" in node && Array.isArray(node.fills)) {
        var f = JSON.parse(JSON.stringify(node.fills));
        for (var i = 0; i < f.length; i++) if (f[i].type === "SOLID") { f[i].color = col; n++; }
        node.fills = f;
      }
    } catch (e) {}
  });
  figma.notify(n ? "Applied " + hex + " to " + n + " fill(s)" : "Nothing to apply to");
}

/* ---------------- messages ---------------- */
figma.ui.onmessage = async function (msg) {
  if (msg.type === "ready") {
    figma.ui.postMessage({ type: "palette", palette: PALETTE });
    pushSelection();
  } else if (msg.type === "spin") {
    // HUEHUEHUE behaviour: hold s and l, rotate h.
    // LOCK flags decide which axis the row walks.
    var base = { h: msg.h, s: msg.s, l: msg.l };
    var out = [{ hex: hsl2hex(base.h, base.s, base.l), note: "", isBase: true }];
    var axis = msg.axis || "h";
    for (var k = 1; k <= msg.steps; k++) {
      var h = base.h, s = base.s, l = base.l, note = "";
      if (axis === "h") { h = base.h + (msg.arc / msg.steps) * k; note = Math.round(((h % 360) + 360) % 360) + "\u00B0"; }
      else if (axis === "s") { s = (k / msg.steps); note = Math.round(s * 100) + "% sat"; }
      else { l = (k / (msg.steps + 1)); note = Math.round(l * 100) + "% lig"; }
      out.push({ hex: hsl2hex(h, s, l), note: note });
    }
    figma.ui.postMessage({
      type: "spun",
      items: out.map(function (o) { return { hex: o.hex, note: o.note, isBase: !!o.isBase, report: report(o.hex) }; }),
    });
  } else if (msg.type === "inspect") {
    figma.ui.postMessage({ type: "report", report: report(msg.hex) });
  } else if (msg.type === "buildRow") {
    await buildRow(msg.items, msg.label);
    figma.notify("Row built at viewport centre");
  } else if (msg.type === "apply") {
    applyToSelection(msg.hex);
  } else if (msg.type === "pick") {
    pushSelection();
  } else if (msg.type === "close") {
    figma.closePlugin();
  }
};

figma.on("selectionchange", pushSelection);
