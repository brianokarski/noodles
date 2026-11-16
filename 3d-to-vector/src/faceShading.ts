/**
 * Flat-tone face shading for the 2.5D look.
 *
 * We do NOT do gradient/lit shading. Instead every face gets one flat tone from
 * a small ordered palette, chosen purely by which way the face points. This is
 * how flat 2.5D illustration reads as dimensional (top / front / side flats)
 * while staying perfectly flat — no highlights, no gradients.
 */

export type PaletteName = "mono" | "ink";

/** Ordered darkest -> lightest. Index 0 is the "front"/silhouette tone. */
export const PALETTES: Record<PaletteName, readonly string[]> = {
  mono: ["#111111", "#5a5a5a", "#9e9e9e"],
  ink: ["#0c1116", "#1e2833", "#33414f"],
};

export type Axis = "px" | "nx" | "py" | "ny" | "pz" | "nz";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** The world axis a normal most closely points along. */
export function dominantAxis(n: Vec3): Axis {
  const ax = Math.abs(n.x);
  const ay = Math.abs(n.y);
  const az = Math.abs(n.z);
  if (ay >= ax && ay >= az) return n.y >= 0 ? "py" : "ny";
  if (ax >= az) return n.x >= 0 ? "px" : "nx";
  return n.z >= 0 ? "pz" : "nz";
}

/**
 * Map a face orientation to a palette tone index (0 = darkest/front).
 *   top            -> lightest
 *   left/right     -> mid
 *   front/back/bot -> darkest
 * Three flats total => the classic faceted 2.5D read.
 */
export function toneIndexForNormal(n: Vec3): number {
  switch (dominantAxis(n)) {
    case "py":
      return 2; // top catches the "light" -> lightest flat
    case "px":
    case "nx":
      return 1; // sides -> mid flat
    default:
      return 0; // front / back / bottom -> darkest flat
  }
}

/**
 * Resolve the flat hex color for a face.
 * @param silhouette when true, every face uses the single darkest tone.
 */
export function colorForNormal(
  n: Vec3,
  palette: PaletteName,
  silhouette = false,
): string {
  const tones = PALETTES[palette];
  if (silhouette) return tones[0];
  const idx = Math.min(toneIndexForNormal(n), tones.length - 1);
  return tones[idx];
}
