import type { Organization } from "../data/models";
import type {
  FieldDefinition,
  FieldValue,
  FocusItem,
} from "../data/expansion-models";
import { smartListSchema, type Contact, type SmartList } from "../data/models";
import {
  analyzeRelationships,
  effectiveAvailability,
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
export type SegmentData = IntelligenceData & {
  organizations?: Organization[];
  fieldDefinitions?: FieldDefinition[];
  fieldValues?: FieldValue[];
  focusItems?: FocusItem[];
};
export function listMatcher(data: SegmentData, now = Date.now()) {
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
    if (list.entityType === "organization") return false;
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
      const advanced = advancedRule(c.id, "contact", rule, os, data);
      if (advanced !== null) return advanced;
      if (field === "availability") return h?.availability === value;
      return (c[field as keyof Contact] || "") === value;
    });
    return parsed.data.mode === "all"
      ? matches.every(Boolean)
      : matches.some(Boolean);
  };
}

function compare(
  value: string | number | boolean,
  rule: SmartList["conditions"][number],
) {
  const target =
    typeof value === "number"
      ? Number(rule.value)
      : typeof value === "boolean"
        ? rule.value === "true"
        : rule.value;
  switch (rule.operator) {
    case "is":
      return value === target;
    case "isNot":
      return value !== target;
    case "contains":
      return (
        typeof value === "string" &&
        value.toLowerCase().includes(rule.value.toLowerCase())
      );
    case "atLeast":
      return (
        typeof value === "number" &&
        Number.isFinite(Number(target)) &&
        value >= Number(target)
      );
    case "atMost":
      return (
        typeof value === "number" &&
        Number.isFinite(Number(target)) &&
        value <= Number(target)
      );
    case "before":
      return typeof value === "string" && value < String(target);
    case "after":
      return typeof value === "string" && value > String(target);
    default:
      return false;
  }
}
function advancedRule(
  id: string,
  type: "contact" | "organization",
  rule: SmartList["conditions"][number],
  opportunities: IntelligenceData["opportunities"],
  data: SegmentData,
): boolean | null {
  if (rule.field === "pipelineId")
    return opportunities.some((o) => o.pipelineId === rule.value);
  if (rule.field === "pinned")
    return (
      (data.focusItems || []).some(
        (f) => f.entityType === type && f.recordId === id,
      ) ===
      (rule.value === "true")
    );
  if (rule.field === "customField") {
    const field = data.fieldDefinitions?.find(
      (f) => f.id === rule.fieldId && f.entityType === type && !f.archived,
    );
    const value = data.fieldValues?.find(
      (v) => v.fieldId === rule.fieldId && v.recordId === id,
    )?.value;
    if (!field || value === undefined) return false;
    const allowed =
      field.type === "number"
        ? ["is", "atLeast", "atMost"]
        : field.type === "date"
          ? ["is", "before", "after"]
          : field.type === "text" || field.type === "longText"
            ? ["is", "contains"]
            : ["is", "isNot"];
    return allowed.includes(rule.operator) && compare(value, rule);
  }
  if (
    [
      "industry",
      "representativePriority",
      "noRepresentatives",
      "closingSoon",
    ].includes(rule.field) &&
    type === "contact"
  )
    return false;
  return null;
}
export function companyListMatcher(data: SegmentData, now = Date.now()) {
  return (org: Organization, list: SmartList) => {
    if (
      list.entityType !== "organization" ||
      !smartListSchema.safeParse(list).success
    )
      return false;
    const representatives = data.contacts.filter(
        (c) => c.organizationId === org.id,
      ),
      tasks = data.tasks.filter((t) => t.organizationId === org.id),
      opportunities = data.opportunities.filter(
        (o) => o.organizationId === org.id,
      );
    const matches = list.conditions.map((rule) => {
      const advanced = advancedRule(
        org.id,
        "organization",
        rule,
        opportunities,
        data,
      );
      if (advanced !== null) return advanced;
      const v = rule.value;
      if (rule.field === "industry") return compare(org.industry, rule);
      if (rule.field === "tag") return org.tags.some((t) => compare(t, rule));
      if (rule.field === "representativePriority")
        return representatives.some((c) => c.priority === v);
      if (rule.field === "noRepresentatives")
        return (
          !representatives.some(
            (c) =>
              effectiveAvailability(c, data.restrictions, now) === "Available",
          ) ===
          (v === "true")
        );
      if (rule.field === "closingSoon")
        return opportunities.some(
          (o) =>
            o.status === "open" &&
            o.expectedCloseAt &&
            Date.parse(o.expectedCloseAt) >= now &&
            Date.parse(o.expectedCloseAt) <=
              now + data.settings.intelligence.closingDays * 86400000,
        );
      if (rule.field === "opportunityStatus")
        return v === "none"
          ? !opportunities.length
          : opportunities.some((o) => o.status === v);
      if (rule.field === "opportunityStage")
        return opportunities.some((o) => o.stageId === v);
      if (rule.field === "taskState")
        return v === "None"
          ? !tasks.some((t) => !t.completedAt)
          : tasks.some((t) => taskState(t, data.settings.timezone, now) === v);
      if (rule.field === "daysSince") {
        const times = data.interactions
          .filter(
            (i) =>
              i.organizationId === org.id &&
              i.type !== "Note" &&
              Date.parse(i.occurredAt) <= now,
          )
          .map((i) => Date.parse(i.occurredAt));
        if (!times.length) return false;
        const days = Math.floor((now - Math.max(...times)) / 86400000);
        return rule.operator === "atLeast"
          ? days >= Number(v)
          : days <= Number(v);
      }
      return false;
    });
    return list.mode === "all" ? matches.every(Boolean) : matches.some(Boolean);
  };
}
