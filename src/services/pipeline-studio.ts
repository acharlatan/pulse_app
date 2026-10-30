import type { Interaction, Opportunity, Task } from "../data/models";
import type { OpportunityInsight } from "./recommendations";
import { calendarDay, shiftDay } from "./progress";

/** Explicit interaction links take precedence; shared company/person work is labeled as related. */
export function opportunityFollowUp(opportunity: Opportunity, tasks: Task[], interactions: Interaction[]) {
  const direct = new Set(interactions.filter((i) => i.opportunityId === opportunity.id && i.followUpId).map((i) => i.followUpId));
  const open = tasks.filter((task) => !task.completedAt);
  const sort = (a: Task, b: Task) => a.dueAt.localeCompare(b.dueAt) || a.id.localeCompare(b.id);
  const linked = open.filter((task) => direct.has(task.id)).sort(sort)[0];
  if (linked) return { task: linked, relation: "linked" as const };
  const related = open.filter((task) =>
    (!!opportunity.organizationId && task.organizationId === opportunity.organizationId) ||
    (!!task.contactId && opportunity.contactIds.includes(task.contactId)),
  ).sort(sort)[0];
  return related ? { task: related, relation: "related" as const } : null;
}

/** Current snapshots only; never equate saved values with revenue or infer historical movement. */
export function pipelineStudio(opportunities: Opportunity[], tasks: Task[], interactions: Interaction[], insights: OpportunityInsight[], timezone: string, now = Date.now()) {
  const open = opportunities.filter((o) => o.status === "open");
  const today = calendarDay(now, timezone), end = shiftDay(today, 14);
  const reviewIds = new Set(insights.filter((i) => i.flags.length > 0).map((i) => i.opportunityId));
  const needsReview = open.filter((o) => reviewIds.has(o.id));
  const closingSoon = open.filter((o) => {
    if (!o.expectedCloseAt) return false;
    const day = calendarDay(o.expectedCloseAt, timezone);
    return day >= today && day <= end;
  });
  const noFollowUp = open.filter((o) => !opportunityFollowUp(o, tasks, interactions));
  return { open, needsReview, closingSoon, noFollowUp };
}
