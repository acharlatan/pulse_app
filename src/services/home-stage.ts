import type { DailyPulseData } from "./daily-pulse";
import { calendarDay } from "./progress";

type HomeStageData = Pick<DailyPulseData, "contacts" | "organizations" | "tasks" | "opportunities" | "focusItems">;

/** Current saved facts only; no relationship quality or suggested action is inferred. */
export function homeStageSnapshot(data: HomeStageData, timezone: string, now = Date.now()) {
  const day = calendarDay(now, timezone);
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "2-digit", hourCycle: "h23" }).format(now));
  const moment = hour >= 5 && hour < 12 ? "morning" : hour >= 12 && hour < 18 ? "afternoon" : "evening";
  const open = data.tasks.filter(task => !task.completedAt).sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.id.localeCompare(b.id));
  const chosen = data.focusItems.filter(item => {
    if (item.today !== day) return false;
    if (item.entityType === "task") return data.tasks.some(task => task.id === item.recordId && !task.completedAt);
    if (item.entityType === "contact") return data.contacts.some(person => person.id === item.recordId);
    if (item.entityType === "organization") return data.organizations.some(company => company.id === item.recordId);
    return data.opportunities.some(opportunity => opportunity.id === item.recordId);
  }).length;
  return { moment, chosen, openCount: open.length, next: open[0] };
}
