# Stipple Filter (Figma Plugin)

Converts selected images in Figma into editable stipple SVGs. Three methods (Voronoi Lloyd, Weighted Poisson, Organic Halftone), full tone controls, and an optional AI auto-tune that recommends starting parameters based on the image.

## Install locally

1. In Figma desktop: **Menu → Plugins → Development → Import plugin from manifest…**
2. Pick `figma-plugin/manifest.json` in this folder.
3. Run via **Plugins → Development → Stipple Filter**.

## Use

1. Select a frame, rectangle, or any node with an image fill in Figma.
2. Open the plugin. The image appears in the sidebar.
3. (Optional) Click **Auto-tune tone** — GPT-4o-mini recommends tone settings based on the image. Requires an OpenAI API key (set via the gear icon, stored locally in Figma client storage).
4. Tune sliders. Preview updates live.
5. Click **Apply to Figma** to place the stipple SVG next to the source.

## File layout

- `manifest.json` — plugin metadata, allows network access to `api.openai.com`.
- `code.js` — plugin main thread. Reads the selected image, stores the API key, writes the stipple SVG back as a node.
- `ui.html` — the tool UI (sidebar + canvas preview). All algorithms run here.
