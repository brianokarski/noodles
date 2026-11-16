# RING LAB — lissajous line system

Three front ends on the same engine:




- **`simple.html`** — one button. RANDOMIZE (space) rolls one piece of art
  with a 3–4 stop harmonious linear gradient. Five styles, keys 0–5 lock one:
  RING (the OG / a loop), OFFSET (contour rings of a soft shape), BLEND
  (Illustrator-style line blend: line → ring, ring → circle, line → line),
  BURST (sunburst rays, centre on or off the card), WAVES (parallel sines
  bulging through the middle). Nothing else to touch. Seeded: the number in the corner
  reproduces that exact card (`simple.html?seed=1234`), ← steps back through
  what you've seen, FULL LAB hands the current one to the full tool.
- **`index.html`** — the full lab, every parameter.


Open `index.html` directly (no server needed). Card artboard is 806×508, same as the card.


## Two families
Switch at the top of the panel.

**LISSAJOUS** — the Card Maker ring and everything derived from it.

**CONFLUENCE** — the Alt 3 idea: a fan of lines off one origin on an edge,
collapsing onto a single axis. Figma's Alt 3 (node 223:101) is exactly
circles centred at `(-9, 254)` — the left edge at mid-height — with radii
`91 189 245 329 400 555 646`, plus the axis line. Preset `FIGMA ALT 3`.

| | |
|---|---|
| ORIGIN | which edge, how far in (negative = off-card), axis height |
| ARC · 90° | the profile. Circles meet the axis at a right angle. `radius min/max` + `distribution` space the fan (1 = even, >1 bunches toward the origin) |
| MERGE · TANGENT | lines bend *into* the axis like tracks joining. `entry x / step` = where each line leaves the top/bottom edge; `join x / step` = where it lands on the axis (step 0 = all join at one point); `tension` .55 ≈ round, higher = tighter corner; `lean` slants the entry |
| AXIS · MIRROR | bottom set on/off; `interleave` offsets the bottom set by a fraction of a step; axis from origin or from the first join |

## Controls (lissajous)
| Section       | What it does |
|---------------|--------------|
| CURVE         | a:b frequency ratio, phase δ, rotation |
| PLACE         | bounding box on the card |
| STRANDS       | count · gap (true normal offset) · phase/strand (weave) · scale/strand (nest) · twist/strand · width ramp |
| JOIN / SPREAD | envelope along t: amount → how tight the pinch; pinches/loop → where strands join; sharpness |
| SPIRAL · TRIM | grow + turns → open spiral; trim → arc segment |
| STROKE        | width (pt) and cap |

Drag any label to scrub. Numbers are editable. F fits, scroll zooms.

## Furniture
Logo, chip and Visa from the `Logo + Chip` frame, at their exact card
positions, always drawn on top. One colour drives logo + Visa (chip keeps
its own tones). Toggle each, and IN EXPORT to include them in the SVG.

## Colour — strokes stay strokes
Every mode outputs plain paths with a solid `stroke`. The gradient lives in
the *distribution* of colours, so Illustrator and get editable strokes.

| mode | what |
|---|---|
| SOLID | one colour (default follows the theme ink) |
| ACROSS | stops interpolated across strands — strand 1 → strand n |
| ALONG | each strand split into chunks, stops interpolated along its length |
| FIELD | **the mesh.** Chunks are coloured by *position* from a colour mesh — a grid of control colours, bicubic-interpolated over the card. The default mesh is the actual gradient (node 223:45) sampled at 12×7. A line picks up the colour of wherever it passes, so the gradient is mapped onto the lines rather than running along them |
| LINEAR | one real SVG `linearGradient` as stroke paint. pastes it fine; Illustrator imports gradient strokes inconsistently — prefer FIELD or ALONG for AI |

**Mesh editor** (FIELD): click any cell to recolour it; pick a resolution
(2×2 … 12×7 — resampling keeps the field, just fewer/more handles); FIGMA
GRADIENT restores the sampled original; SHOW MESH previews the field under
the lines. `field x / y / scale / rotate` move the whole field across the
card — the lines re-colour live, so the gradient is dynamic, not baked.

**SMOOTH vs FLAT** (VIEW). Smooth gives every chunk its own tiny linear
gradient along its chord, start-colour → end-colour, and adjacent chunks share
those colours exactly — so ALONG and FIELD are continuous, not stepped. Joins
are butt-capped (tangents match, cuts coincide, nothing overlaps); only true
line ends get a round dot. pastes gradient strokes fine. If Illustrator
chokes on them, switch to FLAT: solid chunks, visibly stepped, bulletproof.

`offset` slides the ramp. `chunks` is resolution (48 is plenty; seams are exact, 0px).

## Depth
Modulates stroke width and opacity along each strand with a sine:
`width ±` thins/thickens, `fade` drops opacity, `cycles / strand` sets how
many over/unders per loop — matching it to the curve's `b` makes the ring
read as woven. Works on top of any colour mode.

## Randomize vs Variation
**R** randomizes everything in the family — curve ratio, placement, strands,
stroke, colour mode, depth. **V** keeps the curve and re-rolls only the
strand system.

## Output
Strokes only — every strand is its own `<path stroke-width=…>`, no fills.
Recolor / reweight in Illustrator or Figma.

- **⌘C** copies the SVG. **⌘V in or Illustrator** pastes live editable paths.
- **⌘S** downloads the SVG. CLIP adds a rounded-card clipPath.
- SAVE / LOAD preset JSON. State also autosaves in the browser.
- **V** = variation: keeps the curve, re-rolls the strand system (fan / join / weave / nest / arc).

## Pushing straight into (via pi)
Paste the preset JSON to pi and ask it to push. It draws real stroked
VECTOR nodes into the `Card Maker` frame as a group named `RING LAB`,
replacing the previous push. The state is stored on the group as plugin
data so a push can be reproduced.
