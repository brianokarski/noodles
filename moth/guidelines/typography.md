# Typography System

> "Typography is the voice of design. It speaks before images do."

---

## Type Philosophy

### The Three Voices

Every brand has three typographic voices that work in harmony:

1. **Display** — The bold statement maker
2. **Body** — The reliable communicator  
3. **Functional** — The wayfinder and helper

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│    CABINET GROTESK                               ← Display      │
│    Makes the big statements                                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    DM Sans delivers the message clearly.         ← Body         │
│    It's readable, friendly, and versatile.                      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│    LABEL · CAPTION · META                        ← Functional   │
│    12px · DM Sans Medium · Uppercase                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Type Scale

Based on a **1.25 major third** ratio for harmonious scaling:

| Token | Size | Usage |
|-------|------|-------|
| `2xs` | 10px | Fine print, badges |
| `xs` | 12px | Captions, labels |
| `sm` | 14px | Secondary text, UI elements |
| `base` | 16px | Body text (root) |
| `lg` | 18px | Lead paragraphs |
| `xl` | 20px | Large body, small headings |
| `2xl` | 24px | H4 headings |
| `3xl` | 30px | H3 headings |
| `4xl` | 36px | H2 headings |
| `5xl` | 48px | H1 headings |
| `6xl` | 60px | Display small |
| `7xl` | 72px | Display medium |
| `8xl` | 96px | Display large |
| `9xl` | 128px | Hero display |

---

## Text Styles

### Display Styles

```
Display Large
├── Font: Cabinet Grotesk
├── Size: 72px
├── Weight: Bold (700)
├── Line-height: 1.1
├── Letter-spacing: -0.02em
└── Usage: Hero headlines

Display Medium
├── Font: Cabinet Grotesk
├── Size: 48px
├── Weight: Bold (700)
├── Line-height: 1.15
├── Letter-spacing: -0.02em
└── Usage: Section headlines

Display Small
├── Font: Cabinet Grotesk
├── Size: 36px
├── Weight: Semibold (600)
├── Line-height: 1.2
├── Letter-spacing: -0.01em
└── Usage: Card headlines, stats
```

### Heading Styles

```
Heading 1
├── Font: DM Sans
├── Size: 30px
├── Weight: Bold (700)
├── Line-height: 1.25
├── Letter-spacing: -0.01em

Heading 2
├── Font: DM Sans
├── Size: 24px
├── Weight: Semibold (600)
├── Line-height: 1.3

Heading 3
├── Font: DM Sans
├── Size: 20px
├── Weight: Semibold (600)
├── Line-height: 1.35

Heading 4
├── Font: DM Sans
├── Size: 18px
├── Weight: Medium (500)
├── Line-height: 1.4
```

### Body Styles

```
Body Large
├── Font: DM Sans
├── Size: 18px
├── Weight: Regular (400)
├── Line-height: 1.625
├── Max-width: 65ch
└── Usage: Lead paragraphs, featured text

Body Medium (Default)
├── Font: DM Sans
├── Size: 16px
├── Weight: Regular (400)
├── Line-height: 1.5
├── Max-width: 75ch
└── Usage: Primary content

Body Small
├── Font: DM Sans
├── Size: 14px
├── Weight: Regular (400)
├── Line-height: 1.5
├── Max-width: 80ch
└── Usage: Secondary content, dense UIs
```

### Functional Styles

```
Label Large
├── Font: DM Sans
├── Size: 14px
├── Weight: Medium (500)
├── Line-height: 1
├── Letter-spacing: 0.025em
├── Transform: Uppercase
└── Usage: Section labels, eyebrows

Label Medium
├── Font: DM Sans
├── Size: 12px
├── Weight: Medium (500)
├── Line-height: 1
├── Letter-spacing: 0.025em
└── Usage: Form labels, tags

Caption
├── Font: DM Sans
├── Size: 12px
├── Weight: Regular (400)
├── Line-height: 1.4
└── Usage: Helper text, metadata

Code Block
├── Font: JetBrains Mono
├── Size: 14px
├── Weight: Regular (400)
├── Line-height: 1.625
└── Usage: Code snippets

Code Inline
├── Font: JetBrains Mono
├── Size: 14px (0.875em)
├── Weight: Regular (400)
├── Background: neutral.100
├── Padding: 2px 4px
├── Radius: 4px
```

