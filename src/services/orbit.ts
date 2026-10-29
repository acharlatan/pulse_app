import type { Contact, Organization, Opportunity } from "../data/models";
export type OrbitKind = "person" | "company" | "opportunity";
export interface OrbitNode {
  id: string;
  recordId: string;
  kind: OrbitKind;
  label: string;
  mediaId: string;
  x: number;
  y: number;
}
export interface OrbitEdge {
  id: string;
  from: string;
  to: string;
  label: string;
}
export function deriveOrbit(
  data: {
    contacts: Contact[];
    organizations: Organization[];
    opportunities: Opportunity[];
  },
  options: {
    search?: string;
    company?: string;
    person?: string;
    type?: string;
    limit?: number;
    priority?: string;
    balance?: boolean;
  } = {},
) {
  const limit = Math.max(1, Math.min(options.limit || 60, 80)),
    q = (options.search || "").toLowerCase();
  let people = data.contacts.filter(
    (c) =>
      (!options.company || c.organizationId === options.company) &&
      (!options.person || c.id === options.person) &&
      (!options.priority || c.priority === options.priority),
  );
  const dealMatches = (o: Opportunity) =>
    (!options.company || o.organizationId === options.company) &&
    (!options.person || o.contactIds.includes(options.person));
  const deals = data.opportunities.filter(dealMatches);
  const companies = data.organizations.filter(
    (o) =>
      (!options.company || o.id === options.company) &&
      (!options.person || people.some((c) => c.organizationId === o.id)),
  );
  if (options.person)
    people = data.contacts.filter((c) => c.id === options.person);
  const candidates = [
    ...companies.map((o) => ({
      id: `company:${o.id}`,
      recordId: o.id,
      kind: "company" as const,
      label: o.name,
      mediaId: o.avatar,
    })),
    ...people.map((c) => ({
      id: `person:${c.id}`,
      recordId: c.id,
      kind: "person" as const,
      label: c.name,
      mediaId: c.avatar,
    })),
    ...deals.map((o) => ({
      id: `opportunity:${o.id}`,
      recordId: o.id,
      kind: "opportunity" as const,
      label: o.title,
      mediaId: "",
    })),
  ]
    .filter(
      (n) =>
        (!q || n.label.toLowerCase().includes(q)) &&
        (!options.type || n.kind === options.type),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  // For a bounded map, interleave kinds so people are not hidden behind an
  // alphabetically earlier block of companies or opportunities. The full list
  // remains unchanged and edges are still derived only from saved associations.
  const shown = options.balance && candidates.length > limit ? (() => {
    const groups = {
      person: candidates.filter((item) => item.kind === "person"),
      company: candidates.filter((item) => item.kind === "company"),
      opportunity: candidates.filter((item) => item.kind === "opportunity"),
    };
    const positions = { person: 0, company: 0, opportunity: 0 };
    const sequence = ["person", "company", "person", "opportunity"] as const;
    const chosen: typeof candidates = [];
    while (chosen.length < limit) {
      let added = false;
      for (const kind of sequence) {
        const item = groups[kind][positions[kind]];
        if (item && chosen.length < limit) { chosen.push(item); positions[kind]++; added = true; }
      }
      if (!added) break;
    }
    return chosen;
  })() : candidates.slice(0, limit),
    nodes: OrbitNode[] = shown.map((n) => {
      const group = shown.filter((x) => x.kind === n.kind);
      const position = group.findIndex((x) => x.id === n.id);
      const angle =
        (position / Math.max(group.length, 1)) * Math.PI * 2 -
        Math.PI / 2 +
        (n.kind === "company" ? 0.25 : n.kind === "opportunity" ? 0.6 : 0);
      const radius =
        n.kind === "company" ? 235 : n.kind === "person" ? 320 : 130;
      return {
        ...n,
        x: 500 + Math.cos(angle) * radius * 1.32,
        y: 380 + Math.sin(angle) * radius,
      };
    });
  // Resolve label rectangles in a fixed pass budget; no animation or unbounded simulation.
  // The map caps at 24 (18 mobile); larger list results do not render these positions.
  for (let pass = 0; pass < 32; pass++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i],
          b = nodes[j],
          dx = b.x - a.x,
          dy = b.y - a.y;
        const overlapX = 122 - Math.abs(dx),
          overlapY = 132 - Math.abs(dy);
        if (overlapX <= 0 || overlapY <= 0) continue;
        if (overlapX < overlapY) {
          const shift = (overlapX / 2 + 0.5) * (dx < 0 ? -1 : 1);
          a.x -= shift;
          b.x += shift;
        } else {
          const shift = (overlapY / 2 + 0.5) * (dy < 0 ? -1 : 1);
          a.y -= shift;
          b.y += shift;
        }
        for (const n of [a, b]) {
          n.x = Math.max(65, Math.min(935, n.x));
          n.y = Math.max(65, Math.min(695, n.y));
        }
      }
    }
  }
  const ids = new Set(nodes.map((n) => n.id)),
    edges: OrbitEdge[] = [];
  function link(from: string, to: string, label: string) {
    if (ids.has(from) && ids.has(to))
      edges.push({ id: JSON.stringify([from, to, label]), from, to, label });
  }
  for (const c of people)
    if (c.organizationId)
      link(`person:${c.id}`, `company:${c.organizationId}`, "Works at");
  for (const o of deals) {
    if (o.organizationId)
      link(
        `opportunity:${o.id}`,
        `company:${o.organizationId}`,
        "Company opportunity",
      );
    for (const id of o.contactIds)
      link(`person:${id}`, `opportunity:${o.id}`, "Opportunity representative");
  }
  return {
    nodes,
    edges,
    total: candidates.length,
    limited: candidates.length > limit,
  };
}
