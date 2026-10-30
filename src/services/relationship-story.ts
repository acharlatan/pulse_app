import type { Interaction, Opportunity, Task } from "../data/models";
import type { OpportunityTransition } from "../data/intelligence-models";

/** Arrange already-scoped saved records. Opportunity history follows current saved links only. */
export function relationshipStory(interactions: Interaction[], tasks: Task[], opportunities: Opportunity[], transitions: OpportunityTransition[], filter: string) {
  const opportunityIds = new Set(opportunities.map((item) => item.id));
  const entries = [
    ...interactions.filter((item) => filter === "All" || (filter === "Conversations" ? item.type !== "Note" : item.type === filter)).map((record) => ({ kind: "interaction" as const, at: record.occurredAt, record })),
    ...(filter === "All" || filter === "Follow-ups" ? tasks.map((record) => ({ kind: "task" as const, at: record.createdAt, record })) : []),
    ...(filter === "All" || filter === "Stage changes" ? transitions.filter((record) => opportunityIds.has(record.opportunityId)).map((record) => ({ kind: "transition" as const, at: record.occurredAt, record })) : []),
  ];
  return entries.sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || `${a.kind}:${a.record.id}`.localeCompare(`${b.kind}:${b.record.id}`));
}