---

## Font Pairing Guidelines

### Primary Pair: Cabinet Grotesk + DM Sans

```
Display/Headings: Cabinet Grotesk (Bold, Semibold)
Body/UI: DM Sans (Regular, Medium, Semibold)
```

**Why it works:**
- Cabinet Grotesk has distinctive character for brand moments
- DM Sans is highly legible for reading and UI
- Both share geometric DNA but differ in personality
- Clear hierarchy through font family change

### Alternative Pairs

**Modern Minimal:**
```
Display: Clash Display
Body: Inter
Mono: Fira Code
```

**Editorial/Luxury:**
```
Display: Fraunces
Body: Source Serif Pro  
Sans: DM Sans (for UI)
```

**Tech/Developer:**
```
Display: Space Grotesk
Body: IBM Plex Sans
Mono: JetBrains Mono
```

---

## Responsive Typography

### Fluid Type Scale

Use CSS `clamp()` for smooth scaling:

```css
/* Display Large */
--display-large: clamp(48px, 8vw, 96px);

/* H1 */
--heading-1: clamp(24px, 5vw, 36px);

/* Body */
--body: clamp(14px, 1vw + 12px, 16px);
```

### Breakpoint Adjustments

| Style | Mobile | Tablet | Desktop |
|-------|--------|--------|---------|
| Display Large | 48px | 64px | 72-96px |
| Display Medium | 36px | 44px | 48px |
| H1 | 24px | 28px | 30px |
| H2 | 20px | 22px | 24px |
| Body | 14px | 15px | 16px |

---

## Hierarchy Rules

### 1. Maximum Two Size Jumps

Don't jump more than two steps in the scale between adjacent elements:

```
✓ Good: 48px → 24px → 16px
✗ Bad:  72px → 14px
```

### 2. Weight Creates Hierarchy Within Size

```
Same size, different weights:
├── Bold (700): Primary action
├── Medium (500): Secondary emphasis
└── Regular (400): Standard content
```

### 3. Color Creates Tertiary Hierarchy

```
Same size and weight:
├── foreground.primary: Important
├── foreground.secondary: Supporting
└── foreground.tertiary: Disabled/muted
```

---

## Figma Text Styles Setup

Create Figma text styles with this naming convention:

```
Display/
├── Large
├── Medium
└── Small

Heading/
├── H1
├── H2
├── H3
└── H4

Body/
├── Large
├── Medium
└── Small

Label/
├── Large
└── Medium

Code/
├── Block
└── Inline
```

Each style should:
1. Use Figma Variables for font sizes
2. Include line-height and letter-spacing
3. Be linked to appropriate color variables
4. Have responsive variants where needed

---

## Typography Anti-Patterns

### ❌ Avoid
- More than 3 font families
- More than 4 font weights
- Line lengths over 80 characters
- Tiny text below 12px (except legal/fine print)
- All caps for more than a few words
- Centered body text

### ✓ Embrace
- Clear hierarchy through contrast
- Generous line-height for body text
- Optical alignment over mathematical
- Responsive type that breathes
- Consistent vertical rhythm

---

## Accessibility Requirements

| Context | Minimum Size | Contrast Ratio |
|---------|--------------|----------------|
| Body text | 16px | 4.5:1 |
| UI components | 14px | 4.5:1 |
| Large text (24px+) | - | 3:1 |
| Decorative | No minimum | No requirement |

All text must be resizable up to 200% without loss of functionality.

