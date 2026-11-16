# noodles 🍜

Tools built in the middle of real brand work, when drawing it by hand was the slow option. Generators, pattern engines, Figma plugins, a few agents.

Most are one file. Open the folder, open `index.html`, go.

No brand assets ship in here. Load your own palette, type and marks.

---

## Generators

Built on brand projects to make a lot of something, fast.

| Tool | What it does |
|---|---|
| **[Panel Lab](panel-lab/)** | Randomized panel layouts for any artboard size. Set the canvas, columns and gap, then roll. Panels fill with shape tiles, solid fields and type, and export as SVG. Good for posters, social, and anything that needs a system that looks designed rather than templated |
| **[Layer Generator](layer-generator/)** | p5 sketch for generative artwork in two modes. *Totem* is a radial layered composition, *Cells* is pixel-grid organic blobs with nuclei and debris. Built to make booth, social and print assets without hand-drawing each one |
| **[Layer Generator for Figma](layer-generator-figma/)** | The same generator inside Figma. Stack generated layers with per-layer blend modes, opacity and seeds, then apply the stack to one or many frames at once |
| **[Ring Lab](ring-lab/)** | Lissajous line systems. Rings, strands and woven routes, with strokes coloured by a gradient mesh. Three front ends on one engine, from simple to full control |
| **[Wake Lab](wake-lab/)** | Wake and ripple lines radiating from any point on the canvas. Click to place the source |
| **[Icon Lab](icon-lab/)** | Lissajous app-icon generator. Dial frequency, phase, stroke and colour, export a 1024px icon |
| **[Metaball Lab](metaball-lab/)** | Metaball connection studies. Blobs that merge, stretch and pinch as they move near each other |

---

## Figma plugins

| Plugin | What it does |
|---|---|
| **[Pill Painter](figma-pill-painter/)** | A pattern maker with five engines that share one canvas, one spline editor, one set of scrub dials, and drop straight into real Figma nodes. My most-used tool |
| **[Color Matrix](color-matrix/)** | Lay out every pairing in a palette as a matrix to check contrast, overlaps and triads at a glance, then build the rows into Figma |
| **[Hue Herder](huehuehue/)** | Shift every colour in a selection together while keeping their relationships. Rotate hue, scale saturation, nudge lightness, and the whole palette moves as one |
| **[Moodboard Maker](figma-moodboard-maker/)** | Select a pile of images, get a tidy masonry board. Solves the gaps so the tallest column lands exactly on the bottom margin |
| **[Layer Generator](layer-generator-figma/)** | See Generators above |

Install from Figma desktop: **Plugins → Development → Import plugin from manifest**, then pick the folder's `manifest.json`.

---

## Pattern labs

Single-file generators for line, pattern and texture work. All export SVG.

| Lab | What it makes |
|---|---|
| **[Guilloché Lab](guilloche-lab/)** | Security-engraving patterns, the fine looping linework on banknotes and certificates |
| **[Loom Lab](loom-lab/)** | Woven cloth textures |
| **[Stitch Lab](stitch-lab/)** | Stitched and woven specimen patterns |
| **[Offset Lab](offset-lab/)** | Path offsets and blends between shapes |
| **[Sweep Lab](sweep-lab/)** | Line objects built by sweeping a stroke through space |
| **[Tile Lab](tile-lab/)** | Grid, stroke and symmetry tiling |
| **[Line Lab](line-lab/)** | Lissajous curves in space |
| **[Sticker Lab](sticker-lab/)** | Die-cut sticker outlines: offsets, compound shapes, and a smooth gradient aura around any mark |
| **[Pill Painter (web)](pill-painter/)** | The browser version of the Figma plugin |

---

## Creative coding

| Project | What it does |
|---|---|
| **[3d-to-vector](3d-to-vector/)** | Model flat, unshaded 3D objects, orbit to any angle, and export the view as a faceted 2.5D SVG. Clean flat-tone vector at whatever angle you want |
| **[Dither Transitions](dither-transition-demo/)** | Six dithering techniques for transitioning between images, with sliders to see how each behaves |
| **[Image Blender](image-blender/)** | Processing sketch. Feathered oval collages from two or three images, with grain |
| **[Image Warp](image-warp/)** | Processing sketch. Psychedelic mirror treatments on photos |
| **[Type Warp](type-warp/)** | Processing sketch. Moiré line overlays on typography |
| **[Weirdo Tools](weirdo-tools/)** | Small browser instruments for techno production. Knobs, waveforms, strange units |
| **[Candy Equipment](splash/)** | A 3D splash page with chrome reflections. Mostly an excuse to play with lighting |

---

## Type

| Project | What it does |
|---|---|
| **[RoboFont Curve Tools](robofont-scripts/)** | Scripts for drawing better béziers in RoboFont. Curvature combs, inflection detection, and quick fixes for bad curves |

---

## AI and agents

| Project | What it does |
|---|---|
| **[Design Agent](design-agent/)** | Training Claude's design judgement for Figma work. Each skill domain (typography, layout, colour) holds principles pulled from Ruder, Müller-Brockmann and others that Claude reads before it designs |
| **[Moth](moth/)** | A generative brand identity agent. A junior designer that ideates, explores directions and builds identity systems in Figma |

---

## Utilities and side projects

| Project | What it does |
|---|---|
| **[Pomodoro](pomodoro/)** | A tiny macOS menu bar timer. Tag what you're working on, get a soft piano chime when you're done, and a weekly report of where your time went |
| **[Project Tracker](project-tracker/)** | A native Mac Gantt view that reads project notes from markdown files and re-renders as they change |
| **[to-do](todo-md/)** | A drag-to-reorder to-do list backed by a plain markdown file |
| **[pinrip](pinrip/)** | Pull every image and video off a Pinterest board |
| **[Momentum](momentum/)** | A data pipeline tracking the auction market for manual Porsche 997 Carreras. Purely a hobby |

---

## Elsewhere on GitHub

| Repo | What it does |
|---|---|
| **[growth-and-craft](https://github.com/brianokarski/growth-and-craft)** | Nine Claude Code skills for staying sharp at work: weekly prep, scope checks, project updates, peer notes, review prep |
| **[arena-figma-plugin](https://github.com/brianokarski/arena-figma-plugin)** | Browse your Are.na channels inside Figma and import images singly or in batches |
| **[arena-eagle-tagger](https://github.com/brianokarski/arena-eagle-tagger)** | Pull Are.na channels into an Eagle library and categorise every image with AI |
| **[intervals.icu-skill](https://github.com/brianokarski/intervals.icu-skill)** | A Claude skill that builds training plans and syncs them to Intervals.icu |
| **[sqwish](https://github.com/brianokarski/sqwish)** | Type motion experiments |

---

## Process

Built with Claude and Cursor. The model writes the code. The job is knowing what the tool should do, seeing when the output is wrong, and pushing until it holds up in front of a review.

Want something like this on your project? Ping me.
