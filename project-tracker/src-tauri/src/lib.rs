mod models;
mod parser;
mod watcher;

use models::Project;

#[tauri::command]
fn get_projects() -> Vec<Project> {
    parser::parse_all_projects()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      watcher::start_watcher(app.handle().clone());
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![get_projects])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
