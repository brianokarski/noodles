# Critique Agent

A design QA skill that performs a systematic second pass on Figma files to catch and fix visual inconsistencies.

## What it does

The Critique Agent treats design review like a code linter. It screenshots every frame in a Figma file, loads the project's design principles and reference images, then runs a comprehensive checklist covering typography, layout, spacing, color, and system consistency. It generates a prioritized fix list with exact Figma Plugin API code, applies the fixes, and re-screenshots to verify.

## When to use it

Run this after the initial design pass is complete. The agent does not generate designs — it reviews and corrects them. Use it when:

- A deck or layout has been built and needs QA before sharing
- You want to ensure pixel-level consistency across all slides/frames
- You suspect tracking, spacing, or positioning has drifted across frames
- You need to verify that fixed components (footers, TOC, section labels) are identical on every page

## How to invoke

Say **"critique"**, **"cleanup"**, **"second pass"**, **"review"**, or **"QA"** followed by the Figma file URL.

Example:
```
critique https://figma.com/design/abc123/My-Deck
```

## What it checks

| Category | Examples |
|----------|----------|
| Typography | Tracking per size, line-height, font weight matching reference, size consistency across slides, scale distinction |
| Layout | Rule widths, grid alignment, fixed component positions, text overflow, margin consistency |
| Spacing | White space between zones, zone proportions, spacing scale adherence |
| Color | Text color consistency, rule color values, background uniformity, accent color usage |
| System | Fixed vs. variable element consistency, type scale integrity, component pattern compliance |

## Dependencies

- **Principles files** in the parent project (`typography/`, `layout/`, `color/`, `component-patterns/`, `deck-design/`)
- **Reference images** in `layout/swiss layout/`
- **Figma MCP tools**: `get_metadata`, `get_screenshot`, `use_figma`
- A reference frame named "Brian" or "Reference" in the Figma file (optional but preferred)

## Output

1. A prioritized fix list (Critical / Major / Minor) with exact current and target values
2. Automated fixes applied via the Figma Plugin API
3. Before/after screenshots of every modified frame
4. A summary report with issue counts and patterns

## Files

- `critique-agent.md` — The full agent skill with step-by-step instructions and checklist
