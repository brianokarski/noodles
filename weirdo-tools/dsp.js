/* ============================================================
   WT-SERIES DSP CORE
   pure Float32Array processing. mono. no dependencies.
   ============================================================ */

// ---------- seeded rng ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- FFT (radix-2, in-place) ----------
function fft(re, im, inverse) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (inverse ? 2 : -2) * Math.PI / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cwr = 1, cwi = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * cwr - im[i + k + len / 2] * cwi;
        const vi = re[i + k + len / 2] * cwi + im[i + k + len / 2] * cwr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const nwr = cwr * wr - cwi * wi;
        cwi = cwr * wi + cwi * wr; cwr = nwr;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  }
}

// ---------- STFT ----------
const FFT_SIZE = 1024;
const HOP = 256;
const HANN = (() => {
  const w = new Float32Array(FFT_SIZE);
  for (let i = 0; i < FFT_SIZE; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / FFT_SIZE);
  return w;
})();

function stft(x) {
  const nFrames = Math.max(1, Math.floor((x.length - FFT_SIZE) / HOP) + 1);
  const frames = [];
  for (let f = 0; f < nFrames; f++) {
    const re = new Float32Array(FFT_SIZE);
    const im = new Float32Array(FFT_SIZE);
    const off = f * HOP;
    for (let i = 0; i < FFT_SIZE; i++) re[i] = (x[off + i] || 0) * HANN[i];
    fft(re, im, false);
    frames.push({ re, im });
  }
  return frames;
}

function istft(frames, outLen) {
  const out = new Float32Array(outLen);
  const norm = new Float32Array(outLen);
  for (let f = 0; f < frames.length; f++) {
    const re = frames[f].re.slice();
    const im = frames[f].im.slice();
    fft(re, im, true);
    const off = f * HOP;
    for (let i = 0; i < FFT_SIZE; i++) {
      if (off + i >= outLen) break;
      out[off + i] += re[i] * HANN[i];
      norm[off + i] += HANN[i] * HANN[i];
    }
  }
  for (let i = 0; i < outLen; i++) if (norm[i] > 1e-6) out[i] /= norm[i];
  return out;
}

// ---------- onset detection (spectral flux) ----------
function detectOnsets(x, sr, sensitivity) {
  // sensitivity 0..1  (higher = more slices)
  const frames = stft(x);
  const flux = new Float32Array(frames.length);
  let prevMag = null;
  for (let f = 0; f < frames.length; f++) {
    const { re, im } = frames[f];
    const mag = new Float32Array(FFT_SIZE / 2);
    for (let k = 0; k < FFT_SIZE / 2; k++) mag[k] = Math.hypot(re[k], im[k]);
    if (prevMag) {
      let s = 0;
      for (let k = 0; k < mag.length; k++) {
        const d = mag[k] - prevMag[k];
        if (d > 0) s += d;
      }
      flux[f] = s;
    }
    prevMag = mag;
  }
  // adaptive threshold peak-pick
  const onsets = [];
  const win = 8;
  const minGap = Math.floor(sr * 0.05 / HOP);
  const k = 1.8 - sensitivity * 1.3; // 1.8 .. 0.5
  let last = -minGap;
  for (let f = 2; f < flux.length - 2; f++) {
    let mean = 0, cnt = 0;
    for (let j = Math.max(0, f - win); j < Math.min(flux.length, f + win); j++) { mean += flux[j]; cnt++; }
    mean /= cnt;
    if (flux[f] > mean * (1 + k) && flux[f] >= flux[f - 1] && flux[f] > flux[f + 1] && f - last >= minGap) {
      onsets.push(f * HOP);
      last = f;
    }
  }
  return onsets;
}

function slicesFromOnsets(x, onsets) {
  const pts = onsets.slice();
  if (pts.length === 0 || pts[0] > 2048) pts.unshift(0);
  pts.push(x.length);
  const slices = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const len = pts[i + 1] - pts[i];
    if (len > 512) slices.push({ start: pts[i], len });
  }
  if (slices.length < 2) {
    // fallback: uniform 8
    slices.length = 0;
    const n = 8, L = Math.floor(x.length / n);
    for (let i = 0; i < n; i++) slices.push({ start: i * L, len: L });
  }
  return slices;
}

// ---------- spectral centroid of a segment ----------
function centroid(x, start, len) {
  const n = Math.min(FFT_SIZE, len);
  const re = new Float32Array(FFT_SIZE), im = new Float32Array(FFT_SIZE);
  for (let i = 0; i < n; i++) re[i] = x[start + i] * HANN[Math.floor(i * FFT_SIZE / n)];
  fft(re, im, false);
  let num = 0, den = 0;
  for (let k = 1; k < FFT_SIZE / 2; k++) {
    const m = Math.hypot(re[k], im[k]);
    num += k * m; den += m;
  }
  return den > 1e-9 ? num / den : 0;
}

// ---------- resample (linear) ----------
function resample(x, rate) {
  const outLen = Math.max(1, Math.floor(x.length / rate));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const p = i * rate;
    const i0 = Math.floor(p), frac = p - i0;
    out[i] = (x[i0] || 0) * (1 - frac) + (x[i0 + 1] || 0) * frac;
  }
  return out;
}

// ---------- biquad bandpass (constant peak) ----------
function bandpass(x, sr, freq, Q) {
  const w0 = 2 * Math.PI * freq / sr;
  const alpha = Math.sin(w0) / (2 * Q);
  const b0 = alpha, b1 = 0, b2 = -alpha;
  const a0 = 1 + alpha, a1 = -2 * Math.cos(w0), a2 = 1 - alpha;
  const out = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const y = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = y;
    out[i] = y;
  }
  return out;
}

// ---------- helpers ----------
function normalize(x, peak = 0.95) {
  let m = 0;
  for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i]));
  if (m > 1e-9) {
    const g = peak / m;
    for (let i = 0; i < x.length; i++) x[i] *= g;
  }
  return x;
}

function addInto(dst, src, offset, gain) {
  for (let i = 0; i < src.length; i++) {
    const j = offset + i;
    if (j >= 0 && j < dst.length) dst[j] += src[i] * gain;
  }
}

function fadeEdges(x, n) {
  n = Math.min(n, Math.floor(x.length / 2));
  for (let i = 0; i < n; i++) {
    const g = i / n;
    x[i] *= g;
    x[x.length - 1 - i] *= g;
  }
  return x;
}

// ---------- WAV encode (16-bit mono) ----------
function encodeWav(x, sr) {
  const n = x.length;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); ws(8, 'WAVE');
  ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 1, true); v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  ws(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, x[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}
