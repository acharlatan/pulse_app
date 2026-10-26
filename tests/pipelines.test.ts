import { describe, expect, it } from "vitest";
import { defaults, stages, type Opportunity } from "../src/data/models";
import {
  legacyStageId,
  planLegacyPipelines,
  planOpportunityMove,
  planStageRemoval,
  validatePipelineGraph,
} from "../src/services/pipelines";
const at = "2026-10-26T00:00:00.000Z";
const records: Opportunity[] = stages.map((stageId, i) => ({
  id: `o${i}`,
  createdAt: at,
  updatedAt: at,
  title: `Deal ${i}`,
  organizationId: null,
  contactIds: [],
  pipelineId: "default",
  stageId,
  status: stageId === "Won" ? "won" : stageId === "Lost" ? "lost" : "open",
  value: 100,
  currency: "USD",
  probability: null,
  expectedCloseAt: null,
  notes: "Preserve me",
}));
const fixture = () => planLegacyPipelines(defaults, records, at);
describe("pipeline expansion planning", () => {
  it("preserves every legacy record and outcome without mutating input", () => {
    const before = structuredClone(records);
    const graph = fixture();
    expect(graph.opportunities).toEqual(
      records.map((o) => ({
        ...o,
        stageId: legacyStageId(o.pipelineId, o.stageId),
      })),
    );
    expect(records).toEqual(before);
    expect(fixture()).toEqual(graph);
  });
  it("keeps proposal identity and lifecycle definitions independent", () => {
    const graph = fixture();
    const stage = graph.stages.find((s) => s.name === "Proposal")!;
    stage.name = "Agreement review";
    stage.position = 100;
    expect(validatePipelineGraph(graph)).toBe(graph);
    expect(graph.opportunities[5].stageId).toBe(stage.id);
    expect(stages[5]).toBe("Proposal");
  });
  it("recovers legacy pipeline IDs without orphaning records", () => {
    const graph = planLegacyPipelines(
      defaults,
      [{ ...records[0], pipelineId: "older" }],
      at,
    );
    expect(graph.pipelines).toHaveLength(2);
    expect(graph.opportunities[0].pipelineId).toBe("older");
  });
  it("rejects duplicate identities, missing stages and contradictory outcomes", () => {
    const graph = fixture();
    expect(() =>
      validatePipelineGraph({
        ...graph,
        stages: [...graph.stages, graph.stages[0]],
      }),
    ).toThrow(/Duplicate/);
    expect(() =>
      validatePipelineGraph({
        ...graph,
        opportunities: [{ ...graph.opportunities[0], stageId: "missing" }],
      }),
    ).toThrow(/belong/);
    expect(() =>
      validatePipelineGraph({
        ...graph,
        opportunities: [{ ...graph.opportunities[0], status: "won" }],
      }),
    ).toThrow(/contradicts/);
  });
  it("maps outcomes by category even when display names differ", () => {
    const graph = fixture();
    const won = graph.stages.find((s) => s.category === "won")!;
    won.name = "Active partnership";
    expect(planOpportunityMove(graph, "o0", "default", won.id, at).status).toBe(
      "won",
    );
  });
  it("requires explicit reopening and an explicit valid destination", () => {
    const graph = fixture();
    const open = graph.stages[0];
    expect(() =>
      planOpportunityMove(graph, "o7", "default", open.id, at),
    ).toThrow(/reopening/);
    expect(
      planOpportunityMove(graph, "o7", "default", open.id, at, true).status,
    ).toBe("open");
    expect(() =>
      planOpportunityMove(graph, "o0", "other", open.id, at),
    ).toThrow(/destination/);
  });
  it("previews used stage mapping without modifying the original", () => {
    const graph = fixture(),
      before = structuredClone(graph);
    expect(() => planStageRemoval(graph, graph.stages[0].id)).toThrow(
      /replacement/,
    );
    const preview = planStageRemoval(
      graph,
      graph.stages[0].id,
      graph.stages[7].id,
    );
    expect(preview.affected).toBe(1);
    expect(preview.outcomeChanges).toBe(1);
    expect(preview.graph.opportunities[0].status).toBe("won");
    expect(graph).toEqual(before);
  });
  it("preserves mandatory outcome stages and active defaults", () => {
    const graph = fixture();
    expect(() =>
      planStageRemoval(graph, graph.stages[7].id, graph.stages[0].id),
    ).toThrow(/won and lost/);
    graph.pipelines[0].archived = true;
    expect(() => validatePipelineGraph(graph)).toThrow(/active/);
  });
});
