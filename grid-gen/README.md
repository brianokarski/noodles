# grid-gen

Parametric generative graphics tool. Browser-based, produces square-unit graphics (posters, socials, tags, panels) from a seeded system.

## Run it locally

Requires **Node 18+** and **pnpm**. If you don't have pnpm:

```bash
npm install -g pnpm
# or: corepack enable && corepack prepare pnpm@latest --activate
```

Then:

```bash
pnpm install
pnpm dev
```

Vite prints a `http://localhost:5173`-ish URL. Open it. You should see a dark canvas on the left and a Tweakpane control strip on the right.

## What's in the UI

- **Generator** — picks the algorithm. `blocks` is the default (modular BSP tiling, Pantone-poster energy). Also: `columns`, `bars` (BSP stripe regions, Toronto-Tech-Week style), `noise`, `cellular`, `stamps`.
- **Preset** — canvas aspect (poster, square, landscape, tag)
- **Density** — ×1/×2/×4/×8 scales how many integer cells fit in the canvas
- **Palette** — 4 color swatches. Hit **Shuffle palette** to reroll from a curated editorial pool.
- **Seed** — hex string. Hit **Shuffle seed** for a new composition keeping the same palette.
- **Params** — live generator controls (rebuilt when you switch generators)
- **Export** — Copy link (URL hash holds full state), Download SVG, Download PNG ×1/×2/×4, Save/Load JSON

The URL hash encodes the entire composition — copy it, bookmark it, share it. Dropping a hash back in the browser reproduces the exact output.

## Scripts

- `pnpm dev` — live dev server
- `pnpm build` — production build to `dist/`
- `pnpm preview` — serve the production build
- `pnpm test` — Vitest in watch mode
- `pnpm test:run` — Vitest single run
- `pnpm typecheck` — TypeScript type check (no emit)

## Project layout

```
src/
  generators/      — blocks, bars, columns, noise, cellular, stamps (+ tests)
  palette/         — palette utilities + curated palette pool
  presets/         — canvas presets (poster/square/…) and density math
  renderers/       — canvas (live preview) and svg (export) renderers
  state/           — AppState, seeded RNG, URL hash + JSON serialization
  ui/              — Tweakpane controls, export helpers
  main.ts          — app entry: wires state → generator → renderer → UI
```

## Adding a new generator

1. Create `src/generators/<name>.ts` that exports a `GeneratorMeta` with `run`, `name`, `label`, `defaultParams`, `paramSchema`
2. Add it to the array in `src/generators/index.ts`
3. Write a test at `src/generators/<name>.test.ts` (see `blocks.test.ts` for the pattern)
4. The UI picks it up automatically

Every generator is a pure function: `(cols, rows, palette, rng, params) → Grid`. No DOM access, no global state. Seeded RNG means same seed = same output. That's the whole contract.
