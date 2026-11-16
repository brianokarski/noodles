# Layer Generator for Figma

Local development plugin that ports the generator workflow into Figma with **layer recipes**:

- multiple generated layers
- per-layer blend mode + opacity
- per-layer quality + seed + dot controls
- precise global color controls (custom hex palette)
- apply stack to one or many selected frames

## Includes styles

This MVP includes all 12 quality styles from the current generator:

- scale
- adaptation
- flow
- convergence
- emergence
- iterator
- gradient (Gradient Descender)
- latent (Latent Space)
- modulator
- containerizer
- brancher
- retrieval

## Install in Figma (Development plugin)

1. Open Figma desktop
2. Plugins → Development → Import plugin from manifest...
3. Choose: `layer-generator-figma/manifest.json`
4. Run: Plugins → Development → `Layer Generator`

## Usage

1. Select one or more target frames
2. Click **Sync to selection**
3. Build your layer recipe in the panel
4. Adjust blend modes / opacity / seeds
5. Use preset palette or precise custom hex values
6. Click **Apply layers to selected frame(s)**

Plugin creates a container frame named `__LAYER_GENERATOR_BG__` at the back of each selected frame and inserts each generated layer as an image rectangle with native Figma blend/opacity.

## Notes

- This is MVP architecture for the full plugin direction.
- Current color controls are global palette controls (shared across all layers).
- Next iteration can add per-layer color overrides + target-color solve.
