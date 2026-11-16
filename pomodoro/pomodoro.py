"""
Pomodoro — macOS menu bar timer with session tracking.

Features:
- Two preset modes: 50/10 and 25/5 (focus min / break min)
- Tag-based tracking (what you're working on)
- Plays a piano arpeggio on session completion
- Persists sessions to JSON
- Generates weekly markdown reports in Obsidian
"""

import os
import json
import subprocess
import traceback
from datetime import datetime, timedelta, date
from pathlib import Path

import rumps

# Log file for catching errors that would otherwise silently freeze the timer
LOG_FILE = Path.home() / "Documents" / "Obsidian" / "Pomodoro" / "pomodoro.log"


def log_error(label, exc):
    """Append an error to the log file so we can debug stuck states."""
    try:
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(LOG_FILE, "a") as f:
            f.write(f"\n[{datetime.now().isoformat()}] {label}\n")
            f.write(traceback.format_exc())
    except Exception:
        pass

# -- Configuration ----------------------------------------------------------

APP_DIR = Path(__file__).parent
SOUNDS_DIR = APP_DIR / "sounds"
COMPLETE_SOUND = SOUNDS_DIR / "piano.wav"

OBSIDIAN_DIR = Path.home() / "Documents" / "Obsidian" / "Pomodoro"
SESSIONS_FILE = OBSIDIAN_DIR / "sessions.json"

PRESETS = {
    "50 / 10": {"focus": 50 * 60, "break": 10 * 60},
    "25 / 5": {"focus": 25 * 60, "break": 5 * 60},
}

# Recent tags will surface in the picker; these are the seed defaults.
DEFAULT_TAGS = ["Deep work", "Design", "Admin", "Reflection", "Other"]


# -- Storage ----------------------------------------------------------------

def load_sessions():
    if not SESSIONS_FILE.exists():
        return []
    try:
        with open(SESSIONS_FILE) as f:
            return json.load(f)
    except Exception:
        return []


def save_session(session):
    OBSIDIAN_DIR.mkdir(parents=True, exist_ok=True)
    sessions = load_sessions()
    sessions.append(session)
    with open(SESSIONS_FILE, "w") as f:
        json.dump(sessions, f, indent=2)


def recent_tags(limit=8):
    """Pull the most recently used tags from session history."""
    sessions = load_sessions()
    seen = []
    for s in reversed(sessions):
        tag = s.get("tag")
        if tag and tag not in seen:
            seen.append(tag)
        if len(seen) >= limit:
            break
    # Fill out with defaults if we don't have enough history
    for tag in DEFAULT_TAGS:
        if tag not in seen:
            seen.append(tag)
    return seen[:limit]


# -- Reports ----------------------------------------------------------------

def iso_week(d):
    """Return (year, week_number) for a date — used for grouping."""
    iso = d.isocalendar()
    return iso[0], iso[1]


def generate_weekly_report():
    """Write a markdown summary for the current week to Obsidian."""
    sessions = load_sessions()
    if not sessions:
        return None

    today = date.today()
    year, week = iso_week(today)

    # Filter to this week
    this_week = []
    for s in sessions:
        try:
            dt = datetime.fromisoformat(s["completed_at"])
            if iso_week(dt.date()) == (year, week):
                this_week.append((dt, s))
        except (KeyError, ValueError):
            continue

    if not this_week:
        return None

    # Aggregate
    total_focus_seconds = sum(s["duration_seconds"] for _, s in this_week)
    by_tag = {}
    by_day = {}
    for dt, s in this_week:
        by_tag.setdefault(s["tag"], 0)
        by_tag[s["tag"]] += s["duration_seconds"]
        day_key = dt.strftime("%a %b %d")
        by_day.setdefault(day_key, {"sessions": 0, "seconds": 0})
        by_day[day_key]["sessions"] += 1
        by_day[day_key]["seconds"] += s["duration_seconds"]

    def fmt_duration(seconds):
        h = seconds // 3600
        m = (seconds % 3600) // 60
        if h:
            return f"{h}h {m}m"
        return f"{m}m"

    # Compute the Monday of this week for display
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)

    lines = []
    lines.append(f"# Pomodoro — Week of {monday.strftime('%b %-d')} – {sunday.strftime('%b %-d, %Y')}")
    lines.append("")
    lines.append(f"**Total focus time:** {fmt_duration(total_focus_seconds)}")
    lines.append(f"**Sessions completed:** {len(this_week)}")
    lines.append("")
    lines.append("## By tag")
    lines.append("")
    for tag, seconds in sorted(by_tag.items(), key=lambda x: -x[1]):
        lines.append(f"- **{tag}** — {fmt_duration(seconds)} ({sum(1 for _, s in this_week if s['tag'] == tag)} sessions)")
    lines.append("")
    lines.append("## By day")
    lines.append("")
    # Order days by date
    for dt, s in sorted(this_week, key=lambda x: x[0]):
        pass  # placeholder
    day_order = sorted(by_day.keys(), key=lambda d: datetime.strptime(d, "%a %b %d"))
    for day in day_order:
        info = by_day[day]
        lines.append(f"- **{day}** — {info['sessions']} sessions, {fmt_duration(info['seconds'])}")
    lines.append("")
    lines.append("## Sessions")
    lines.append("")
    for dt, s in sorted(this_week, key=lambda x: x[0]):
        time_str = dt.strftime("%a %b %-d, %-I:%M%p")
        dur = fmt_duration(s["duration_seconds"])
        lines.append(f"- {time_str} — {s['tag']} ({dur})")

    report = "\n".join(lines)

    OBSIDIAN_DIR.mkdir(parents=True, exist_ok=True)
    report_path = OBSIDIAN_DIR / f"{year}-W{week:02d}.md"
    with open(report_path, "w") as f:
        f.write(report)

    return report_path


