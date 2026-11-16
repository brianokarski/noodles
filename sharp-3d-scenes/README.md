# SHARP 3D Scene Experiments

Turn any image into an explorable 3D scene in seconds!

## Setup (one time)

```bash
# Install conda if you don't have it
brew install miniforge

# Create environment
conda create -n sharp python=3.13
conda activate sharp

# Clone and install SHARP
git clone https://github.com/apple/ml-sharp.git ~/ml-sharp
cd ~/ml-sharp
pip install -r requirements.txt
```

## Workflow

### 1. Generate or find images
Drop your images into the `inputs/` folder. Great sources:
- Your own photos (landscapes, rooms, architecture)
- AI generators (Midjourney, DALL-E, Leonardo.ai, Flux)
- Unsplash.com for free stock photos

### 2. Process with SHARP
```bash
# Activate environment
conda activate sharp

# Process all images in inputs folder
sharp predict -i inputs/ -o outputs/

# Or process a single image
sharp predict -i inputs/my_cool_scene.png -o outputs/
```

### 3. View your 3D scenes
Open your `.ply` files at: https://supersplat.io

Just drag and drop! Use mouse to orbit, scroll to zoom.

## Tips for Best Results

Images with these qualities convert best:
- Strong depth (foreground + background elements)
- Consistent lighting
- High resolution (1024px+ recommended)
- Clear scene structure

## AI Prompt Ideas

See `prompts.md` for creative prompt ideas!
