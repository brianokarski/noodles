// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { SVGRenderer } from "three/examples/jsm/renderers/SVGRenderer.js";
import { buildShape, buildMaterials } from "./shapes";
import { normalizeSvgMarkup } from "./exportSvg";

/** Render a shape at a 3/4 angle and return the serialized SVG markup. */
function renderToSvg(silhouette: boolean): string {
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-3, 3, 3, -3, 0.1, 100);
  cam.position.set(2.4, 1.8, 2.8);
  cam.lookAt(0, 0, 0);

  const { geometry } = buildShape("bag");
  const mesh = new THREE.Mesh(geometry, buildMaterials("mono", silhouette));
  scene.add(mesh);

  const renderer = new SVGRenderer();
  renderer.setSize(400, 400);
  renderer.render(scene, cam);
  return new XMLSerializer().serializeToString(renderer.domElement);
}

/** Distinct fill colors present in the SVG (from style="fill:..." or fill=). */
function distinctFills(svg: string): Set<string> {
  const fills = new Set<string>();
  for (const m of svg.matchAll(/fill:\s*([^;"']+)/gi)) fills.add(m[1].trim());
  for (const m of svg.matchAll(/fill="([^"]+)"/gi)) {
    if (m[1] !== "none") fills.add(m[1].trim());
  }
  return fills;
}

describe("SVGRenderer export (end-to-end)", () => {
  it("emits vector path elements for the bag", () => {
    const svg = renderToSvg(false);
    expect(svg).toContain("<path");
  });

  it("faceted mode produces multiple distinct flat tones (2.5D)", () => {
    const svg = renderToSvg(false);
    const fills = distinctFills(svg);
    expect(fills.size).toBeGreaterThanOrEqual(2);
  });

  it("silhouette mode collapses to a single fill", () => {
    const svg = renderToSvg(true);
    const fills = distinctFills(svg);
    expect(fills.size).toBe(1);
  });

  it("normalized markup is a valid standalone svg document", () => {
    const svg = normalizeSvgMarkup(renderToSvg(false), { width: 400, height: 400 });
    expect(svg.startsWith("<?xml")).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    // SVGRenderer emits its own centered viewBox; the normalizer must preserve
    // it (not overwrite with 0 0 w h) so the exported drawing stays centered.
    expect(svg).toContain('viewBox="-200 -200 400 400"');
    expect(svg).toContain('width="400"');
    expect(svg).toContain('height="400"');
  });
});
