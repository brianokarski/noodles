# Image Treatment Guidelines

> "Photography is truth. But a treated photograph becomes the brand's truth."

---

## Image Philosophy

Images in brand identity serve three purposes:

1. **Establish Mood** — Create emotional resonance
2. **Demonstrate Product** — Show what's being offered
3. **Humanize Brand** — Connect through people and stories

The treatment applied should amplify the brand, never distract from content.

---

## Aspect Ratios

### Standard Ratios

| Ratio | Usage | Notes |
|-------|-------|-------|
| 1:1 | Avatars, thumbnails, social icons | Perfect for grids |
| 4:3 | Traditional photo, cards | Classic, comfortable |
| 3:2 | Hero images, features | Photographic standard |
| 16:9 | Video, wide banners | Cinematic feel |
| 21:9 | Ultra-wide heroes | Dramatic, immersive |
| 2:3 | Portrait, mobile-first | Vertical emphasis |
| 9:16 | Stories, mobile full-screen | Social native |

### Responsive Ratios

```
Desktop Hero: 21:9 or 16:9
Tablet Hero: 16:9 or 4:3
Mobile Hero: 4:3 or 1:1
```

### Figma Implementation

Use Figma's frame constraints:

```
Frame: Image Container
├── Width: Fill container
├── Aspect Ratio: Lock to chosen ratio
├── Child: Image fill
│   ├── Fill: Image
│   ├── Sizing: Fill
│   └── Fit: Cover (crop to fill) or Contain (letterbox)
```

---

## Crop & Composition

### The Rule of Thirds Grid

```
┌─────────┬─────────┬─────────┐
│         │         │         │
│    +    │         │    +    │  ← Primary focal points
│         │         │         │
├─────────┼─────────┼─────────┤
│         │         │         │
│         │         │         │
│         │         │         │
├─────────┼─────────┼─────────┤
│         │         │         │
│    +    │         │    +    │  ← Secondary focal points
│         │         │         │
└─────────┴─────────┴─────────┘
```

### Focal Point Guidelines

**For products:**
- Center the product or place on rule-of-thirds intersection
- Allow breathing room around the product
- Consistent focal depth across product lines

**For people:**
- Eyes at upper third line
- Face at intersection point
- Direction of gaze leads into the composition

**For abstract/mood:**
- Lead the eye to the content
- Create negative space for text overlay

### Safe Zones for Text Overlay

```
┌────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░ TEXT SAFE ZONE ░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│                                        │
│        IMAGE FOCAL AREA                │
│        (Avoid text here)               │
│                                        │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░ TEXT SAFE ZONE ░░░░░░░░░░░░░░ │
└────────────────────────────────────────┘
```

---

## Color Treatment Strategies

### 1. Brand Tint Overlay

Add brand color with reduced opacity:

```
Image Layer
├── Blend Mode: Normal
└── Overlay Layer
    ├── Fill: brand.500
    ├── Opacity: 15-30%
    └── Blend Mode: Multiply or Soft Light
```

**Effect:** Unifies diverse photos under brand color

### 2. Duotone

Map image to two colors:

```
Dark areas → brand.900 or neutral.900
Light areas → brand.100 or accent.200
```

**Effect:** Strong brand statement, editorial feel

### 3. Black & White with Color Accent

Desaturate image, keep one color:

```
Image: Grayscale
Accent: Keep original color of key element (product, CTA)
```

**Effect:** Draws attention, premium feel

### 4. Warm/Cool Shift

Shift color temperature:

```
Warm brands: Add orange/yellow to shadows
Cool brands: Add blue/teal to highlights
```

**Effect:** Subtle mood alignment

### 5. Low Contrast Editorial

Reduce contrast, lift blacks:

```
Blacks: Lifted to 10-15%
Whites: Pulled to 95%
Saturation: Reduced 10-20%
```

**Effect:** Soft, approachable, magazine-like

---

## Overlay Patterns

### Gradient Overlays

For text legibility over images:

```
Bottom-to-top gradient (most common):
├── Start: rgba(0,0,0,0.8) at bottom
├── End: rgba(0,0,0,0) at 60% height
└── Usage: Text at bottom of image

Top-to-bottom gradient:
├── Start: rgba(0,0,0,0.6) at top
├── End: rgba(0,0,0,0) at 40% height
└── Usage: Navigation over hero

Radial gradient:
├── Center: transparent
├── Edge: rgba(0,0,0,0.4)
└── Usage: Vignette effect
```

