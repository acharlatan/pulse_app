import type {
  Contact,
  Interaction,
  Opportunity,
  Organization,
  Task,
} from "../data/models";
import type { FocusItem } from "../data/expansion-models";
import type { Recommendation, OpportunityInsight } from "./recommendations";
import { taskState } from "./recommendations";
import { calendarDay } from "./progress";
import { calculateAnalytics } from "./analytics";
import { analyticsGuidance, type FocusTarget } from "./analytics-guidance";
export interface DailyPulseData {
  contacts: Contact[];
  organizations: Organization[];
  tasks: Task[];
  opportunities: Opportunity[];
  interactions: Interaction[];
  focusItems: FocusItem[];
  queue: Recommendation[];
  opportunityInsights: OpportunityInsight[];
}
export interface DailySuggestion extends FocusTarget {
  lane: "Keep a commitment" | "Protect an opportunity" | "Renew a connection";
}
export function dailyPulse(
  data: DailyPulseData,
  timezone: string,
  now = Date.now(),
  intention = "",
) {
  const day = calendarDay(now, timezone);
  const exists = (f: FocusItem) =>
    (f.entityType === "contact"
      ? data.contacts
      : f.entityType === "organization"
        ? data.organizations
        : f.entityType === "task"
          ? data.tasks
          : data.opportunities
    ).some((r) => r.id === f.recordId);
  const chosen = data.focusItems
    .filter((f) => f.today === day && exists(f))
    .sort(
      (a, b) =>
        a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    );
  const selected = new Set(
    chosen.map((f) => JSON.stringify([f.entityType, f.recordId])),
  );
  const open = data.tasks
    .filter((t) => !t.completedAt)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.id.localeCompare(b.id));
  const attention = open.filter(
    (t) => taskState(t, timezone, now) !== "Upcoming",
  );
  const later = open.filter((t) => taskState(t, timezone, now) === "Upcoming");
  const report = calculateAnalytics(
    { ...data, transitions: [], relationships: [] },
    {
      preset: "7",
      start: "",
      end: "",
      timezone,
      pipelineId: "",
      organizationId: "",
      interactionType: "",
      priority: "",
      category: "",
      outcome: "",
    },
    now,
  );
  const guidance = analyticsGuidance(
    report,
    data.queue,
    data.opportunityInsights,
    timezone,
  );
  // Due tasks are administrative reviews; communication eligibility still belongs to the shared rules.
  const commitments: DailySuggestion[] = attention.map((t) => ({
    id: t.id,
    type: "task",
    title: t.title,
    label: "Review commitment",
    lane: "Keep a commitment",
    reason: `${taskState(t, timezone, now)} · Saved follow-up due ${calendarDay(t.dueAt, timezone)}. Review the commitment and any contact restrictions.`,
  }));
  const opportunityLane: DailySuggestion[] = guidance.opportunities.map((r) => ({
      ...r,
      lane: "Protect an opportunity",
    }));
  const relationshipLane: DailySuggestion[] = guidance.relationships.map((r) => ({ ...r, lane: "Renew a connection" }));
  // The preference changes presentation order only, never eligibility or restriction checks.
  const relationshipsFirst = ["clients", "partnerships", "networking", "job_search"].includes(intention);
  const lanes: DailySuggestion[][] = relationshipsFirst ? [commitments, relationshipLane, opportunityLane] : [commitments, opportunityLane, relationshipLane];
  const suggestions: DailySuggestion[] = [];
  const seen = new Set(selected);
  // One per evidence lane first, then fill available spaces; never invent three targets.
  for (
    let index = 0;
    suggestions.length < 3 && lanes.some((l) => index < l.length);
    index++
  ) {
    for (const lane of lanes) {
      const r = lane[index];
      if (!r) continue;
      const key = JSON.stringify([r.type, r.id]);
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push(r);
      if (suggestions.length === 3) break;
    }
  }
  const occurredToday = (at: string) =>
    Date.parse(at) <= now && calendarDay(at, timezone) === day;
  const completed = data.tasks
    .filter((t) => t.completedAt && occurredToday(t.completedAt))
    .sort((a, b) => b.completedAt!.localeCompare(a.completedAt!));
  const conversations = data.interactions
    .filter((i) => i.type !== "Note" && occurredToday(i.occurredAt))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const finished = chosen.filter(
    (f) =>
      f.entityType === "task" &&
      data.tasks.some((t) => t.id === f.recordId && !!t.completedAt),
  );
  const remaining = chosen.filter((f) => !finished.includes(f));
  return {
    day,
    chosen,
    remaining,
    finished,
    suggestions,
    attention,
    later,
    completed,
    conversations,
  };
}
