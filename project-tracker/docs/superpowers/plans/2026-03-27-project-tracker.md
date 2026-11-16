# Project Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a native Mac Tauri app that reads Obsidian project files and renders a Gantt-style timeline with an integrated sprint timer.

**Architecture:** Tauri v2 app with a Rust backend for file reading/watching/parsing and a React + TypeScript frontend for rendering. The Rust side exposes two IPC commands: `get_projects` (initial load) and an event channel `projects-updated` (file watcher). The frontend is a single-page app with no routing.

**Tech Stack:** Tauri v2, Rust, React 18, TypeScript, Vite, CSS (no Tailwind, no component library)

**Spec:** `docs/superpowers/specs/2026-03-27-project-tracker-design.md`
**Prototype:** `prototype.html` (reference for layout/styling)

---

## Prerequisites

Before starting, the developer must have:
- Rust toolchain installed (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- Node.js 18+ (already present: v25.2.1)
- Tauri CLI (`cargo install tauri-cli`)

---

## File Structure

```
src-tauri/
  src/
    main.rs           — Tauri app entry, registers commands + file watcher
    parser.rs         — Markdown parser: reads .md files, extracts Project structs
    watcher.rs        — File watcher: watches ~/Documents/Obsidian/Projects/*.md
    models.rs         — Rust structs: Project, TimelineEntry (serde serializable)
  Cargo.toml
  tauri.conf.json
  icons/

src/
  main.tsx            — React entry point
  App.tsx             — Root component, receives project data via IPC
  App.css             — Global styles + font faces + antialiasing
  components/
    TopBar.tsx        — Logo, status pills, sprint timer container
    SprintTimer.tsx   — CYBERDORO timer: marquee, duration toggle, countdown, controls
    ProjectList.tsx   — Left column: "Projects" pill + project cards
    ProjectCard.tsx   — Single project card (name centered)
    GanttView.tsx     — Right column: week headers, day labels, gantt blocks, today line
    GanttBlock.tsx    — Single project's gantt row: phase bars + checkpoint dots + tooltips
    WeekHeader.tsx    — Week date pills row
    DayLabels.tsx     — M/T/W/T/F day pills with date numbers, today highlight
  hooks/
    useProjects.ts    — IPC hook: calls get_projects on mount, listens to projects-updated event
    useTimer.ts       — Pomodoro timer state machine
    useDragScroll.ts  — Drag-to-scroll behavior for the timeline
  utils/
    dates.ts          — Date math: week starts, day-of-week, date-to-column-position
    messages.ts       — LED marquee quote list
  types.ts            — TypeScript types matching Rust models

public/
  fonts/
    Inter-Regular.ttf
    (display font of your choice)
  images/
    project-tracker.png
```

---

## Task 1: Scaffold Tauri + React project

**Files:**
- Create: entire project scaffold
- Modify: `tauri.conf.json` for window config

- [ ] **Step 1: Create Tauri v2 app with React template**

```bash
cd project-tracker
npm create tauri-app@latest . -- --template react-ts --manager npm
```

If the directory isn't empty, move existing files aside first, scaffold, then move them back.

- [ ] **Step 2: Verify scaffold builds**

```bash
npm install
npm run tauri dev
```

Expected: blank Tauri window opens.

- [ ] **Step 3: Configure window**

Edit `src-tauri/tauri.conf.json`:
- Window title: "Project Tracker"
- Default size: 1440x900
- Min size: 1024x600
- Decorations: true (native title bar)
- Transparent: false

- [ ] **Step 4: Copy fonts and images into public/**

```bash
mkdir -p public/fonts public/images
cp fonts/Inter-Regular.ttf public/fonts/
cp fonts/(display font of your choice) public/fonts/
cp images/project-tracker.png public/images/
```

- [ ] **Step 5: Commit**

```bash
git init
echo "node_modules\ntarget\ndist\n.DS_Store" > .gitignore
git add -A
git commit -m "feat: scaffold Tauri v2 + React project"
```

---

## Task 2: Rust models and markdown parser

**Files:**
- Create: `src-tauri/src/models.rs`
- Create: `src-tauri/src/parser.rs`
- Modify: `src-tauri/src/main.rs`

- [ ] **Step 1: Define Rust models**

Create `src-tauri/src/models.rs`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelineEntry {
    pub start_date: String,      // YYYY-MM-DD
    pub end_date: Option<String>, // YYYY-MM-DD, None = point event
    pub entry_type: String,       // milestone, review, deadline, handoff, sync, checkin, phase
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub name: String,
    pub status: String,
    pub lead: Vec<String>,
    pub team: Vec<String>,
    pub director: Option<String>,
    pub pm: Option<String>,
    pub entries: Vec<TimelineEntry>,
}
```

- [ ] **Step 2: Write the parser**

Create `src-tauri/src/parser.rs`:

The parser should:
1. Read all `*.md` files from `~/Documents/Obsidian/Projects/`
2. For each file:
   - Extract `# Title` as project name
   - Extract `**Status:**`, `**Lead:**`, `**Team:**`, `**Director:**`, `**PM:**` via line-starts matching
   - Find `#### Timeline:` section
   - Parse each line starting with `- ` until next `####` or EOF
   - Point event format: `- YYYY-MM-DD | type | description`
   - Duration format: `- YYYY-MM-DD to YYYY-MM-DD | type | description`
3. Return `Vec<Project>`

```rust
use std::fs;
use std::path::PathBuf;
use crate::models::{Project, TimelineEntry};

pub fn get_projects_dir() -> PathBuf {
    let home = dirs::home_dir().expect("Could not find home directory");
    home.join("Documents/Obsidian/Projects")
}

pub fn parse_all_projects() -> Vec<Project> {
    let dir = get_projects_dir();
    let mut projects = Vec::new();

    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map_or(false, |e| e == "md") {
                if let Ok(content) = fs::read_to_string(&path) {
                    if let Some(project) = parse_project(&content) {
                        projects.push(project);
                    }
                }
            }
        }
    }

    projects
}

fn parse_project(content: &str) -> Option<Project> {
    let lines: Vec<&str> = content.lines().collect();

    let name = lines.iter()
        .find(|l| l.starts_with("# "))
        .map(|l| l.trim_start_matches("# ").to_string())?;

    let status = extract_field(&lines, "**Status:**");
    let lead = extract_list(&lines, "**Lead:**");
    let team = extract_list(&lines, "**Team:**");
    let director = extract_field_optional(&lines, "**Director:**");
    let pm = extract_field_optional(&lines, "**PM:**");

    let entries = parse_timeline(&lines);

    Some(Project { name, status, lead, team, director, pm, entries })
}

fn extract_field(lines: &[&str], prefix: &str) -> String {
    lines.iter()
        .find(|l| l.starts_with(prefix))
        .map(|l| l.trim_start_matches(prefix).trim().to_string())
        .unwrap_or_default()
}

fn extract_field_optional(lines: &[&str], prefix: &str) -> Option<String> {
    lines.iter()
        .find(|l| l.starts_with(prefix))
        .map(|l| l.trim_start_matches(prefix).trim().to_string())
}

fn extract_list(lines: &[&str], prefix: &str) -> Vec<String> {
    extract_field(lines, prefix)
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

fn parse_timeline(lines: &[&str]) -> Vec<TimelineEntry> {
    let mut entries = Vec::new();
    let mut in_timeline = false;

    for line in lines {
        if line.starts_with("#### Timeline") {
            in_timeline = true;
            continue;
        }
        if in_timeline && line.starts_with("####") {
            break;
        }
        if in_timeline && line.starts_with("- ") {
            if let Some(entry) = parse_timeline_entry(line) {
                entries.push(entry);
            }
        }
    }

    entries
}

fn parse_timeline_entry(line: &str) -> Option<TimelineEntry> {
    let content = line.trim_start_matches("- ");
    let parts: Vec<&str> = content.splitn(3, " | ").collect();
    if parts.len() < 3 {
        return None;
    }

    let date_part = parts[0].trim();
    let entry_type = parts[1].trim().to_string();
    let description = parts[2].trim().to_string();

    if date_part.contains(" to ") {
        let dates: Vec<&str> = date_part.splitn(2, " to ").collect();
        Some(TimelineEntry {
            start_date: dates[0].trim().to_string(),
            end_date: Some(dates[1].trim().to_string()),
            entry_type,
            description,
        })
    } else {
        Some(TimelineEntry {
            start_date: date_part.to_string(),
            end_date: None,
            entry_type,
            description,
        })
    }
}
```

- [ ] **Step 3: Add `dirs` dependency to Cargo.toml**

```bash
cd src-tauri
cargo add dirs serde --features serde/derive
```

- [ ] **Step 4: Register modules in main.rs and add IPC command**

```rust
mod models;
mod parser;
mod watcher;

use parser::parse_all_projects;
use models::Project;

#[tauri::command]
fn get_projects() -> Vec<Project> {
    parse_all_projects()
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_projects])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 5: Verify it compiles**

```bash
cd .. && npm run tauri dev
```

Expected: app opens, no compile errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: Rust markdown parser and IPC command"
```

---

## Task 3: File watcher

**Files:**
- Create: `src-tauri/src/watcher.rs`
- Modify: `src-tauri/src/main.rs`

- [ ] **Step 1: Add notify dependency**

```bash
cd src-tauri && cargo add notify
```

- [ ] **Step 2: Write watcher module**

Create `src-tauri/src/watcher.rs`:

```rust
use notify::{Watcher, RecursiveMode, RecommendedWatcher, Event, EventKind};
use std::sync::mpsc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use crate::parser::parse_all_projects;

pub fn start_watcher(app: AppHandle) {
    std::thread::spawn(move || {
        let (tx, rx) = mpsc::channel();

        let mut watcher = RecommendedWatcher::new(
            move |res: Result<Event, _>| {
                if let Ok(event) = res {
                    if matches!(event.kind, EventKind::Modify(_) | EventKind::Create(_) | EventKind::Remove(_)) {
                        let _ = tx.send(());
                    }
                }
            },
            notify::Config::default().with_poll_interval(Duration::from_secs(2)),
        ).expect("Failed to create watcher");

        let dir = crate::parser::get_projects_dir();
        watcher.watch(&dir, RecursiveMode::NonRecursive)
            .expect("Failed to watch directory");

        // Debounce: wait 500ms after last event before re-parsing
        loop {
            if rx.recv().is_ok() {
                // Drain any queued events
                while rx.recv_timeout(Duration::from_millis(500)).is_ok() {}
                let projects = parse_all_projects();
                let _ = app.emit("projects-updated", &projects);
            }
        }
    });
}
```

- [ ] **Step 3: Start watcher in main.rs setup**

Update `main.rs`:

```rust
mod watcher;
use watcher::start_watcher;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_projects])
        .setup(|app| {
            start_watcher(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 4: Verify watcher compiles and runs**

```bash
cd .. && npm run tauri dev
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: file watcher with debounced project reload"
```

---

## Task 4: TypeScript types and IPC hook

**Files:**
- Create: `src/types.ts`
- Create: `src/hooks/useProjects.ts`

- [ ] **Step 1: Define TypeScript types**

Create `src/types.ts`:

```typescript
export interface TimelineEntry {
  start_date: string;
  end_date: string | null;
  entry_type: string;
  description: string;
}

export interface Project {
  name: string;
  status: string;
  lead: string[];
  team: string[];
  director: string | null;
  pm: string | null;
  entries: TimelineEntry[];
}
```

- [ ] **Step 2: Create useProjects hook**

Create `src/hooks/useProjects.ts`:

```typescript
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Project } from "../types";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    invoke<Project[]>("get_projects").then(setProjects);

    const unlisten = listen<Project[]>("projects-updated", (event) => {
      setProjects(event.payload);
    });

    return () => { unlisten.then((fn) => fn()); };
  }, []);

  return projects;
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: TypeScript types and useProjects IPC hook"
```

---

## Task 5: Global styles and font setup

**Files:**
- Create: `src/App.css` (replace scaffold default)

- [ ] **Step 1: Write global styles**

Replace `src/App.css` with styles from the prototype. Include:
- `@font-face` declarations for Inter and a display font(reference files in `/fonts/`)
- CSS reset (`* { margin:0; padding:0; box-sizing:border-box; }`)
- Body styles: font-family Inter, 19px, normal weight, antialiasing stack
- All component styles from prototype (topbar, pills, sprint-timer, left-col, right-col, gantt-block, bars, dots, tooltips, today-line, week-days, etc.)
- Media query for 1440px

Reference `prototype.html` for exact values. Port all CSS from the prototype `<style>` tag.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: global styles and font setup"
```

---

## Task 6: Date utilities

**Files:**
- Create: `src/utils/dates.ts`

- [ ] **Step 1: Write date utility functions**

```typescript
export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekStarts(centerDate: Date, weeksBefore: number, weeksAfter: number): Date[] {
  const monday = getMonday(centerDate);
  const weeks: Date[] = [];
  for (let i = -weeksBefore; i <= weeksAfter; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i * 7);
    weeks.push(d);
  }
  return weeks;
}

export function dateToColumnIndex(date: Date, weekStarts: Date[]): number {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const firstMonday = weekStarts[0];
  const diffDays = Math.floor((target.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24));
  const weekIndex = Math.floor(diffDays / 7);
  const dayOfWeek = diffDays % 7; // 0=Mon, 4=Fri
  if (dayOfWeek > 4) return -1; // weekend
  return weekIndex * 5 + dayOfWeek;
}

export function columnToPercent(colIndex: number, totalDays: number): number {
  return ((colIndex + 0.5) / totalDays) * 100;
}

export function rangeToPercent(startCol: number, endCol: number, totalDays: number): { left: number; width: number } {
  const left = (startCol / totalDays) * 100;
  const width = ((endCol - startCol + 1) / totalDays) * 100;
  return { left, width };
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export function formatWeekLabel(monday: Date): string {
  return monday.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

export function getDayLabel(dayIndex: number): string {
  return ["M", "T", "W", "T", "F"][dayIndex] || "";
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: date utility functions"
```

---

## Task 7: Sprint Timer components

**Files:**
- Create: `src/hooks/useTimer.ts`
- Create: `src/utils/messages.ts`
- Create: `src/components/SprintTimer.tsx`

- [ ] **Step 1: Create messages list**

Create `src/utils/messages.ts` — copy the marquee messages array from prototype.

- [ ] **Step 2: Create useTimer hook**

Create `src/hooks/useTimer.ts`:

State machine with states: idle, running, paused, break_running, break_paused. Exposes: `remaining`, `isBreak`, `isRunning`, `duration`, `setDuration`, `toggle`, `reset`, `sessionCount`.

- [ ] **Step 3: Create SprintTimer component**

Create `src/components/SprintTimer.tsx`:

Port the timer HTML structure from prototype. Uses `useTimer` hook and `messages.ts`. LED marquee with CSS animation, duration toggle (25/50), timer display, START/PAUSE/RESET buttons with fixed widths.

- [ ] **Step 4: Verify timer works in isolation**

Temporarily render `<SprintTimer />` in App.tsx, run `npm run tauri dev`, confirm timer counts down, marquee scrolls, buttons work.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: sprint timer component with LED marquee"
```

---

## Task 8: TopBar component

**Files:**
- Create: `src/components/TopBar.tsx`

- [ ] **Step 1: Create TopBar**

Contains: logo image (absolute positioned), "X Active Projects" pill, "X Complete" pill, `<SprintTimer />`. Counts derived from projects prop.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: top bar with project counts and timer"
```

---

## Task 9: Gantt components

**Files:**
- Create: `src/components/WeekHeader.tsx`
- Create: `src/components/DayLabels.tsx`
- Create: `src/components/GanttBlock.tsx`
- Create: `src/components/GanttView.tsx`
- Create: `src/hooks/useDragScroll.ts`

- [ ] **Step 1: Create useDragScroll hook**

Port drag-to-scroll logic from prototype. Returns a ref to attach to the scrollable container.

- [ ] **Step 2: Create WeekHeader**

Row of black week-date pills. Takes `weekStarts: Date[]` prop.

- [ ] **Step 3: Create DayLabels**

Row of gray day pills with day letter + date number. Highlights today in red. Takes `weekStarts: Date[]` prop.

- [ ] **Step 4: Create GanttBlock**

Single project's gantt row (96px). Positions phase bars in top half, checkpoint dots in bottom half. Calculates positions from `TimelineEntry[]` using date utils. Tooltip on hover.

- [ ] **Step 5: Create GanttView**

Right column container: `<WeekHeader />`, `<DayLabels />`, then `<GanttBlock />` per project. Includes today vertical line. Uses `useDragScroll`. `right-inner` sets min-width based on number of weeks × column width.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: gantt view with week headers, day labels, and project blocks"
```

---

## Task 10: Project list (left column)

**Files:**
- Create: `src/components/ProjectCard.tsx`
- Create: `src/components/ProjectList.tsx`

- [ ] **Step 1: Create ProjectCard**

Gray rounded card (96px height), project name centered. Takes `name: string` prop.

- [ ] **Step 2: Create ProjectList**

Left column: "Projects" pill (89px tall) + list of `<ProjectCard />`. Gap 8px.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: project list left column"
```

---

## Task 11: Wire everything together in App.tsx

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Compose App.tsx**

```typescript
import { useProjects } from "./hooks/useProjects";
import TopBar from "./components/TopBar";
import ProjectList from "./components/ProjectList";
import GanttView from "./components/GanttView";
import { getWeekStarts } from "./utils/dates";
import "./App.css";

function App() {
  const projects = useProjects();
  const weekStarts = getWeekStarts(new Date(), 1, 4);

  return (
    <div className="app">
      <TopBar projects={projects} />
      <div className="main">
        <ProjectList projects={projects} />
        <GanttView projects={projects} weekStarts={weekStarts} />
      </div>
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Clean up main.tsx**

Remove any scaffold boilerplate. Just render `<App />`.

- [ ] **Step 3: Test full app**

```bash
npm run tauri dev
```

Expected: app opens with real project data from Obsidian files rendered in the Gantt view. Timer works. Drag to scroll works. Today line shows.

- [ ] **Step 4: Test file watcher**

Open one of the Obsidian project files, add a timeline entry, save. The app should update within ~1 second.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: wire all components together, app is functional"
```

---

## Task 12: Add timeline data to Obsidian files

**Files:**
- Modify: `~/Documents/Obsidian/Projects/*.md` (add `#### Timeline:` sections)

- [ ] **Step 1: Add structured timeline entries to each project file**

Add `#### Timeline:` section with entries in the format:
```
- YYYY-MM-DD | type | description
- YYYY-MM-DD to YYYY-MM-DD | phase | description
```

Use the existing freeform timeline data as a guide. This is manual data entry — translate the current dates into the structured format.

- [ ] **Step 2: Verify app renders the new data**

```bash
npm run tauri dev
```

Expected: all projects show timeline bars and checkpoint dots at correct positions.

- [ ] **Step 3: Commit the app (not the Obsidian files)**

```bash
git add -A
git commit -m "feat: v1 complete — Project Tracker functional"
```
