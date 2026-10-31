import { describe, expect, it } from "vitest";
import type { Contact, Organization, Opportunity } from "../src/data/models";
import { deriveOrbit } from "../src/services/orbit";
import { savedOrbitConnections, savedOrbitNode } from "../src/services/orbit-connections";

const data = {
  contacts: [
    { id: "ada", name: "Ada", organizationId: "studio", avatar: "" },
    { id: "bella", name: "Bella", organizationId: "studio", avatar: "" },
    { id: "independent", name: "Independent", organizationId: null, avatar: "" },
  ] as Contact[],
  organizations: [{ id: "studio", name: "Studio", avatar: "" }, { id: "other", name: "Other", avatar: "" }] as Organization[],
  opportunities: [
    { id: "project", title: "Project", organizationId: "studio", contactIds: ["ada"], avatar: "" },
    { id: "other-project", title: "Other project", organizationId: "other", contactIds: [], avatar: "" },
  ] as Opportunity[],
};

function focused(id: string, limit = 24) {
  const selected = savedOrbitNode(data, id)!;
  const neighbors = savedOrbitConnections(data, selected).map((connection) => connection.node.id);
  return deriveOrbit(data, { includeIds: new Set([id, ...neighbors]), centerId: id, preferredId: id, preferredIds: neighbors, limit, balance: true });
}

describe("focused Orbit map", () => {
  it("centers a person and includes only their directly saved company and opportunity", () => {
    const before = structuredClone(data);
    const graph = focused("person:ada");
    expect(graph.nodes.map((node) => node.id).sort()).toEqual(["company:studio", "opportunity:project", "person:ada"]);
    expect(graph.nodes.find((node) => node.id === "person:ada")).toMatchObject({ x: 500, y: 380 });
    expect(graph.edges.filter((edge) => edge.from === "person:ada" || edge.to === "person:ada")).toHaveLength(2);
    expect(graph.nodes.some((node) => node.id === "person:bella")).toBe(false);
    expect(data).toEqual(before);
  });
  it("focuses a company around its own saved people and work and respects the map cap", () => {
    const graph = focused("company:studio", 2);
    expect(graph.total).toBe(4);
    expect(graph.limited).toBe(true);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.nodes.some((node) => node.id === "company:studio")).toBe(true);
    expect(graph.nodes.every((node) => ["company:studio", "person:ada", "person:bella", "opportunity:project"].includes(node.id))).toBe(true);
  });
  it("keeps a solitary record useful without inventing links", () => {
    const graph = focused("person:independent");
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0]).toMatchObject({ x: 500, y: 380 });
    expect(graph.edges).toEqual([]);
  });
});
