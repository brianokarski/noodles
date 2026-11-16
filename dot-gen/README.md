# dot-gen

Generative dot-composition tool. Browser-based, produces reproducible SVG and PNG artwork across four generator modes.

## Quick start

```bash
pnpm install
pnpm dev
```

Open the URL Vite prints.

## Scripts

- `pnpm dev` — live dev server
- `pnpm build` — production build to `dist/`
- `pnpm preview` — serve the production build locally
- `pnpm test` — Vitest watch
- `pnpm test:run` — Vitest single run
- `pnpm typecheck` — TypeScript check

## How it works

- Pick a **canvas preset** (poster, square, landscape, tag, sticker, social 1:1, social 9:16) and a **density** multiplier.
- Pick a **generator**: grid-cluster, radial, particle-path, or network.
- Tweak the generator's params live.
- Edit the **palette** (2–8 hex colors).
- Set a **seed** or hit 🎲.
- **Copy link** to share the exact composition; **Download SVG/PNG** for handoff.

Every composition lives in the URL hash — bookmark it, share it.

## Adding a new generator

1. Create `src/generators/<name>.ts` exporting a `GeneratorMeta` (`id`, `label`, `defaultParams`, `paramSchema`, `run`).
2. Add it to the array in `src/generators/index.ts`.
3. The UI picks it up automatically.
