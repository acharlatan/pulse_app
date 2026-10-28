import type {
  Contact,
  Interaction,
  Opportunity,
  Organization,
  Task,
} from "../data/models";
import type { OpportunityTransition } from "../data/intelligence-models";
import type { RelationshipInsight } from "./recommendations";
import { calendarDay, shiftDay } from "./progress";
export type DatePreset = "7" | "30" | "90" | "month" | "year" | "custom";
export interface ReportFilter {
  preset: DatePreset;
  personId?: string;
  start: string;
  end: string;
  timezone: string;
  pipelineId: string;
  organizationId: string;
  interactionType: string;
  priority: string;
  category: string;
  outcome: string;
}
export function period(filter: ReportFilter, now = Date.now()) {
  const today = calendarDay(now, filter.timezone);
  const end = filter.preset === "custom" ? filter.end : today;
  const start =
    filter.preset === "custom"
      ? filter.start
      : filter.preset === "month"
        ? today.slice(0, 7) + "-01"
        : filter.preset === "year"
          ? today.slice(0, 4) + "-01-01"
          : shiftDay(today, 1 - Number(filter.preset));
  function valid(d: string) {
    return (
      /^\d{4}-\d\d-\d\d$/.test(d) &&
      !Number.isNaN(Date.parse(d + "T00:00:00Z")) &&
      new Date(d + "T00:00:00Z").toISOString().slice(0, 10) === d
    );
  }
  if (!valid(start) || !valid(end) || start > end)
    throw new Error("Choose a valid start and end date.");
  const days =
    Math.round(
      (Date.parse(end + "T00:00:00Z") - Date.parse(start + "T00:00:00Z")) / DAY,
    ) + 1;
  if (days > 3660) throw new Error("Choose a range of ten years or less.");
  return {
    start,
    end,
    days,
    previousStart: shiftDay(start, -days),
    previousEnd: shiftDay(start, -1),
  };
}
const DAY = 86400000;
export interface AnalyticsData {
  contacts: Contact[];
  organizations: Organization[];
  interactions: Interaction[];
  tasks: Task[];
  opportunities: Opportunity[];
  transitions: OpportunityTransition[];
  relationships: RelationshipInsight[];
}
export function calculateAnalytics(
  data: AnalyticsData,
  filter: ReportFilter,
  now = Date.now(),
) {
  const range = period(filter, now),
    people = new Map(data.contacts.map((c) => [c.id, c]));
  const matchesPerson = (id: string | null) => {
    if (filter.personId && id !== filter.personId) return false;
    if (!filter.priority && !filter.category) return true;
    const c = id ? people.get(id) : undefined;
    return (
      !!c &&
      (!filter.priority || c.priority === filter.priority) &&
      (!filter.category || c.category === filter.category)
    );
  };
  const day = (at: string) => calendarDay(at, filter.timezone);
  const inRange = (at: string, from = range.start, to = range.end) =>
    day(at) >= from && day(at) <= to && Date.parse(at) <= now;
  // organizationId is the interaction's historical snapshot, never the person's current employer.
  const meaningful = data.interactions.filter(
    (i) =>
      i.type !== "Note" &&
      Date.parse(i.occurredAt) <= now &&
      (!filter.interactionType || i.type === filter.interactionType) &&
      (!filter.organizationId || i.organizationId === filter.organizationId) &&
      matchesPerson(i.contactId),
  );
  const interactions = meaningful.filter((i) => inRange(i.occurredAt));
  const previousInteractions = meaningful.filter((i) =>
    inRange(i.occurredAt, range.previousStart, range.previousEnd),
  );
  const taskRows = data.tasks.filter(
    (t) =>
      (!filter.organizationId || t.organizationId === filter.organizationId) &&
      matchesPerson(t.contactId),
  );
  const completed = taskRows.filter(
    (t) => t.completedAt && inRange(t.completedAt),
  );
  const due = taskRows.filter(
    (t) => day(t.dueAt) >= range.start && day(t.dueAt) <= range.end,
  );
  const open = taskRows.filter((t) => !t.completedAt),
    overdue = open.filter((t) => Date.parse(t.dueAt) < now);
  const opportunities = data.opportunities.filter(
    (o) =>
      (!filter.pipelineId || o.pipelineId === filter.pipelineId) &&
      (!filter.organizationId || o.organizationId === filter.organizationId) &&
      (!filter.outcome || o.status === filter.outcome) &&
      ((!filter.priority && !filter.category && !filter.personId) ||
        o.contactIds.some(matchesPerson)),
  );
  const won = opportunities.filter((o) => o.status === "won"),
    lost = opportunities.filter((o) => o.status === "lost"),
    active = opportunities.filter((o) => o.status === "open");
  const currency = new Map<string, number>();
  for (const o of active)
    if (o.value !== null)
      currency.set(o.currency, (currency.get(o.currency) || 0) + o.value);
  const oppIds = new Set(opportunities.map((o) => o.id));
  const transitions = data.transitions.filter(
    (t) => oppIds.has(t.opportunityId) && inRange(t.occurredAt),
  );
  const trend = new Map<string, number>();
  for (const i of interactions) {
    const d = day(i.occurredAt),
      bucket = range.days > 90 ? d.slice(0, 7) : d;
    trend.set(bucket, (trend.get(bucket) || 0) + 1);
  }
  const filteredContacts = data.contacts.filter(
    (c) =>
      (!filter.organizationId || c.organizationId === filter.organizationId) &&
      matchesPerson(c.id),
  );
  const contactIds = new Set(filteredContacts.map((c) => c.id));
  const health = data.relationships.filter((r) => contactIds.has(r.contactId));
  const conversationContactIds = new Set(
    data.interactions
      .filter(
        (i) =>
          i.type !== "Note" && Date.parse(i.occurredAt) <= now && i.contactId,
      )
      .map((i) => i.contactId),
  );
  const organizationsWithPeople = new Set(
    data.contacts.map((c) => c.organizationId).filter(Boolean),
  );
  const issues = {
    noCompany: filteredContacts.filter((c) => !c.organizationId),
    noContact: filteredContacts.filter(
      (c) => !c.emails.length && !c.phones.length,
    ),
    noHistory: filteredContacts.filter(
      (c) => !conversationContactIds.has(c.id),
    ),
    noClose: opportunities.filter((o) => !o.expectedCloseAt),
    noRepresentative: opportunities.filter((o) => !o.contactIds.length),
    noCompanyRepresentatives: (filter.personId
      ? []
      : data.organizations
    ).filter(
      (o) =>
        (!filter.organizationId || o.id === filter.organizationId) &&
        !organizationsWithPeople.has(o.id),
    ),
    unlinkedTasks: taskRows.filter((t) => !t.contactId && !t.organizationId),
  };
  const latestEntry = new Map<string, OpportunityTransition>();
  for (const t of data.transitions)
    if (
      (t.previousStageId !== t.stageId ||
        t.previousPipelineId !== t.pipelineId) &&
      Date.parse(t.occurredAt) <= now &&
      (!latestEntry.has(t.opportunityId) ||
        latestEntry.get(t.opportunityId)!.occurredAt < t.occurredAt)
    )
      latestEntry.set(t.opportunityId, t);
  const currentStageAge = active.map((o) => {
    const last = latestEntry.get(o.id);
    return {
      opportunity: o,
      days:
        last && last.stageId === o.stageId && last.pipelineId === o.pipelineId
          ? Math.max(0, Math.floor((now - Date.parse(last.occurredAt)) / DAY))
          : null,
    };
  });
  // A duration needs a witnessed entry and a later witnessed exit, never a creation timestamp.
  const completedStageDurations = new Map<
    string,
    { pipelineId: string; stageId: string; label: string; days: number[] }
  >();
  const ordered = [...data.transitions]
    .filter((t) => oppIds.has(t.opportunityId))
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const priorByOpportunity = new Map<string, OpportunityTransition>();
  for (const t of ordered) {
    const previous = priorByOpportunity.get(t.opportunityId);
    if (
      previous &&
      previous.stageId === t.previousStageId &&
      previous.pipelineId === t.previousPipelineId &&
      (t.stageId !== t.previousStageId ||
        t.pipelineId !== t.previousPipelineId) &&
      inRange(t.occurredAt)
    ) {
      const elapsed =
        (Date.parse(t.occurredAt) - Date.parse(previous.occurredAt)) / DAY;
      const key = JSON.stringify([
        t.previousPipelineId,
        t.previousStageId,
        t.previousStageName,
      ]);
      if (elapsed >= 0) {
        const group = completedStageDurations.get(key) || {
          pipelineId: t.previousPipelineId,
          stageId: t.previousStageId,
          label: `${t.previousPipelineName} · ${t.previousStageName}`,
          days: [],
        };
        group.days.push(elapsed);
        completedStageDurations.set(key, group);
      }
    }
    // An outcome-only correction does not establish a new stage entry.
    if (
      t.previousStageId !== t.stageId ||
      t.previousPipelineId !== t.pipelineId
    )
      priorByOpportunity.set(t.opportunityId, t);
  }
  return {
    range,
    asOf: now,
    contacts: filteredContacts,
    interactions,
    previousInteractions,
    completed,
    due,
    open,
    overdue,
    opportunities,
    active,
    won,
    lost,
    winRate:
      !filter.outcome && won.length + lost.length
        ? won.length / (won.length + lost.length)
        : null,
    currency: [...currency.entries()].sort(),
    transitions,
    trend: [...trend.entries()].sort(([a], [b]) => a.localeCompare(b)),
    health,
    issues,
    currentStageAge,
    completedStageDurations: [...completedStageDurations.values()].map((g) => {
      const sorted = [...g.days].sort((a, b) => a - b),
        middle = Math.floor(sorted.length / 2);
      return {
        ...g,
        average: sorted.reduce((a, b) => a + b, 0) / sorted.length,
        median:
          sorted.length % 2
            ? sorted[middle]
            : (sorted[middle - 1] + sorted[middle]) / 2,
      };
    }),
  };
}
// All text cells are quoted and formula-prefixed values are neutralized, including leading whitespace.
export function safeCsv(rows: (string | number | null)[][]) {
  return rows
    .map((row) =>
      row
        .map((v) => {
          let s = String(v ?? "");
          if (/^\s*[=+\-@\t\r]/.test(s)) s = "'" + s;
          return '"' + s.replaceAll('"', '""') + '"';
        })
        .join(","),
    )
    .join("\r\n");
}

export type AnalyticsReport = ReturnType<typeof calculateAnalytics>;
