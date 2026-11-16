import { Project } from "../types";
import { SprintTimer } from "./SprintTimer";

export default function TopBar({ projects }: { projects: Project[] }) {
  const active = projects.filter(p => {
    const s = p.status.toLowerCase();
    return !s.includes("wrapping") && !s.includes("complete") && !s.includes("paused");
  }).length;
  const complete = projects.length - active;

  return (
    <div className="topbar">
      <div className="logo">
        <img src="/images/project-tracker.png" alt="Project Tracker" />
      </div>
      <div className="pill active-projects" style={{ marginLeft: 180 }}>
        {active} Active Projects
      </div>
      <div className="pill complete">{complete} Complete</div>
      <SprintTimer />
    </div>
  );
}
