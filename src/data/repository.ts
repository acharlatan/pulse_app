import {
  pipelineSchema,
  pipelineStageSchema,
  planLegacyPipelines,
  validatePipelineGraph,
} from "../services/pipelines";
import {
  fieldDefinitionSchema,
  fieldValueSchema,
  focusSchema,
  validateFieldValue,
} from "./expansion-models";
import { ensureProgress, syncReward } from "./progress-repository";
import {
  rewardSchema,
  rewardChangeSchema,
  progressStateSchema,
  dailyQuestSchema,
} from "./progress-models";
import { calendarDay, weekOf, sourceRule } from "../services/progress";
import { z } from "zod";
import { type PulseDB } from "./db";
import {
  smartListSchema,
  recommendationActionSchema,
  importBatchSchema,
  type SmartList,
  type RecommendationAction,
  gamificationSchema,
  integrationSchema,
  organizationSchema,
  contactSchema,
  taskSchema,
  interactionSchema,
  opportunitySchema,
  eventSchema,
  settingsSchema,
  restrictionSchema,
  permissionSchema,
  stamp,
  defaults,
  type Organization,
  type Contact,
  type Interaction,
  type Task,
  type Settings,
  type Opportunity,
  type Restriction,
  type Permission,
} from "./models";
export async function settings(db: PulseDB) {
  return settingsSchema.parse((await db.settings.get("settings")) || defaults);
}
export async function updateSettings(db: PulseDB, patch: Partial<Settings>) {
  return db.transaction("rw", [db.settings, db.progressState], async () => {
    const value = settingsSchema.parse({ ...(await settings(db)), ...patch });
    await db.settings.put(value);
    await ensureProgress(db);
    return value;
  });
}
async function event(
  db: PulseDB,
  summary: string,
  contactId: string | null = null,
  organizationId: string | null = null,
  reference?: {
    entityType: "task" | "interaction" | "opportunity";
    entityId: string;
    action: string;
  },
) {
  const identity = stamp();
  await db.events.add({
    ...identity,
    ...reference,
    workspace: db.workspace,
    occurrenceId: identity.id,
    category: "crm",
    summary,
    contactId,
    organizationId,
  });
}
// Optional editor snapshot, checked inside the write transaction to prevent stale overwrites.
function assertEditorVersion(
  previous: { updatedAt: string } | undefined,
  expected?: string,
) {
  if (expected !== undefined && (!previous || previous.updatedAt !== expected))
    throw new Error(
      "This record changed or was deleted in another tab. Copy your edits, close this editor, and reopen the latest record.",
    );
}
export async function saveOrganization(
  db: PulseDB,
  value: Organization,
  expectedUpdatedAt?: string,
) {
  const parsed = organizationSchema.parse({
    ...value,
    updatedAt: new Date().toISOString(),
  });
  await db.transaction("rw", [db.organizations, db.events], async () => {
    const previous = await db.organizations.get(parsed.id);
    assertEditorVersion(previous, expectedUpdatedAt);
    if (previous) parsed.createdAt = previous.createdAt;
    await db.organizations.put(parsed);
    await event(db, `Updated company · ${parsed.name}`, null, parsed.id);
  });
}
export async function saveContact(
  db: PulseDB,
  value: Contact,
  expectedUpdatedAt?: string,
) {
  const parsed = contactSchema.parse({
    ...value,
    updatedAt: new Date().toISOString(),
  });
  await db.transaction(
    "rw",
    [db.contacts, db.organizations, db.events, db.restrictions],
    async () => {
      if (
        parsed.organizationId &&
        !(await db.organizations.get(parsed.organizationId))
      )
        throw new Error("Choose an existing company.");
      const previous = await db.contacts.get(parsed.id);
      assertEditorVersion(previous, expectedUpdatedAt);
      if (previous) parsed.createdAt = previous.createdAt;
      await db.contacts.put(parsed);
      const restrictionId = `profile-${parsed.id}`;
      const previousRestriction = await db.restrictions.get(restrictionId);
      if (
        parsed.availability === "Available" &&
        previous?.availability !== "Available"
      )
        await db.restrictions.delete(restrictionId);
      if (
        parsed.availability !== "Available" &&
        (!previous ||
          previous.availability !== parsed.availability ||
          previous.timeoutUntil !== parsed.timeoutUntil)
      )
        await db.restrictions.put({
          ...stamp(),
          createdAt: previousRestriction?.createdAt || parsed.updatedAt,
          id: restrictionId,
          contactId: parsed.id,
          type: parsed.availability,
          startAt: new Date().toISOString(),
          endAt:
            parsed.availability === "Temporarily unavailable"
              ? parsed.timeoutUntil
              : null,
          reason: previousRestriction?.reason || "Set in profile",
          source: previousRestriction?.source || "User",
        });
      await event(
        db,
        `Saved profile · ${parsed.name}`,
        parsed.id,
        parsed.organizationId,
      );
    },
  );
}
export async function addInteraction(db: PulseDB, value: Interaction) {
  const parsed = interactionSchema.parse(value);
  return db.transaction("rw", db.tables, async () => {
    if (parsed.contactId) {
      const contact = await db.contacts.get(parsed.contactId);
      if (!contact) throw new Error("Contact no longer exists.");
      parsed.organizationId = contact.organizationId;
    }
    if (
      parsed.organizationId &&
      !(await db.organizations.get(parsed.organizationId))
    )
      throw new Error("Company no longer exists.");
    await validateInteractionLinks(db, parsed);
    await db.interactions.add(parsed);
    const feedback = await syncReward(
      db,
      "interaction",
      parsed.id,
      true,
      false,
    );
    await event(
      db,
      `${parsed.type} logged`,
      parsed.contactId,
      parsed.organizationId,
      { entityType: "interaction", entityId: parsed.id, action: "logged" },
    );
    return feedback;
  });
}
export async function saveTask(
  db: PulseDB,
  value: Task,
  expectedUpdatedAt?: string,
) {
  const parsed = taskSchema.parse({
    ...value,
    updatedAt: new Date().toISOString(),
  });
  await db.transaction("rw", db.tables, async () => {
    if (parsed.contactId) {
      const contact = await db.contacts.get(parsed.contactId);
      if (!contact) throw new Error("Contact no longer exists.");
      parsed.organizationId = contact.organizationId;
    }
    if (
      parsed.organizationId &&
      !(await db.organizations.get(parsed.organizationId))
    )
      throw new Error("Company no longer exists.");
    const previous = await db.tasks.get(parsed.id);
    assertEditorVersion(previous, expectedUpdatedAt);
    if (previous) parsed.createdAt = previous.createdAt;
    parsed.completedAt = previous?.completedAt || null;
    await db.tasks.put(parsed);
    await syncReward(db, "task", parsed.id, false, false);
    await event(
      db,
      `${previous ? "Follow-up updated" : "Follow-up planned"} · ${parsed.title}`,
      parsed.contactId,
      parsed.organizationId,
      { entityType: "task", entityId: parsed.id, action: "saved" },
    );
  });
}
export async function completeTask(db: PulseDB, id: string) {
  return db.transaction("rw", db.tables, async () => {
    const task = await db.tasks.get(id);
    if (!task || task.completedAt) return;
    await db.tasks.update(id, {
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const feedback = await syncReward(db, "task", task.id, true, false);
    await event(
      db,
      `Task completed · ${task.title}`,
      task.contactId,
      task.organizationId,
      { entityType: "task", entityId: task.id, action: "completed" },
    );
    return feedback;
  });
}
export async function deleteContact(db: PulseDB, id: string) {
  await db.transaction("rw", db.tables, async () => {
    const c = await db.contacts.get(id);
    if (!c) return;
    const removedTaskIds = new Set(
      (await db.tasks.where("contactId").equals(id).toArray()).map((t) => t.id),
    );
    for (const i of await db.interactions.toArray())
      if (
        i.followUpId &&
        removedTaskIds.has(i.followUpId) &&
        i.contactId !== id
      )
        await db.interactions.update(i.id, { followUpId: null });
    await db.recommendationActions.where("recordId").equals(id).delete();
    for (const reward of await db.rewards.toArray()) {
      const source =
        reward.sourceType === "task"
          ? await db.tasks.get(reward.sourceId)
          : reward.sourceType === "interaction"
            ? await db.interactions.get(reward.sourceId)
            : null;
      if (source?.contactId === id)
        await syncReward(db, reward.sourceType, reward.sourceId, false, true);
    }
    for (const taskId of removedTaskIds)
      await db.dailyQuests
        .where("taskId")
        .equals(taskId)
        .modify({ title: "Removed follow-up" });
    await db.focusItems
      .where("recordId")
      .equals(id)
      .filter((f) => f.entityType === "contact")
      .delete();
    const fields = new Set(
      (
        await db.fieldDefinitions
          .where("entityType")
          .equals("contact")
          .toArray()
      ).map((f) => f.id),
    );
    await db.fieldValues
      .where("recordId")
      .equals(id)
      .filter((v) => fields.has(v.fieldId))
      .delete();
    await db.contacts.delete(id);
    for (const pin of await db.focusItems.toArray())
      if (pin.entityType === "task" && !(await db.tasks.get(pin.recordId)))
        await db.focusItems.delete(pin.id);
    for (const table of [
      db.interactions,
      db.tasks,
      db.restrictions,
      db.permissions,
    ])
      await table.where("contactId").equals(id).delete();
    await db.events.where("contactId").equals(id).delete();
    for (const o of await db.opportunities.toArray())
      if (o.contactIds.includes(id)) {
        await db.opportunities.update(o.id, {
          contactIds: o.contactIds.filter((v) => v !== id),
        });
        await syncReward(db, "opportunity", o.id);
      }
    await event(db, `Deleted contact · ${c.name}`);
  });
}
export async function deleteOrganization(db: PulseDB, id: string) {
  await db.transaction("rw", db.tables, async () => {
    const org = await db.organizations.get(id);
    if (!org) return;
    await db.contacts
      .where("organizationId")
      .equals(id)
      .modify({ organizationId: null });
    for (const name of ["interactions", "tasks", "events", "opportunities"])
      await db
        .table(name)
        .where("organizationId")
        .equals(id)
        .modify({ organizationId: null });
    await db.focusItems
      .where("recordId")
      .equals(id)
      .filter((f) => f.entityType === "organization")
      .delete();
    const fields = new Set(
      (
        await db.fieldDefinitions
          .where("entityType")
          .equals("organization")
          .toArray()
      ).map((f) => f.id),
    );
    await db.fieldValues
      .where("recordId")
      .equals(id)
      .filter((v) => fields.has(v.fieldId))
      .delete();
    await db.organizations.delete(id);
    await event(db, `Deleted company · ${org.name}; related records preserved`);
  });
}
export const backupSchema = z.object({
  format: z.literal("pulse-backup"),
  version: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  metadata: z
    .object({
      appVersion: z.string(),
      exportedAt: z.string().datetime(),
      workspace: z.enum(["demo", "personal"]),
    })
    .optional(),
  pipelines: z.array(pipelineSchema).default([]),
  pipelineStages: z.array(pipelineStageSchema).default([]),
  fieldDefinitions: z.array(fieldDefinitionSchema).default([]),
  fieldValues: z.array(fieldValueSchema).default([]),
  focusItems: z.array(focusSchema).default([]),
  rewards: z.array(rewardSchema).default([]),
  rewardChanges: z.array(rewardChangeSchema).default([]),
  progressState: z.array(progressStateSchema).max(1).default([]),
  dailyQuests: z.array(dailyQuestSchema).default([]),
  smartLists: z.array(smartListSchema).default([]),
  recommendationActions: z.array(recommendationActionSchema).default([]),
  importBatches: z.array(importBatchSchema).default([]),
  organizations: z.array(organizationSchema),
  contacts: z.array(contactSchema),
  interactions: z.array(interactionSchema),
  tasks: z.array(taskSchema),
  opportunities: z.array(opportunitySchema),
  events: z.array(eventSchema),
  settings: z.array(settingsSchema).max(1),
  restrictions: z.array(restrictionSchema),
  permissions: z.array(permissionSchema),
  gamification: z.array(gamificationSchema).default([]),
  integrations: z.array(integrationSchema).default([]),
});
export async function exportBackup(db: PulseDB) {
  return db.transaction("r", db.tables, async () => ({
    format: "pulse-backup",
    version: 4,
    metadata: {
      appVersion: "1.1.0-rc.1",
      exportedAt: new Date().toISOString(),
      workspace: db.workspace,
    },
    pipelines: (await db.pipelines.count())
      ? await db.pipelines.toArray()
      : planLegacyPipelines(
          await settings(db),
          await db.opportunities.toArray(),
          new Date().toISOString(),
        ).pipelines,
    pipelineStages: (await db.pipelines.count())
      ? await db.pipelineStages.toArray()
      : planLegacyPipelines(
          await settings(db),
          await db.opportunities.toArray(),
          new Date().toISOString(),
        ).stages,
    fieldDefinitions: await db.fieldDefinitions.toArray(),
    fieldValues: await db.fieldValues.toArray(),
    focusItems: await db.focusItems.toArray(),
    rewards: await db.rewards.toArray(),
    rewardChanges: await db.rewardChanges.toArray(),
    progressState: await db.progressState.toArray(),
    dailyQuests: await db.dailyQuests.toArray(),
    smartLists: await db.smartLists.toArray(),
    recommendationActions: await db.recommendationActions.toArray(),
    importBatches: await db.importBatches.toArray(),
    organizations: await db.organizations.toArray(),
    contacts: await db.contacts.toArray(),
    interactions: await db.interactions.toArray(),
    tasks: await db.tasks.toArray(),
    opportunities: await db.opportunities.toArray(),
    events: await db.events.toArray(),
    settings: await db.settings.toArray(),
    restrictions: await db.restrictions.toArray(),
    permissions: await db.permissions.toArray(),
    gamification: await db.gamification.toArray(),
    integrations: await db.integrations.toArray(),
  }));
}
export function validateBackup(input: unknown) {
  const b = backupSchema.parse(input);
  // Version-one backups remain supported. The stage is authoritative for outcomes.
  if (b.version < 4) {
    const legacy = b.opportunities.map((o) => ({
      ...o,
      stageId: o.stageId as Opportunity["stageId"],
    }));
    const graph = planLegacyPipelines(
      b.settings[0] || defaults,
      legacy,
      b.metadata?.exportedAt || "2026-01-01T00:00:00.000Z",
    );
    b.pipelines = graph.pipelines;
    b.pipelineStages = graph.stages;
    b.opportunities = graph.opportunities;
  }
  validatePipelineGraph({
    pipelines: b.pipelines,
    stages: b.pipelineStages,
    opportunities: b.opportunities,
  });
  const entityRows = {
    contact: b.contacts,
    organization: b.organizations,
    opportunity: b.opportunities,
    task: b.tasks,
  };
  const definitions = new Map(b.fieldDefinitions.map((f) => [f.id, f]));
  for (const f of b.fieldDefinitions) {
    if (
      b.fieldDefinitions.filter((x) => x.entityType === f.entityType).length >
        30 ||
      new Set(f.choices).size !== f.choices.length ||
      (f.type === "select" && !f.choices.length)
    )
      throw new Error("Invalid custom field definition.");
  }
  const pairs = new Set<string>();
  for (const v of b.fieldValues) {
    const f = definitions.get(v.fieldId),
      key = JSON.stringify([v.fieldId, v.recordId]);
    if (
      !f ||
      !entityRows[f.entityType].some((r) => r.id === v.recordId) ||
      pairs.has(key) ||
      v.id !== key
    )
      throw new Error("Invalid custom field reference.");
    pairs.add(key);
    validateFieldValue(f, v.value);
  }
  for (const f of b.focusItems)
    if (
      f.id !== JSON.stringify([f.entityType, f.recordId]) ||
      !entityRows[f.entityType].some((r) => r.id === f.recordId)
    )
      throw new Error("Invalid focus reference.");
  const orgs = new Set(b.organizations.map((v) => v.id)),
    contacts = new Set(b.contacts.map((v) => v.id));
  for (const records of [
    b.pipelines,
    b.pipelineStages,
    b.fieldDefinitions,
    b.fieldValues,
    b.focusItems,
    b.rewards,
    b.rewardChanges,
    b.progressState,
    b.dailyQuests,
    b.smartLists,
    b.recommendationActions,
    b.importBatches,
    b.organizations,
    b.contacts,
    b.interactions,
    b.tasks,
    b.opportunities,
    b.events,
    b.restrictions,
    b.permissions,
  ])
    if (new Set(records.map((r) => r.id)).size !== records.length)
      throw new Error("Backup contains duplicate identifiers.");
  for (const r of [
    ...b.contacts,
    ...b.interactions,
    ...b.tasks,
    ...b.opportunities,
    ...b.events,
  ])
    if (r.organizationId && !orgs.has(r.organizationId))
      throw new Error("Backup references a missing company.");
  for (const r of [
    ...b.interactions,
    ...b.tasks,
    ...b.events,
    ...b.restrictions,
    ...b.permissions,
  ])
    if (r.contactId && !contacts.has(r.contactId))
      throw new Error("Backup references a missing contact.");
  for (const o of b.opportunities)
    if (o.contactIds.some((id) => !contacts.has(id)))
      throw new Error("Opportunity references a missing contact.");
  const validReviewRecords = new Set([
    ...b.contacts.map((c) => c.id),
    ...b.opportunities.map((o) => o.id),
  ]);
  for (const a of b.recommendationActions)
    if (!validReviewRecords.has(a.recordId))
      throw new Error("Recommendation action references a missing record.");
  const opportunities = new Set(b.opportunities.map((o) => o.id)),
    tasks = new Set(b.tasks.map((t) => t.id));
  for (const i of b.interactions) {
    if (i.opportunityId && !opportunities.has(i.opportunityId))
      throw new Error("Missing opportunity reference.");
    if (i.followUpId && !tasks.has(i.followUpId))
      throw new Error("Missing follow-up reference.");
  }
  const state = b.progressState[0];
  if (
    (b.rewards.length || b.dailyQuests.length || b.rewardChanges.length) &&
    !state
  )
    throw new Error("Progress calendar is missing.");
  const sourceMaps = {
    task: new Map(b.tasks.map((t) => [t.id, t])),
    interaction: new Map(b.interactions.map((i) => [i.id, i])),
    opportunity: new Map(b.opportunities.map((o) => [o.id, o])),
  };
  const correctionGroups = new Map<string, typeof b.rewardChanges>();
  for (const c of b.rewardChanges) {
    const rows = correctionGroups.get(c.rewardId) || [];
    rows.push(c);
    correctionGroups.set(c.rewardId, rows);
  }
  const structurallyAvailableContacts = b.contacts.map((c) => ({
    ...c,
    availability: "Available" as const,
    timeoutUntil: null,
  }));
  const fingerprints = new Set<string>();
  for (const r of b.rewards) {
    if (!r.deleted && !sourceMaps[r.sourceType].has(r.sourceId))
      throw new Error("Reward references a missing source.");
    if (
      !state ||
      r.timezone !== state.timezone ||
      r.day !== calendarDay(r.earnedAt, r.timezone) ||
      r.week !== weekOf(r.day) ||
      r.earnedAt < state.startedAt
    )
      throw new Error("Invalid reward calendar.");
    const key = JSON.stringify([r.day, r.fingerprint]);
    if (fingerprints.has(key)) throw new Error("Duplicate reward fingerprint.");
    fingerprints.add(key);
  }
  for (const r of b.rewards) {
    if (r.active) {
      const source = sourceMaps[r.sourceType].get(r.sourceId);
      // Validate current source structure without retroactively applying later communication instructions.
      if (
        !source ||
        !sourceRule(
          r.sourceType,
          source,
          {
            contacts: structurallyAvailableContacts,
            permissions: [],
            restrictions: [],
          },
          Date.parse(r.earnedAt),
        )
      )
        throw new Error("Active reward source no longer qualifies.");
    }
    const changes = (correctionGroups.get(r.id) || []).sort(
      (a, b) => a.sequence - b.sequence,
    );
    if (
      changes.length === 0 ||
      changes[0].action !== "granted" ||
      changes.filter((c) => c.action === "granted").length !== 1 ||
      changes.some((c, i) => c.sequence !== i + 1) ||
      (changes.at(-1)!.action !== "reversed") !== r.active
    )
      throw new Error("Invalid reward correction history.");
  }
  const rewardIds = new Set(b.rewards.map((r) => r.id));
  for (const change of b.rewardChanges)
    if (!rewardIds.has(change.rewardId))
      throw new Error("Reward correction references a missing entitlement.");
  // Quest source tombstones are intentional: a deleted task remains an unavailable quest for that day.
  if (
    b.dailyQuests.some(
      (q) =>
        !state ||
        q.createdAt < state.startedAt ||
        q.day !== calendarDay(q.createdAt, state.timezone),
    )
  )
    throw new Error("Invalid quest history.");
  return b;
}
export async function restoreBackup(db: PulseDB, input: unknown) {
  const b = validateBackup(input);
  await db.transaction("rw", db.tables, async () => {
    for (const key of [
      "pipelines",
      "pipelineStages",
      "fieldDefinitions",
      "fieldValues",
      "focusItems",
      "rewards",
      "rewardChanges",
      "progressState",
      "dailyQuests",
      "smartLists",
      "recommendationActions",
      "importBatches",
      "organizations",
      "contacts",
      "interactions",
      "tasks",
      "opportunities",
      "events",
      "settings",
      "restrictions",
      "permissions",
      "gamification",
      "integrations",
    ] as const) {
      await db[key].clear();
      await db.table(key).bulkAdd(b[key]);
    }
  });
}

export async function moveOpportunity(db: PulseDB, id: string, stage: string) {
  const record = await db.opportunities.get(id);
  if (!record) throw new Error("Opportunity no longer exists.");
  await saveOpportunity(
    db,
    {
      ...record,
      stageId: stage as Opportunity["stageId"],
    },
    record.updatedAt,
  );
}

async function validateInteractionLinks(db: PulseDB, i: Interaction) {
  if (!i.contactId && !i.organizationId)
    throw new Error("Choose a person or company.");
  if (i.opportunityId && !(await db.opportunities.get(i.opportunityId)))
    throw new Error("Opportunity no longer exists.");
  if (i.followUpId && !(await db.tasks.get(i.followUpId)))
    throw new Error("Follow-up no longer exists.");
}
export async function updateInteraction(
  db: PulseDB,
  value: Interaction,
  expectedUpdatedAt?: string,
) {
  await db.transaction("rw", db.tables, async () => {
    const previous = await db.interactions.get(value.id);
    if (!previous) throw new Error("Interaction no longer exists.");
    assertEditorVersion(previous, expectedUpdatedAt);
    const parsed = interactionSchema.parse({
      ...value,
      createdAt: previous.createdAt,
      updatedAt: new Date().toISOString(),
    });
    if (parsed.contactId && !(await db.contacts.get(parsed.contactId)))
      throw new Error("Contact no longer exists.");
    if (
      parsed.organizationId &&
      !(await db.organizations.get(parsed.organizationId))
    )
      throw new Error("Company no longer exists.");
    await validateInteractionLinks(db, parsed);
    // The company is a historical snapshot, retained when a person moves companies.
    await db.interactions.put(parsed);
    await syncReward(db, "interaction", parsed.id, false, false);
    await event(
      db,
      `${parsed.type} corrected`,
      parsed.contactId,
      parsed.organizationId,
      { entityType: "interaction", entityId: parsed.id, action: "corrected" },
    );
  });
}
export async function deleteInteraction(db: PulseDB, id: string) {
  await db.transaction("rw", db.tables, async () => {
    const i = await db.interactions.get(id);
    if (!i) return;
    await db.interactions.delete(id);
    await syncReward(db, "interaction", i.id, false, true);
    await event(
      db,
      "Interaction deleted; linked tasks preserved",
      i.contactId,
      i.organizationId,
      { entityType: "interaction", entityId: i.id, action: "deleted" },
    );
  });
}
export async function reopenTask(db: PulseDB, id: string) {
  await db.transaction("rw", db.tables, async () => {
    const t = await db.tasks.get(id);
    if (!t?.completedAt) return;
    await db.tasks.update(id, {
      completedAt: null,
      updatedAt: new Date().toISOString(),
    });
    await syncReward(db, "task", t.id, false, false);
    await event(
      db,
      `Follow-up reopened · ${t.title}`,
      t.contactId,
      t.organizationId,
      { entityType: "task", entityId: t.id, action: "reopened" },
    );
  });
}
export async function deleteTask(db: PulseDB, id: string) {
  await db.transaction("rw", db.tables, async () => {
    const t = await db.tasks.get(id);
    if (!t) return;
    for (const i of await db.interactions.toArray())
      if (i.followUpId === id)
        await db.interactions.update(i.id, {
          followUpId: null,
          updatedAt: new Date().toISOString(),
        });
    await db.focusItems
      .where("recordId")
      .equals(id)
      .filter((f) => f.entityType === "task")
      .delete();
    const fields = new Set(
      (
        await db.fieldDefinitions.where("entityType").equals("task").toArray()
      ).map((f) => f.id),
    );
    await db.fieldValues
      .where("recordId")
      .equals(id)
      .filter((v) => fields.has(v.fieldId))
      .delete();
    await db.tasks.delete(id);
    await db.dailyQuests
      .where("taskId")
      .equals(id)
      .modify({ title: "Removed follow-up" });
    await syncReward(db, "task", t.id, false, true);
    await event(
      db,
      `Follow-up deleted · ${t.title}`,
      t.contactId,
      t.organizationId,
      { entityType: "task", entityId: t.id, action: "deleted" },
    );
  });
}
export async function saveOpportunity(
  db: PulseDB,
  value: Opportunity,
  expectedUpdatedAt?: string,
) {
  const parsed = opportunitySchema.parse({
    ...value,
    status: value.status,
    updatedAt: new Date().toISOString(),
  });
  if (!parsed.title.trim()) throw new Error("Enter an opportunity title.");
  if (!/^[A-Z]{3}$/.test(parsed.currency))
    throw new Error("Use a three-letter currency code.");
  try {
    new Intl.NumberFormat("en", {
      style: "currency",
      currency: parsed.currency,
    });
  } catch {
    throw new Error("Invalid currency.");
  }
  return db.transaction("rw", db.tables, async () => {
    const pipeline = await db.pipelines.get(parsed.pipelineId);
    const stage = await db.pipelineStages.get(parsed.stageId);
    if (!pipeline || !stage || stage.pipelineId !== pipeline.id)
      throw new Error("Choose a valid pipeline and stage.");
    const existing = await db.opportunities.get(parsed.id);
    if (pipeline.archived && existing?.pipelineId !== pipeline.id)
      throw new Error("Choose an active pipeline.");
    parsed.status = stage.category;
    if (
      parsed.organizationId &&
      !(await db.organizations.get(parsed.organizationId))
    )
      throw new Error("Company no longer exists.");
    if (new Set(parsed.contactIds).size !== parsed.contactIds.length)
      throw new Error("Duplicate representative.");
    for (const id of parsed.contactIds) {
      const c = await db.contacts.get(id);
      if (!c) throw new Error("Contact no longer exists.");
      // Existing links remain valid when representatives change employers.
      const previous = await db.opportunities.get(parsed.id);
      if (
        parsed.organizationId &&
        c.organizationId !== parsed.organizationId &&
        !(
          previous?.organizationId === parsed.organizationId &&
          previous.contactIds.includes(id)
        )
      )
        throw new Error(
          "New representatives must belong to the selected company.",
        );
    }
    const previous = await db.opportunities.get(parsed.id);
    assertEditorVersion(previous, expectedUpdatedAt);
    if (previous) parsed.createdAt = previous.createdAt;
    await db.opportunities.put(parsed);
    const feedback = await syncReward(
      db,
      "opportunity",
      parsed.id,
      !!previous && previous.status === "open" && parsed.status !== "open",
      false,
    );
    await event(
      db,
      `Opportunity ${previous ? "updated" : "created"} · ${parsed.title} · ${stage.name}`,
      null,
      parsed.organizationId,
      { entityType: "opportunity", entityId: parsed.id, action: "saved" },
    );
    return feedback;
  });
}
export async function deleteOpportunity(db: PulseDB, id: string) {
  await db.transaction("rw", db.tables, async () => {
    const o = await db.opportunities.get(id);
    if (!o) return;
    for (const i of await db.interactions.toArray())
      if (i.opportunityId === id)
        await db.interactions.update(i.id, {
          opportunityId: null,
          updatedAt: new Date().toISOString(),
        });
    await db.recommendationActions.where("recordId").equals(id).delete();
    await db.focusItems
      .where("recordId")
      .equals(id)
      .filter((f) => f.entityType === "opportunity")
      .delete();
    const fields = new Set(
      (
        await db.fieldDefinitions
          .where("entityType")
          .equals("opportunity")
          .toArray()
      ).map((f) => f.id),
    );
    await db.fieldValues
      .where("recordId")
      .equals(id)
      .filter((v) => fields.has(v.fieldId))
      .delete();
    await db.opportunities.delete(id);
    await syncReward(db, "opportunity", o.id, false, true);
    await event(
      db,
      `Opportunity deleted · ${o.title}`,
      null,
      o.organizationId,
      { entityType: "opportunity", entityId: o.id, action: "deleted" },
    );
  });
}
export async function saveRestriction(db: PulseDB, value: Restriction) {
  const parsed = restrictionSchema.parse({
    ...value,
    updatedAt: new Date().toISOString(),
  });
  if (parsed.startAt && parsed.endAt && parsed.startAt >= parsed.endAt)
    throw new Error("End must be after start.");
  if (["Do not contact", "On hold"].includes(parsed.type) && parsed.endAt)
    throw new Error("Indefinite restrictions must be ended explicitly.");
  await db.transaction(
    "rw",
    [db.contacts, db.restrictions, db.events],
    async () => {
      const c = await db.contacts.get(parsed.contactId);
      if (!c) throw new Error("Contact no longer exists.");
      const previous = await db.restrictions.get(parsed.id);
      if (previous) parsed.createdAt = previous.createdAt;
      if (
        previous &&
        JSON.stringify({ ...previous, updatedAt: "" }) !==
          JSON.stringify({ ...parsed, updatedAt: "" })
      ) {
        await db.restrictions.add({
          ...previous,
          id: stamp().id,
          endAt:
            previous.endAt && previous.endAt < parsed.updatedAt
              ? previous.endAt
              : parsed.updatedAt,
          updatedAt: parsed.updatedAt,
        });
      }
      await db.restrictions.put(parsed);
      if (parsed.id === `profile-${c.id}`)
        await db.contacts.update(c.id, {
          availability: parsed.type,
          timeoutUntil:
            parsed.type === "Temporarily unavailable" ? parsed.endAt : null,
          updatedAt: parsed.updatedAt,
        });
      await event(
        db,
        `Availability recorded · ${parsed.type}`,
        c.id,
        c.organizationId,
      );
    },
  );
}
export async function endRestriction(db: PulseDB, id: string) {
  await db.transaction(
    "rw",
    [db.restrictions, db.contacts, db.events],
    async () => {
      const r = await db.restrictions.get(id);
      if (!r) return;
      // Preserve the original instruction as an ended record.
      const now = new Date().toISOString();
      await db.restrictions.update(id, { endAt: now, updatedAt: now });
      if (id === `profile-${r.contactId}`)
        await db.contacts.update(r.contactId, {
          availability: "Available",
          timeoutUntil: null,
          updatedAt: now,
        });
      await event(db, "Availability restriction ended", r.contactId);
    },
  );
}
export async function savePermission(db: PulseDB, value: Permission) {
  const parsed = permissionSchema.parse({
    ...value,
    updatedAt: new Date().toISOString(),
    withdrawnAt:
      value.status === "Withdrawn"
        ? value.withdrawnAt || new Date().toISOString()
        : null,
  });
  await db.transaction(
    "rw",
    [db.permissions, db.contacts, db.events],
    async () => {
      const c = await db.contacts.get(parsed.contactId);
      if (!c) throw new Error("Contact no longer exists.");
      const existing = (
        await db.permissions.where("contactId").equals(c.id).toArray()
      ).find(
        (p) =>
          p.channel === parsed.channel &&
          p.purpose === parsed.purpose &&
          p.id !== parsed.id,
      );
      if (existing)
        throw new Error(
          "Edit the existing permission for this channel and purpose.",
        );
      const previous = await db.permissions.get(parsed.id);
      if (previous) parsed.createdAt = previous.createdAt;
      await db.permissions.put(parsed);
      await event(
        db,
        `${parsed.purpose} permission · ${parsed.channel} · ${parsed.status}`,
        c.id,
        c.organizationId,
      );
    },
  );
}

export async function saveSmartList(db: PulseDB, value: SmartList) {
  const parsed = smartListSchema.parse({
    ...value,
    updatedAt: new Date().toISOString(),
  });
  await db.transaction("rw", db.tables, async () => {
    for (const rule of parsed.conditions)
      if (rule.field === "customField") {
        const field = rule.fieldId
          ? await db.fieldDefinitions.get(rule.fieldId)
          : undefined;
        if (!field || field.archived || field.entityType !== parsed.entityType)
          throw new Error(
            "Choose an active custom field for this record type.",
          );
        const allowed =
          field.type === "number"
            ? ["is", "atLeast", "atMost"]
            : field.type === "date"
              ? ["is", "before", "after"]
              : ["text", "longText"].includes(field.type)
                ? ["is", "contains"]
                : ["is", "isNot"];
        if (!allowed.includes(rule.operator))
          throw new Error("Choose a comparison supported by this field type.");
        validateFieldValue(
          field,
          field.type === "number"
            ? Number(rule.value)
            : field.type === "checkbox"
              ? rule.value === "true"
              : rule.value,
        );
        if (
          field.type === "checkbox" &&
          !["true", "false"].includes(rule.value)
        )
          throw new Error("Choose true or false.");
      }
    const old = await db.smartLists.get(parsed.id);
    if (old) parsed.createdAt = old.createdAt;
    await db.smartLists.put(parsed);
    await event(db, "Smart List saved");
  });
}
export async function deleteSmartList(db: PulseDB, id: string) {
  await db.transaction("rw", [db.smartLists, db.events], async () => {
    await db.smartLists.delete(id);
    await event(db, "Smart List deleted");
  });
}
export async function saveRecommendationAction(
  db: PulseDB,
  value: RecommendationAction,
) {
  const parsed = recommendationActionSchema.parse(value);
  if (
    parsed.kind === "snooze" &&
    (!parsed.until || Date.parse(parsed.until) <= Date.now())
  )
    throw new Error("Choose a future snooze date.");
  await db.transaction(
    "rw",
    [db.recommendationActions, db.events, db.contacts, db.opportunities],
    async () => {
      if (
        !(await db.contacts.get(parsed.recordId)) &&
        !(await db.opportunities.get(parsed.recordId))
      )
        throw new Error("Review record no longer exists.");
      await db.recommendationActions.where("key").equals(parsed.key).delete();
      await db.recommendationActions.add(parsed);
      await event(
        db,
        parsed.kind === "snooze"
          ? "Recommendation snoozed"
          : "Recommendation dismissed",
      );
    },
  );
}
export async function clearRecommendationAction(db: PulseDB, id: string) {
  await db.transaction(
    "rw",
    [db.recommendationActions, db.events],
    async () => {
      if (!(await db.recommendationActions.get(id))) return;
      await db.recommendationActions.delete(id);
      await event(db, "Recommendation returned to review");
    },
  );
}
