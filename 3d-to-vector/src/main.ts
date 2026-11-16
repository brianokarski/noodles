import * as THREE from "three";
import { SVGRenderer } from "three/examples/jsm/renderers/SVGRenderer.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { buildShape, buildMaterials, type ShapeName } from "./shapes";
import type { PaletteName } from "./faceShading";
import { normalizeSvgMarkup, downloadSvg, svgFilename } from "./exportSvg";

// ---- DOM ----
const stage = document.getElementById("stage") as HTMLDivElement;
const shapeSel = document.getElementById("shape") as HTMLSelectElement;
const modeSel = document.getElementById("mode") as HTMLSelectElement;
const paletteSel = document.getElementById("palette") as HTMLSelectElement;
const resetBtn = document.getElementById("reset") as HTMLButtonElement;
const exportBtn = document.getElementById("export") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLParagraphElement;

// ---- state ----
let shape: ShapeName = shapeSel.value as ShapeName;
let palette: PaletteName = paletteSel.value as PaletteName;
let silhouette = modeSel.value === "silhouette";

// ---- scene ----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

// Orthographic so the export reads as a clean flat vector (no perspective skew).
const FRUSTUM = 3;
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
const START_POS = new THREE.Vector3(2.4, 1.8, 2.8);

const renderer = new SVGRenderer();
renderer.setQuality("high");
stage.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement as unknown as HTMLElement);
controls.enablePan = false;
controls.enableZoom = true;

let mesh: THREE.Mesh | null = null;

function disposeMesh(): void {
  if (!mesh) return;
  scene.remove(mesh);
  mesh.geometry.dispose();
  (mesh.material as THREE.Material[]).forEach((m) => m.dispose());
  mesh = null;
}

function rebuildMesh(): void {
  disposeMesh();
  const { geometry } = buildShape(shape);
  const materials = buildMaterials(palette, silhouette);
  mesh = new THREE.Mesh(geometry, materials);
  scene.add(mesh);
  render();
}

function recolor(): void {
  if (!mesh) return;
  const materials = buildMaterials(palette, silhouette);
  (mesh.material as THREE.Material[]).forEach((m) => m.dispose());
  mesh.material = materials;
  render();
}

function sizeStage(): { w: number; h: number } {
  const rect = stage.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width));
  const h = Math.max(1, Math.floor(rect.height));
  const aspect = w / h;
  camera.left = -FRUSTUM * aspect;
  camera.right = FRUSTUM * aspect;
  camera.top = FRUSTUM;
  camera.bottom = -FRUSTUM;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  return { w, h };
}

function render(): void {
  renderer.render(scene, camera);
}

function resetView(): void {
  camera.position.copy(START_POS);
  camera.lookAt(0, 0, 0);
  controls.target.set(0, 0, 0);
  controls.update();
  render();
}

// Re-render on user orbit/zoom.
controls.addEventListener("change", render);
window.addEventListener("resize", () => {
  sizeStage();
  render();
});

// ---- UI wiring ----
shapeSel.addEventListener("change", () => {
  shape = shapeSel.value as ShapeName;
  rebuildMesh();
});
modeSel.addEventListener("change", () => {
  silhouette = modeSel.value === "silhouette";
  recolor();
});
paletteSel.addEventListener("change", () => {
  palette = paletteSel.value as PaletteName;
  recolor();
});
resetBtn.addEventListener("click", resetView);

exportBtn.addEventListener("click", () => {
  render(); // ensure the SVG DOM reflects the current view
  const { w, h } = sizeStage();
  const raw = new XMLSerializer().serializeToString(renderer.domElement);
  const markup = normalizeSvgMarkup(raw, { width: w, height: h });
  downloadSvg(markup, svgFilename(shape));
  statusEl.textContent = `Exported ${svgFilename(shape)} (${w}×${h}).`;
});

// ---- boot ----
sizeStage();
resetView();
rebuildMesh();
statusEl.textContent = "Ready. Drag to orbit.";
