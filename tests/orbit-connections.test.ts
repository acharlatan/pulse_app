import { beforeEach, afterEach, expect, it } from "vitest";
import { PulseDB } from "../src/data/db";
import { initialize } from "../src/data/seed";
import { deriveOrbit } from "../src/services/orbit";
import { savedOrbitConnections, savedOrbitNode } from "../src/services/orbit-connections";
let db: PulseDB;
beforeEach(async () => { db = new PulseDB("demo"); await db.delete(); await db.open(); await initialize(db); });
afterEach(async () => { await db.delete(); });
async function data() { return { contacts: await db.contacts.toArray(), organizations: await db.organizations.toArray(), opportunities: await db.opportunities.toArray() }; }
it("shows only explicit saved associations even when a map or list is capped", async () => {
  const d = await data(), person = d.contacts[0], company = d.organizations.find(o => o.id === person.organizationId)!;
  const node = savedOrbitNode(d, `person:${person.id}`)!;
  const links = savedOrbitConnections(d, node);
  expect(links.some(x => x.node.id === `company:${company.id}` && x.label === "Works at")).toBe(true);
  expect(links.every(x => x.node.kind !== "person")).toBe(true);
  expect(links.filter(x => x.node.kind === "opportunity").every(x => d.opportunities.find(o => o.id === x.node.recordId)?.contactIds.includes(person.id))).toBe(true);
  const companyLinks = savedOrbitConnections(d, savedOrbitNode(d, `company:${company.id}`)!);
  expect(companyLinks.some(x => x.node.id === node.id)).toBe(true);
  expect(companyLinks.every(x => x.node.kind !== "company")).toBe(true);
});
it("keeps an explicitly requested record on a bounded map without creating extra edges", async () => {
  const d = await data(), person = d.contacts.at(-1)!;
  const graph = deriveOrbit(d, { limit: 3, balance: true, preferredId: `person:${person.id}` });
  expect(graph.nodes).toHaveLength(3);
  expect(graph.nodes.some(n => n.id === `person:${person.id}`)).toBe(true);
  expect(graph.edges.every(e => graph.nodes.some(n => n.id === e.from) && graph.nodes.some(n => n.id === e.to))).toBe(true);
  expect(savedOrbitNode(d, "person:missing")).toBeUndefined();
});
