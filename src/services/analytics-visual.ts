import { calendarDay, shiftDay } from "./progress";
import type { AnalyticsReport } from "./analytics";

/** Calendar buckets are bounded by the selected range and the current workspace day. */
export function completionBuckets(report: Pick<AnalyticsReport, "range" | "completed" | "asOf">, timezone: string): [string, number][] {
  const today = calendarDay(report.asOf, timezone);
  const counts = new Map<string, number>();
  for (const item of report.completed) {
    if (!item.completedAt || Date.parse(item.completedAt) > report.asOf) continue;
    const day = calendarDay(item.completedAt, timezone);
    if (day < report.range.start || day > report.range.end) continue;
    counts.set(day, (counts.get(day) || 0) + 1);
  }
  const days: [string, number][] = [];
  for (let i = 0; i < report.range.days; i++) {
    const day = shiftDay(report.range.start, i);
    if (day > today) break;
    days.push([day, counts.get(day) || 0]);
  }
  if (report.range.days <= 14) return days;
  if (report.range.days <= 90) {
    const groups: [string, number][] = [];
    for (let i = 0; i < days.length; i += 7) {
      const group = days.slice(i, i + 7);
      groups.push([`${group[0][0]}..${group[group.length - 1][0]}`, group.reduce((sum, [, count]) => sum + count, 0)]);
    }
    return groups;
  }
  const months = new Map<string, number>();
  for (const [day, count] of days) { const month = day.slice(0, 7); months.set(month, (months.get(month) || 0) + count); }
  return [...months.entries()];
}
