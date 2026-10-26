import { z } from "zod";
import { stages, type Opportunity, type Settings } from "../data/models";

export const pipelineLimits = { active: 12, stages: 24 } as const;
const identity = {
  id: z.string().min(1).max(300),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
};
export const pipelineSchema = z.object({
  ...identity,
  name: z.string().trim().min(1).max(100),
  description: z.string().max(2000),
  position: z.number().int().nonnegative(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  isDefault: z.boolean(),
  archived: z.boolean(),
});
export const pipelineStageSchema = z.object({
  ...identity,
  pipelineId: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  position: z.number().int().nonnegative(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  category: z.enum(["open", "won", "lost"]),
});
export type PipelineDefinition = z.infer<typeof pipelineSchema>;
export type PipelineStage = z.infer<typeof pipelineStageSchema>;
export type PipelineOpportunity = Omit<Opportunity, "stageId"> & {
  stageId: string;
};
export interface PipelineGraph {
  pipelines: PipelineDefinition[];
  stages: PipelineStage[];
  opportunities: PipelineOpportunity[];
}

/** Pure validation: never modifies records, emits events, or grants rewards. */
export function validatePipelineGraph(graph: PipelineGraph) {
  const pipelines = graph.pipelines.map((p) => pipelineSchema.parse(p));
  const definitions = graph.stages.map((s) => pipelineStageSchema.parse(s));
  for (const rows of [pipelines, definitions, graph.opportunities])
    if (new Set(rows.map((r) => r.id)).size !== rows.length)
      throw new Error("Duplicate pipeline, stage or opportunity identifier.");
  const active = pipelines.filter((p) => !p.archived);
  if (!active.length || active.length > pipelineLimits.active)
    throw new Error("Keep between 1 and 12 active pipelines.");
  if (
    pipelines.filter((p) => p.isDefault).length !== 1 ||
    !active.some((p) => p.isDefault)
  )
    throw new Error("Choose exactly one active default pipeline.");
  const pipelineIds = new Set(pipelines.map((p) => p.id));
  for (const stage of definitions)
    if (!pipelineIds.has(stage.pipelineId))
      throw new Error("Stage references a missing pipeline.");
  for (const pipeline of pipelines) {
    const rows = definitions.filter((s) => s.pipelineId === pipeline.id);
    if (
      rows.length > pipelineLimits.stages ||
      !["open", "won", "lost"].every((category) =>
        rows.some((s) => s.category === category),
      )
    )
      throw new Error(
        "Each pipeline needs open, won and lost stages, with at most 24 stages.",
      );
    if (new Set(rows.map((s) => s.position)).size !== rows.length)
      throw new Error("Stage positions must be unique within a pipeline.");
  }
  const byId = new Map(definitions.map((s) => [s.id, s]));
  for (const opportunity of graph.opportunities) {
    const stage = byId.get(opportunity.stageId);
    if (!stage || stage.pipelineId !== opportunity.pipelineId)
      throw new Error("Opportunity stage does not belong to its pipeline.");
    if (opportunity.status !== stage.category)
      throw new Error("Opportunity outcome contradicts its stage.");
  }
  return graph;
}

// JSON tuple encoding prevents collisions between arbitrary pipeline IDs and names.
export const legacyStageId = (pipelineId: string, stage: string) =>
  `legacy:${JSON.stringify([pipelineId, stage])}`;

/** Prepare the full migration before writing anything. Calling again on the same
 * legacy input produces identical output, including IDs and original timestamps.
 * The future Dexie upgrade must commit this graph and filter mappings atomically.
 */
export function planLegacyPipelines(
  settings: Settings,
  opportunities: Opportunity[],
  at: string,
): PipelineGraph {
  z.string().datetime().parse(at);
  const ids = [
    ...new Set([
      settings.pipeline.id,
      ...opportunities.map((o) => o.pipelineId),
    ]),
  ];
  const configured = [...new Set([...settings.pipeline.stages, ...stages])];
  const graph: PipelineGraph = {
    pipelines: ids.map((id, position) => ({
      id,
      name:
        id === settings.pipeline.id
          ? settings.pipeline.name
          : `Recovered pipeline ${position}`,
      description: "",
      position,
      color: "#7161e8",
      isDefault: id === settings.pipeline.id,
      archived: false,
      createdAt: at,
      updatedAt: at,
    })),
    stages: ids.flatMap((pipelineId) =>
      configured.map((name, position) => ({
        id: legacyStageId(pipelineId, name),
        pipelineId,
        name,
        position,
        color: "#7161e8",
        category:
          name === "Won"
            ? ("won" as const)
            : name === "Lost"
              ? ("lost" as const)
              : ("open" as const),
        createdAt: at,
        updatedAt: at,
      })),
    ),
    opportunities: opportunities.map((o) => ({
      ...o,
      stageId: legacyStageId(o.pipelineId, o.stageId),
      status:
        o.stageId === "Won" ? "won" : o.stageId === "Lost" ? "lost" : "open",
    })),
  };
  return validatePipelineGraph(graph);
}

/** No implicit destination selection and no implicit reopening of closed records. */
export function planOpportunityMove(
  graph: PipelineGraph,
  id: string,
  pipelineId: string,
  stageId: string,
  at: string,
  reopen = false,
): PipelineOpportunity {
  validatePipelineGraph(graph);
  z.string().datetime().parse(at);
  const previous = graph.opportunities.find((o) => o.id === id);
  const pipeline = graph.pipelines.find(
    (p) => p.id === pipelineId && !p.archived,
  );
  const stage = graph.stages.find(
    (s) => s.id === stageId && s.pipelineId === pipelineId,
  );
  if (!previous || !pipeline || !stage)
    throw new Error(
      "Choose an existing opportunity and active destination stage.",
    );
  if (previous.status !== "open" && stage.category === "open" && !reopen)
    throw new Error("Confirm reopening this opportunity.");
  return {
    ...previous,
    pipelineId,
    stageId,
    status: stage.category,
    updatedAt: at,
  };
}

/** Impact preview only. Repository/UI must require confirmation and a stale
 * snapshot check before committing the complete graph in one transaction. */
export function planStageRemoval(
  graph: PipelineGraph,
  id: string,
  replacementId?: string,
) {
  validatePipelineGraph(graph);
  const stage = graph.stages.find((s) => s.id === id);
  if (!stage) throw new Error("Stage no longer exists.");
  const affected = graph.opportunities.filter((o) => o.stageId === id);
  const replacement = graph.stages.find(
    (s) =>
      s.id === replacementId &&
      s.id !== id &&
      s.pipelineId === stage.pipelineId,
  );
  if (affected.length && !replacement)
    throw new Error("Choose a replacement stage for affected opportunities.");
  const next: PipelineGraph = {
    pipelines: graph.pipelines,
    stages: graph.stages.filter((s) => s.id !== id),
    opportunities: graph.opportunities.map((o) =>
      o.stageId === id && replacement
        ? { ...o, stageId: replacement.id, status: replacement.category }
        : o,
    ),
  };
  validatePipelineGraph(next);
  return {
    graph: next,
    affected: affected.length,
    outcomeChanges: affected.filter((o) => o.status !== replacement?.category)
      .length,
  };
}
