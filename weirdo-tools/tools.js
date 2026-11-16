/* ============================================================
   WT-SERIES TOOL PROCESSORS
   each: (x: Float32Array, sr: number, p: params) -> Float32Array
   ============================================================ */

// ---------- confield helpers ----------

// bresenham euclidean rhythm, rotated
function euclid(k, n, rot) {
  const pat = new Uint8Array(n);
  for (let i = 0; i < n; i++) pat[(i + rot) % n] = Math.floor(i * k / n) !== Math.floor((i - 1) * k / n) ? 1 : 0;
  return pat;
}

// micro-loop sustain: freeze a slice into a drone of length L (granular hold)
function sustainSlice(seg, L) {
  const win = Math.min(2048, seg.length);
  const start = Math.max(0, Math.floor(seg.length / 2) - win / 2);
  const grain = seg.slice(start, start + win);
  const half = Math.floor(win / 2);
  const out = new Float32Array(L);
  let pos = 0;
  while (pos < L) {
    for (let i = 0; i < win && pos + i < L; i++) {
      // triangular crossfade loop
      const g = i < half ? i / half : (win - i) / half;
      out[pos + i] += grain[i] * g;
    }
    pos += half;
  }
  return out;
}

// weighted similarity walk: pick next slice index near prev centroid
function similarPick(rng, cents, prev, heat) {
  const n = cents.length;
  if (n === 1) return 0;
  const cMax = Math.max(...cents, 1);
  let total = 0;
  const w = new Float32Array(n);
  for (let j = 0; j < n; j++) {
    const sim = 1 - Math.abs(cents[prev] - cents[j]) / cMax;
    w[j] = Math.pow(sim, 3) + heat * 0.4;
    total += w[j];
  }
  let r = rng() * total;
  for (let j = 0; j < n; j++) { r -= w[j]; if (r <= 0) return j; }
  return n - 1;
}

