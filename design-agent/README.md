# Design Agent

Train Claude's design skills for Figma work. Each skill domain contains principles extracted from books, references, and examples that Claude reads before generating designs.

## Skills

| Skill | Status | Sources | Description |
|-------|--------|---------|-------------|
| typography | Trained | Ruder, Müller-Brockmann, Muggeridge, Typeface Design 101 | Type scales, hierarchy, tracking, leading, typeface selection |
| layout | Trained | Müller-Brockmann, Swiss layout refs (7 images) | Grid systems, spacing, composition, alignment |
| color | Trained | Swiss refs, Wheeler, K-HOLE | Palette construction, grey scale hierarchy, accent usage |
| brand-identity | Trained | Wheeler, K-HOLE, Millman, McLuhan | Positioning, visual identity, fragmentation strategy |
| deck-design | Trained | Synthesized from all sources | Slide structure, pacing, information hierarchy |
| component-patterns | Trained | Synthesized from all sources | Cards, CTAs, stat blocks, section labels, ghost numbers |

## How it works

1. Drop references into `{skill}/references/`, `{skill}/pdfs/`, or `books/`
2. Show Claude examples (Figma URLs, screenshots, descriptions)
3. Claude extracts principles into `{skill}/principles.md`
4. Principles are loaded before any Figma design work

## Folder structure

```
Design Agent/
  books/                    <- Source PDFs organized by topic
    Typography/
    Brand Identity/
    Strategy and Thinking/
    Logo Design/
  skills/                   <- Extracted book knowledge (JSON)
    typography/
    layout/
    branding/
  layout/
    swiss layout/           <- Swiss design reference images
  fonts/                    <- Drop your own licensed fonts here
  typography/principles.md
  layout/principles.md
  color/principles.md
  brand-identity/principles.md
  deck-design/principles.md
  component-patterns/principles.md
```

## Cross-cutting themes

These five principles emerged from every source and apply to all skills:

1. **Constraint is generative.** Limitation of means, typefaces, colors, and visibility produces better outcomes than abundance.
2. **Context over isolation.** Always design in context — the double-spread, the user flow, the full sequence — never a single element alone.
3. **Optical truth over mathematical truth.** The eye is the final judge, not the grid. What is measured as equal may not appear equal.
4. **Deliberate distinction.** Make differences obvious or don't make them at all. Ambiguous variation is the enemy of clarity.
5. **What you leave out defines you.** White space, restraint, opacity, omission — as powerful as inclusion.
