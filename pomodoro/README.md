# Pomodoro 🍅

Tiny macOS menu bar Pomodoro timer with tag-based session tracking and weekly Obsidian reports.

## Features

- 🍅 Lives in the menu bar with live countdown
- Two presets: **50 / 10** and **25 / 5** (focus min / break min)
- Tag your sessions (what you're working on) — recent tags surface in the menu
- Plays a soft piano arpeggio on session complete
- Macos notification when focus or break finishes
- Persists every session to `~/Documents/Obsidian/Pomodoro/sessions.json`
- Generates weekly markdown reports in your Obsidian vault

## Run

Double-click `Pomodoro.command` (Finder will open Terminal and launch the app), or:

```bash
~/Applications/Pomodoro/run.sh
```

## Auto-launch on login (optional)

System Settings → General → Login Items → add `Pomodoro.command`.

Or for a true background launchd setup, ask Claude to write you a `~/Library/LaunchAgents/com.brian.pomodoro.plist`.

## Sound

The completion sound lives at `sounds/piano.wav` — a generated 4-note arpeggio + sustained chord. Swap it for any audio file (mp3, wav, aiff) and rename to `piano.wav` to use your own.

To regenerate the default chime:

```bash
cd ~/Applications/Pomodoro
source venv/bin/activate
python generate_piano.py
```

Tweak `notes` in `generate_piano.py` to change the melody.

## Where reports live

- `~/Documents/Obsidian/Pomodoro/sessions.json` — raw session log
- `~/Documents/Obsidian/Pomodoro/2026-W19.md` — weekly markdown report (auto-named ISO year-week)

The weekly report shows: total focus time, sessions per tag, sessions per day, and a chronological list. Open the report folder via the menu, or just navigate in Obsidian — it'll show up in your vault sidebar.

## Menu

| Item | What it does |
|---|---|
| Start 50 / 10 → [tag] | Begin a focus session, then auto-roll into a break |
| Start 25 / 5 → [tag] | Same, shorter |
| Pause / Resume | Toggle the active timer |
| Reset | Stop and clear |
| Skip break | End a break early |
| Today's sessions | Quick popup of today's totals |
| Generate weekly report | Write the markdown report and open it |
| Open report folder | Reveal the Obsidian Pomodoro folder in Finder |
| Quit | Exit the app |

## Tags

Free-form. Suggested patterns:
- Project name (`Dev/Eng Identity`, `Neobank`)
- Activity (`Admin`, `Reflection`, `Review prep`)
- Whatever's useful for your weekly report

The menu surfaces your 8 most-recently-used tags. You can always type a new one via "New tag…".

## Files

```
~/Applications/Pomodoro/
├── pomodoro.py             # main app
├── generate_piano.py       # regenerates the completion sound
├── run.sh                  # CLI launcher
├── Pomodoro.command        # double-clickable launcher
├── venv/                   # python virtualenv (rumps + numpy)
├── sounds/
│   └── piano.wav           # completion sound (swap to customize)
└── README.md
```
