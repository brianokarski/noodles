# Layer Generator

p5.js sketch for generating booth/social/print artwork in two modes:

- **Totem** — radial layered composition (jagged plate → halo of figurines → checker ring → dot ring → radial gradient core → pupil)
- **Cells** — pixel-grid organic blobs with hexagonal nuclei + scattered debris

## Run

No build step. Just open in a browser:

```bash
cd generator
python3 -m http.server 8000
# then visit http://localhost:8000
```

Or use any static server (`npx serve`, VS Code Live Server, etc).

## Controls

- **Mode** — Totem / Cells
- **Palette** — Random or audience-tuned (ML / Ruby / Dev / Mono)
- **R** — randomize seed
- **P** — export PNG
- **S** — export SVG (vector, opens in Illustrator/Figma)

## Architecture

```
sketch.js              # main loop, GUI, export, p5 proxy
lib/rng.js             # mulberry32 seeded RNG (so seeds are reproducible)
lib/palette.js         # palettes per audience tier
generators/totem.js    # radial layered composition
generators/cells.js    # pixel-grid blobs
```

Adding a new generator:

1. Create `generators/myThing.js` exposing `function drawMyThing(p, rng, palette, w, h)`
2. Add a `<script>` tag in `index.html`
3. Add a mode option to the `<select id="mode">` and a branch in `sketch.js` `render()`

Each generator receives a p5-like `p` object so it works for both the main canvas (`window`) and SVG export (a `p5.Graphics` proxy). Stick to `p.fill`, `p.rect`, `p.ellipse`, etc. — never bare globals.

## Next steps (ideas)

- More motifs in the totem halo (not just figurines — glyphs, math symbols, tiny nodes)
- Reaction-diffusion proper for cells mode (replace fuzzy-distance with Gray-Scott)
- Animation mode (loop seeds, ease between frames, export MP4 sequence)
- Figma plugin port — same algorithm, native vector output on the canvas
- Audience-locked exports — batch render 50 totems in ML palette for ICLR booth
