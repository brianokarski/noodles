# Off-the-Shelf Libraries for Dithered/Splatter Transitions

## 🎯 Best Options (2026)

### 1. **gl-transitions** ⭐ Most Popular
**Best for:** Ready-made transition effects, production use

```bash
npm install gl-transitions
```

**Pros:**
- 67+ pre-built shader transitions
- Includes: Pixelize, Mosaic, RandomSquares, etc.
- Works with React, Vue, vanilla JS
- Well-documented and maintained
- Free & open source

**Quick Start:**
```javascript
import GLTransitions from 'gl-transitions';
import pixelize from 'gl-transitions/transitions/pixelize.glsl';

// Use with your WebGL setup
```

**Links:**
- Website: https://gl-transitions.com/
- GitHub: https://github.com/gl-transitions/gl-transitions
- Gallery: https://gl-transitions.com/gallery

---

### 2. **Efecto** 🆕 New in 2026!
**Best for:** Dithering effects specifically (Floyd-Steinberg, Atkinson, Bayer)

Built by Pablo Stanley, just released Jan 2026.

**Features:**
- Multiple dithering algorithms
- Real-time controls
- Built on Three.js + postprocessing
- Works with images and 3D models

**Links:**
- Tutorial: https://tympanus.net/codrops/2026/01/04/efecto-building-real-time-ascii-and-dithering-effects-with-webgl-shaders/
- Likely on GitHub (check codrops/efecto)

---

### 3. **curtains.js**
**Best for:** Image/video slideshows with WebGL effects

```bash
npm install curtainsjs
```

**Why it's great:**
- Designed specifically for DOM image/video animations
- CSS-positioned WebGL planes
- Easy to integrate with existing HTML
- Perfect for hero images, galleries, slideshows

**Quick Start:**
```javascript
import { Curtains, Plane } from 'curtainsjs';

const curtains = new Curtains({ container: "canvas" });

const plane = new Plane(curtains, document.querySelector(".plane"), {
  // Your transition shader here
});
```

**Links:**
- Website: https://www.curtainsjs.com/
- Docs: https://www.curtainsjs.com/documentation.html
- Examples: https://www.curtainsjs.com/examples.html

---

### 4. **Three.js + Custom Shader**
**Best for:** Maximum flexibility, custom effects

```bash
npm install three gsap
```

See `three-example.js` for a complete implementation.

**Pros:**
- Full control over the effect
- Huge ecosystem and community
- Can combine with postprocessing effects
- Easy animation with GSAP

**Cons:**
- More setup required
- Need to write/adapt shaders yourself

---

### 5. **PixiJS with Filters**
**Best for:** 2D graphics, sprites, simpler than Three.js

```bash
npm install pixi.js
```

**Features:**
- 2D-focused WebGL renderer
- Built-in filter system
- Great for UI transitions
- Lighter than Three.js

**Example:**
```javascript
import * as PIXI from 'pixi.js';

const app = new PIXI.Application();
// Add custom displacement/dither filter
```

---

## 🔨 Specialized Tools

### **dither-me**
- GitHub: https://github.com/MaxtuneLee/dither-me
- Apply retro dithering to images
- WebGL-based

### **dither-lab**
- GitHub: https://github.com/vojtaholik/dither-lab
- Interactive dithering playground
- Multiple algorithms
- SVG export

---

## 📊 Quick Comparison

| Library | Ease of Use | Flexibility | Performance | Best For |
|---------|-------------|-------------|-------------|----------|
| **gl-transitions** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Quick implementation |
| **Efecto** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Dithering specifically |
| **curtains.js** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | DOM integration |
| **Three.js** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Custom/complex effects |
| **PixiJS** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 2D/UI focused |

---

## 🎨 Dither Transition Types Available

### **Ordered Dithering (Bayer Matrix)**
- Classic crosshatch pattern
- Very performant
- Retro/print aesthetic
- **Available in:** All libraries (easy to implement)

### **Blue Noise Dithering**
- Evenly distributed, professional look
- No visible patterns
- Most natural appearance
- **Available in:** Efecto, custom shaders

### **Error Diffusion (Floyd-Steinberg, Atkinson)**
- High-quality dithering
- More computation intensive
- **Available in:** Efecto, custom implementations

### **Random/Stipple**
- Simple but can show clustering
- Very fast
- **Available in:** gl-transitions (pixelize), easy custom

### **Dissolve/Splatter Effects**
- Random blocks/squares
- Mosaic patterns
- **Available in:** gl-transitions (mosaic, randomsquares)

---

## 💡 Recommendations

### For Quick Production Use:
→ **gl-transitions** - Just works, lots of options

### For Best Dithering Quality:
→ **Efecto** (2026) - Purpose-built for dithering

### For Existing Website Integration:
→ **curtains.js** - Works with your DOM/CSS

### For Custom Complex Effects:
→ **Three.js** - Full control, worth the setup

### For 2D/UI Work:
→ **PixiJS** - Lighter, 2D-focused

---

## 🚀 Getting Started (Fastest Path)

1. **Install gl-transitions:**
```bash
npm install gl-transitions
npm install gl-transition
```

2. **Pick a transition from their gallery:**
https://gl-transitions.com/gallery

3. **Use with vanilla WebGL or React:**
```javascript
import createTransition from 'gl-transition';
import pixelize from 'gl-transitions/transitions/pixelize';

const transition = createTransition(gl, pixelize);
transition.draw(progress);
```

---

## 📚 Additional Resources

- **WebGL Fundamentals:** https://webglfundamentals.org/
- **Shader Toy:** https://www.shadertoy.com/ (find inspiration)
- **Book of Shaders:** https://thebookofshaders.com/
- **Codrops Collective:** https://tympanus.net/codrops/collective/ (latest WebGL demos)

---

## ⚠️ Browser Support

All these solutions require WebGL:
- ✅ Chrome, Firefox, Safari, Edge (modern versions)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)
- ❌ IE11 (use fallback graceful degradation)

**Fallback strategy:**
```javascript
if (!gl) {
  // Simple CSS crossfade
  element.style.opacity = progress;
}
```
