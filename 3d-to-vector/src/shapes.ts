/**
 * Geometry builders + flat-tone triangle grouping.
 *
 * For the 2.5D flat look we want each face to be ONE solid tone. Rather than
 * depend on SVGRenderer's patchy vertex-color handling, we:
 *   1. build the geometry non-indexed (independent triangles),
 *   2. bucket every triangle by its face-normal tone (see faceShading),
 *   3. reorder triangles so same-tone triangles are contiguous, and
 *   4. emit geometry `groups` -> one MeshBasicMaterial per tone.
 * Material color is always honored by SVGRenderer, so tones export reliably.
 */

import * as THREE from "three";
import { toneIndexForNormal, PALETTES, type PaletteName } from "./faceShading";

export type ShapeName = "bag" | "box" | "cylinder" | "cone";

const TONE_COUNT = PALETTES.mono.length; // 3

/** Raw (pre-grouping) geometry for each shape, centered on the origin. */
function baseGeometry(shape: ShapeName): THREE.BufferGeometry {
  switch (shape) {
    case "box":
      return new THREE.BoxGeometry(1.3, 1.5, 1.0);
    case "cylinder":
      return new THREE.CylinderGeometry(0.8, 0.8, 1.6, 24);
    case "cone":
      return new THREE.ConeGeometry(0.9, 1.7, 24);
    case "bag":
      return bagGeometry();
  }
}

/**
 * A shopping-bag body: a trapezoid outline (wider at the top) extruded to give
 * depth. Front/back = the bag silhouette, the extruded walls = the gusset — so
 * at a 3/4 angle you read front + side + top exactly like the reference icon.
 */
function bagGeometry(): THREE.BufferGeometry {
  const wTop = 1.15;
  const wBot = 0.95;
  const h = 1.5;
  const depth = 0.75;

  const shape = new THREE.Shape();
  shape.moveTo(-wBot / 2, -h / 2);
  shape.lineTo(wBot / 2, -h / 2);
  shape.lineTo(wTop / 2, h / 2);
  shape.lineTo(-wTop / 2, h / 2);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
  });
  // ExtrudeGeometry builds along +Z from z=0; recenter on the origin.
  geo.translate(0, 0, -depth / 2);
  return geo;
}

/** Geometric normal of triangle `t` from a flat position array (9 floats/tri). */
function triNormal(pos: Float32Array, t: number, out: THREE.Vector3): void {
  const o = t * 9;
  const ax = pos[o], ay = pos[o + 1], az = pos[o + 2];
  const bx = pos[o + 3], by = pos[o + 4], bz = pos[o + 5];
  const cx = pos[o + 6], cy = pos[o + 7], cz = pos[o + 8];
  const abx = bx - ax, aby = by - ay, abz = bz - az;
  const acx = cx - ax, acy = cy - ay, acz = cz - az;
  out.set(
    aby * acz - abz * acy,
    abz * acx - abx * acz,
    abx * acy - aby * acx,
  );
  if (out.lengthSq() > 0) out.normalize();
}

export interface BuiltShape {
  geometry: THREE.BufferGeometry;
  /** Number of triangles assigned to each tone index. */
  toneCounts: number[];
}

/**
 * Build a display-ready geometry: non-indexed, triangles reordered and grouped
 * by flat tone, with flat per-face normals. One group per tone index.
 */
export function buildShape(shape: ShapeName): BuiltShape {
  const raw = baseGeometry(shape);
  const base = raw.index ? raw.toNonIndexed() : raw;
  const src = base.attributes.position.array as Float32Array;
  const triCount = src.length / 9;

  const n = new THREE.Vector3();
  const buckets: number[][] = Array.from({ length: TONE_COUNT }, () => []);
  for (let t = 0; t < triCount; t++) {
    triNormal(src, t, n);
    const tone = Math.min(toneIndexForNormal(n), TONE_COUNT - 1);
    buckets[tone].push(t);
  }

  const dst = new Float32Array(src.length);
  const geometry = new THREE.BufferGeometry();
  const toneCounts: number[] = [];
  let vertexOffset = 0;

  for (let tone = 0; tone < TONE_COUNT; tone++) {
    const tris = buckets[tone];
    const start = vertexOffset;
    for (const t of tris) {
      dst.set(src.subarray(t * 9, t * 9 + 9), vertexOffset * 3);
      vertexOffset += 3;
    }
    const count = tris.length * 3;
    if (count > 0) geometry.addGroup(start, count, tone);
    toneCounts.push(tris.length);
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(dst, 3));
  geometry.computeVertexNormals(); // flat, since triangles are independent
  base.dispose();
  if (raw !== base) raw.dispose();

  return { geometry, toneCounts };
}

/** One MeshBasicMaterial per tone. In silhouette mode all use the darkest tone. */
export function buildMaterials(
  palette: PaletteName,
  silhouette: boolean,
): THREE.MeshBasicMaterial[] {
  const tones = PALETTES[palette];
  return Array.from({ length: TONE_COUNT }, (_, i) => {
    const color = silhouette ? tones[0] : tones[Math.min(i, tones.length - 1)];
    return new THREE.MeshBasicMaterial({ color, side: THREE.FrontSide });
  });
}