# -- App --------------------------------------------------------------------

class PomodoroApp(rumps.App):
    def __init__(self):
        super().__init__("🍅", quit_button=None)

        # State
        self.timer = rumps.Timer(self.tick, 1)
        self.remaining = 0
        self.total = 0
        self.is_focus = False
        self.is_break = False
        self.current_preset = None
        self.current_tag = None
        self.session_started_at = None

        # Build menu
        self.menu = self.build_menu()

    # -- Menu construction --------------------------------------------------

    def build_menu(self):
        recent = recent_tags()

        # 50/10 submenu — pick a tag
        fifty_menu = rumps.MenuItem("Start 50 / 10")
        for tag in recent:
            fifty_menu.add(rumps.MenuItem(tag, callback=self.make_starter("50 / 10", tag)))
        fifty_menu.add(rumps.separator)
        fifty_menu.add(rumps.MenuItem("New tag…", callback=self.make_starter("50 / 10", None)))

        # 25/5 submenu
        twenty_five_menu = rumps.MenuItem("Start 25 / 5")
        for tag in recent:
            twenty_five_menu.add(rumps.MenuItem(tag, callback=self.make_starter("25 / 5", tag)))
        twenty_five_menu.add(rumps.separator)
        twenty_five_menu.add(rumps.MenuItem("New tag…", callback=self.make_starter("25 / 5", None)))

        return [
            fifty_menu,
            twenty_five_menu,
            rumps.separator,
            rumps.MenuItem("Pause / Resume", callback=self.toggle_pause),
            rumps.MenuItem("Reset", callback=self.reset),
            rumps.MenuItem("Skip break", callback=self.skip_break),
            rumps.separator,
            rumps.MenuItem("Today's sessions", callback=self.show_today),
            rumps.MenuItem("Generate weekly report", callback=self.gen_report),
            rumps.MenuItem("Open report folder", callback=self.open_folder),
            rumps.separator,
            rumps.MenuItem("Quit", callback=rumps.quit_application),
        ]

    def rebuild_menu(self):
        """Rebuild the menu so recently-used tags show up."""
        self.menu.clear()
        for item in self.build_menu():
            self.menu.add(item)

    def make_starter(self, preset, tag):
        def starter(_):
            actual_tag = tag
            if actual_tag is None:
                resp = rumps.Window(
                    title="New tag",
                    message="What are you working on?",
                    default_text="",
                    ok="Start",
                    cancel="Cancel",
                    dimensions=(280, 22),
                ).run()
                if not resp.clicked or not resp.text.strip():
                    return
                actual_tag = resp.text.strip()
            self.start_focus(preset, actual_tag)
        return starter

    # -- Timer control ------------------------------------------------------

    def start_focus(self, preset_name, tag):
        preset = PRESETS[preset_name]
        self.current_preset = preset_name
        self.current_tag = tag
        self.session_started_at = datetime.now()
        self.is_focus = True
        self.is_break = False
        self.total = preset["focus"]
        self.remaining = preset["focus"]
        self.title = self.format_title(self.remaining, tag)
        self.timer.start()

    def start_break(self):
        preset = PRESETS[self.current_preset]
        self.is_focus = False
        self.is_break = True
        self.total = preset["break"]
        self.remaining = preset["break"]
        self.title = f"☕ {self.format_time(self.remaining)}"
        self.timer.start()

    def tick(self, _):
        try:
            self.remaining -= 1
            if self.remaining <= 0:
                self.timer.stop()
                if self.is_focus:
                    self.complete_focus()
                else:
                    self.complete_break()
                return
            if self.is_focus:
                self.title = self.format_title(self.remaining, self.current_tag)
            else:
                self.title = f"☕ {self.format_time(self.remaining)}"
        except Exception as e:
            # Don't let a tick failure leave the timer stuck silently
            log_error("tick failed", e)
            self.timer.stop()
            self.title = "🍅 (err)"

    def complete_focus(self):
        # Each step wrapped: a failure in one shouldn't block the rest.
        try:
            self.play_sound()
        except Exception as e:
            log_error("play_sound failed", e)
        try:
            save_session({
                "tag": self.current_tag,
                "preset": self.current_preset,
                "duration_seconds": PRESETS[self.current_preset]["focus"],
                "started_at": self.session_started_at.isoformat(),
                "completed_at": datetime.now().isoformat(),
            })
        except Exception as e:
            log_error("save_session failed", e)
        try:
            # Notifications can hang or raise on unsigned local apps. Best-effort.
            rumps.notification(
                title="Pomodoro complete",
                subtitle=f"{self.current_tag} — {self.current_preset.split('/')[0].strip()}min",
                message="Time for a break.",
            )
        except Exception as e:
            log_error("notification failed", e)
        # Skip rebuild_menu here — modifying menu structure inside the timer
        # callback can lock the UI. Defer it: menu will refresh on next tag pick.
        try:
            self.start_break()
        except Exception as e:
            log_error("start_break failed", e)
            self.title = "🍅 (start_break err)"

    def complete_break(self):
        try:
            self.play_sound()
        except Exception as e:
            log_error("play_sound (break) failed", e)
        try:
            rumps.notification(
                title="Break done",
                subtitle="Ready when you are.",
                message="Pick a session from the menu.",
            )
        except Exception as e:
            log_error("break notification failed", e)
        self.title = "🍅"
        self.is_focus = False
        self.is_break = False
        # Refresh the menu now that we're idle — safe outside the timer's tick path
        try:
            self.rebuild_menu()
        except Exception as e:
            log_error("rebuild_menu (after break) failed", e)

    def toggle_pause(self, _):
        if self.timer.is_alive():
            self.timer.stop()
            self.title = f"⏸ {self.format_time(self.remaining)}"
        elif self.remaining > 0:
            self.timer.start()

    def reset(self, _):
        self.timer.stop()
        self.remaining = 0
        self.is_focus = False
        self.is_break = False
        self.title = "🍅"

    def skip_break(self, _):
        if self.is_break:
            self.timer.stop()
            self.complete_break()

    # -- Display helpers ----------------------------------------------------

    def format_time(self, seconds):
        m = seconds // 60
        s = seconds % 60
        return f"{m:02d}:{s:02d}"

    def format_title(self, seconds, tag):
        # Truncate tag to keep menu bar tidy
        max_len = 14
        short = tag if len(tag) <= max_len else tag[: max_len - 1] + "…"
        return f"🍅 {self.format_time(seconds)} · {short}"

    # -- Sound --------------------------------------------------------------

    def play_sound(self):
        if COMPLETE_SOUND.exists():
            subprocess.Popen(["afplay", str(COMPLETE_SOUND)])

    # -- Reports ------------------------------------------------------------

    def show_today(self, _):
        sessions = load_sessions()
        today = date.today()
        today_sessions = [
            s for s in sessions
            if datetime.fromisoformat(s["completed_at"]).date() == today
        ]
        if not today_sessions:
            rumps.alert("Today", "No sessions yet today.")
            return
        total_sec = sum(s["duration_seconds"] for s in today_sessions)
        h = total_sec // 3600
        m = (total_sec % 3600) // 60
        total_str = f"{h}h {m}m" if h else f"{m}m"
        by_tag = {}
        for s in today_sessions:
            by_tag.setdefault(s["tag"], 0)
            by_tag[s["tag"]] += s["duration_seconds"]
        lines = [f"{len(today_sessions)} sessions, {total_str} total\n"]
        for tag, sec in sorted(by_tag.items(), key=lambda x: -x[1]):
            tm = sec // 60
            lines.append(f"• {tag}: {tm}m")
        rumps.alert("Today's sessions", "\n".join(lines))

    def gen_report(self, _):
        path = generate_weekly_report()
        if path:
            rumps.notification("Weekly report saved", str(path.name), "")
            subprocess.Popen(["open", str(path)])
        else:
            rumps.alert("No sessions yet this week.")

    def open_folder(self, _):
        OBSIDIAN_DIR.mkdir(parents=True, exist_ok=True)
        subprocess.Popen(["open", str(OBSIDIAN_DIR)])


if __name__ == "__main__":
    PomodoroApp().run()
