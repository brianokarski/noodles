# Color Theory & Application

> "Color is the keyboard. The eye is the hammer. The soul is the piano with its many strings." — Kandinsky

---

## Color System Architecture

### Three Layers of Color

```
┌────────────────────────────────────────────────────────────────┐
│                      COMPONENT TOKENS                          │
│    button.primary.background, card.border, input.focus        │
│                              ↑                                 │
├────────────────────────────────────────────────────────────────┤
│                      SEMANTIC TOKENS                           │
│    color.background.primary, color.foreground.secondary       │
│                              ↑                                 │
├────────────────────────────────────────────────────────────────┤
│                      PRIMITIVE TOKENS                          │
│    color.brand.500, color.neutral.200, color.accent.600       │
└────────────────────────────────────────────────────────────────┘
```

This architecture enables:
- **Theme switching** by swapping semantic → primitive mappings
- **Consistency** through semantic naming
- **Flexibility** through component-level customization

---

## Building a Brand Palette

### Step 1: Define the Primary Brand Color

Choose a color that embodies the brand personality:

```
Energy & Action → Warm (Red, Orange, Yellow)
Trust & Stability → Cool (Blue, Green, Teal)
Creativity & Premium → Neutral+ (Purple, Pink, Black)
```

### Step 2: Generate the Color Scale

Use OKLCH or HSLuv for perceptually uniform steps:

```
brand.50  → L: 97%, C: 5%   (very light tint)
brand.100 → L: 94%, C: 10%
brand.200 → L: 88%, C: 20%
brand.300 → L: 78%, C: 35%
brand.400 → L: 65%, C: 50%
brand.500 → L: 55%, C: 60%  ← Primary (key)
brand.600 → L: 45%, C: 55%
brand.700 → L: 38%, C: 48%
brand.800 → L: 30%, C: 40%
brand.900 → L: 22%, C: 30%
brand.950 → L: 15%, C: 20%  (very dark shade)
```

### Step 3: Add an Accent Color

Choose based on color relationship:

| Relationship | Angle | Effect |
|--------------|-------|--------|
| Complementary | 180° | High contrast, vibrant |
| Analogous | 30-60° | Harmonious, cohesive |
| Triadic | 120° | Balanced, dynamic |
| Split-complementary | 150°/210° | Vibrant but balanced |

### Step 4: Establish Neutrals

Warm or cool neutrals based on brand temperature:

```
Warm Brand → Neutral with slight warm undertone
Cool Brand → Neutral with slight cool undertone
```

---

## Semantic Color Mapping

### Background Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `background.primary` | white | neutral.950 | Main canvas |
| `background.secondary` | neutral.50 | neutral.900 | Elevated surfaces |
| `background.tertiary` | neutral.100 | neutral.800 | Cards, containers |
| `background.inverse` | neutral.900 | neutral.50 | Inverted sections |
| `background.brand` | brand.500 | brand.500 | Brand moments |

### Foreground Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `foreground.primary` | neutral.900 | neutral.50 | Primary text |
| `foreground.secondary` | neutral.600 | neutral.400 | Secondary text |
| `foreground.tertiary` | neutral.400 | neutral.600 | Muted/disabled |
| `foreground.inverse` | neutral.50 | neutral.900 | On dark surfaces |
| `foreground.brand` | brand.600 | brand.400 | Brand-colored text |

### Border Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `border.primary` | neutral.200 | neutral.700 | Default borders |
| `border.secondary` | neutral.100 | neutral.800 | Subtle dividers |
| `border.focus` | brand.500 | brand.400 | Focus rings |

---

## Status Colors

Consistent across themes:

```
Success:  #10B981 (Emerald-ish green)
├── Light BG: success.50
├── Dark BG: success.950
└── Icon/text: success.500

Warning:  #F59E0B (Amber)
├── Light BG: warning.50
├── Dark BG: warning.950
└── Icon/text: warning.500

Error:    #EF4444 (Red)
├── Light BG: error.50
├── Dark BG: error.950
└── Icon/text: error.500

Info:     #3B82F6 (Blue)
├── Light BG: info.50
├── Dark BG: info.950
└── Icon/text: info.500
```

---

## Dark Mode Strategy

### Inversion Principles

