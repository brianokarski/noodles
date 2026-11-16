import { useEffect } from "react";
import { useProjects } from "./hooks/useProjects";
import TopBar from "./components/TopBar";
import GanttBlock from "./components/GanttBlock";
import { getWeekStarts, formatWeekLabel, getDayLabel, isToday, dateToColumnIndex, columnToPercent } from "./utils/dates";
import "./App.css";

function App() {
  const projects = useProjects();
  const weekStarts = getWeekStarts(new Date(), 1, 4);
  const totalDays = weekStarts.length * 5;
  const todayCol = dateToColumnIndex(new Date(), weekStarts);
  const gridCols = `repeat(${totalDays}, 1fr)`;

  const allDays: Date[] = [];
  for (const ws of weekStarts) {
    for (let d = 0; d < 5; d++) {
      const date = new Date(ws);
      date.setDate(ws.getDate() + d);
      allDays.push(date);
    }
  }

  // Sync horizontal scroll across all .gantt-cell elements
  useEffect(() => {
    let syncing = false;
    const syncScroll = (e: Event) => {
      if (syncing) return;
      syncing = true;
      const source = e.target as HTMLElement;
      document.querySelectorAll<HTMLElement>(".gantt-cell").forEach((el) => {
        if (el !== source) el.scrollLeft = source.scrollLeft;
      });
      syncing = false;
    };

    let dragging = false;
    let dragTarget: HTMLElement | null = null;
    let startX = 0;
    let scrollStart = 0;

    const onDown = (e: MouseEvent) => {
      const t = (e.target as HTMLElement).closest(".gantt-cell") as HTMLElement;
      if (!t) return;
      dragging = true;
      dragTarget = t;
      startX = e.pageX;
      scrollStart = t.scrollLeft;
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging || !dragTarget) return;
      e.preventDefault();
      dragTarget.scrollLeft = scrollStart - (e.pageX - startX);
    };
    const onUp = () => { dragging = false; dragTarget = null; };

    const cells = document.querySelectorAll<HTMLElement>(".gantt-cell");
    cells.forEach((el) => el.addEventListener("scroll", syncScroll));
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      cells.forEach((el) => el.removeEventListener("scroll", syncScroll));
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [projects]);

  return (
    <div className="app">
      <TopBar projects={projects} />

      <div className="tracker">
        {/* Header row */}
        <div className="projects-pill">Projects</div>
        <div className="gantt-cell header-gantt">
          <div className="gantt-scroll-inner" style={{ minWidth: totalDays * 60 }}>
            <div style={{ display: "grid", gridTemplateColumns: gridCols }} className="week-pills-row">
              {weekStarts.map((ws, i) => (
                <div key={i} className="week-date" style={{ gridColumn: `${i * 5 + 1} / ${i * 5 + 6}` }}>
                  {formatWeekLabel(ws)}
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: gridCols }} className="day-labels-row">
              {allDays.map((date, i) => (
                <div key={i} className={`day${isToday(date) ? " today" : ""}`}>
                  {getDayLabel(i % 5)}
                  <span className="date-num">{date.getDate()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Project rows */}
        {projects.map((p) => (
          <>
            <div className="project-card" key={`card-${p.name}`}>
              <div className="card-row proj-name">{p.name}</div>
            </div>
            <div className="gantt-cell" key={`gantt-${p.name}`}>
              <div className="gantt-scroll-inner" style={{ minWidth: totalDays * 60, position: "relative" }}>
                {todayCol >= 0 && (
                  <div className="today-line" style={{ left: `${columnToPercent(todayCol, totalDays)}%` }} />
                )}
                <GanttBlock project={p} weekStarts={weekStarts} totalDays={totalDays} gridCols={gridCols} />
              </div>
            </div>
          </>
        ))}
      </div>
    </div>
  );
}

export default App;
