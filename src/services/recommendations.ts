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
  if (
    contact.availability === "Do not contact" ||
    contact.availability === "On hold"
  )
    return false;
  if (
    contact.availability === "Temporarily unavailable" &&
    (!contact.timeoutUntil || Date.parse(contact.timeoutUntil) > now)
  )
    return false;
  if (
    restrictions.some(
      (r) =>
        r.contactId === contact.id &&
        (!r.startAt || Date.parse(r.startAt) <= now) &&
        (!r.endAt || Date.parse(r.endAt) > now) &&
        r.type !== "Available",
    )
  )
    return false;
  return !permissions.some(
    (p) =>
      p.contactId === contact.id &&
      p.purpose === "Relationship" &&
      (p.status === "Denied" || p.status === "Withdrawn"),
  );
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
