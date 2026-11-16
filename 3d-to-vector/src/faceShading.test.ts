import { describe, it, expect } from "vitest";
import {
  dominantAxis,
  toneIndexForNormal,
  colorForNormal,
  PALETTES,
} from "./faceShading";

describe("dominantAxis", () => {
  it("picks the axis a normal points most strongly along", () => {
    expect(dominantAxis({ x: 0, y: 1, z: 0 })).toBe("py");
    expect(dominantAxis({ x: 0, y: -1, z: 0 })).toBe("ny");
    expect(dominantAxis({ x: 0.9, y: 0.1, z: 0.2 })).toBe("px");
    expect(dominantAxis({ x: -0.9, y: 0.1, z: 0.2 })).toBe("nx");
    expect(dominantAxis({ x: 0.1, y: 0.2, z: 0.95 })).toBe("pz");
    expect(dominantAxis({ x: 0.1, y: 0.2, z: -0.95 })).toBe("nz");
  });
});

describe("toneIndexForNormal", () => {
  it("gives top faces the lightest flat", () => {
    expect(toneIndexForNormal({ x: 0, y: 1, z: 0 })).toBe(2);
  });
  it("gives side faces the mid flat", () => {
    expect(toneIndexForNormal({ x: 1, y: 0, z: 0 })).toBe(1);
    expect(toneIndexForNormal({ x: -1, y: 0, z: 0 })).toBe(1);
  });
  it("gives front/back/bottom the darkest flat", () => {
    expect(toneIndexForNormal({ x: 0, y: 0, z: 1 })).toBe(0);
    expect(toneIndexForNormal({ x: 0, y: 0, z: -1 })).toBe(0);
    expect(toneIndexForNormal({ x: 0, y: -1, z: 0 })).toBe(0);
  });
});

describe("colorForNormal", () => {
  it("returns three distinct flats for a faceted cube view", () => {
    const top = colorForNormal({ x: 0, y: 1, z: 0 }, "mono");
    const side = colorForNormal({ x: 1, y: 0, z: 0 }, "mono");
    const front = colorForNormal({ x: 0, y: 0, z: 1 }, "mono");
    expect(new Set([top, side, front]).size).toBe(3);
    expect(front).toBe(PALETTES.mono[0]);
  });

  it("collapses every face to the single darkest tone in silhouette mode", () => {
    const a = colorForNormal({ x: 0, y: 1, z: 0 }, "mono", true);
    const b = colorForNormal({ x: 1, y: 0, z: 0 }, "mono", true);
    const c = colorForNormal({ x: 0, y: 0, z: 1 }, "mono", true);
    expect(a).toBe(PALETTES.mono[0]);
    expect(new Set([a, b, c]).size).toBe(1);
  });
});
