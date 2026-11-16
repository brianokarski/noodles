export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekStarts(centerDate: Date, weeksBefore: number, weeksAfter: number): Date[] {
  const monday = getMonday(centerDate);
  const weeks: Date[] = [];
  for (let i = -weeksBefore; i <= weeksAfter; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i * 7);
    weeks.push(d);
  }
  return weeks;
}

export function dateToColumnIndex(date: Date, weekStarts: Date[]): number {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const firstMonday = weekStarts[0];
  const diffDays = Math.floor((target.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24));
  const weekIndex = Math.floor(diffDays / 7);
  const dayOfWeek = diffDays % 7;
  if (dayOfWeek > 4) return -1;
  return weekIndex * 5 + dayOfWeek;
}

export function columnToPercent(colIndex: number, totalDays: number): number {
  return ((colIndex + 0.5) / totalDays) * 100;
}

export function rangeToPercent(startCol: number, endCol: number, totalDays: number): { left: number; width: number } {
  const left = (startCol / totalDays) * 100;
  const width = ((endCol - startCol + 1) / totalDays) * 100;
  return { left, width };
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export function formatWeekLabel(monday: Date): string {
  return monday.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

export function getDayLabel(dayIndex: number): string {
  return ["M", "T", "W", "T", "F"][dayIndex] || "";
}