const TOOL_PROCESSORS = {

  // WT-01 — SPECTRAL CHOP : timbre-aware slicer + probability resequencer
  chop(x, sr, p) {
    const rng = mulberry32(p.seed);
    const onsets = detectOnsets(x, sr, p.sens);
    const slices = slicesFromOnsets(x, onsets);
    const slots = Math.round(p.slots);
    const slotLen = Math.floor(x.length / slots);
    const out = new Float32Array(slotLen * slots);
    const FADE = 128;

    for (let s = 0; s < slots; s++) {
      const sl = slices[Math.floor(rng() * slices.length)];
      let seg = x.slice(sl.start, sl.start + sl.len);

      if (rng() < p.pitchProb) {
        const rates = [0.5, 0.75, 1.5, 2.0];
        seg = resample(seg, rates[Math.floor(rng() * rates.length)]);
      }
      if (rng() < p.revProb) seg = seg.slice().reverse();

      let piece;
      if (rng() < p.stutProb) {
        // stutter: repeat the head of the segment across the slot
        const rep = 2 + Math.floor(rng() * 3);
        const chunk = Math.floor(slotLen / rep);
        piece = new Float32Array(slotLen);
        for (let r = 0; r < rep; r++) {
          const c = fadeEdges(seg.slice(0, chunk), 64);
          piece.set(c.subarray(0, Math.min(chunk, slotLen - r * chunk)), r * chunk);
        }
      } else {
        piece = new Float32Array(slotLen);
        piece.set(seg.subarray(0, Math.min(seg.length, slotLen)));
      }
      fadeEdges(piece, FADE);
      out.set(piece, s * slotLen);
    }
    return normalize(out);
  },

  // WT-02 — RATCHET : accelerating pitch-drift delay
  ratchet(x, sr, p) {
    const repeats = Math.round(p.repeats);
    const gaps = [];
    let g = p.time;
    for (let i = 0; i < repeats; i++) {
      gaps.push(Math.max(0.03, g));
      g *= (1 - 0.55 * p.ratchet);
    }
    const totalGap = gaps.reduce((a, b) => a + b, 0);
    const maxLen = Math.floor(x.length + totalGap * sr + x.length);
    const out = new Float32Array(maxLen);
    addInto(out, x, 0, 1.0);

    let pos = 0;
    for (let i = 0; i < repeats; i++) {
      pos += Math.floor(gaps[i] * sr);
      const rate = Math.pow(2, (p.drift * (i + 1)) / 12);
      let echo = resample(x, rate);
      // later repeats get chopped into shrinking stutter chunks
      if (i >= 2) {
        const chunk = Math.max(256, Math.floor(gaps[i] * sr * 0.5));
        const chopped = new Float32Array(echo.length);
        for (let c = 0; c + chunk <= echo.length; c += chunk * 2) {
          const seg = fadeEdges(echo.slice(c, c + chunk), 64);
          chopped.set(seg, c);
          chopped.set(seg, Math.min(c + chunk, chopped.length - chunk));
        }
        echo = chopped;
      }
      addInto(out, echo, pos, Math.pow(p.fb, i + 1) * p.mix);
    }
    return normalize(out);
  },

  // WT-03 — FREEZE : spectral-freeze feedback delay (tails calcify)
  freeze(x, sr, p) {
    const repeats = Math.round(p.repeats);
    const dSamp = Math.floor(p.time * sr);
    const out = new Float32Array(x.length + dSamp * repeats + FFT_SIZE);
    addInto(out, x, 0, 1.0);

    const rng = mulberry32(p.seed);
    const frozen = new Uint8Array(FFT_SIZE / 2); // grows each pass
    let cur = x.slice();

    for (let i = 0; i < repeats; i++) {
      // freeze more bins this pass
      for (let k = 4; k < FFT_SIZE / 2; k++) {
        if (!frozen[k] && rng() < p.freezeAmt * 0.25) frozen[k] = 1;
      }
      const frames = stft(cur);
      if (frames.length > 1) {
        const hold = frames[Math.floor(frames.length / 3)];
        for (let f = 0; f < frames.length; f++) {
          for (let k = 0; k < FFT_SIZE / 2; k++) {
            if (frozen[k]) {
              frames[f].re[k] = hold.re[k]; frames[f].im[k] = hold.im[k];
              frames[f].re[FFT_SIZE - k - 1] = hold.re[FFT_SIZE - k - 1];
              frames[f].im[FFT_SIZE - k - 1] = hold.im[FFT_SIZE - k - 1];
            }
          }
        }
      }
      cur = istft(frames, cur.length);
      fadeEdges(cur, 256);
      addInto(out, cur, dSamp * (i + 1), Math.pow(p.fb, i + 1) * p.mix);
    }
    return normalize(out);
  },

  // WT-04 — CORRIDOR : narrowing resonant band + shrinking tape each pass
  corridor(x, sr, p) {
    const repeats = Math.round(p.repeats);
    const dSamp = Math.floor(p.time * sr);
    const out = new Float32Array(x.length + dSamp * repeats + sr);
    addInto(out, x, 0, 1.0);

    let cur = x.slice();
    let pos = 0;
    for (let i = 0; i < repeats; i++) {
      pos += dSamp;
      // shrink the tape: shorter + pitched up
      cur = resample(cur, 1 + p.shrink * 0.14);
      // narrow the corridor: rising Q, drifting center
      const Q = 0.8 + p.narrow * (i + 1) * 2.2;
      const f0 = p.center * Math.pow(1.06, i);
      cur = bandpass(cur, sr, Math.min(f0, sr * 0.4), Q);
      // resonant bandpass loses energy — re-normalize the pass, gain staging via fb
      normalize(cur, 1.0);
      fadeEdges(cur, 256);
      addInto(out, cur, pos, Math.pow(p.fb, i + 1) * p.mix);
    }
    return normalize(out);
  },

  // WT-05 — SCRAMBLE : feedback loop that reorders the buffer every repeat
  scramble(x, sr, p) {
    const rng = mulberry32(p.seed);
    const repeats = Math.round(p.repeats);
    const dSamp = Math.floor(p.time * sr);
    const out = new Float32Array(x.length + dSamp * repeats);
    addInto(out, x, 0, 1.0);

    let cur = x.slice();
    for (let i = 0; i < repeats; i++) {
      const nChunks = Math.round(p.chunks);
      const cLen = Math.floor(cur.length / nChunks);
      const order = Array.from({ length: nChunks }, (_, k) => k);
      // fisher-yates
      for (let k = order.length - 1; k > 0; k--) {
        const j = Math.floor(rng() * (k + 1));
        [order[k], order[j]] = [order[j], order[k]];
      }
      const next = new Float32Array(cur.length);
      for (let c = 0; c < nChunks; c++) {
        let seg = cur.slice(order[c] * cLen, order[c] * cLen + cLen);
        if (rng() < p.revProb) seg = seg.slice().reverse();
        fadeEdges(seg, 96);
        next.set(seg, c * cLen);
      }
      cur = next;
      addInto(out, cur, dSamp * (i + 1), Math.pow(p.fb, i + 1) * p.mix);
    }
    return normalize(out);
  },

  // WT-06 — MUTATE : markov chain loop mutator (infinite in-family variations)
  mutate(x, sr, p) {
    const rng = mulberry32(p.seed);
    const onsets = detectOnsets(x, sr, p.sens);
    const slices = slicesFromOnsets(x, onsets);
    const n = slices.length;

    // features for similarity links
    const cents = slices.map(s => centroid(x, s.start, s.len));
    const cMax = Math.max(...cents, 1);

    // transition weights: strong "original order" + similarity-based teleports
    const W = [];
    for (let i = 0; i < n; i++) {
      W.push(new Float32Array(n));
      W[i][(i + 1) % n] = 3.0; // original flow
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const sim = 1 - Math.abs(cents[i] - cents[j]) / cMax;
        W[i][j] += Math.pow(sim, 4) * p.chaos * 2.5;
      }
    }

    const targetLen = Math.floor(x.length * p.bars);
    const out = new Float32Array(targetLen);
    let pos = 0;
    let s = 0;
    while (pos < targetLen) {
      const sl = slices[s];
      const seg = fadeEdges(x.slice(sl.start, sl.start + sl.len), 96);
      addInto(out, seg, pos, 1.0);
      pos += sl.len;
      // sample next state
      let total = 0;
      for (let j = 0; j < n; j++) total += W[s][j];
      let r = rng() * total;
      let next = (s + 1) % n;
      for (let j = 0; j < n; j++) {
        r -= W[s][j];
        if (r <= 0) { next = j; break; }
      }
      s = next;
    }
    return normalize(out);
  },

  // WT-07 — CONFIELD : multi-voice generative system over the slice pool
  confield(x, sr, p) {
    const rng = mulberry32(p.seed);
    const onsets = detectOnsets(x, sr, p.sens);
    const raw = slicesFromOnsets(x, onsets);

    // feature-tag every slice, split pool into low / mid / high by centroid
    const tagged = raw.map(s => {
      let e = 0;
      for (let i = 0; i < s.len; i += 8) e += x[s.start + i] * x[s.start + i];
      return { ...s, cent: centroid(x, s.start, s.len), energy: Math.sqrt(e / (s.len / 8)) };
    }).sort((a, b) => a.cent - b.cent);
    const third = Math.max(1, Math.floor(tagged.length / 3));
    const pools = {
      low: tagged.slice(0, third),
      mid: tagged.slice(third, third * 2),
      high: tagged.slice(third * 2),
    };
    for (const k of ['low', 'mid', 'high']) if (pools[k].length === 0) pools[k] = tagged;

    const bars = Math.round(p.bars);
    const STEPS = 16;
    const barLen = x.length;              // treat the source as one bar
    const stepLen = Math.floor(barLen / STEPS);
    const out = new Float32Array(barLen * bars + stepLen * 8);

    const place = (pool, idx, pos, gain, opts = {}) => {
      const sl = pool[idx];
      let seg = x.slice(sl.start, sl.start + sl.len);
      if (opts.rate && opts.rate !== 1) seg = resample(seg, opts.rate);
      if (opts.rev) seg = seg.slice().reverse();
      if (opts.maxLen) seg = seg.slice(0, opts.maxLen);
      fadeEdges(seg, 96);
      addInto(out, seg, pos, gain);
    };

    // system state
    let kLow = 3 + Math.floor(rng() * 3);   // euclidean density, drifts per bar
    let rotLow = 0;
    let midIdx = Math.floor(rng() * pools.mid.length);
    let highIdx = Math.floor(rng() * pools.high.length);
    let chaosAcc = 0;                        // rises when bright slices fire
    const cMax = Math.max(...tagged.map(s => s.cent), 1);

    for (let bar = 0; bar < bars; bar++) {
      // the system rewrites its own rules each bar
      if (rng() < 0.45) kLow = Math.max(2, Math.min(8, kLow + (rng() < 0.5 ? -1 : 1)));
      if (rng() < 0.3) rotLow = Math.floor(rng() * STEPS);
      const lowPat = euclid(kLow, STEPS, rotLow);
      const lowRate = rng() < p.chaos * 0.3 ? [0.5, 0.75, 1.5][Math.floor(rng() * 3)] : 1;

      // texture voice: occasional frozen drone across half a bar
      if (rng() < 0.25 + p.chaos * 0.25) {
        const pool = rng() < 0.5 ? pools.mid : pools.high;
        const sl = pool[Math.floor(rng() * pool.length)];
        const seg = x.slice(sl.start, sl.start + sl.len);
        const drone = sustainSlice(seg, stepLen * (4 + Math.floor(rng() * 8)));
        fadeEdges(drone, Math.floor(drone.length / 4));
        addInto(out, drone, bar * barLen + Math.floor(rng() * 8) * stepLen, 0.22);
      }

      for (let st = 0; st < STEPS; st++) {
        const phase = (bar * STEPS + st) / (bars * STEPS);
        // elastic clock: sine warp, stronger on offbeats, slowly changing rate
        const warp = Math.round(
          p.warp * stepLen * 0.9 *
          Math.sin(2 * Math.PI * (phase * 3 + bar * 0.21)) *
          (st % 2 ? 1 : 0.25)
        );
        const pos = bar * barLen + st * stepLen + warp;

        // LOW voice — euclidean anchor
        if (lowPat[st] && rng() < 0.92) {
          const idx = Math.floor(rng() * pools.low.length);
          place(pools.low, idx, pos, 1.0, { rate: lowRate, maxLen: stepLen * 2 });
        }

        // MID voice — LFO-gated probability + markov similarity walk
        const lfo = Math.abs(Math.sin(2 * Math.PI * (phase * 2 + 0.17)));
        if (rng() < p.density * (0.25 + 0.75 * lfo)) {
          midIdx = similarPick(rng, pools.mid.map(s => s.cent), midIdx, p.chaos);
          const swing = st % 2 ? Math.round(stepLen * 0.12 * p.warp) : 0;
          place(pools.mid, midIdx, pos + swing, 0.65, {
            rev: rng() < p.chaos * 0.35,
            maxLen: stepLen * 2,
          });
        }

        // HIGH voice — glitch layer, ratchets fed by the chaos accumulator
        if (rng() < 0.18 + chaosAcc * 0.45) {
          highIdx = similarPick(rng, pools.high.map(s => s.cent), highIdx, p.chaos);
          const nRat = rng() < p.ratchet * (0.35 + chaosAcc) ? 2 + Math.floor(rng() * 3) : 1;
          const sub = Math.floor(stepLen / nRat);
          for (let r = 0; r < nRat; r++) {
            place(pools.high, highIdx, pos + r * sub, 0.5 - r * 0.07, {
              rev: rng() < 0.3,
              rate: nRat > 1 && rng() < 0.5 ? Math.pow(2, (r + 1) / 12) : 1,
              maxLen: sub,
            });
          }
          // bright events heat the system up
          chaosAcc = Math.min(1, chaosAcc + (pools.high[highIdx].cent / cMax) * 0.12 * p.chaos);
        }
        chaosAcc *= 0.97; // and it always cools
      }
    }
    return normalize(out);
  },
};
