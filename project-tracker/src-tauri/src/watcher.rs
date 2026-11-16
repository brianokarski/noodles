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

        loop {
            if rx.recv().is_ok() {
                while rx.recv_timeout(Duration::from_millis(500)).is_ok() {}
                let projects = parse_all_projects();
                let _ = app.emit("projects-updated", &projects);
            }
        }
    });
}
