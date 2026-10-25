import type { PulseDB } from "./db";
import {
  contactSchema,
  organizationSchema,
  interactionSchema,
  importBatchSchema,
  stamp,
} from "./models";
import { sourceDigest, type ImportPlan } from "../services/csv-import";
export async function commitImport(db: PulseDB, plan: ImportPlan) {
  const contacts = plan.contacts.map((c) => contactSchema.parse(c)),
    organizations = plan.organizations.map((o) => organizationSchema.parse(o)),
    notes = plan.notes.map((i) => interactionSchema.parse(i)),
    batch = importBatchSchema.parse(plan.batch);
  if (contacts.length > 2000 || organizations.length > 2000)
    throw new Error("Import is too large.");
  if (
    new Set(contacts.map((c) => c.id)).size !== contacts.length ||
    new Set(organizations.map((o) => o.id)).size !== organizations.length
  )
    throw new Error("Duplicate identifiers in import.");
  await db.transaction("rw", db.tables, async () => {
    const currentContacts = await db.contacts.toArray(),
      currentOrgs = await db.organizations.toArray();
    if (sourceDigest(currentContacts, currentOrgs) !== plan.sourceDigest)
      throw new Error(
        "Workspace changed after preview. Validate the import again before applying it.",
      );
    if (await db.importBatches.get(batch.id))
      throw new Error("This import has already been applied.");
    const orgIds = new Set([
        ...currentOrgs.map((o) => o.id),
        ...organizations.map((o) => o.id),
      ]),
      contactIds = new Set([
        ...currentContacts.map((c) => c.id),
        ...contacts.map((c) => c.id),
      ]);
    for (const c of contacts)
      if (c.organizationId && !orgIds.has(c.organizationId))
        throw new Error("Missing company in import.");
    for (const i of notes)
      if (
        !i.contactId ||
        !contactIds.has(i.contactId) ||
        (i.organizationId && !orgIds.has(i.organizationId))
      )
        throw new Error("Missing imported note reference.");
    // Imports cannot modify communication restrictions or permission records.
    for (const c of contacts) {
      const old = currentContacts.find((v) => v.id === c.id);
      if (
        old &&
        (c.availability !== old.availability ||
          c.timeoutUntil !== old.timeoutUntil ||
          c.createdAt !== old.createdAt)
      )
        throw new Error(
          "Import cannot alter contact restrictions or identity timestamps.",
        );
    }
    const countNew = contacts.filter(
        (c) => !currentContacts.some((old) => old.id === c.id),
      ).length,
      newOrgs = organizations.filter(
        (o) => !currentOrgs.some((old) => old.id === o.id),
      ).length;
    if (
      countNew !== batch.createdContacts ||
      contacts.length - countNew !== batch.updatedContacts ||
      newOrgs !== batch.createdOrganizations ||
      organizations.length - newOrgs !== batch.updatedOrganizations
    )
      throw new Error("Import summary does not match the planned writes.");
    await db.organizations.bulkPut(organizations);
    await db.contacts.bulkPut(contacts);
    await db.interactions.bulkAdd(notes);
    await db.importBatches.add(batch);
    await db.events.add({
      ...stamp(),
      category: "import",
      contactId: null,
      organizationId: null,
      summary: `CSV import completed · ${batch.createdContacts} people created · ${batch.updatedContacts} updated`,
    });
  });
  return batch;
}
