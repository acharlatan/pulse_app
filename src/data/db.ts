import type {
  Reward,
  RewardChange,
  ProgressState,
  DailyQuest,
} from "./progress-models";
import { settingsSchema } from "./models";
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
  }
}
const instances = new Map<Workspace, PulseDB>();
export function database(workspace: Workspace) {
  if (!instances.has(workspace))
    instances.set(workspace, new PulseDB(workspace));
  return instances.get(workspace)!;
}
