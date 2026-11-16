// RING LAB — line system core. Pure functions, no DOM.
// window.Ring in the browser, module.exports in node.
//
// build(state) → strands[]  each { k, w, tag, geo, d }  (geo = exact geometry)
// paint(state, strands) → parts[]  each { d, w, color, opacity }  (what gets drawn)
// toSVG(state) → string  — strokes only, always.

(function (root) {
  const TAU = Math.PI * 2;

  // ── Defaults ─────────────────────────────────────────────────────────
  const DEFAULTS = {
    family: 'lissajous',                       // 'lissajous' | 'confluence'

    // reference ring: a 2, b 5, δ 0 in a 787x486 box.
    curve:   { a: 2, b: 5, delta: 0, rot: 0 },
    box:     { cx: 403, cy: 254, w: 787, h: 486 },
    strands: { n: 1, gap: 8, phase: 0, scale: 0, twist: 0, ramp: 0 },
    env:     { amt: 0, m: 2, psi: 0, pow: 1 },
    spiral:  { grow: 0, turns: 1 },
    trim:    { start: 0, end: 1 },

    // Figma Alt 3 223:101 = circles centred (-9, 254), r 91 189 245 329 400 555 646.
    conf: {
      side: 'left', ox: -9, ay: 0, n: 7,
      profile: 'arc',                          // 'arc' | 'merge'
      rMin: 91, rMax: 646, pow: 1, radii: null,
      entry: 120, entryStep: 90, join: 380, joinStep: 60, tension: 0.55, lean: 0,
      bottom: true, interleave: 0, axis: true, axisFrom: 'origin',
    },

    // ── offset: contours of a convex base shape (clean parallel offsets).
    offset: { shape: 'super', e: 2.6, n: 14, gap: 14, cx: 403, cy: 254, w: 420, h: 300, rot: 0, oneSided: false },

    // ── blend: Illustrator-style line blend between shape A and shape B.
    //    shapes: { kind:'lissajous'|'super'|'line'|'circle', a,b,delta | e | ang,off , cx,cy,w,h,rot }
    blend: {
      n: 18, ease: 1,
      A: { kind: 'line', ang: 0, off: -0.55, cx: 403, cy: 254, w: 1100, h: 508, rot: 0 },
      B: { kind: 'lissajous', a: 2, b: 5, delta: 0, cx: 403, cy: 254, w: 600, h: 370, rot: 0 },
    },

    // ── sunburst: rays from a centre (can be off-card), optional curve/twist.
    burst: { cx: 403, cy: 254, n: 48, a0: 0, a1: 360, r0: 40, r1: 700, bulge: 0, twist: 0, wobble: 0 },

    // ── waves: parallel sine lines across the card with phase drift.
    waves: { n: 16, ang: 0, amp: 40, len: 520, drift: 18, spread: 22, bulge: 0.6, cx: 403, cy: 254 },

    // ── hatch: parallel straight lines clipped to the inside of a shape (even-odd).
    hatch: { ang: 45, spacing: 12, shape: { kind: 'lissajous', a: 2, b: 5, delta: 0, cx: 403, cy: 254, w: 700, h: 430, rot: 0 }, inside: true },

    // ── moire: two copies of a contour set, one rotated/scaled slightly.
    //    kind 'circle' = concentric rings from a centre; kind 'lines' = parallel straight lines.
    //    Set 2 is the same, shifted by dx/dy, rotated rot2, spacing scaled gap2.
    moire: { kind: 'circle', cx: 403, cy: 254, ang: 0, gap: 10, gap2: 1, rot2: 0, dx: 40, dy: 0, reach: 560 },

    // ── kiss: circles touching, with rings emanating from each. 'away' draws
    //    only the half-rings on the far sides; 'full' overlaps whole rings;
    //    'inner' faces them toward each other (lens).
    kiss: { cx: 403, cy: 254, ang: 0, count: 2, r: 70, ratio: 1, gap: 22, n: 10, mode: 'away', sweep: 180 },

    // ── knot: the Lissajous as a 3D curve (z = sin(c t + φ)), tilted, projected
    //    with perspective, drawn with over/under breaks where it crosses itself
    //    and weight/opacity falling off with depth.
    knot: { a: 2, b: 5, c: 3, phi: 90, tilt: 55, turn: 0, persp: 0.35, zAmp: 1,
            n: 1, gap: 7, cx: 403, cy: 254, w: 700, h: 430,
            cut: 2.6, wNear: 1, wFar: 0.45, aFar: 0.55 },

    // ── sheet: parallel lines over a bumped surface, drawn front-to-back with
    //    hidden-line removal, spacing foreshortened toward the back.
    sheet: { n: 22, cx: 403, cy: 254, w: 1100, depth: 420, persp: 0.55, amp: 120,
             profile: 'dome', px: 0.5, py: 0.5, size: 0.3, wNear: 1, wFar: 0.5, aFar: 0.6 },   // dome | cylinder | ridge | fold | step

    // ── wire: wireframe primitives, back-faces culled, perspective. One object.
    wire: { shape: 'sphere', cx: 403, cy: 254, size: 170, tilt: 20, turn: 25, persp: 0.4,
            rings: 9, meridians: 12, R: 1, r: 0.42, turns: 6, cull: true, wNear: 1, wFar: 0.45, aFar: 0.5 },

    stroke:  { w: 2, cap: 'round' },

    // Colour. Every mode outputs strokes with a solid stroke colour — the
    // gradient lives in the *distribution* of colours across strands or
    // along chunks, so Illustrator / Figma get plain editable paths.
    //   solid   one colour
    //   across  interpolate stops across strands (k)
    //   along   chunk each strand, interpolate stops along t
    //   field   chunk, colour by position: bilinear between 4 corners (mesh-like)
    //   linear  one SVG linearGradient as stroke paint (Figma ok; AI partial)
    color: {
      mode: 'solid',
      stops: ['#F2F2F0', '#3E7CB1', '#F2B134'],
      three: false,
      angle: 30, chunks: 48, reverse: false, offset: 0,
    },

    // Colour mesh for FIELD mode: cols x rows control colours, row-major from
    // top-left, bicubic (Catmull-Rom) interpolated over the card. The default
    // is a 2x2; the Figma 12x7 gets loaded by the UI. meshT moves the field.
    mesh:  { cols: 2, rows: 2, colors: ['#3E7CB1', '#C9D6E8', '#1F2A36', '#F2B134'] },
    meshT: { x: 0, y: 0, scale: 1, rot: 0 },

    // Depth: modulate width / opacity along t (needs chunks → along/field, or on).
    depth: { on: false, width: 0, alpha: 0, freq: 2, phase: 0, chunks: 48 },

    card: { w: 806, h: 508, r: 28 },
  };

  const clone = (o) => JSON.parse(JSON.stringify(o));
  function merge(base, over) {
    const out = clone(base);
    if (over && over.mesh) over = Object.assign({}, over, { mesh: { cols: over.mesh.cols, rows: over.mesh.rows, colors: over.mesh.colors } });
    for (const fam of ['hatch']) if (over && over[fam] && over[fam].shape) { const o = Object.assign({}, out[fam], over[fam]); o.shape = Object.assign({}, out[fam].shape, over[fam].shape); over = Object.assign({}, over, { [fam]: o }); }
    if (over && over.blend) { const b = Object.assign({}, out.blend, over.blend); if (over.blend.A) b.A = Object.assign({}, out.blend.A, over.blend.A); if (over.blend.B) b.B = Object.assign({}, out.blend.B, over.blend.B); over = Object.assign({}, over, { blend: b }); }
    for (const k in over || {}) {
      if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k])) out[k] = Object.assign(out[k] || {}, over[k]);
      else out[k] = over[k];
    }
    return out;
  }
  const f2 = (v) => +v.toFixed(2);

  // ═══════════════════════════════════════════════════════════════════════
  // LISSAJOUS
  // ═══════════════════════════════════════════════════════════════════════
  function envelope(t, env) {
    if (!env.amt) return 1;
    const c = (1 + Math.cos(env.m * t + env.psi * Math.PI / 180)) / 2;
    return 1 - env.amt * Math.pow(c, env.pow);
  }
  function basePoint(t, S, k) {
    const { curve, spiral, env, strands } = S;
    const T = TAU * spiral.turns, e = envelope(t, env);
    const delta = (curve.delta + k * strands.phase) * Math.PI / 180;
    const amp = 1 + k * strands.scale * e;
    const rot = (curve.rot + k * strands.twist) * Math.PI / 180;
    const g = 1 + spiral.grow * (t / T);
    let x = Math.sin(curve.a * t + delta) * amp * g, y = Math.sin(curve.b * t) * amp * g;
    if (rot) { const c = Math.cos(rot), s = Math.sin(rot); [x, y] = [x * c - y * s, x * s + y * c]; }
    return [x, y];
  }
  const toCard = (p, S) => [S.box.cx + p[0] * S.box.w / 2, S.box.cy + p[1] * S.box.h / 2];
  function strandPoint(t, S, k) {
    const p = toCard(basePoint(t, S, k), S);
    const d = k * S.strands.gap * envelope(t, S.env);
    if (!d) return p;
    const h = 1e-3, p0 = toCard(basePoint(t - h, S, k), S), p1 = toCard(basePoint(t + h, S, k), S);
    let tx = p1[0] - p0[0], ty = p1[1] - p0[1]; const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
    return [p[0] - ty * d, p[1] + tx * d];
  }
  const isClosed = (S) => S.trim.start === 0 && S.trim.end === 1 && !S.spiral.grow;
  function sampleStrand(S, k) {
    const { curve, spiral, trim } = S;
    const T = TAU * spiral.turns;
    const per = Math.max(180, 40 * Math.max(curve.a, curve.b));
    const N = Math.round(per * spiral.turns * Math.max(0.05, trim.end - trim.start));
    const t0 = trim.start * T, t1 = trim.end * T, closed = isClosed(S);
    const pts = [];
    for (let i = 0, c = closed ? N : N + 1; i < c; i++) pts.push(strandPoint(t0 + (t1 - t0) * (i / N), S, k));
    return { pts, closed };
  }

  // Catmull-Rom → cubic Béziers
  function ptsToPath(pts, closed) {
    const n = pts.length; if (n < 2) return '';
    const P = (i) => closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    let d = `M${f2(pts[0][0])} ${f2(pts[0][1])}`;
    for (let i = 0, segs = closed ? n : n - 1; i < segs; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      d += `C${f2(p1[0] + (p2[0] - p0[0]) / 6)} ${f2(p1[1] + (p2[1] - p0[1]) / 6)} ${f2(p2[0] - (p3[0] - p1[0]) / 6)} ${f2(p2[1] - (p3[1] - p1[1]) / 6)} ${f2(p2[0])} ${f2(p2[1])}`;
    }
    return closed ? d + 'Z' : d;
  }

  function buildLissajous(S) {
    const n = Math.max(1, Math.round(S.strands.n)), out = [];
    for (let i = 0; i < n; i++) {
      const k = i - (n - 1) / 2;
      const { pts, closed } = sampleStrand(S, k);
      const w = Math.max(0.1, S.stroke.w * (1 + k * S.strands.ramp));
      out.push({ k, w, tag: 'strand', geo: { type: 'pts', pts, closed }, d: ptsToPath(pts, closed) });
    }
    return out;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CONFLUENCE — exact geometry kept as cubic / line so chunking is exact.
  // ═══════════════════════════════════════════════════════════════════════
  const KAPPA = 0.5522847498;
  function cubicPath(p) { return `M${f2(p[0][0])} ${f2(p[0][1])}C${f2(p[1][0])} ${f2(p[1][1])} ${f2(p[2][0])} ${f2(p[2][1])} ${f2(p[3][0])} ${f2(p[3][1])}`; }
  function linePath(p) { return `M${f2(p[0][0])} ${f2(p[0][1])}L${f2(p[1][0])} ${f2(p[1][1])}`; }

  function buildConfluence(S) {
    const C = S.conf, W = S.card.w, H = S.card.h;
    const ay = H / 2 + C.ay, ox = C.ox;
    const explicit = Array.isArray(C.radii) && C.radii.length ? C.radii : null;
    const n = explicit ? explicit.length : Math.max(1, Math.round(C.n));
    const w = S.stroke.w, out = [];
    const mx = C.side === 'right' ? (x) => W - x : (x) => x;
    const P = (x, y) => [mx(x), y];
    let firstJoin = Infinity;

    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0 : i / (n - 1);
      for (const sgn of (C.bottom ? [-1, 1] : [-1])) {
        const shift = sgn > 0 ? C.interleave : 0;
        let geo, jx;
        if (C.profile === 'arc') {
          const ui = Math.min(1, Math.max(0, u + shift / Math.max(1, n - 1)));
          const r = explicit ? explicit[i] : C.rMin + (C.rMax - C.rMin) * Math.pow(ui, C.pow);
          jx = ox + r;
          geo = { type: 'cubic', p: [P(ox, ay + sgn * r), P(ox + KAPPA * r, ay + sgn * r), P(ox + r, ay + sgn * KAPPA * r), P(ox + r, ay)] };
        } else if (C.profile === 'bend') {
          // a straight leg from the edge, then a
          // quarter circle tangent to the axis at jx. All bends share one
          // radius, so they are translated copies that merge into the axis.
          const r = explicit ? explicit[i] : C.rMin + (C.rMax - C.rMin) * Math.pow(u, C.pow);
          jx = C.join + (i + shift) * C.joinStep;
          const ex = jx - r, edgeY = sgn < 0 ? -20 : H + 20;
          const p0 = P(ex, ay + sgn * r);
          geo = { type: 'pts', pts: [P(ex, edgeY), p0], closed: false };
          const c = [p0, P(ex, ay + sgn * r * (1 - KAPPA)), P(jx - KAPPA * r, ay), P(jx, ay)];
          firstJoin = Math.min(firstJoin, jx);
          // Each bend keeps running along the axis for C.tail px after its
          // join (Figma: the L's straight leg). With C.axis off, that is all
          // the merged line there is — it stops after the last join.
          const tail = C.tail ? `L${f2(P(jx + C.tail, ay)[0])} ${f2(ay)}` : '';
          out.push({ k: (sgn < 0 ? -1 : 1) * (i + 1), w, tag: sgn < 0 ? 'top' : 'bottom', geo: { type: 'cubic', p: c },
            d: linePath([P(ex, edgeY), p0]) + cubicPath(c).replace(/^M[^C]*/, '') + tail });
          continue;
        } else {
          const ex = C.entry + (i + shift) * C.entryStep;
          jx = C.join + (i + shift) * C.joinStep;
          const edgeY = sgn < 0 ? 0 : H, dy = ay - edgeY;
          const t = Math.min(0.98, Math.max(0.02, C.tension));
          geo = { type: 'cubic', p: [P(ex, edgeY), P(ex + C.lean * dy * t, edgeY + dy * t), P(jx - (jx - ex) * t, ay), P(jx, ay)] };
        }
        firstJoin = Math.min(firstJoin, jx);
        out.push({ k: (sgn < 0 ? -1 : 1) * (i + 1), w, tag: sgn < 0 ? 'top' : 'bottom', geo, d: cubicPath(geo.p) });
      }
    }
    if (C.axis) {
      const x0 = C.axisFrom === 'firstJoin' ? firstJoin : ox;
      const geo = { type: 'line', p: [P(x0, ay), P(W + 20, ay)] };
      out.unshift({ k: 0, w, tag: 'axis', geo, d: linePath(geo.p) });
    }
    return out;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SHAPES — sample any named shape to N points in card space.
  // ═══════════════════════════════════════════════════════════════════════
  function placeUnit(p, sh) {
    let [x, y] = p;
    if (sh.rot) { const a = sh.rot * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); [x, y] = [x * c - y * s, x * s + y * c]; }
    return [sh.cx + x * sh.w / 2, sh.cy + y * sh.h / 2];
  }
  function shapePts(sh, N) {
    const pts = [];
    const sgnpow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
    for (let i = 0; i < N; i++) {
      const t = i / N, th = t * TAU;
      let u;
      if (sh.kind === 'lissajous') u = [Math.sin(sh.a * th + (sh.delta || 0) * Math.PI / 180), Math.sin(sh.b * th)];
      else if (sh.kind === 'super') { const e = 2 / (sh.e || 2.5); u = [sgnpow(Math.cos(th), e), sgnpow(Math.sin(th), e)]; }
      else if (sh.kind === 'circle') u = [Math.cos(th), Math.sin(th)];
      else { // line: open, from -1..1 along angle ang, offset off perpendicular (unit space)
        const a = (sh.ang || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), q = -1 + 2 * (i / (N - 1)), o = sh.off || 0;
        u = [q * c - o * s, q * s + o * c];
      }
      pts.push(placeUnit(u, sh));
    }
    return { pts, closed: sh.kind !== 'line' };
  }
  // Signed area → +1 if the polygon winds so that our normal points outward.
  function outwardSign(pts) {
    let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; }
    return a > 0 ? -1 : 1;
  }
  function offsetPts(pts, closed, d) {
    if (closed) d *= outwardSign(pts);          // positive d = outward, always
    const n = pts.length, out = [];
    for (let i = 0; i < n; i++) {
      const p0 = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], p1 = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      let tx = p1[0] - p0[0], ty = p1[1] - p0[1]; const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
      out.push([pts[i][0] - ty * d, pts[i][1] + tx * d]);
    }
    return out;
  }

  // ── OFFSET: contours ─────────────────────────────────────────────────────
  function buildOffset(S) {
    const O = S.offset, out = [];
    const base = shapePts({ kind: O.shape, e: O.e, a: S.curve.a, b: S.curve.b, delta: S.curve.delta, cx: O.cx, cy: O.cy, w: O.w, h: O.h, rot: O.rot }, 240);
    const n = Math.max(1, Math.round(O.n));
    for (let i = 0; i < n; i++) {
      const k = O.oneSided ? i : i - (n - 1) / 2;
      const pts = offsetPts(base.pts, base.closed, k * O.gap);
      out.push({ k, w: S.stroke.w, tag: 'contour', geo: { type: 'pts', pts, closed: base.closed }, d: ptsToPath(pts, base.closed) });
    }
    return out;
  }

  // ── BLEND: A → B in n steps ──────────────────────────────────────────────
  function buildBlend(S) {
    const B = S.blend, N = 200;
    const A = shapePts(B.A, N), Z = shapePts(B.B, N);
    const closed = A.closed && Z.closed;
    const n = Math.max(2, Math.round(B.n)), out = [];
    for (let i = 0; i < n; i++) {
      let t = i / (n - 1); t = Math.pow(t, B.ease || 1);
      const pts = A.pts.map((p, j) => [p[0] + (Z.pts[j][0] - p[0]) * t, p[1] + (Z.pts[j][1] - p[1]) * t]);
      out.push({ k: i - (n - 1) / 2, w: S.stroke.w, tag: 'blend', geo: { type: 'pts', pts, closed }, d: ptsToPath(pts, closed) });
    }
    return out;
  }

  // ── SUNBURST: rays ───────────────────────────────────────────────────────
  function buildBurst(S) {
    const Bu = S.burst, out = [], n = Math.max(1, Math.round(Bu.n));
    const full = Math.abs((Bu.a1 - Bu.a0) % 360) < 1e-6;
    for (let i = 0; i < n; i++) {
      const t = full ? i / n : (n === 1 ? 0.5 : i / (n - 1));
      const ang = (Bu.a0 + (Bu.a1 - Bu.a0) * t) * Math.PI / 180;
      const r1 = Bu.r1 * (1 + Bu.wobble * Math.sin(i * 2.399));   // golden-angle wobble so it isn't periodic
      const pts = [];
      const M = 24;
      for (let j = 0; j <= M; j++) {
        const u = j / M, r = Bu.r0 + (r1 - Bu.r0) * u;
        const a = ang + Bu.twist * Math.PI / 180 * u;                // spiral twist with radius
        const side = Math.sin(u * Math.PI) * Bu.bulge * (r1 - Bu.r0); // sideways bulge → curved rays
        pts.push([Bu.cx + Math.cos(a) * r - Math.sin(a) * side, Bu.cy + Math.sin(a) * r + Math.cos(a) * side]);
      }
      out.push({ k: i - (n - 1) / 2, w: S.stroke.w, tag: 'ray', geo: { type: 'pts', pts, closed: false }, d: ptsToPath(pts, false) });
    }
    return out;
  }

  // ── WAVES: parallel sines ────────────────────────────────────────────────
  function buildWaves(S) {
    const Wv = S.waves, out = [], n = Math.max(1, Math.round(Wv.n));
    const a = Wv.ang * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
    const L = 1400, M = 160;
    for (let i = 0; i < n; i++) {
      const k = i - (n - 1) / 2, v = n === 1 ? 0 : i / (n - 1);
      const env = 1 - Wv.bulge * Math.pow(Math.abs(2 * v - 1), 2);      // amplitude peaks on the middle line
      const pts = [];
      for (let j = 0; j <= M; j++) {
        const x = -L / 2 + L * j / M;
        const y = k * Wv.spread + Math.sin((x / Wv.len) * TAU + k * Wv.drift * Math.PI / 180) * Wv.amp * env;
        pts.push([Wv.cx + x * c - y * sn, Wv.cy + x * sn + y * c]);
      }
      out.push({ k, w: S.stroke.w, tag: 'wave', geo: { type: 'pts', pts, closed: false }, d: ptsToPath(pts, false) });
    }
    return out;
  }

  // ── HATCH: straight lines clipped to a shape (even-odd) ──────────────────
  function buildHatch(S) {
    const Hh = S.hatch, poly = shapePts(Hh.shape, 400).pts, out = [];
    const a = Hh.ang * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);     // line direction
    const nx = -dy, ny = dx;                                                   // normal
    // project polygon onto the normal to find the band of lines that can hit it
    let lo = Infinity, hi = -Infinity;
    for (const p of poly) { const d = p[0] * nx + p[1] * ny; lo = Math.min(lo, d); hi = Math.max(hi, d); }
    const L = 2000, cx = S.card.w / 2, cy = S.card.h / 2;
    let k = 0;
    for (let off = Math.ceil(lo / Hh.spacing) * Hh.spacing; off <= hi; off += Hh.spacing, k++) {
      // line: P(t) = base + t*dir, base = off * normal
      const bx = off * nx, by = off * ny;
      const ts = [];
      for (let i = 0; i < poly.length; i++) {
        const p = poly[i], q = poly[(i + 1) % poly.length];
        // intersect infinite line with segment pq
        const ex = q[0] - p[0], ey = q[1] - p[1];
        const den = dx * ey - dy * ex; if (Math.abs(den) < 1e-9) continue;
        const u = ((p[0] - bx) * ey - (p[1] - by) * ex) / den;      // param along line
        const v = ((p[0] - bx) * dy - (p[1] - by) * dx) / den;      // param along segment
        if (v >= 0 && v < 1) ts.push(u);
      }
      ts.sort((m, n) => m - n);
      // even-odd: pairs (0,1),(2,3)… are inside
      for (let i = 0; i + 1 < ts.length; i += 2) {
        const pA = [bx + dx * ts[i], by + dy * ts[i]], pB = [bx + dx * ts[i + 1], by + dy * ts[i + 1]];
        if (Math.hypot(pB[0] - pA[0], pB[1] - pA[1]) < 2) continue;
        if (!Hh.inside) continue;
        out.push({ k, w: S.stroke.w, tag: 'hatch', geo: { type: 'line', p: [pA, pB] }, d: linePath([pA, pB]) });
      }
    }
    return out;
  }

  // ── MOIRE: two periodic sets, slightly mismatched, covering the card ─────
  function buildMoire(S) {
    const Mo = S.moire, out = [];
    const sets = [
      { cx: Mo.cx, cy: Mo.cy, ang: Mo.ang, gap: Mo.gap, k0: 0 },
      { cx: Mo.cx + Mo.dx, cy: Mo.cy + Mo.dy, ang: Mo.ang + Mo.rot2, gap: Mo.gap * Mo.gap2, k0: 1000 },
    ];
    for (const st of sets) {
      if (Mo.kind === 'lines') {
        const a = st.ang * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx, L = 1400;
        const count = Math.ceil(Mo.reach / st.gap);
        for (let i = -count; i <= count; i++) {
          const off = i * st.gap, bx = st.cx + nx * off, by = st.cy + ny * off;
          const p = [[bx - dx * L / 2, by - dy * L / 2], [bx + dx * L / 2, by + dy * L / 2]];
          out.push({ k: st.k0 + i, w: S.stroke.w, tag: 'moire', geo: { type: 'line', p }, d: linePath(p) });
        }
      } else {
        const count = Math.ceil(Mo.reach / st.gap), M = 96;
        for (let i = 1; i <= count; i++) {
          const r = i * st.gap, pts = [];
          for (let j = 0; j < M; j++) { const t = j / M * TAU; pts.push([st.cx + Math.cos(t) * r, st.cy + Math.sin(t) * r]); }
          out.push({ k: st.k0 + i, w: S.stroke.w, tag: 'moire', geo: { type: 'pts', pts, closed: true }, d: ptsToPath(pts, true) });
        }
      }
    }
    return out;
  }

  // ── KISS: tangent circles, rings emanating ──────────────────────────────
  function buildKiss(S) {
    const K = S.kiss, out = [];
    const a = K.ang * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a);     // axis through the centres
    const radii = [];
    for (let i = 0; i < K.count; i++) radii.push(K.r * Math.pow(K.ratio, i));
    // lay the circles out tangent along the axis, centred as a group
    const total = radii.reduce((t, r) => t + 2 * r, 0);
    let pos = -total / 2;
    const centres = radii.map((r) => { const c = pos + r; pos += 2 * r; return { d: c, r }; });
    centres.forEach((c, ci) => {
      const cx = K.cx + ux * c.d, cy = K.cy + uy * c.d;
      // which way is "away"? outward along the axis for the end circles; middle circles get both halves in 'away' mode only if count==2
      const dirs = [];
      if (K.mode === 'full') dirs.push(null);
      else if (K.mode === 'inner') { if (ci > 0) dirs.push(-1); if (ci < K.count - 1) dirs.push(1); }
      else { if (ci === 0) dirs.push(-1); if (ci === K.count - 1) dirs.push(1); }
      for (let i = 0; i < K.n; i++) {
        const r = c.r + i * K.gap;
        for (const dir of dirs) {
          const pts = [], M = 72;
          if (dir === null) { for (let j = 0; j < M; j++) { const t = j / M * TAU; pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]); }
            out.push({ k: ci * 100 + i, w: S.stroke.w, tag: 'kiss', geo: { type: 'pts', pts, closed: true }, d: ptsToPath(pts, true) }); }
          else {
            const half = K.sweep * Math.PI / 360, base = a + (dir > 0 ? 0 : Math.PI);
            for (let j = 0; j <= M; j++) { const t = base - half + (2 * half) * j / M; pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]); }
            out.push({ k: ci * 100 + i, w: S.stroke.w, tag: 'kiss', geo: { type: 'pts', pts, closed: false }, d: ptsToPath(pts, false) });
          }
        }
      }
    });
    return out;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DEPTH FAMILIES
  // ═══════════════════════════════════════════════════════════════════════

  // Cut polyline `pts` (with parallel `zs`) at the given arclength positions,
  // removing ±g around each. Returns runs of { pts, zs }.
  function cutRuns(pts, zs, cuts, g, closed) {
    const n = pts.length;
    const al = [0]; for (let i = 1; i < n; i++) al.push(al[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = al[n - 1] + (closed ? Math.hypot(pts[0][0] - pts[n - 1][0], pts[0][1] - pts[n - 1][1]) : 0);
    const dead = (sAt) => cuts.some((c) => { let d = Math.abs(sAt - c); if (closed) d = Math.min(d, total - d); return d < g; });
    const runs = []; let cur = null;
    const push = (p, z) => { if (!cur) cur = { pts: [], zs: [] }; cur.pts.push(p); cur.zs.push(z); };
    const flush = () => { if (cur && cur.pts.length > 1) runs.push(cur); cur = null; };
    for (let i = 0; i < n; i++) {
      if (dead(al[i])) { flush(); continue; }
      push(pts[i], zs[i]);
    }
    flush();
    // closed curve: if first and last runs are both alive at the seam, join them
    if (closed && runs.length > 1 && !dead(0) && !dead(al[n - 1])) {
      const last = runs.pop(); runs[0] = { pts: last.pts.concat(runs[0].pts), zs: last.zs.concat(runs[0].zs) };
    }
    return runs;
  }
  // 2D segment intersection → [t_on_a, t_on_b] or null
  function segX(p, q, r, s2) {
    const d1x = q[0] - p[0], d1y = q[1] - p[1], d2x = s2[0] - r[0], d2y = s2[1] - r[1];
    const den = d1x * d2y - d1y * d2x; if (Math.abs(den) < 1e-9) return null;
    const t = ((r[0] - p[0]) * d2y - (r[1] - p[1]) * d2x) / den, u = ((r[0] - p[0]) * d1y - (r[1] - p[1]) * d1x) / den;
    return (t > 0 && t < 1 && u > 0 && u < 1) ? [t, u] : null;
  }

  // ── KNOT ──────────────────────────────────────────────────────────────────
  function buildKnot(S) {
    const K = S.knot, N = 480, out = [];
    const tilt = K.tilt * Math.PI / 180, turn = K.turn * Math.PI / 180;
    const n = Math.max(1, Math.round(K.n));
    // 3D sample, rotate, project
    const strands3 = [];
    for (let si = 0; si < n; si++) {
      const k = si - (n - 1) / 2;
      const pts = [], zs = [];
      for (let i = 0; i < N; i++) {
        const t = i / N * TAU;
        let x = Math.sin(K.a * t), y = Math.sin(K.b * t), z = Math.sin(K.c * t + K.phi * Math.PI / 180) * K.zAmp;
        // strand offset along the curve's 3D normal (approx: offset in z and radial)
        if (k) { const r = Math.hypot(x, y) || 1; x += (x / r) * k * K.gap / (K.w / 2); y += (y / r) * k * K.gap / (K.h / 2); }
        // turn about y, tilt about x
        let x1 = x * Math.cos(turn) + z * Math.sin(turn), z1 = -x * Math.sin(turn) + z * Math.cos(turn);
        let y2 = y * Math.cos(tilt) - z1 * Math.sin(tilt), z2 = y * Math.sin(tilt) + z1 * Math.cos(tilt);
        const f = 1 / (1 + K.persp * z2 * 0.5);                      // perspective: nearer (z2>0) = bigger
        pts.push([K.cx + x1 * f * K.w / 2, K.cy + y2 * f * K.h / 2]);
        zs.push((z2 + 1) / 2);                                          // 0 far … 1 near
      }
      strands3.push({ k, pts, zs });
    }
    // occlusion: for every 2D crossing, cut the farther strand
    const g = S.stroke.w * K.cut;
    const cutsFor = strands3.map(() => []);
    const al = strands3.map((s) => { const a = [0]; for (let i = 1; i < s.pts.length; i++) a.push(a[i - 1] + Math.hypot(s.pts[i][0] - s.pts[i - 1][0], s.pts[i][1] - s.pts[i - 1][1])); return a; });
    for (let A = 0; A < strands3.length; A++) for (let B = A; B < strands3.length; B++) {
      const P = strands3[A].pts, Q = strands3[B].pts, nP = P.length, nQ = Q.length;
      for (let i = 0; i < nP; i++) {
        const jStart = A === B ? i + 2 : 0;
        for (let j = jStart; j < nQ; j++) {
          if (A === B && ((i === 0 && j === nQ - 1))) continue;
          const x = segX(P[i], P[(i + 1) % nP], Q[j], Q[(j + 1) % nQ]); if (!x) continue;
          const zA = strands3[A].zs[i] * (1 - x[0]) + strands3[A].zs[(i + 1) % nP] * x[0];
          const zB = strands3[B].zs[j] * (1 - x[1]) + strands3[B].zs[(j + 1) % nQ] * x[1];
          if (Math.abs(zA - zB) < 0.02) continue;                        // grazing — leave it
          const segLenA = Math.hypot(P[(i + 1) % nP][0] - P[i][0], P[(i + 1) % nP][1] - P[i][1]);
          const segLenB = Math.hypot(Q[(j + 1) % nQ][0] - Q[j][0], Q[(j + 1) % nQ][1] - Q[j][1]);
          if (zA < zB) cutsFor[A].push(al[A][i] + x[0] * segLenA); else cutsFor[B].push(al[B][j] + x[1] * segLenB);
        }
      }
    }
    strands3.forEach((s, si) => {
      const runs = cutsFor[si].length ? cutRuns(s.pts, s.zs, cutsFor[si], g, true) : [{ pts: s.pts, zs: s.zs }];
      runs.forEach((r, ri) => {
        const closed = runs.length === 1 && !cutsFor[si].length;
        out.push({ k: s.k, w: S.stroke.w, tag: 'knot', geo: { type: 'pts', pts: r.pts, zs: r.zs, closed }, d: ptsToPath(r.pts, closed), depth3: { wNear: K.wNear, wFar: K.wFar, aFar: K.aFar } });
      });
    });
    return out;
  }

  // ── SHEET ─────────────────────────────────────────────────────────────────
  function buildSheet(S) {
    const Sh = S.sheet, out = [], n = Math.max(2, Math.round(Sh.n)), M = 220;
    // Geometric height profiles — hard forms, not blobs.
    const height = (u, v) => {
      const du = (u - Sh.px) / Sh.size, dv = (v - Sh.py) / (Sh.size * 0.8);
      switch (Sh.profile) {
        case 'dome':     { const d2 = du * du + dv * dv; return d2 < 1 ? Math.sqrt(1 - d2) : 0; }          // hemisphere under the sheet
        case 'cylinder': { return Math.abs(du) < 1 ? Math.sqrt(1 - du * du) : 0; }                          // half-pipe across the full depth
        case 'ridge':    { return Math.abs(du) < 1 ? 0.5 + 0.5 * Math.cos(du * Math.PI) : 0; }              // one clean cosine ridge
        case 'fold':     { return Math.abs(du) < 1 ? 1 - Math.abs(du) : 0; }                                // a crease, two planes
        case 'step':     { return Math.abs(du) < 1 && Math.abs(dv) < 1 ? 1 : 0; }                           // a block
        default: return 0;
      }
    };
    // lines from back (v=0, top) to front (v=1, bottom); foreshortened spacing
    const lines = [];
    for (let i = 0; i < n; i++) {
      const v = i / (n - 1);
      const fv = Math.pow(v, 1 + Sh.persp);                              // bunch toward the back
      const yBase = Sh.cy - Sh.depth / 2 + fv * Sh.depth;
      const scale = 0.55 + 0.45 * fv;                                     // back lines narrower
      const pts = [], zs = [];
      for (let j = 0; j <= M; j++) {
        const u = j / M;
        const x = Sh.cx + (u - 0.5) * Sh.w * scale;
        const y = yBase - height(u, v) * Sh.amp * (0.6 + 0.4 * fv);
        pts.push([x, y]); zs.push(fv);
      }
      lines.push({ pts, zs });
    }
    // hidden-line: draw front to back; a back line is hidden where a nearer line is higher (smaller y) at that x
    const horizon = new Map();                                             // x-bucket → min y seen
    const bucket = (x) => Math.round(x / 2);
    for (let i = n - 1; i >= 0; i--) {
      const L = lines[i]; let cur = null;
      const flush = () => { if (cur && cur.pts.length > 1) out.push({ k: i, w: S.stroke.w, tag: 'sheet', geo: { type: 'pts', pts: cur.pts, zs: cur.zs, closed: false }, d: ptsToPath(cur.pts, false), depth3: { wNear: Sh.wNear, wFar: Sh.wFar, aFar: Sh.aFar } }); cur = null; };
      for (let j = 0; j < L.pts.length; j++) {
        const [x, y] = L.pts[j], b = bucket(x), hz = horizon.get(b);
        const visible = hz === undefined || y < hz - 0.5;
        if (visible) { if (!cur) cur = { pts: [], zs: [] }; cur.pts.push(L.pts[j]); cur.zs.push(L.zs[j]); } else flush();
      }
      flush();
      for (const [x, y] of L.pts) { const b = bucket(x); const hz = horizon.get(b); if (hz === undefined || y < hz) horizon.set(b, y); }
    }
    return out;
  }

  // ── WIRE: wireframe primitives ───────────────────────────────────────────
  // Lines are generated on the surface with their normals; after rotation,
  // points whose normal faces away are culled (back-face), the rest projected.
  function buildWire(S) {
    const Wd = S.wire, out = [];
    const tilt = Wd.tilt * Math.PI / 180, turn = Wd.turn * Math.PI / 180;
    const rot = (p) => {                                   // turn about y, then tilt about x
      let [x, y, z] = p;
      [x, z] = [x * Math.cos(turn) + z * Math.sin(turn), -x * Math.sin(turn) + z * Math.cos(turn)];
      [y, z] = [y * Math.cos(tilt) - z * Math.sin(tilt), y * Math.sin(tilt) + z * Math.cos(tilt)];
      return [x, y, z];
    };
    const proj = (p) => { const f = 1 / (1 + Wd.persp * p[2] * 0.5); return [Wd.cx + p[0] * f * Wd.size, Wd.cy - p[1] * f * Wd.size]; };
    const lines = [];                                      // each: [{p:[x,y,z], n:[nx,ny,nz]}...], closed
    const M = 96;
    const add = (fn, closed) => { const L = []; for (let i = 0; i < (closed ? M : M + 1); i++) L.push(fn(i / M)); lines.push({ L, closed }); };
    const sh = Wd.shape;
    if (sh === 'sphere') {
      for (let i = 1; i < Wd.rings; i++) { const ph = -Math.PI / 2 + Math.PI * i / Wd.rings, r = Math.cos(ph), y = Math.sin(ph);
        add((t) => { const a = t * TAU, p = [r * Math.cos(a), y, r * Math.sin(a)]; return { p, n: p }; }, true); }
      for (let j = 0; j < Wd.meridians; j++) { const a = Math.PI * j / Wd.meridians;
        add((t) => { const ph = -Math.PI + t * TAU, r = Math.cos(ph); const p = [r * Math.cos(a), Math.sin(ph), r * Math.sin(a)]; return { p, n: p }; }, true); }
    } else if (sh === 'cylinder') {
      const h = 1.1;
      for (let i = 0; i <= Wd.rings; i++) { const y = -h + 2 * h * i / Wd.rings; const rim = i === 0 || i === Wd.rings;
        add((t) => { const a = t * TAU; return { p: [Math.cos(a), y, Math.sin(a)], n: rim ? null : [Math.cos(a), 0, Math.sin(a)] }; }, true); }
      for (let j = 0; j < Wd.meridians; j++) { const a = TAU * j / Wd.meridians;
        add((t) => ({ p: [Math.cos(a), -h + 2 * h * t, Math.sin(a)], n: [Math.cos(a), 0, Math.sin(a)] }), false); }
    } else if (sh === 'cone') {
      for (let i = 1; i <= Wd.rings; i++) { const y = -1 + 2 * i / Wd.rings, r = (1 - (y + 1) / 2);
        add((t) => { const a = t * TAU; return { p: [r * Math.cos(a), y, r * Math.sin(a)], n: [Math.cos(a), 0.5, Math.sin(a)] }; }, true); }
      for (let j = 0; j < Wd.meridians; j++) { const a = TAU * j / Wd.meridians;
        add((t) => ({ p: [(1 - t) * Math.cos(a), -1 + 2 * t, (1 - t) * Math.sin(a)], n: [Math.cos(a), 0.5, Math.sin(a)] }), false); }
    } else if (sh === 'torus') {
      for (let i = 0; i < Wd.rings; i++) { const a = TAU * i / Wd.rings, cx = Math.cos(a) * Wd.R, cz = Math.sin(a) * Wd.R;
        add((t) => { const b = t * TAU, nx = Math.cos(a) * Math.cos(b), ny = Math.sin(b), nz = Math.sin(a) * Math.cos(b);
          return { p: [cx + Wd.r * nx, Wd.r * ny, cz + Wd.r * nz], n: [nx, ny, nz] }; }, true); }
      for (let j = 0; j < Wd.meridians; j++) { const b = TAU * j / Wd.meridians;
        add((t) => { const a = t * TAU, nx = Math.cos(a) * Math.cos(b), ny = Math.sin(b), nz = Math.sin(a) * Math.cos(b);
          return { p: [Math.cos(a) * Wd.R + Wd.r * nx, Wd.r * ny, Math.sin(a) * Wd.R + Wd.r * nz], n: [nx, ny, nz] }; }, true); }
    } else if (sh === 'helix') {
      const h = 1.1, K = 12 * Wd.turns;
      const L = []; for (let i = 0; i <= K * 8; i++) { const t = i / (K * 8), a = t * TAU * Wd.turns; L.push({ p: [Math.cos(a), -h + 2 * h * t, Math.sin(a)], n: [Math.cos(a), 0, Math.sin(a)] }); }
      lines.push({ L, closed: false });
    } else if (sh === 'stack') {                            // ellipses stacked along y, no culling: a transparent coil of rings
      for (let i = 0; i <= Wd.rings; i++) { const y = -1 + 2 * i / Wd.rings; add((t) => { const a = t * TAU; return { p: [Math.cos(a), y, Math.sin(a)], n: null }; }, true); }
    }
    // rotate, cull, project → runs
    lines.forEach((ln, li) => {
      const pts3 = ln.L.map((q) => ({ p: rot(q.p), n: q.n ? rot(q.n) : null }));
      let cur = null; const runs = [];
      const flush = () => { if (cur && cur.pts.length > 1) runs.push(cur); cur = null; };
      const count = ln.closed ? pts3.length + 1 : pts3.length;
      for (let i = 0; i < count; i++) {
        const q = pts3[i % pts3.length];
        const vis = !Wd.cull || !q.n || q.n[2] > -0.02;
        if (!vis) { flush(); continue; }
        if (!cur) cur = { pts: [], zs: [] };
        cur.pts.push(proj(q.p)); cur.zs.push((q.p[2] + 1.5) / 3);
      }
      flush();
      const wholeVisible = runs.length === 1 && runs[0].pts.length === pts3.length + (ln.closed ? 1 : 0);
      runs.forEach((r) => {
        const closed = ln.closed && wholeVisible;
        const pts = closed ? r.pts.slice(0, -1) : r.pts;
        out.push({ k: li, w: S.stroke.w, tag: 'wire', geo: { type: 'pts', pts, zs: r.zs, closed }, d: ptsToPath(pts, closed), depth3: { wNear: Wd.wNear, wFar: Wd.wFar, aFar: Wd.aFar } });
      });
    });
    return out;
  }

  function build(state) {
    const S = merge(DEFAULTS, state);
    switch (S.family) {
      case 'wire':       return buildWire(S);
      case 'knot':       return buildKnot(S);
      case 'sheet':      return buildSheet(S);
      case 'kiss':       return buildKiss(S);
      case 'hatch':      return buildHatch(S);
      case 'moire':      return buildMoire(S);
      case 'confluence': return buildConfluence(S);
      case 'offset':     return buildOffset(S);
      case 'blend':      return buildBlend(S);
      case 'burst':      return buildBurst(S);
      case 'waves':      return buildWaves(S);
      default:           return buildLissajous(S);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CHUNKING — split any strand into K pieces, each with a centre u ∈ [0,1]
  // and a centroid (for field colour). Pieces overlap by one sample so the
  // joins are seamless under round caps.
  // ═══════════════════════════════════════════════════════════════════════
  function splitCubic(p, t) {
    const L = (a, b) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const p01 = L(p[0], p[1]), p12 = L(p[1], p[2]), p23 = L(p[2], p[3]);
    const p012 = L(p01, p12), p123 = L(p12, p23), m = L(p012, p123);
    return [[p[0], p01, p012, m], [m, p123, p23, p[3]]];
  }
  function cubicChunks(p, K) {
    const out = []; let rest = p;
    for (let i = 0; i < K; i++) {
      const t = 1 / (K - i);
      if (i === K - 1) { out.push(rest); break; }
      const [a, b] = splitCubic(rest, t); out.push(a); rest = b;
    }
    return out;
  }
  function chunk(strand, K) {
    const g = strand.geo, parts = [];
    if (g.type === 'pts') {
      const n = g.pts.length, segs = g.closed ? n : n - 1;
      for (let c = 0; c < K; c++) {
        const i0 = Math.floor(segs * c / K), i1 = Math.floor(segs * (c + 1) / K);
        if (i1 <= i0) continue;
        const pts = [];
        for (let i = i0; i <= i1; i++) pts.push(g.pts[g.closed ? i % n : Math.min(i, n - 1)]);
        // extend one sample each side as Catmull-Rom context, then drop them from the path
        const ctx = [g.pts[g.closed ? (i0 - 1 + n) % n : Math.max(0, i0 - 1)], ...pts, g.pts[g.closed ? (i1 + 1) % n : Math.min(n - 1, i1 + 1)]];
        const d = ptsToPathCtx(ctx);
        const mid = pts[Math.floor(pts.length / 2)];
        let z;
        if (g.zs) { let acc = 0, cnt = 0; for (let i = i0; i <= i1; i++) { acc += g.zs[g.closed ? i % n : Math.min(i, n - 1)]; cnt++; } z = acc / cnt; }
        parts.push({ d, u: (c + 0.5) / K, u0: c / K, u1: (c + 1) / K, at: mid, a: pts[0], b: pts[pts.length - 1], z });
      }
    } else if (g.type === 'cubic') {
      cubicChunks(g.p, K).forEach((p, c) => parts.push({ d: cubicPath(p), u: (c + 0.5) / K, u0: c / K, u1: (c + 1) / K, at: midOfCubic(p), a: p[0], b: p[3] }));
    } else {
      const [a, b] = g.p;
      for (let c = 0; c < K; c++) {
        const t0 = c / K, t1 = (c + 1) / K;
        const p = [[a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0], [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1]];
        parts.push({ d: linePath(p), u: (c + 0.5) / K, u0: t0, u1: t1, at: [(p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2], a: p[0], b: p[1] });
      }
    }
    return parts;
  }
  // Catmull-Rom over ctx[1..n-2], using ctx[0] and ctx[n-1] only as tangents.
  function ptsToPathCtx(ctx) {
    const n = ctx.length; if (n < 4) return ptsToPath(ctx.slice(1, -1), false);
    let d = `M${f2(ctx[1][0])} ${f2(ctx[1][1])}`;
    for (let i = 1; i < n - 2; i++) {
      const p0 = ctx[i - 1], p1 = ctx[i], p2 = ctx[i + 1], p3 = ctx[i + 2];
      d += `C${f2(p1[0] + (p2[0] - p0[0]) / 6)} ${f2(p1[1] + (p2[1] - p0[1]) / 6)} ${f2(p2[0] - (p3[0] - p1[0]) / 6)} ${f2(p2[1] - (p3[1] - p1[1]) / 6)} ${f2(p2[0])} ${f2(p2[1])}`;
    }
    return d;
  }
  function midOfCubic(p) {
    const t = 0.5, mt = 1 - t;
    return [mt * mt * mt * p[0][0] + 3 * mt * mt * t * p[1][0] + 3 * mt * t * t * p[2][0] + t * t * t * p[3][0],
            mt * mt * mt * p[0][1] + 3 * mt * mt * t * p[1][1] + 3 * mt * t * t * p[2][1] + t * t * t * p[3][1]];
  }

  // ═══════════════════════════════════════════════════════════════════════
  // COLOUR
  // ═══════════════════════════════════════════════════════════════════════
  function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgb2hex(c) { return '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase(); }
  function lerp3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function ramp(stops, u) {
    const cs = stops.map(hex2rgb);
    if (cs.length === 1) return rgb2hex(cs[0]);
    const x = Math.min(1, Math.max(0, u)) * (cs.length - 1), i = Math.min(cs.length - 2, Math.floor(x));
    return rgb2hex(lerp3(cs[i], cs[i + 1], x - i));
  }
  // Catmull-Rom in 1D over 4 samples
  function cr(p0, p1, p2, p3, t) {
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
  }
  // Bicubic sample of the mesh at card position (x,y), after meshT.
  function field(S, x, y) {
    const M = S.mesh, T = S.meshT, W = S.card.w, H = S.card.h;
    // card → unit, apply inverse transform (rotate about centre, scale, offset)
    let u = x / W - 0.5 - T.x, v = y / H - 0.5 - T.y;
    if (T.rot) { const a = -T.rot * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a); const ar = W / H; [u, v] = [(u * ar * c - v * sn) / ar, u * ar * sn + v * c]; }
    u = u / T.scale + 0.5; v = v / T.scale + 0.5;
    u = Math.min(1, Math.max(0, u)); v = Math.min(1, Math.max(0, v));
    const cols = M.cols, rows = M.rows;
    const rgb = M._rgb || (M._rgb = M.colors.map(hex2rgb));
    const at = (c, r) => rgb[Math.min(rows - 1, Math.max(0, r)) * cols + Math.min(cols - 1, Math.max(0, c))];
    const gx = u * (cols - 1), gy = v * (rows - 1);
    const cx = Math.min(cols - 1, Math.floor(gx)), cy = Math.min(rows - 1, Math.floor(gy));
    const tx = gx - cx, ty = gy - cy;
    const out = [0, 0, 0];
    for (let ch = 0; ch < 3; ch++) {
      const rowv = [];
      for (let j = -1; j <= 2; j++) rowv.push(cr(at(cx - 1, cy + j)[ch], at(cx, cy + j)[ch], at(cx + 1, cy + j)[ch], at(cx + 2, cy + j)[ch], tx));
      out[ch] = cr(rowv[0], rowv[1], rowv[2], rowv[3], ty);
    }
    return rgb2hex(out);
  }
  // ── Random mesh. Picks a palette, then colours each cell by a smooth
  // scalar field (sum of a few random sines) run through a ramp of that
  // palette, so colours pool into regions rather than scatter. ──────────
  const BRAND = ['#3E7CB1', '#C9D6E8', '#F2B134', '#FBE7B5', '#1F2A36', '#F2F2F0'];
  const TONES = ['#5B3A29', '#8C7A6B', '#A8B5C7', '#E7C9B5', '#F1D3C2', '#7FA7C9', '#2F6690', '#1F4E79', '#B8B2A7'];
  function hsl2hex(h, s, l) {
    h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return rgb2hex([f(0) * 255, f(8) * 255, f(4) * 255]);
  }
  function randomMesh(cols, rows, opts = {}) {
    const rnd = opts.rnd || Math.random;
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const mode = opts.palette || pick(['figma', 'figma', 'brand', 'harmony', 'harmony']);
    let pal;
    if (mode === 'figma') pal = [pick(TONES), pick(TONES), pick(TONES), pick(TONES)];
    else if (mode === 'brand') pal = [pick(BRAND), pick(BRAND), pick(BRAND), pick(BRAND)];
    else {
      const h0 = rnd() * 360, spread = pick([25, 40, 60, 150, 180]);
      pal = [hsl2hex(h0, 55 + rnd() * 35, 22 + rnd() * 18), hsl2hex(h0 + spread * 0.5, 60 + rnd() * 30, 55 + rnd() * 15),
             hsl2hex(h0 + spread, 45 + rnd() * 35, 70 + rnd() * 18), hsl2hex(h0 - spread * 0.6, 50 + rnd() * 30, 40 + rnd() * 20)];
    }
    // two low-frequency fields
    const waves = [];
    for (let i = 0; i < 3; i++) waves.push({ fx: (0.6 + rnd() * 1.6) * TAU, fy: (0.6 + rnd() * 1.6) * TAU, px: rnd() * TAU, py: rnd() * TAU, w: 0.4 + rnd() * 0.6 });
    const fieldAt = (u, v) => { let a = 0, t = 0; for (const w of waves) { a += w.w * Math.sin(u * w.fx + w.px) * Math.cos(v * w.fy + w.py); t += w.w; } return 0.5 + 0.5 * (a / t); };
    const colors = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const u = cols === 1 ? 0.5 : c / (cols - 1), v = rows === 1 ? 0.5 : r / (rows - 1);
      colors.push(ramp(pal, fieldAt(u, v)));
    }
    return { cols, rows, colors, palette: mode };
  }

  // Resample a mesh to a new grid size (bicubic), returns a new mesh object.
  function resampleMesh(S, cols, rows) {
    const colors = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = (cols === 1 ? 0.5 : c / (cols - 1)) * S.card.w, y = (rows === 1 ? 0.5 : r / (rows - 1)) * S.card.h;
      colors.push(field(Object.assign({}, S, { meshT: { x: 0, y: 0, scale: 1, rot: 0 } }), x, y));
    }
    return { cols, rows, colors };
  }
  function stops(C) { const s = C.three ? C.stops.slice(0, 3) : C.stops.slice(0, 2); return C.reverse ? s.slice().reverse() : s; }
  const wrap01 = (u) => ((u % 1) + 1) % 1;

  // paint(): strands → drawable parts, applying colour mode + depth.
  function paint(state, strands) {
    const S = merge(DEFAULTS, state), C = S.color, D = S.depth;
    const anyZ = strands.some((s) => s.depth3 && s.geo && s.geo.zs);
    const needChunks = C.mode === 'along' || C.mode === 'field' || D.on || anyZ;
    const K = Math.max(2, Math.round(needChunks ? (C.mode === 'solid' || C.mode === 'across' || C.mode === 'linear' ? D.chunks : C.chunks) : 1));
    const n = strands.length;
    const parts = [];
    strands.forEach((s, i) => {
      const uk = n > 1 ? i / (n - 1) : 0;
      let base = C.stops[0];
      if (C.mode === 'across') base = ramp(stops(C), wrap01(uk + C.offset));
      if (C.mode === 'linear') base = 'url(#ringGrad)';
      if (!needChunks) { parts.push({ d: s.d, w: s.w, color: base, opacity: 1, k: s.k, tag: s.tag }); return; }
      const chunks = chunk(s, K);
      const closed = s.geo.type === 'pts' && s.geo.closed;
      chunks.forEach((p, ci) => {
        // Colour at both ends of the chunk → continuous across joins.
        let c0 = base, c1 = base;
        if (C.mode === 'along') { c0 = ramp(stops(C), wrap01(p.u0 + C.offset)); c1 = ramp(stops(C), wrap01(p.u1 + C.offset)); }
        if (C.mode === 'field') { c0 = field(S, p.a[0], p.a[1]); c1 = field(S, p.b[0], p.b[1]); }
        let w = s.w, opacity = 1;
        if (D.on) {
          const ph = Math.sin(TAU * D.freq * p.u + D.phase * Math.PI / 180);
          w = Math.max(0.1, s.w * (1 + D.width * ph));
          opacity = Math.max(0.03, 1 - D.alpha * (0.5 + 0.5 * ph));
        }
        if (s.depth3 && p.z !== undefined) {                                   // 0 far … 1 near
          const d3 = s.depth3;
          w = Math.max(0.1, w * (d3.wFar + (d3.wNear - d3.wFar) * p.z));
          opacity = Math.min(opacity, d3.aFar + (1 - d3.aFar) * p.z);
        }
        // Internal joins are butt: both chunks share the point AND the tangent,
        // so the two cuts coincide and nothing overlaps. True ends get a dot.
        parts.push({ d: p.d, w, color: c0 === c1 ? c0 : null, c0, c1, a: p.a, b: p.b, opacity, k: s.k, tag: s.tag, cap: 'butt' });
        if (!closed && S.stroke.cap === 'round') {
          if (ci === 0) parts.push({ dot: p.a, w, color: c0, opacity, k: s.k, tag: s.tag });
          if (ci === chunks.length - 1) parts.push({ dot: p.b, w, color: c1, opacity, k: s.k, tag: s.tag });
        }
      });
    });
    return parts;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SVG
  // ═══════════════════════════════════════════════════════════════════════
  function gradientDef(S) {
    const C = S.color, a = C.angle * Math.PI / 180;
    const x1 = 50 - Math.cos(a) * 50, y1 = 50 - Math.sin(a) * 50, x2 = 50 + Math.cos(a) * 50, y2 = 50 + Math.sin(a) * 50;
    const ss = stops(C);
    return `<linearGradient id="ringGrad" x1="${f2(x1)}%" y1="${f2(y1)}%" x2="${f2(x2)}%" y2="${f2(y2)}%">` +
      ss.map((c, i) => `<stop offset="${(i / (ss.length - 1) * 100).toFixed(1)}%" stop-color="${c}"/>`).join('') + `</linearGradient>`;
  }
  // Extend an open path by `e` along its end tangents (first-order; e is tiny).
  // Kills the anti-alias hairline where two butt-capped chunks meet. The
  // gradient stays anchored on the true endpoints, so the overlap region is
  // the same colour from both sides and disappears.
  const SEAM = 0.6;
  function extendPath(d, a, b, e) {
    const nums = d.replace(/[MCLZ]/g, ' ').trim().split(/\s+/).map(Number);
    if (nums.length < 4) return d;
    // tangent at start: from first point toward first control/next point
    let tx = nums[2] - nums[0], ty = nums[3] - nums[1]; let L = Math.hypot(tx, ty) || 1;
    const a2 = [a[0] - tx / L * e, a[1] - ty / L * e];
    // tangent at end: from last control/prev point toward last point
    const n = nums.length;
    tx = nums[n - 2] - nums[n - 4]; ty = nums[n - 1] - nums[n - 3]; L = Math.hypot(tx, ty) || 1;
    const b2 = [b[0] + tx / L * e, b[1] + ty / L * e];
    return `M${f2(a2[0])} ${f2(a2[1])}L${f2(a[0])} ${f2(a[1])}` + d.slice(d.indexOf(d.match(/[CL]/)[0])) + `L${f2(b2[0])} ${f2(b2[1])}`;
  }

  // Render parts → { defs, paths }. smooth=true gives each two-colour chunk its
  // own linear gradient along its chord (continuous colour); smooth=false
  // flattens to the start colour (max compatibility, visibly stepped).
  function partsSVG(S, parts, opts = {}) {
    const smooth = opts.smooth !== false;
    const defs = [], paths = [];
    let gi = 0;
    for (const p of parts) {
      const op = p.opacity < 1 ? ` stroke-opacity="${f2(p.opacity)}"` : '';
      if (p.dot) {
        paths.push(`<path d="M${f2(p.dot[0])} ${f2(p.dot[1])}L${f2(p.dot[0])} ${f2(p.dot[1])}" stroke="${p.color}" stroke-width="${f2(p.w)}" stroke-linecap="round"${op}/>`);
        continue;
      }
      let stroke = p.color;
      if (!stroke) {
        if (smooth) {
          const id = `${opts.idPrefix || 'g'}${gi++}`;
          defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f2(p.a[0])}" y1="${f2(p.a[1])}" x2="${f2(p.b[0])}" y2="${f2(p.b[1])}"><stop offset="0" stop-color="${p.c0}"/><stop offset="1" stop-color="${p.c1}"/></linearGradient>`);
          stroke = `url(#${id})`;
        } else stroke = p.c0;
      }
      const cap = p.cap ? ` stroke-linecap="${p.cap}"` : '';
      // Overlap only when opaque — with fade, doubled alpha would show as ticks.
      const d = (p.cap === 'butt' && p.a && p.b && p.opacity >= 0.999 && opts.seam !== false) ? extendPath(p.d, p.a, p.b, SEAM) : p.d;
      paths.push(`<path d="${d}" stroke="${stroke}" stroke-width="${f2(p.w)}"${cap}${op}/>`);
    }
    return { defs, paths };
  }

  function toSVG(state, opts = {}) {
    const S = merge(DEFAULTS, state);
    const parts = paint(S, build(S));
    const { w, h, r } = S.card;
    const { defs, paths } = partsSVG(S, parts, opts);
    if (S.color.mode === 'linear') defs.unshift(gradientDef(S));
    if (opts.clip) defs.push(`<clipPath id="card"><rect width="${w}" height="${h}" rx="${r}" ry="${r}"/></clipPath>`);
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none">`,
      defs.length ? `  <defs>${defs.join('')}</defs>` : '',
      `  <g id="ring" stroke-linecap="${S.stroke.cap}" stroke-linejoin="round"${opts.clip ? ' clip-path="url(#card)"' : ''}>`,
      paths.map((p) => '    ' + p).join('\n'),
      `  </g>`,
      opts.furniture || '',
      `</svg>`,
    ].filter(Boolean).join('\n');
  }

  const Ring = { DEFAULTS, merge, clone, build, paint, toSVG, partsSVG, gradientDef, envelope, isClosed, ramp, field, resampleMesh, randomMesh };
  if (typeof module !== 'undefined' && module.exports) module.exports = Ring;
  root.Ring = Ring;
})(typeof window !== 'undefined' ? window : globalThis);