Not a simple invert — follow these rules:

1. **Background luminosity inverts**
   ```
   Light: white → gray → black
   Dark:  near-black → gray → near-white
   ```

2. **Foreground luminosity inverts**
   ```
   Light: black text on white
   Dark:  white text on black
   ```

3. **Accent colors shift lighter**
   ```
   Light: brand.600 for links
   Dark:  brand.400 for links (more luminous)
   ```

4. **Shadows become less visible**
   ```
   Light: rgba(0,0,0,0.1)
   Dark:  rgba(0,0,0,0.4) or glow effects
   ```

5. **Saturation may need adjustment**
   ```
   Light: Full saturation works
   Dark:  Slightly desaturated colors feel better
   ```

---

## Color Contrast Requirements

### WCAG 2.1 Levels

| Ratio | Level | Usage |
|-------|-------|-------|
| 3:1 | AA Large | Text 24px+ or bold 18.66px+ |
| 4.5:1 | AA Normal | Body text, UI components |
| 7:1 | AAA | Enhanced accessibility |

### Testing Workflow

1. Check all foreground/background combinations
2. Verify interactive state colors
3. Test with color blindness simulators
4. Validate in both light and dark modes

### Pre-Approved Combinations

```
✓ foreground.primary on background.primary → >7:1
✓ foreground.secondary on background.primary → >4.5:1
✓ foreground.inverse on brand.500 → Check! (depends on brand hue)
✓ status.error.foreground on status.error.background → >4.5:1
```

---

## Color Application Patterns

### Hierarchy Through Color

```
Level 1: Brand color (primary action)
Level 2: Neutral dark (secondary action)
Level 3: Neutral medium (tertiary/ghost)
Level 4: Neutral light (disabled)
```

### Surface Elevation

```
Base:     background.primary (white)
Layer 1:  background.secondary (slight tint)
Layer 2:  background.tertiary + shadow
Layer 3:  Card with elevation shadow
Overlay:  Semi-transparent backdrop
```

### Color for Meaning

```
Interactive: brand colors
Positive: success colors
Caution: warning colors
Destructive: error colors
Neutral: gray/neutral colors
```

---

## Figma Variables Setup

### Collection Structure

```
Colors/
├── Primitives/
│   ├── brand/
│   │   ├── 50 through 950
│   ├── accent/
│   │   ├── 50 through 950
│   ├── neutral/
│   │   ├── 0 through 950
│   └── semantic/
│       ├── success/ (50, 500, 900)
│       ├── warning/ (50, 500, 900)
│       ├── error/ (50, 500, 900)
│       └── info/ (50, 500, 900)
│
└── Semantic/
    ├── background/
    │   ├── primary (light: white, dark: neutral.950)
    │   ├── secondary (light: neutral.50, dark: neutral.900)
    │   └── ...
    ├── foreground/
    │   ├── primary (light: neutral.900, dark: neutral.50)
    │   └── ...
    ├── border/
    │   └── ...
    └── interactive/
        └── ...
```

### Mode Configuration

Create two modes:
- **Light** (default)
- **Dark**

Each semantic token references different primitives per mode.

---

## Anti-Patterns

### ❌ Avoid

- Pure black (#000000) for text — use neutral.900
- Pure white (#FFFFFF) on colored backgrounds without checking contrast
- More than 5-6 colors in a single interface
- Rainbow gradients unless intentionally playful
- Meaning conveyed by color alone

### ✓ Embrace

- Consistent use of semantic tokens
- Color + icon + text for important states
- Subtle background colors for grouping
- High contrast for primary actions
- Restraint — let white space breathe

---

## Color Psychology Quick Reference

| Color | Associations | Caution |
|-------|--------------|---------|
| Blue | Trust, calm, professional | Can feel cold |
| Green | Growth, success, nature | Can feel cheap |
| Red | Energy, urgency, passion | Can feel aggressive |
| Orange | Friendly, creative, fun | Can feel cheap |
| Yellow | Optimism, warning, energy | Hard to read |
| Purple | Premium, creative, mystery | Can feel immature |
| Pink | Playful, modern, youthful | Can feel gendered |
| Black | Luxury, power, elegance | Can feel heavy |
| White | Clean, minimal, open | Can feel clinical |

