import type { MediaAsset } from "./media-models";
import {
  pipelineSchema,
  pipelineStageSchema,
  planLegacyPipelines,
  type PipelineDefinition,
  type PipelineStage,
} from "../services/pipelines";
import type {
  FieldDefinition,
  FieldValue,
  FocusItem,
} from "./expansion-models";
import type {
  Reward,
  RewardChange,
  ProgressState,
  DailyQuest,
} from "./progress-models";
import { settingsSchema, defaults } from "./models";
import Dexie, { type Table } from "dexie";
import type {
  Organization,
  Contact,
  Interaction,
  Task,
  Opportunity,
  ActivityEvent,
  Settings,
  Restriction,
  Permission,
  GamificationState,
  IntegrationConfiguration,
  Workspace,
  SmartList,
  RecommendationAction,
  ImportBatch,
} from "./models";
export class PulseDB extends Dexie {
  media!: Table<MediaAsset>;
  pipelines!: Table<PipelineDefinition>;
  pipelineStages!: Table<PipelineStage>;
  fieldDefinitions!: Table<FieldDefinition>;
  fieldValues!: Table<FieldValue>;
  focusItems!: Table<FocusItem>;
  rewards!: Table<Reward>;
  rewardChanges!: Table<RewardChange>;
  progressState!: Table<ProgressState>;
  dailyQuests!: Table<DailyQuest>;
  smartLists!: Table<SmartList>;
  recommendationActions!: Table<RecommendationAction>;
  importBatches!: Table<ImportBatch>;
  organizations!: Table<Organization>;
  contacts!: Table<Contact>;
  interactions!: Table<Interaction>;
  tasks!: Table<Task>;
  opportunities!: Table<Opportunity>;
  events!: Table<ActivityEvent>;
  settings!: Table<Settings>;
  restrictions!: Table<Restriction>;
  permissions!: Table<Permission>;
  gamification!: Table<GamificationState>;
  integrations!: Table<IntegrationConfiguration>;
  constructor(public workspace: Workspace) {
    super(`pulse-${workspace}`);
    this.version(1).stores({
      organizations: "id,name,updatedAt",
      contacts: "id,organizationId,name,stage,priority",
      interactions: "id,contactId,organizationId,occurredAt",
      tasks: "id,contactId,organizationId,dueAt,completedAt",
      opportunities: "id,organizationId,stageId",
      events: "id,contactId,organizationId,createdAt",
      settings: "id",
      restrictions: "id,contactId",
      permissions: "id,contactId",
      gamification: "id",
      integrations: "id",
    });
    this.version(2)
      .stores({
        smartLists: "id,name",
        recommendationActions: "id,key,recordId",
        importBatches: "id,createdAt",
      })
      .upgrade(async (tx) => {
        await tx
          .table("settings")
          .toCollection()
          .modify((s) => {
            s.intelligence = settingsSchema.parse(s).intelligence;
          });
      });
    this.version(3)
      .stores({
        rewards: "id,&[day+fingerprint],fingerprint,sourceId,earnedAt,day,week",
        rewardChanges: "id,rewardId,at",
        progressState: "id",
        dailyQuests: "id,day,taskId",
      })
      .upgrade(async (tx) => {
        await tx
          .table("settings")
          .toCollection()
          .modify((s) => {
            s.progress = settingsSchema.parse(s).progress;
          });
      });
    this.version(4)
      .stores({
        pipelines: "id,position,isDefault",
        pipelineStages: "id,pipelineId,position",
        opportunities: "id,organizationId,stageId,pipelineId",
        fieldDefinitions: "id,entityType",
        fieldValues: "id,fieldId,recordId,&[fieldId+recordId]",
        focusItems: "id,recordId,&[entityType+recordId]",
      })
      .upgrade(async (tx) => {
        const settings = settingsSchema.parse(
          (await tx.table("settings").get("settings")) || defaults,
        );
        const graph = planLegacyPipelines(
          settings,
          await tx.table("opportunities").toArray(),
          new Date().toISOString(),
        );
        await tx
          .table("pipelines")
          .bulkPut(graph.pipelines.map((p) => pipelineSchema.parse(p)));
        await tx
          .table("pipelineStages")
          .bulkPut(graph.stages.map((s) => pipelineStageSchema.parse(s)));
        await tx.table("opportunities").bulkPut(graph.opportunities);
        // Legacy filters refer to names. Default pipeline identities retain those exact IDs.
      });
    this.version(5)
      .stores({ media: "id,createdAt" })
      .upgrade(async (tx) => {
        await tx
          .table("settings")
          .toCollection()
          .modify((s) => {
            s.identity = settingsSchema.parse(s).identity;
          });
      });
  }
}
const instances = new Map<Workspace, PulseDB>();
export function database(workspace: Workspace) {
  if (!instances.has(workspace))
    instances.set(workspace, new PulseDB(workspace));
  return instances.get(workspace)!;
}
