# 3d-to-vector

Model flat (unshaded) 3D objects, orbit to any angle, and export the view as a
**faceted 2.5D SVG** — front + gusset + top read as distinct flat tones, like a
solid shopping-bag icon posable to any angle.

## Run

```bash
pnpm install
pnpm dev        # http://localhost:5173  — drag to orbit, scroll to zoom
pnpm test       # vitest (unit + headless SVGRenderer integration)
pnpm build      # type-check + production bundle
```

## How it works

- **three.js `SVGRenderer` + `OrthographicCamera`** — projects the scene to real
  SVG `<path>`s with no perspective skew (clean vector output).
- **Flat tones, no shading** — each face gets one solid tone chosen purely by its
  orientation (top = lightest, sides = mid, front/back = darkest). Triangles are
  grouped by tone and drawn with one `MeshBasicMaterial` per tone, so tones export
  reliably. See `src/faceShading.ts` and `src/shapes.ts`.
- **Camera orbits, object stays fixed** — so a face keeps its tone as you rotate
  the view.
- **Export** serializes the live `<svg>` and normalizes it into a standalone file
  (`src/exportSvg.ts`).

## Fill modes

- **Faceted 2.5D** — multi-tone, dimensional (the default; matches the reference).
- **Silhouette** — every face collapses to the single darkest tone (pure outline).

## Files

| File | Role |
|------|------|
| `src/main.ts` | Scene, camera, orbit controls, UI wiring, export |
| `src/shapes.ts` | Geometry builders + flat-tone triangle grouping |
| `src/faceShading.ts` | Normal → flat palette tone (pure, tested) |
| `src/exportSvg.ts` | SVG normalize + download (pure core, tested) |

## Next ideas

- Add a real bag handle (torus / arc) to the bag shape.
- Import external meshes (glTF/OBJ), not just primitives.
- Snap-to-angle presets (front, 3/4, iso).
- Path merging so coplanar triangles export as one `<path>` per face.
