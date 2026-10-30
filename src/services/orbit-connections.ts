import type { Contact, Organization, Opportunity } from "../data/models";
import type { OrbitNode } from "./orbit";

export interface OrbitConnectionData { contacts: Contact[]; organizations: Organization[]; opportunities: Opportunity[] }
export interface SavedOrbitConnection { id: string; label: string; node: OrbitNode }

/** Resolve a saved record independently of map and list caps. Positions are map-only. */
export function savedOrbitNode(data: OrbitConnectionData, id: string): OrbitNode | undefined {
  const separator = id.indexOf(":");
  if (separator < 0) return undefined;
  const kind = id.slice(0, separator), recordId = id.slice(separator + 1);
  if (kind === "person") {
    const item = data.contacts.find((c) => c.id === recordId);
    return item ? { id, recordId, kind, label: item.name, mediaId: item.avatar, x: 0, y: 0 } : undefined;
  }
  if (kind === "company") {
    const item = data.organizations.find((o) => o.id === recordId);
    return item ? { id, recordId, kind, label: item.name, mediaId: item.avatar, x: 0, y: 0 } : undefined;
  }
  if (kind === "opportunity") {
    const item = data.opportunities.find((o) => o.id === recordId);
    return item ? { id, recordId, kind, label: item.title, mediaId: "", x: 0, y: 0 } : undefined;
  }
  return undefined;
}

/** Only explicit current CRM associations; shared employment never creates a person-to-person edge. */
export function savedOrbitConnections(data: OrbitConnectionData, selected: OrbitNode): SavedOrbitConnection[] {
  const connections = new Map<string, SavedOrbitConnection>();
  function add(id: string, label: string) {
    const node = savedOrbitNode(data, id);
    if (!node) return;
    const key = JSON.stringify([selected.id, node.id, label]);
    connections.set(key, { id: key, label, node });
  }
  if (selected.kind === "person") {
    const person = data.contacts.find(c => c.id === selected.recordId);
    if (person?.organizationId) add(`company:${person.organizationId}`, "Works at");
    for (const opportunity of data.opportunities) if (opportunity.contactIds.includes(selected.recordId)) add(`opportunity:${opportunity.id}`, "Opportunity representative");
  } else if (selected.kind === "company") {
    for (const contact of data.contacts) if (contact.organizationId === selected.recordId) add(`person:${contact.id}`, "Works at");
    for (const opportunity of data.opportunities) if (opportunity.organizationId === selected.recordId) add(`opportunity:${opportunity.id}`, "Company opportunity");
  } else {
    const opportunity = data.opportunities.find(o => o.id === selected.recordId);
    if (opportunity?.organizationId) add(`company:${opportunity.organizationId}`, "Company opportunity");
    for (const id of opportunity?.contactIds || []) add(`person:${id}`, "Opportunity representative");
  }
  return [...connections.values()].sort((a,b) => a.node.kind.localeCompare(b.node.kind) || a.node.label.localeCompare(b.node.label) || a.id.localeCompare(b.id));
}
