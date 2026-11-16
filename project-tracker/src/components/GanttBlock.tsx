import { Project } from "../types";
import { dateToColumnIndex } from "../utils/dates";

interface Props {
  project: Project;
  weekStarts: Date[];
  totalDays: number;
  gridCols: string;
}

export default function GanttBlock({ project, weekStarts, totalDays, gridCols }: Props) {
  const phases = project.entries.filter((e) => e.end_date);
  const points = project.entries.filter((e) => !e.end_date);

  // Auto-generate a project span bar if no explicit phases and range > 1 day
  let autoSpan: { startCol: number; endCol: number } | null = null;
  if (phases.length === 0 && points.length > 1) {
    const cols = points
      .map((e) => dateToColumnIndex(new Date(e.start_date), weekStarts))
      .filter((c) => c >= 0);
    if (cols.length > 1) {
      const min = Math.min(...cols);
      const max = Math.max(...cols);
      if (max > min) {
        autoSpan = { startCol: min, endCol: max };
      }
    }
  }

  return (
    <div className="gantt-block">
      {/* Vertical grid lines */}
      <div className="gantt-gridlines" style={{ display: "grid", gridTemplateColumns: gridCols }}>
        {Array.from({ length: totalDays }, (_, i) => (
          <div
            key={i}
            className={`gridline${i % 5 === 0 ? " week-start" : ""}`}
          />
        ))}
      </div>

      {/* Phase bars */}
      <div className="gantt-bars" style={{ display: "grid", gridTemplateColumns: gridCols }}>
        {phases.map((entry, i) => {
          const startCol = dateToColumnIndex(new Date(entry.start_date), weekStarts);
          const endCol = dateToColumnIndex(new Date(entry.end_date!), weekStarts);
          if (startCol < 0 || endCol < 0) return null;
          return (
            <div
              key={`phase-${i}`}
              className="bar dark"
              style={{ gridColumn: `${startCol + 1} / ${endCol + 2}` }}
            >
              {entry.description}
            </div>
          );
        })}
        {autoSpan && (
          <div
            className="bar dark"
            style={{ gridColumn: `${autoSpan.startCol + 1} / ${autoSpan.endCol + 2}` }}
          >
            {project.name}
          </div>
        )}
      </div>

      {/* Checkpoint dots */}
      <div className="gantt-dots" style={{ display: "grid", gridTemplateColumns: gridCols }}>
        {points.map((entry, i) => {
          const col = dateToColumnIndex(new Date(entry.start_date), weekStarts);
          if (col < 0) return null;
          const dotClass = getDotClass(entry.entry_type);
          const dateLabel = new Date(entry.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          return (
            <div
              key={`dot-${i}`}
              style={{ gridColumn: `${col + 1} / ${col + 2}`, display: "flex", justifyContent: "center" }}
            >
              <div className={`dia ${dotClass}`}>
                <span className="tip">{dateLabel} — {entry.description}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getDotClass(type: string): string {
  switch (type) {
    case "review": return "rev";
    case "deadline": return "dead";
    case "handoff": return "hand";
    case "milestone": return "mile";
    case "sync": return "mile";
    case "checkin": return "mile";
    default: return "mile";
  }
}
