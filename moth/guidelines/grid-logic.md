# Grid Logic & Spacing Philosophy

> "Space is not empty. Space is intentional silence that gives meaning to the shapes it surrounds."

---

## Core Principles

### 1. The Base Unit

Everything derives from `4px`.

```
Base Unit = 4px
```

This creates a predictable rhythm throughout all designs:

| Token | Value | Usage |
|-------|-------|-------|
| `space.1` | 4px | Tight gaps, icon margins |
| `space.2` | 8px | Small padding, list gaps |
| `space.3` | 12px | Standard component gaps |
| `space.4` | 16px | Content padding, card gaps |
| `space.6` | 24px | Section internal spacing |
| `space.8` | 32px | Major section breaks |
| `space.12` | 48px | Section padding |
| `space.16` | 64px | Large section breaks |
| `space.24` | 96px | Major visual breaks |

### 2. The Spacing Scale

We use a **geometric progression** that provides visual harmony:

```
4 → 8 → 12 → 16 → 20 → 24 → 32 → 40 → 48 → 64 → 80 → 96...
```

Each step increases by roughly 1.5× the previous, creating natural visual relationships.

---

## Column Systems

### Desktop (12 columns)
```
┌──────────────────────────────────────────────────────────────────────┐
│ M │ C │ G │ C │ G │ C │ G │ C │ G │ C │ G │ C │ G │ C │ G │ C │ G │ C │ M │
└──────────────────────────────────────────────────────────────────────┘

M = Margin (80px default)
C = Column (fluid)
G = Gutter (32px default)
```

### Tablet (8 columns)
```
┌────────────────────────────────────────────────┐
│ M │ C │ G │ C │ G │ C │ G │ C │ G │ C │ G │ C │ G │ C │ M │
└────────────────────────────────────────────────┘

M = Margin (40px)
G = Gutter (24px)
```

### Mobile (4 columns)
```
┌────────────────────────┐
│ M │ C │ G │ C │ G │ C │ G │ C │ M │
└────────────────────────┘

M = Margin (16px)
G = Gutter (16px)
```

---

## Breakpoints

| Name | Min Width | Columns | Margin | Gutter |
|------|-----------|---------|--------|--------|
| `xs` | 0px | 4 | 16px | 16px |
| `sm` | 640px | 4 | 24px | 16px |
| `md` | 768px | 8 | 40px | 24px |
| `lg` | 1024px | 12 | 64px | 32px |
| `xl` | 1280px | 12 | 80px | 32px |
| `2xl` | 1536px | 12 | auto | 32px |

At `2xl`, margins become fluid to center content at `maxWidth: 1280px`.

---

## Density Modes

Different contexts require different spatial densities:

### Comfortable (Default)
```
Component padding: space.4 (16px)
Component gap: space.4 (16px)
Section gap: space.8 (32px)
```
Use for: Marketing pages, onboarding, content-heavy layouts

### Compact
```
Component padding: space.3 (12px)
Component gap: space.2 (8px)
Section gap: space.6 (24px)
```
Use for: Data-dense dashboards, mobile UIs, settings panels

### Sparse
```
Component padding: space.6 (24px)
Component gap: space.6 (24px)
Section gap: space.12 (48px)
```
Use for: Hero sections, landing pages, luxury/premium feels

---

## Alignment Rules

### 1. Baseline Grid

All text should align to a 4px baseline grid.

```
Line height must result in heights divisible by 4:

16px font × 1.5 line-height = 24px ✓
14px font × 1.5 line-height = 21px ✗ (use 1.43 → 20px, or 1.57 → 22px... round to 20px)
```

### 2. Icon Alignment

Icons should be optically centered, not mathematically centered.

```
Good: Icons aligned by visual weight
Bad: Icons aligned by bounding box
```

### 3. Edge Alignment

Elements should align to the content edge, not the container edge:

```
┌─────────────────────────────┐
│  ┌─────────────────────┐    │  ← Container padding
│  │ Title               │    │
│  ├─────────────────────┤    │
│  │ Content aligns to   │    │  ← Content aligns to title, 
│  │ title edge          │    │     not card edge
│  └─────────────────────┘    │
└─────────────────────────────┘
```

---

## Figma Implementation

### Auto-Layout Settings

```
Direction: Vertical or Horizontal
Spacing: Use token references (space.4)
Padding: Use token references (space.4 or asymmetric)
Alignment: Top-left default, center for CTA groups
Distribution: Packed (default), Space-between for navs
```

### Frame Naming Convention

```
[Component]/[Variant]/[State]

Examples:
Button/Primary/Default
Button/Primary/Hover
Card/Elevated/WithMedia
Section/Hero/CenteredDark
```

### Layer Structure

```
ComponentName
├── .container (auto-layout wrapper)
│   ├── .header
│   │   ├── .title
│   │   └── .subtitle
│   ├── .body
│   │   └── .content
│   └── .footer
│       └── .actions
```

---

## Spacing Tokens in Figma Variables

Set up Figma variables in this hierarchy:

```
Primitives/
├── space/
│   ├── 0 = 0
│   ├── 1 = 4
│   ├── 2 = 8
│   ├── 3 = 12
│   ├── 4 = 16
│   └── ...

Semantic/
├── spacing/
│   ├── content/
│   │   ├── xs = {Primitives/space/1}
│   │   ├── sm = {Primitives/space/2}
│   │   └── ...
│   ├── component/
│   │   └── ...
│   └── section/
│       └── ...
```

---

## Common Patterns

### Card Spacing
```
Outer: padding-{space.6}
Header-to-body: gap-{space.4}
Body items: gap-{space.3}
```

### List Spacing
```
Between items: gap-{space.1} (tight) or gap-{space.2} (normal)
Item padding: padding-{space.3}
```

### Form Spacing
```
Between fields: gap-{space.4}
Label-to-input: gap-{space.1.5}
Input-to-helper: gap-{space.1}
```

### Section Spacing
```
Between sections: gap-{space.16} to gap-{space.24}
Section internal: padding-y-{space.12}
```

---

## Anti-Patterns

### ❌ Don't Mix Spacing Systems
```
Bad:  margin: 13px;  /* arbitrary value */
Good: margin: var(--space-3);  /* 12px token */
```

### ❌ Don't Create Visual Orphans
```
Bad:  Large gap above element, tiny gap below
Good: Consistent visual grouping through proximity
```

### ❌ Don't Ignore Optical Alignment
```
Bad:  Mathematical center that looks off
Good: Adjusted position for visual balance
```

### ❌ Don't Overpad Mobile
```
Bad:  Same 80px margins on mobile as desktop
Good: Proportional margins that preserve content space
```

---

## The Golden Ratio Exception

For hero elements and large display typography, the golden ratio (1.618) may be used for dramatic visual relationships:

```
Hero title: 72px
Hero subtitle: 72px / 1.618 ≈ 44px (round to 48px token)
```

This creates natural visual hierarchy that feels "right" even if viewers can't articulate why.

