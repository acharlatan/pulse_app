import type { Interaction, Opportunity, Task } from "../data/models";

/** These records have already been scoped by the saved person or historical company association. */
export function profileSnapshot(interactions: Interaction[], tasks: Task[], opportunities: Opportunity[], now = Date.now()) {
  const past = interactions
    .filter((item) => Number.isFinite(Date.parse(item.occurredAt)) && Date.parse(item.occurredAt) <= now)
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || a.id.localeCompare(b.id));
  return {
    lastConversation: past.find((item) => item.type !== "Note"),
    lastNote: past.find((item) => item.type === "Note"),
    nextTask: tasks.filter((item) => !item.completedAt).sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt) || a.id.localeCompare(b.id))[0],
    openTasks: tasks.filter((item) => !item.completedAt).length,
    openOpportunities: opportunities.filter((item) => item.status === "open"),
  };
}
