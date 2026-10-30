import type { Contact, Interaction, Opportunity, Organization, Task } from "../data/models";
import type { OrbitConnectionData } from "./orbit-connections";
import type { OrbitNode } from "./orbit";

export type OrbitLens = "all" | "followups" | "opportunities" | "activity";
export interface OrbitSignalsData extends OrbitConnectionData {
  contacts: Contact[];
  organizations: Organization[];
  opportunities: Opportunity[];
  tasks: Task[];
  interactions: Interaction[];
}
export interface OrbitSignal {
  id: string;
  node: OrbitNode;
  title: string;
  date?: string;
  kind: "followups" | "opportunities" | "activity";
  activityType?: Interaction["type"];
  stageId?: string;
}

/** Snapshot of explicit saved work. Recent activity includes notes but never implies contact or relationship health. */
export function orbitSignals(data: OrbitSignalsData, now = Date.now()) {
  const nodes = new Map<string, OrbitNode>();
  for (const item of data.contacts) nodes.set(`person:${item.id}`, { id:`person:${item.id}`, recordId:item.id, kind:"person", label:item.name, mediaId:item.avatar, x:0, y:0 });
  for (const item of data.organizations) nodes.set(`company:${item.id}`, { id:`company:${item.id}`, recordId:item.id, kind:"company", label:item.name, mediaId:item.avatar, x:0, y:0 });
  for (const item of data.opportunities) nodes.set(`opportunity:${item.id}`, { id:`opportunity:${item.id}`, recordId:item.id, kind:"opportunity", label:item.title, mediaId:"", x:0, y:0 });
  const ids: Record<Exclude<OrbitLens, "all">, Set<string>> = {
    followups: new Set(), opportunities: new Set(), activity: new Set(),
  };
  const followups: OrbitSignal[] = [], opportunities: OrbitSignal[] = [], activity: OrbitSignal[] = [];
  function addIds(kind: Exclude<OrbitLens, "all">, candidates: (string | null)[]) {
    for (const id of candidates) if (id && nodes.has(id)) ids[kind].add(id);
  }
  function firstNode(candidates: (string | null)[]) {
    for (const id of candidates) { const node = id && nodes.get(id); if (node) return node; }
    return undefined;
  }
  for (const task of data.tasks) {
    const due = Date.parse(task.dueAt);
    if (task.completedAt || !Number.isFinite(due) || due > now + 7 * 86400000) continue;
    const links = [task.contactId && `person:${task.contactId}`, task.organizationId && `company:${task.organizationId}`];
    addIds("followups", links);
    const node = firstNode(links);
    if (node) followups.push({ id: task.id, node, title: task.title, date: task.dueAt, kind: "followups" });
  }
  for (const opportunity of data.opportunities) {
    if (opportunity.status !== "open") continue;
    const links = [`opportunity:${opportunity.id}`, opportunity.organizationId && `company:${opportunity.organizationId}`, ...opportunity.contactIds.map(id => `person:${id}`)];
    addIds("opportunities", links);
    const node = nodes.get(links[0]!);
    if (node) opportunities.push({ id: opportunity.id, node, title: opportunity.title, kind: "opportunities", stageId: opportunity.stageId });
  }
  for (const interaction of data.interactions) {
    const occurred = Date.parse(interaction.occurredAt);
    if (!Number.isFinite(occurred) || occurred > now || occurred < now - 30 * 86400000) continue;
    // Organization is the historical snapshot saved on the interaction, not a person's current employer.
    const links = [interaction.contactId && `person:${interaction.contactId}`, interaction.organizationId && `company:${interaction.organizationId}`, interaction.opportunityId && `opportunity:${interaction.opportunityId}`];
    addIds("activity", links);
    const node = firstNode(links);
    if (node) activity.push({ id: interaction.id, node, title: interaction.summary, date: interaction.occurredAt, kind: "activity", activityType: interaction.type });
  }
  followups.sort((a, b) => Date.parse(a.date!) - Date.parse(b.date!) || a.id.localeCompare(b.id));
  opportunities.sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
  activity.sort((a, b) => Date.parse(b.date!) - Date.parse(a.date!) || a.id.localeCompare(b.id));
  return { followups, opportunities, activity, ids };
}
