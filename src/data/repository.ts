import { z } from "zod";
import { type PulseDB } from "./db";
import {
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
} from "./models";
export async function settings(db: PulseDB) {
  return (await db.settings.get("settings")) || defaults;
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
      await db.contacts.put(parsed);
      const restrictionId = `profile-${parsed.id}`;
      if (parsed.availability === "Available")
        await db.restrictions.delete(restrictionId);
      if (parsed.availability !== "Available")
        await db.restrictions.put({
          ...stamp(),
          id: restrictionId,
          contactId: parsed.id,
          type: parsed.availability,
          startAt: null,
          endAt:
            parsed.availability === "Temporarily unavailable"
              ? parsed.timeoutUntil
              : null,
          reason: "Set in profile",
          source: "User",
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
    [db.interactions, db.contacts, db.organizations, db.events],
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
      await db.interactions.add(parsed);
      await event(
        db,
        `${parsed.type} logged · ${parsed.summary.slice(0, 90)}`,
        parsed.contactId,
        parsed.organizationId,
      );
    },
  );
}
export async function saveTask(db: PulseDB, value: Task) {
  const parsed = taskSchema.parse(value);
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
      if (
        parsed.organizationId &&
        !(await db.organizations.get(parsed.organizationId))
      )
        throw new Error("Company no longer exists.");
      await db.tasks.put(parsed);
      await event(
        db,
        `Follow-up planned · ${parsed.title}`,
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
  version: z.literal(1),
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
    version: 1,
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
export async function restoreBackup(db: PulseDB, input: unknown) {
  const b = backupSchema.parse(input);
  const orgs = new Set(b.organizations.map((v) => v.id)),
    contacts = new Set(b.contacts.map((v) => v.id));
  for (const records of [
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
  const opportunities = new Set(b.opportunities.map((o) => o.id)),
    tasks = new Set(b.tasks.map((t) => t.id));
  for (const i of b.interactions) {
    if (i.opportunityId && !opportunities.has(i.opportunityId))
      throw new Error("Missing opportunity reference.");
    if (i.followUpId && !tasks.has(i.followUpId))
      throw new Error("Missing follow-up reference.");
  }
  await db.transaction("rw", db.tables, async () => {
    for (const key of [
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
  const parsed = opportunitySchema.parse({
    ...record,
    stageId: stage,
    status: stage === "Won" ? "won" : stage === "Lost" ? "lost" : "open",
    updatedAt: new Date().toISOString(),
  });
  await db.transaction("rw", [db.opportunities, db.events], async () => {
    await db.opportunities.put(parsed);
    await event(
      db,
      `${record.title} moved to ${stage}`,
      null,
      record.organizationId,
    );
  });
}
