# Project Tracker — Design Spec

## Overview
A native Mac desktop app (Tauri) that reads Obsidian project files and renders a Gantt-style timeline. Includes an integrated pomodoro/sprint timer with LED marquee.

## Data Source
- Location: `~/Documents/Obsidian/Projects/*.md`
- Read-only — edits happen in Obsidian, app watches for changes and re-renders
- File watcher via Tauri's Rust backend triggers re-parse on save

## Markdown Format

### Header metadata (parsed via line matching):
```
# Project Name
**Status:** Active | Wrapping up | Blocked | Paused
**Lead:** Name(s)
**Team:** Name, Name, Name
**Director:** Name (optional)
**PM:** Name (optional)
```

### Timeline section:
```
#### Timeline:
- 2026-03-24 | milestone | Direction approved
- 2026-03-24 to 2026-03-28 | phase | Refine + build out elements
- 2026-03-27 | review | Joe review
```

### Entry types:
`milestone`, `review`, `deadline`, `handoff`, `sync`, `checkin`, `phase`

### Parsed data model:
```
Project {
  name: string
  status: string
  lead: string[]
  team: string[]
  director?: string
  pm?: string
  entries: TimelineEntry[]
}

TimelineEntry {
  startDate: Date
  endDate?: Date        // present = duration bar, absent = point marker (dot)
  type: string
  description: string
}
```

Parser reads header fields with regex, then parses `#### Timeline:` entries line by line. Stops at next `####` heading or EOF. Everything else (notes, decisions, context) is ignored.

## Tech Stack
- **Tauri** — native Mac app, lives in dock
- **React + TypeScript** — frontend SPA
- **CSS Grid** — Gantt rendering (no canvas, no D3)
- **Rust backend** — file reading, file watcher, markdown parser, IPC to frontend
- **No database, no server** — markdown files are the database

## Data Flow
```
Obsidian saves .md → Rust file watcher detects change → Rust parser extracts data → IPC to React frontend → Re-render Gantt
```

## App Layout

### Two-column layout:
- **Left column (fixed 280px):** Project cards + "Projects" header pill
- **Right column (horizontally scrollable, drag to pan):** Week headers, day labels, Gantt blocks
- White gradient fade on the left edge where timeline passes under project cards

### Top bar:
- Logo (Project Tracker death metal logo, top-left, overlapping)
- "5 Active Projects" pill (gray)
- "2 Complete" pill (gray)
- Sprint Timer (black bar, flex-fills remaining width)

### Header area (right column):
- Week pills (black, full-width per week): "March 23", "March 30", etc.
- Day label pills (gray, smaller): Each shows day letter left-aligned + date number right-aligned (e.g., `F  27`)
- Today's day pill highlighted in red with vertical line extending down through Gantt

### Project rows:
Each project = one block in both columns, pixel-aligned:
- **Left:** Rounded gray card with project name centered
- **Right:** Gantt block (96px height) containing:
  - Top half: Phase bar(s) — black rounded pill spanning the date range
  - Bottom half: Checkpoint dots positioned at their dates
  - Hover on dot → black tooltip pill showing "Mar 27 — Joe review"

### Spacing system:
- All margins/gaps = 8px consistently
- All pills: 20px border-radius, 10px 20px padding (or height: 54px for header pills)
- Faint vertical grid lines separate days (4% opacity), slightly darker at week boundaries (8% opacity)

## Sprint Timer (CYBERDORO)
Integrated in the top bar, uses a display font.

### Components:
- **LED marquee strip** — scrolls motivational/grim quotes (Cormac McCarthy, Matrix, Philip K. Dick, etc.)
- **Duration toggle:** 25 / 50 (green = active, dark = inactive)
- **Timer display:** countdown in salmon (#ffbeaf), green (#bdffaf) during break
- **START/PAUSE** button (fixed width, no layout jump)
- **RESET** button

### Behavior:
- Click START → countdown begins, button changes to PAUSE
- Session ends → auto-switches to 5min break, display turns green
- Break ends → resets to work session
- RESET returns to initial state

### Colors:
- Active duration: #bdffaf (green)
- Inactive duration: #393939
- Timer display: #ffbeaf (salmon), #bdffaf (green during break)
- START/PAUSE/RESET: #b0b0b0
- LED marquee text: #b0b0b0

## Visual Design

### Color palette:
- Black (#000), White (#fff), Gray (#d4d4d4, #e4e4e4, #999, #666)
- Red (#ff4444) for today indicator only
- Timer accent colors (green, salmon) confined to the timer bar

### Typography:
- **Inter** — all UI text, 19px, normal weight
- **a display font.4 Trial** — sprint timer only, 33px
- Full antialiasing: `-webkit-font-smoothing: antialiased`, `-moz-osx-font-smoothing: grayscale`, `text-rendering: geometricPrecision`, `font-feature-settings: 'kern' 1, 'liga' 1, 'calt' 1`

### Fonts:
Located in `/fonts/`:
- `Inter-Regular.ttf`
- `(display font of your choice)`

## Zoom levels (future):
- Week — 7 day columns visible, wider per-day
- Month — ~28 day columns, medium density (current default)
- Quarter — ~90 day columns, compressed

## Prototype
Working HTML prototype at `/prototype.html` demonstrates:
- Full layout with project cards + Gantt alignment
- Working pomodoro timer with LED marquee
- Drag-to-scroll timeline
- Today line + highlighted day
- Hover tooltips on checkpoint dots

## Out of scope for v1:
- Editing from the app (write-back to markdown)
- Settings/preferences UI
- Multiple views or pages
- Progress percentages
