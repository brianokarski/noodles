# 3d-to-vector

## Overview
A tool for building flat (unshaded) 3D objects, posing/rotating them freely in 3D
space, and exporting the resulting flat shape as an **SVG silhouette** — like a
solid black shopping-bag icon, but generatable from any angle with real depth.
The goal is designer-controlled vector output: model once, spin to the angle you
want, export clean flat SVG paths. Phase: initial setup / greenfield.

## What it does
- Create/compose simple 3D objects (primitives + basic modeling to start)
- Flat rendering — **no shading, no lighting**, solid fill (silhouette look)
- Orbit / rotate the object in 3D space to choose an angle and depth
- Export the current view as a flat **SVG** (clean vector shapes, not a raster trace)

## Proposed stack (working assumption — override freely)
- **Web (browser) + TypeScript**
- **three.js** for the 3D scene, camera, orbit controls
- SVG export path — options to evaluate in Phase 1:
  - three.js `SVGRenderer` (renders faces as SVG polygons)
  - Custom projection: project geometry to 2D, compute the outline/hull, emit `<path>`
  - For a true single flat silhouette, outline extraction beats per-face polygons
    (avoids internal seams between coplanar faces)
- Build tooling: Vite (fast dev server + easy static build)

## Role & Scope
- **Type:** Solo tool Brian is building (coding project — not a team/design-leadership project)
- **Design-leadership intake:** intentionally skipped (see /newproject skill)

## Key files
- **Obsidian project notes:** ~/Documents/Obsidian/Projects/3d-to-vector.md (notes, decisions, timeline)
- **References:** ./references/ (drop the reference bag silhouette + any target shapes here)

## Current phase
Working spike complete (2026-07-06). Orbitable flat shapes (bag/box/cylinder/cone),
faceted 2.5D + silhouette fill modes, and SVG export all working; 15 tests pass,
build green. `pnpm dev` to run. Next: bag handle, mesh import, angle presets,
per-face path merging (see README "Next ideas").

## Architecture (decided)
- three.js `SVGRenderer` + `OrthographicCamera` for clean, skew-free vector output.
- Flat tones (no shading): faces bucketed by normal into an ordered palette; triangles
  grouped by tone, one `MeshBasicMaterial` per tone (SVGRenderer honors material color
  reliably; vertex colors are not dependable).
- Camera orbits, object stays fixed → face tones stay stable as the view rotates.

## Open questions
- Modeling scope: primitives only, or import meshes (glTF/OBJ) later?
- Add a real bag handle (torus/arc)?
- Single object or multi-object scenes?

## Context for this session
When working on this project:
- Update the Obsidian project file (~/Documents/Obsidian/Projects/3d-to-vector.md)
  with new notes, decisions, and timeline entries as `- YYYY-MM-DD | type | description`
  (types: milestone, decision, spike, deadline, checkin)
- Brian is a designer with deep visual/craft standards — get the vector output *clean*
  (no stray seams, tidy paths, correct fills). He'll drive the aesthetic.
- Don't design UI unprompted; focus on the engineering. He'll provide components/look.
