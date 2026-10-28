import type { AnalyticsReport } from "./analytics";
import type { OpportunityInsight, Recommendation } from "./recommendations";
import { calendarDay, shiftDay } from "./progress";
export interface FocusTarget {
  id: string;
  type: "task" | "contact" | "opportunity";
  title: string;
  reason: string;
  label: string;
}
/** Presentation of existing evidence, never an independent health or predictive score. */
export function analyticsGuidance(
  report: AnalyticsReport,
  queue: Recommendation[],
  insights: OpportunityInsight[],
  timezone: string,
) {
  const ids = new Set(report.contacts.map((c) => c.id));
  const commitments: FocusTarget[] = [...report.overdue]
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.id.localeCompare(b.id))
    .map((t) => ({
      id: t.id,
      type: "task",
      title: t.title,
      reason: `Saved follow-up due ${calendarDay(t.dueAt, timezone)}. Review the date, scope and any contact restrictions.`,
      label: "Review commitment",
    }));
  const openIds = new Set(report.active.map((o) => o.id));
  const eligibleOpportunityIds = new Set(
    queue
      .filter((r) => r.opportunityId && !r.blocked && !r.action)
      .map((r) => r.opportunityId),
  );
  const opportunities: FocusTarget[] = insights
    .filter(
      (i) =>
        openIds.has(i.opportunityId) &&
        eligibleOpportunityIds.has(i.opportunityId) &&
        i.flags.length > 0,
    )
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.date.localeCompare(b.date) ||
        a.opportunityId.localeCompare(b.opportunityId),
    )
    .map((i) => ({
      id: i.opportunityId,
      type: "opportunity",
      title: report.active.find((o) => o.id === i.opportunityId)!.title,
      reason: i.reason,
      label: "Review opportunity",
    }));
  const seen = new Set<string>();
  const relationships: FocusTarget[] = queue
    .filter(
      (r) =>
        r.contactId &&
        ids.has(r.contactId) &&
        !r.blocked &&
        !r.action &&
        r.category !== "Overdue follow-up",
    )
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        b.priority - a.priority ||
        a.date.localeCompare(b.date),
    )
    .filter((r) => {
      if (seen.has(r.contactId!)) return false;
      seen.add(r.contactId!);
      return true;
    })
    .map((r) => ({
      id: r.contactId!,
      type: "contact",
      title: report.contacts.find((c) => c.id === r.contactId)!.name,
      reason: r.reason,
      label: "Open relationship",
    }));
  const conversationsByContact = new Set(
    report.interactions
      .map((i) => i.contactId)
      .filter((id) => !!id && ids.has(id)),
  );
  const activity = new Map<
    string | null,
    {
      organizationId: string | null;
      conversations: number;
      overdue: number;
      open: number;
    }
  >();
  const bucket = (id: string | null) => {
    const key = id;
    if (!activity.has(key))
      activity.set(key, {
        organizationId: id,
        conversations: 0,
        overdue: 0,
        open: 0,
      });
    return activity.get(key)!;
  };
  // Conversation organization is its historical snapshot; never reassign it via a person's current employer.
  for (const i of report.interactions) bucket(i.organizationId).conversations++;
  for (const t of report.overdue) bucket(t.organizationId).overdue++;
  for (const o of report.active) bucket(o.organizationId).open++;
  const companyActivity = [...activity.values()].sort(
    (a, b) =>
      b.overdue - a.overdue ||
      b.open - a.open ||
      b.conversations - a.conversations ||
      (a.organizationId || "").localeCompare(b.organizationId || ""),
  );
  const recorded = new Map(report.trend);
  const trend: [string, number][] = [];
  for (let i = 0; i < report.range.days; i++) {
    const day = shiftDay(report.range.start, i);
    if (day > calendarDay(report.asOf, timezone)) break;
    const key = report.range.days > 90 ? day.slice(0, 7) : day;
    if (!trend.some(([d]) => d === key))
      trend.push([key, recorded.get(key) || 0]);
  }
  return {
    commitments,
    opportunities,
    relationships,
    coverage: {
      reached: conversationsByContact.size,
      total: report.contacts.length,
    },
    companyActivity,
    trend,
  };
}

/** Seven-day display groups preserve exact date bounds for source inspection. */
export function analyticsDisplayTrend(
  report: AnalyticsReport,
  overview: boolean,
  timezone: string,
): [string, number][] {
  const daily = analyticsGuidance(report, [], [], timezone).trend;
  if (!overview || report.range.days <= 14 || report.range.days > 90)
    return daily;
  const groups: [string, number][] = [];
  for (let i = 0; i < daily.length; i += 7) {
    const slice = daily.slice(i, i + 7);
    groups.push([
      `${slice[0][0]}..${slice[slice.length - 1][0]}`,
      slice.reduce((sum, [, n]) => sum + n, 0),
    ]);
  }
  return groups;
}
export function inAnalyticsBucket(
  at: string,
  bucket: string,
  timezone: string,
) {
  if (!bucket) return true;
  const day = calendarDay(at, timezone);
  if (bucket.includes("..")) {
    const [start, end] = bucket.split("..");
    return day >= start && day <= end;
  }
  return day.startsWith(bucket);
}
