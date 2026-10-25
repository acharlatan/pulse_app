import type {
  Contact,
  Interaction,
  Permission,
  Restriction,
  Settings,
  Task,
} from "../data/models";
export function eligible(
  contact: Contact,
  permissions: Permission[] = [],
  restrictions: Restriction[] = [],
  now = Date.now(),
) {
  return (
    restrictionReasons(contact, permissions, restrictions, now).length === 0
  );
}
export function restrictionReasons(
  contact: Contact,
  permissions: Permission[] = [],
  restrictions: Restriction[] = [],
  now = Date.now(),
) {
  const reasons: string[] = [];
  // Explicit profile restrictions carry the start/end window. Legacy profiles without
  // a restriction row retain their existing availability behavior.
  if (!restrictions.some((r) => r.id === `profile-${contact.id}`)) {
    if (["Do not contact", "On hold"].includes(contact.availability))
      reasons.push(contact.availability);
    if (
      contact.availability === "Temporarily unavailable" &&
      (!contact.timeoutUntil || Date.parse(contact.timeoutUntil) > now)
    )
      reasons.push("Temporarily unavailable");
  }
  for (const r of restrictions)
    if (
      r.contactId === contact.id &&
      r.type !== "Available" &&
      (!r.startAt || Date.parse(r.startAt) <= now) &&
      (!r.endAt || Date.parse(r.endAt) > now)
    )
      reasons.push(
        `${r.type}${r.endAt ? " until " + r.endAt.slice(0, 10) : " until explicitly ended"}`,
      );
  for (const p of permissions)
    if (
      p.contactId === contact.id &&
      p.purpose === "Relationship" &&
      ["Denied", "Withdrawn"].includes(p.status)
    )
      reasons.push(
        `${p.channel} relationship permission ${p.status.toLowerCase()}`,
      );
  return reasons;
}
export function taskState(task: Task, timezone: string, now = Date.now()) {
  if (task.completedAt) return "Completed";
  const day = (d: number) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  if (overdue(task, now)) return "Overdue";
  return day(Date.parse(task.dueAt)) === day(now) ? "Due today" : "Upcoming";
}
export function lastInteraction(id: string, interactions: Interaction[]) {
  return interactions
    .filter((i) => i.contactId === id && i.type !== "Note")
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]?.occurredAt;
}
export function overdue(task: Task, now = Date.now()) {
  return !task.completedAt && Date.parse(task.dueAt) < now;
}
export function recommendations(
  contacts: Contact[],
  interactions: Interaction[],
  tasks: Task[],
  settings: Settings,
  permissions: Permission[] = [],
  restrictions: Restriction[] = [],
  now = Date.now(),
) {
  return contacts
    .filter(
      (c) =>
        eligible(c, permissions, restrictions, now) &&
        !["Won", "Lost"].includes(c.stage),
    )
    .flatMap((c) => {
      const last = lastInteraction(c.id, interactions);
      const days = Math.max(
        0,
        Math.floor((now - Date.parse(last || c.createdAt)) / 86400000),
      );
      const threshold = ["High", "VIP"].includes(c.priority)
        ? settings.priorityDays
        : settings.reconnectDays;
      const due = tasks.some((t) => t.contactId === c.id && overdue(t, now));
      const key = `${c.id}:${last || c.createdAt}:${due ? "due" : "quiet"}`;
      if (settings.dismissed.includes(key) || (!due && days < threshold))
        return [];
      return [
        {
          contact: c,
          key,
          days,
          reason: due
            ? "A planned follow-up is overdue"
            : `${days} days since ${last ? "your last conversation" : "this relationship began"}`,
          rank: due ? 0 : ["High", "VIP"].includes(c.priority) ? 1 : 2,
        },
      ];
    })
    .sort((a, b) => a.rank - b.rank || b.days - a.days);
}
