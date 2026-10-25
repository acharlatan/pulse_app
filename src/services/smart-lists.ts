import { smartListSchema, type Contact, type SmartList } from "../data/models";
import {
  analyzeRelationships,
  taskState,
  type IntelligenceData,
} from "./recommendations";
export const builtInLists = [
  ["all", "All contacts"],
  ["new", "New relationships"],
  ["priority", "High-priority prospects"],
  ["clients", "Active clients"],
  ["due", "Follow-ups due today"],
  ["overdue", "Overdue follow-ups"],
  ["no-action", "No next action"],
  ["cooling", "Cooling relationships"],
  ["dormant", "Dormant relationships"],
  ["paused", "Contacts on timeout"],
  ["reactivated", "Recently reactivated"],
  ["deals", "Active opportunities"],
  ["independent", "Without a company"],
] as const;
export function listMatcher(data: IntelligenceData, now = Date.now()) {
  const intel = analyzeRelationships(data, now),
    health = new Map(intel.relationships.map((r) => [r.contactId, r]));
  const tasks = new Map<string, typeof data.tasks>(),
    deals = new Map<string, typeof data.opportunities>();
  for (const t of data.tasks)
    if (t.contactId) {
      const rows = tasks.get(t.contactId) || [];
      rows.push(t);
      tasks.set(t.contactId, rows);
    }
  for (const o of data.opportunities)
    for (const id of o.contactIds) {
      const rows = deals.get(id) || [];
      rows.push(o);
      deals.set(id, rows);
    }
  return (c: Contact, list: SmartList | string) => {
    const h = health.get(c.id),
      ts = tasks.get(c.id) || [],
      os = deals.get(c.id) || [];
    if (typeof list === "string")
      switch (list) {
        case "all":
          return true;
        case "new":
          return c.stage === "New";
        case "priority":
          return (
            ["High", "VIP"].includes(c.priority) &&
            ["Prospect", "Lead"].includes(c.category)
          );
        case "clients":
          return c.category === "Active client";
        case "due":
          return ts.some(
            (t) =>
              !t.completedAt &&
              new Intl.DateTimeFormat("en-CA", {
                timeZone: data.settings.timezone,
              }).format(new Date(t.dueAt)) ===
                new Intl.DateTimeFormat("en-CA", {
                  timeZone: data.settings.timezone,
                }).format(now),
          );
        case "overdue":
          return ts.some(
            (t) => taskState(t, data.settings.timezone, now) === "Overdue",
          );
        case "no-action":
          return !ts.some((t) => !t.completedAt);
        case "cooling":
          return h?.health === "Cooling";
        case "dormant":
          return h?.health === "Dormant";
        case "paused":
          return h?.health === "Paused";
        case "reactivated":
          return (
            !!h?.expiredPauseAt &&
            now - Date.parse(h.expiredPauseAt) <= 7 * 86400000 &&
            !["Paused", "Restricted"].includes(h.health)
          );
        case "deals":
          return os.some((o) => o.status === "open");
        case "independent":
          return !c.organizationId;
        default:
          return false;
      }
    const parsed = smartListSchema.safeParse(list);
    if (!parsed.success) return false;
    const matches = parsed.data.conditions.map((rule) => {
      const { field, operator, value } = rule;
      if (field === "daysSince")
        return (
          h?.days !== null &&
          h?.days !== undefined &&
          (operator === "atLeast"
            ? h.days >= Number(value)
            : h.days <= Number(value))
        );
      if (field === "health") return h?.health === value;
      if (field === "tag")
        return c.tags.some((t) =>
          operator === "contains"
            ? t.toLowerCase().includes(value.toLowerCase())
            : t.toLowerCase() === value.toLowerCase(),
        );
      if (field === "taskState")
        return value === "None"
          ? !ts.some((t) => !t.completedAt)
          : ts.some((t) => taskState(t, data.settings.timezone, now) === value);
      if (field === "opportunityStatus")
        return value === "none"
          ? !os.length
          : os.some((o) => o.status === value);
      if (field === "opportunityStage")
        return os.some((o) => o.stageId === value);
      if (field === "availability") return h?.availability === value;
      return (c[field] || "") === value;
    });
    return parsed.data.mode === "all"
      ? matches.every(Boolean)
      : matches.some(Boolean);
  };
}
