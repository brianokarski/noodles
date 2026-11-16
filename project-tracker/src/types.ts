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
