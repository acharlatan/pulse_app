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
} from "./models";
export class PulseDB extends Dexie {
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
  }
}
const instances = new Map<Workspace, PulseDB>();
export function database(workspace: Workspace) {
  if (!instances.has(workspace))
    instances.set(workspace, new PulseDB(workspace));
  return instances.get(workspace)!;
}
