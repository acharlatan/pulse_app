import type { AnalyticsReport } from "./analytics";
import { inAnalyticsBucket } from "./analytics-guidance";

/** Assemble only directly saved person links inside the already filtered report. */
export function relationshipLedger(report: AnalyticsReport, bucket: string, timezone: string) {
  const people = new Set(report.contacts.map(person => person.id));
  const conversations = new Map<string, typeof report.interactions>();
  const tasks = new Map<string, typeof report.open>();
  const opportunities = new Map<string, typeof report.active>();
  const statuses = new Map(report.health.map(item => [item.contactId, item.health]));
  for (const item of report.interactions) {
    if (!item.contactId || !people.has(item.contactId) || !inAnalyticsBucket(item.occurredAt, bucket, timezone)) continue;
    const list = conversations.get(item.contactId) || [];
    list.push(item);
    conversations.set(item.contactId, list);
  }
  for (const item of report.open) {
    if (!item.contactId || !people.has(item.contactId)) continue;
    const list = tasks.get(item.contactId) || [];
    list.push(item);
    tasks.set(item.contactId, list);
  }
  for (const item of report.active) for (const id of new Set(item.contactIds)) {
    if (!people.has(id)) continue;
    const list = opportunities.get(id) || [];
    list.push(item);
    opportunities.set(id, list);
  }
  return report.contacts.map(person => ({
    person,
    conversations: (conversations.get(person.id) || []).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || a.id.localeCompare(b.id)),
    tasks: (tasks.get(person.id) || []).sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.id.localeCompare(b.id)),
    opportunities: (opportunities.get(person.id) || []).sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id)),
    status: statuses.get(person.id),
  })).sort((a, b) => a.person.name.localeCompare(b.person.name) || a.person.id.localeCompare(b.person.id));
}
