use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelineEntry {
    pub start_date: String,
    pub end_date: Option<String>,
    pub entry_type: String,
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
