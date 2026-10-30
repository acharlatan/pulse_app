import type { Task } from "../data/models";
import { calendarDay, shiftDay } from "./progress";

/** Open commitments due within the next seven local calendar days, including today. */
export function upcomingCommitments(tasks: Task[], timezone: string, now = Date.now()) {
  const today = calendarDay(now, timezone), end = shiftDay(today, 6);
  return tasks.filter((task) => !task.completedAt && calendarDay(task.dueAt, timezone) >= today && calendarDay(task.dueAt, timezone) <= end)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.id.localeCompare(b.id));
}
