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
    projects.sort_by(|a, b| {
        let a_general = a.name.to_lowercase() == "general";
        let b_general = b.name.to_lowercase() == "general";
        match (a_general, b_general) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });
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
    if parts.len() < 3 { return None; }
    let date_part = parts[0].trim();
    let entry_type = parts[1].trim().to_string();
    let description = parts[2].trim().to_string();
    if date_part.contains(" to ") {
        let dates: Vec<&str> = date_part.splitn(2, " to ").collect();
        Some(TimelineEntry {
            start_date: dates[0].trim().to_string(),
            end_date: Some(dates[1].trim().to_string()),
            entry_type, description,
        })
    } else {
        Some(TimelineEntry {
            start_date: date_part.to_string(),
            end_date: None,
            entry_type, description,
        })
    }
}
