import type { Interaction, Task } from "../data/models";
import type { OpportunityTransition } from "../data/intelligence-models";
import type { AnalyticsReport } from "./analytics";

export type AnalyticsStoryEvent =
  | { kind: "conversation"; id: string; at: string; record: Interaction }
  | { kind: "completed"; id: string; at: string; record: Task }
  | { kind: "movement"; id: string; at: string; record: OpportunityTransition };

/** Present actual records already scoped by calculateAnalytics; never backfill historical events. */
export function analyticsStory(report: Pick<AnalyticsReport, "interactions" | "completed" | "transitions" | "asOf">): AnalyticsStoryEvent[] {
  const events: AnalyticsStoryEvent[] = [
    ...report.interactions.filter((record) => record.type !== "Note").map((record) => ({ kind: "conversation" as const, id: record.id, at: record.occurredAt, record })),
    ...report.completed.filter((record) => !!record.completedAt).map((record) => ({ kind: "completed" as const, id: record.id, at: record.completedAt!, record })),
    ...report.transitions.map((record) => ({ kind: "movement" as const, id: record.id, at: record.occurredAt, record })),
  ];
  return events.filter((event) => Number.isFinite(Date.parse(event.at)) && Date.parse(event.at) <= report.asOf)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || `${a.kind}:${a.id}`.localeCompare(`${b.kind}:${b.id}`));
}
