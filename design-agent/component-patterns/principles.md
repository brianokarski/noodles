# Component Patterns

> Synthesized from Swiss references, book knowledge, and deck design work

---

## Core Rules

### 1. No ornamentation
No drop shadows, gradients, borders (unless 1px functional), decorative rules, or illustrative embellishments. Every visual element serves a communicative function.

### 2. Components are grid citizens
Every component aligns to the master grid. Internal padding follows the spacing scale. Components don't float — they snap.

### 3. Systematic repetition
When a component pattern is established, apply it consistently. Variation comes from content, not from changing the component structure.

---

## Stat Block
```
[divider line — full width, 1px, 20% grey]
[value — 48px, Black weight, accent color]    [label — 14px, Regular, 50% grey, wide tracking]
```
- Divider above, not below
- Value left-aligned, label offset to the right
- Stack vertically with consistent spacing

## Card
```
[card frame — dark fill (6-8% white), 1px stroke (15% grey)]
  [category — 11px, Medium, accent color, wide tracking, uppercase]
  [title — 28px, Black weight, off-white]
  [description — 14-16px, Regular, 50-60% grey]
  [arrow or action — 24px, 40% grey, bottom-right]
```
- No border-radius (sharp corners)
- Internal padding: 32px
- Cards in a row share identical dimensions

## Quote/Manifesto Block
```
[accent-color filled frame]
  [text — 44px, Black weight, near-black on accent]
  [attribution or CTA — 16px, Medium, near-black, bottom of block]
```
- Used for provocative statements or positioning claims
- One per slide maximum
- Should contrast sharply with the dark background

## CTA Strip
```
[full-width accent-color frame, 60px height]
  [text — 18px, Black weight, near-black, wide tracking (6px)]
```
- Always full width of the slide/page
- Positioned at absolute bottom
- Single line of text, left-aligned with standard margin

## Section Label
```
[text — 14px, Medium weight, accent color, letter-spacing: 8px, uppercase]
```
- Always positioned at top-left of content zone (x:80, y:80)
- Consistent position across all slides

## Ghost Number
```
[text — 200px, Bold weight, 8% white opacity]
```
- Positioned at top-left, slightly clipped by frame edge (y: -30)
- Provides subliminal section orientation
- Never competes with content — it's felt, not read