### Scrim Patterns

Solid color overlays:

```
Light scrim: rgba(255,255,255,0.85)
├── Usage: Light text box over image

Dark scrim: rgba(0,0,0,0.6)
├── Usage: Full image with text overlay

Brand scrim: rgba(brand.900, 0.9)
├── Usage: Strong brand statement
```

---

## Image Shapes

### Standard Corners

Match the design system radius scale:

| Context | Radius | Token |
|---------|--------|-------|
| Thumbnails | 4-8px | radius.md / radius.lg |
| Cards | 8-16px | radius.lg / radius.xl |
| Avatars | Full circle | radius.full |
| Hero images | 0px | radius.none |
| Feature images | 16-24px | radius.xl / radius.2xl |

### Masks & Clipping

```
Blob shapes: Organic, playful brands
Geometric shapes: Modern, structured brands
Diagonal cuts: Dynamic, energetic brands
Wave patterns: Friendly, approachable brands
```

### Border Treatment

```
No border: Clean, minimal (default)
Subtle border: 1px neutral.200 for definition on white backgrounds
Thick border: 4-8px brand color for emphasis
Shadow: Elevated, prominent images
```

---

## Motion & Image

### Hover Effects

```
Subtle zoom:
├── Transform: scale(1.05)
├── Duration: 400ms
├── Ease: ease-out
└── Apply to: image fill, not container

Reveal overlay:
├── Overlay slides up from bottom
├── Duration: 300ms
├── Contains: title, CTA
```

### Parallax

```
Background parallax:
├── Movement: 10-30% of scroll distance
├── Direction: Opposite to scroll
└── Disable on mobile / reduced motion

Foreground parallax:
├── Movement: 5-15% of scroll distance
├── Direction: With scroll
```

### Ken Burns Effect

For static images in video/hero contexts:

```
Slow zoom:
├── Scale: 1 → 1.1 over 10-20 seconds
├── Ease: linear
├── Pan: Optional slow drift

Used for: Backgrounds, loading states, ambient motion
```

---

## Photography Direction

### Style Guidelines

Document the brand's photography style:

**Lighting:**
- Natural vs. studio
- Soft vs. dramatic
- High key vs. low key

**Color Palette:**
- Dominant colors in scenes
- Color temperature
- Saturation level

**Composition:**
- Symmetrical vs. dynamic
- Minimal vs. detailed
- Tight crop vs. environmental

**Subjects:**
- Real people vs. models
- Diverse representation
- Emotional tone (joy, contemplation, action)

### Stock Photo Do's and Don'ts

**✓ Do:**
- Choose authentic-looking moments
- Select consistent lighting across images
- Apply treatment to unify the look
- Prefer images with negative space for text

**✗ Don't:**
- Use obviously staged corporate photos
- Mix wildly different photo styles
- Use images with visible watermarks
- Select images that don't represent your audience

---

## Accessibility

### Alt Text Guidelines

Every image needs appropriate alt text:

```
Decorative: alt="" (empty, not omitted)
Informative: Describe the content
Functional: Describe the action (for linked images)
Complex: Provide long description separately
```

### Color Contrast

Text over images must maintain 4.5:1 contrast:

```
Solutions:
├── Gradient overlay
├── Solid background behind text
├── Text shadow
└── Test with contrast checker
```

### Motion Sensitivity

```
Respect prefers-reduced-motion:
├── Disable parallax
├── Stop auto-advancing carousels
├── Pause Ken Burns effect
```

---

## Figma Best Practices

### Layer Naming

```
🖼️ Hero Image
├── Image Fill
├── Gradient Overlay
└── Text Container
    ├── Eyebrow
    ├── Headline
    └── CTA
```

### Image Component Structure

```
Component: Image / Card
├── Properties:
│   ├── Aspect Ratio: 1:1, 4:3, 16:9, etc.
│   ├── Radius: none, md, lg, xl, full
│   ├── Overlay: none, gradient, scrim
│   └── Has Caption: boolean
```

### Image Fills

Use Figma's image fill options:
- **Fill:** Cover (crop to fit)
- **Fit:** Contain (letterbox)
- **Tile:** Pattern/texture

Position images using the image position controls for optimal crop.

