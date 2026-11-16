# Dithered Image Transition Demo

Interactive demo showcasing 6 different dithering techniques for image transitions, similar to the effect you saw in the web app.

## Quick Start

1. Open `index.html` in your browser (works with local file:// protocol)
2. Use the sliders to control the transition progress
3. Click "Animate" to see the full transition effect

## Techniques Explained

### 1. Basic Threshold (Random Noise)
Simple random noise with hard threshold. Fast but can show clustering patterns.
- **Best for:** Quick prototypes, retro effects
- **Characteristic:** Grainy, slightly clumpy

### 2. Blue Noise Dither ⭐
Multi-scale noise approximation that distributes pixels evenly. **This is likely what the original effect uses.**
- **Best for:** Professional, high-quality transitions
- **Characteristic:** Evenly distributed, no visible patterns
- **Why it's good:** Human eyes are less sensitive to high-frequency blue noise

### 3. Ordered Dither (Bayer Matrix)
Classic 8×8 Bayer matrix creates a distinctive crosshatch pattern.
- **Best for:** Retro/print aesthetic, stylized effects
- **Characteristic:** Visible diagonal patterns
- **Historical:** Used in early graphics and printing

### 4. Soft Threshold (Smoothstep)
Adds anti-aliasing to the threshold for smoother pixel edges.
- **Best for:** Reducing jaggedness, smoother appearance
- **Characteristic:** Softer edges, less harsh transitions
- **Controls:** Adjustable softness parameter

### 5. Perlin Noise
Organic, cloud-like patterns using Perlin noise.
- **Best for:** Natural, flowing transitions
- **Characteristic:** Large, smooth blobs
- **Controls:** Scale parameter for pattern size

### 6. Animated Noise
Noise pattern changes over time for a sparkling effect.
- **Best for:** Dynamic, eye-catching transitions
- **Characteristic:** Shimmering, temporal variation
- **Note:** Noise animates independently of progress

## Using Your Own Images

Replace `imageA.png` and `imageB.png` with your own images, or edit the JavaScript:

```javascript
// In transition-engine.js, around line 400:
const imageA = 'your-image-1.jpg';
const imageB = 'your-image-2.jpg';
```

**Image requirements:**
- Any web-compatible format (jpg, png, webp)
- Will scale to fit canvas (first image dimensions used)
- Both images should ideally be same size for best results

## Technical Details

### Implementation
- **Pure WebGL** for performance and quality
- **Fragment shaders** handle the pixel-level logic
- **Real-time rendering** at 60fps
- **No dependencies** - vanilla JavaScript + WebGL

### How It Works

Each pixel decision is based on:
```glsl
if (noise(x, y) < progress) {
    show imageB;
} else {
    show imageA;
}
```

The "interesting" part is the **noise function**:
- **Random noise:** `Math.random()` per pixel
- **Blue noise:** Multi-scale combination to avoid clustering
- **Ordered:** Fixed Bayer matrix pattern
- **Perlin:** Coherent noise with smooth gradients

### Browser Compatibility
- Modern browsers with WebGL support
- Chrome, Firefox, Safari, Edge (all recent versions)
- Mobile browsers supported

## Customization Ideas

### Change transition speed
```javascript
// In the animate button handler:
transition.animate(3000); // 3000ms = 3 seconds
```

### Modify noise patterns
Edit the fragment shaders in `getFragmentShader()` to create custom effects:
- Mix multiple noise types
- Add color channel separation
- Implement directional wipes
- Add edge detection for smart transitions

### Add more controls
You can expose additional shader uniforms:
- Noise scale/frequency
- Color grading
- Edge emphasis
- Directional bias

## Performance Notes

- **GPU-accelerated** - all rendering on GPU
- **512×512 noise texture** - can increase for more detail
- **6 separate WebGL contexts** - one per canvas
- Large images may impact performance on low-end devices

## Next Steps

Want to use this in production? Consider:
1. **Three.js wrapper** for easier integration
2. **Precomputed blue noise textures** for perfect distribution
3. **Multiple image carousel** support
4. **Touch/mouse interaction** for manual scrubbing
5. **CSS-driven animation** synced with scroll position

## Credits

Based on techniques used in modern web applications and games:
- Blue noise theory from graphics research
- Bayer matrix from classic print dithering
- Perlin noise from procedural generation

---

**Tips:**
- Blue noise (#2) and soft threshold (#4) look the most professional
- Ordered dither (#3) is great for retro/brutalist aesthetics  
- Try combining techniques by mixing shaders
- Experiment with different transition speeds for different moods
