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
  const value = settingsSchema.parse({ ...(await settings(db)), ...patch });
  await db.settings.put(value);
  return value;
}
async function event(
  db: PulseDB,
  summary: string,
  contactId: string | null = null,
  organizationId: string | null = null,
) {
  await db.events.add({
    ...stamp(),
    category: "crm",
    summary,
    contactId,
    organizationId,
  });
}
export async function saveOrganization(db: PulseDB, value: Organization) {
  const parsed = organizationSchema.parse({
    ...value,
    updatedAt: new Date().toISOString(),
  });
  await db.transaction("rw", [db.organizations, db.events], async () => {
    const previous = await db.organizations.get(parsed.id);
    if (previous) parsed.createdAt = previous.createdAt;
    await db.organizations.put(parsed);
    await event(db, `Updated company · ${parsed.name}`, null, parsed.id);
  });
}
export async function saveContact(db: PulseDB, value: Contact) {
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
  await db.transaction(
    "rw",
    [
      db.interactions,
      db.contacts,
      db.organizations,
      db.events,
      db.tasks,
      db.opportunities,
    ],
    async () => {
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
      await event(
        db,
        `${parsed.type} logged`,
        parsed.contactId,
        parsed.organizationId,
      );
    },
  );
}
export async function saveTask(db: PulseDB, value: Task) {
  const parsed = taskSchema.parse({
    ...value,
    updatedAt: new Date().toISOString(),
  });
  await db.transaction(
    "rw",
    [db.tasks, db.contacts, db.organizations, db.events],
    async () => {
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
      if (previous) parsed.createdAt = previous.createdAt;
      await db.tasks.put(parsed);
      await event(
        db,
        `${previous ? "Follow-up updated" : "Follow-up planned"} · ${parsed.title}`,
        parsed.contactId,
        parsed.organizationId,
      );
    },
  );
}
export async function completeTask(db: PulseDB, id: string) {
  await db.transaction("rw", [db.tasks, db.events], async () => {
    const task = await db.tasks.get(id);
    if (!task || task.completedAt) return;
    await db.tasks.update(id, {
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await event(
      db,
      `Task completed · ${task.title}`,
      task.contactId,
      task.organizationId,
    );
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
    await db.contacts.delete(id);
    for (const table of [
      db.interactions,
      db.tasks,
      db.restrictions,
      db.permissions,
    ])
      await table.where("contactId").equals(id).delete();
    await db.events.where("contactId").equals(id).delete();
    for (const o of await db.opportunities.toArray())
      if (o.contactIds.includes(id))
        await db.opportunities.update(o.id, {
          contactIds: o.contactIds.filter((v) => v !== id),
        });
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
    await db.organizations.delete(id);
    await event(db, `Deleted company · ${org.name}; related records preserved`);
  });
}
export const backupSchema = z.object({
  format: z.literal("pulse-backup"),
  version: z.union([z.literal(1), z.literal(2)]),
  metadata: z
    .object({
      appVersion: z.string(),
      exportedAt: z.string().datetime(),
      workspace: z.enum(["demo", "personal"]),
    })
    .optional(),
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
    version: 2,
    metadata: {
      appVersion: "0.3.0",
      exportedAt: new Date().toISOString(),
      workspace: db.workspace,
    },
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
  for (const o of b.opportunities)
    o.status =
      o.stageId === "Won" ? "won" : o.stageId === "Lost" ? "lost" : "open";
  const orgs = new Set(b.organizations.map((v) => v.id)),
    contacts = new Set(b.contacts.map((v) => v.id));
  for (const records of [
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
  return b;
}
export async function restoreBackup(db: PulseDB, input: unknown) {
  const b = validateBackup(input);
  await db.transaction("rw", db.tables, async () => {
    for (const key of [
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
  await saveOpportunity(db, {
    ...record,
    stageId: stage as Opportunity["stageId"],
  });
}

async function validateInteractionLinks(db: PulseDB, i: Interaction) {
  if (!i.contactId && !i.organizationId)
    throw new Error("Choose a person or company.");
  if (i.opportunityId && !(await db.opportunities.get(i.opportunityId)))
    throw new Error("Opportunity no longer exists.");
  if (i.followUpId && !(await db.tasks.get(i.followUpId)))
    throw new Error("Follow-up no longer exists.");
}
export async function updateInteraction(db: PulseDB, value: Interaction) {
  await db.transaction("rw", db.tables, async () => {
    const previous = await db.interactions.get(value.id);
    if (!previous) throw new Error("Interaction no longer exists.");
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
    await event(
      db,
      `${parsed.type} corrected`,
      parsed.contactId,
      parsed.organizationId,
    );
  });
}
export async function deleteInteraction(db: PulseDB, id: string) {
  await db.transaction("rw", [db.interactions, db.events], async () => {
    const i = await db.interactions.get(id);
    if (!i) return;
    await db.interactions.delete(id);
    await event(
      db,
      "Interaction deleted; linked tasks preserved",
      i.contactId,
      i.organizationId,
    );
  });
}
export async function reopenTask(db: PulseDB, id: string) {
  await db.transaction("rw", [db.tasks, db.events], async () => {
    const t = await db.tasks.get(id);
    if (!t?.completedAt) return;
    await db.tasks.update(id, {
      completedAt: null,
      updatedAt: new Date().toISOString(),
    });
    await event(
      db,
      `Follow-up reopened · ${t.title}`,
      t.contactId,
      t.organizationId,
    );
  });
}
export async function deleteTask(db: PulseDB, id: string) {
  await db.transaction(
    "rw",
    [db.tasks, db.interactions, db.events],
    async () => {
      const t = await db.tasks.get(id);
      if (!t) return;
      for (const i of await db.interactions.toArray())
        if (i.followUpId === id)
          await db.interactions.update(i.id, {
            followUpId: null,
            updatedAt: new Date().toISOString(),
          });
      await db.tasks.delete(id);
      await event(
        db,
        `Follow-up deleted · ${t.title}`,
        t.contactId,
        t.organizationId,
      );
    },
  );
}
export async function saveOpportunity(db: PulseDB, value: Opportunity) {
  const parsed = opportunitySchema.parse({
    ...value,
    status:
      value.stageId === "Won"
        ? "won"
        : value.stageId === "Lost"
          ? "lost"
          : "open",
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
  await db.transaction(
    "rw",
    [db.opportunities, db.contacts, db.organizations, db.settings, db.events],
    async () => {
      const config = await settings(db);
      if (parsed.pipelineId !== config.pipeline.id)
        throw new Error("Choose the configured pipeline.");
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
      if (previous) parsed.createdAt = previous.createdAt;
      await db.opportunities.put(parsed);
      await event(
        db,
        `Opportunity ${previous ? "updated" : "created"} · ${parsed.title} · ${parsed.stageId}`,
        null,
        parsed.organizationId,
      );
    },
  );
}
export async function deleteOpportunity(db: PulseDB, id: string) {
  await db.transaction(
    "rw",
    [db.opportunities, db.interactions, db.events, db.recommendationActions],
    async () => {
      const o = await db.opportunities.get(id);
      if (!o) return;
      for (const i of await db.interactions.toArray())
        if (i.opportunityId === id)
          await db.interactions.update(i.id, {
            opportunityId: null,
            updatedAt: new Date().toISOString(),
          });
      await db.recommendationActions.where("recordId").equals(id).delete();
      await db.opportunities.delete(id);
      await event(
        db,
        `Opportunity deleted · ${o.title}`,
        null,
        o.organizationId,
      );
    },
  );
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
  await db.transaction("rw", [db.smartLists, db.events], async () => {
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
