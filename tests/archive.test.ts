import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it } from "vitest";
import { PulseDB } from "../src/data/db";
import {
  exportBackup,
  restoreBackup,
  saveContact,
  saveOrganization,
  setArchiveStatus,
} from "../src/data/repository";

let db: PulseDB;
beforeEach(async () => {
  db = new PulseDB("personal");
  await db.delete();
  await db.open();
  await restoreBackup(
    db,
    JSON.parse(readFileSync("tests/fixtures/backup-v2.json", "utf8")),
  );
});
afterEach(async () => {
  await db.delete();
});

it("archives and restores people and companies without changing linked records", async () => {
  const before = await exportBackup(db);
  const contact = before.contacts.find((c) => c.organizationId)!;
  const company = before.organizations.find(
    (o) => o.id === contact.organizationId,
  )!;
  expect(contact).toBeTruthy();
  expect(company).toBeTruthy();
  await setArchiveStatus(db, "contact", contact.id, contact.updatedAt, true);
  await setArchiveStatus(
    db,
    "organization",
    company.id,
    company.updatedAt,
    true,
  );
  const archived = await exportBackup(db);
  expect(
    archived.contacts.find((c) => c.id === contact.id)?.archivedAt,
  ).toBeTruthy();
  expect(
    archived.organizations.find((o) => o.id === company.id)?.archivedAt,
  ).toBeTruthy();
  for (const table of db.tables) {
    if (!["contacts", "organizations", "events"].includes(table.name)) {
      const key = table.name as keyof typeof before;
      expect(archived[key], table.name).toEqual(before[key]);
    }
  }
  expect(archived.events).toHaveLength(before.events.length + 2);
  expect(
    archived.contacts.find((c) => c.id === contact.id)?.organizationId,
  ).toBe(company.id);
  await setArchiveStatus(
    db,
    "contact",
    contact.id,
    archived.contacts.find((c) => c.id === contact.id)!.updatedAt,
    false,
  );
  await setArchiveStatus(
    db,
    "organization",
    company.id,
    archived.organizations.find((o) => o.id === company.id)!.updatedAt,
    false,
  );
  expect((await db.contacts.get(contact.id))?.archivedAt).toBeNull();
  expect((await db.organizations.get(company.id))?.archivedAt).toBeNull();
  expect(await db.events.count()).toBe(before.events.length + 4);
});

it("rejects stale edits and archive actions and cannot unarchive through a normal save", async () => {
  const contact = (await db.contacts.toArray())[0];
  const org = (await db.organizations.toArray())[0];
  await setArchiveStatus(db, "contact", contact.id, contact.updatedAt, true);
  await setArchiveStatus(db, "organization", org.id, org.updatedAt, true);
  await expect(
    saveContact(db, { ...contact, name: "Stale" }, contact.updatedAt),
  ).rejects.toThrow(/changed or was deleted/);
  await expect(
    setArchiveStatus(db, "organization", org.id, org.updatedAt, false),
  ).rejects.toThrow(/changed or was deleted/);
  const current = (await db.contacts.get(contact.id))!;
  await saveContact(
    db,
    { ...current, archivedAt: null, name: "Edited" },
    current.updatedAt,
  );
  expect((await db.contacts.get(contact.id))?.archivedAt).toBe(
    current.archivedAt,
  );
  const currentOrg = (await db.organizations.get(org.id))!;
  await saveOrganization(
    db,
    { ...currentOrg, archivedAt: null, name: "Edited company" },
    currentOrg.updatedAt,
  );
  expect((await db.organizations.get(org.id))?.archivedAt).toBe(
    currentOrg.archivedAt,
  );
});

it("rolls back an archive when its activity event cannot be saved", async () => {
  const contact = (await db.contacts.toArray())[0];
  const events = await db.events.toArray();
  const fail = () => {
    throw new Error("Storage is full");
  };
  db.events.hook("creating", fail);
  try {
    await expect(
      setArchiveStatus(db, "contact", contact.id, contact.updatedAt, true),
    ).rejects.toThrow("Storage is full");
    expect(await db.contacts.get(contact.id)).toEqual(contact);
    expect(await db.events.toArray()).toEqual(events);
  } finally {
    db.events.hook("creating").unsubscribe(fail);
  }
});

it("roundtrips archive status in v7 and restores v6 records as active", async () => {
  const contact = (await db.contacts.toArray())[0];
  const org = (await db.organizations.toArray())[0];
  await setArchiveStatus(db, "contact", contact.id, contact.updatedAt, true);
  await setArchiveStatus(db, "organization", org.id, org.updatedAt, true);
  const backup = await exportBackup(db);
  expect(backup.version).toBe(7);
  await restoreBackup(db, backup);
  expect((await db.contacts.get(contact.id))?.archivedAt).toBeTruthy();
  expect((await db.organizations.get(org.id))?.archivedAt).toBeTruthy();
  const legacy = {
    ...backup,
    version: 6,
    contacts: backup.contacts.map((record) => {
      const copy: Partial<typeof record> = { ...record };
      delete copy.archivedAt;
      return copy;
    }),
    organizations: backup.organizations.map((record) => {
      const copy: Partial<typeof record> = { ...record };
      delete copy.archivedAt;
      return copy;
    }),
  };
  await restoreBackup(db, legacy);
  expect((await db.contacts.get(contact.id))?.archivedAt).toBeNull();
  expect((await db.organizations.get(org.id))?.archivedAt).toBeNull();
});

it("rejects missing or invalid v7 archive state without replacing the workspace", async () => {
  const before = await exportBackup(db);
  const withoutArchive: Partial<(typeof before.contacts)[number]> = { ...before.contacts[0] };
  delete withoutArchive.archivedAt;
  for (const bad of [
    withoutArchive,
    { ...before.contacts[0], archivedAt: "not a date" },
  ]) {
    await expect(
      restoreBackup(db, {
        ...before,
        contacts: [bad, ...before.contacts.slice(1)],
      }),
    ).rejects.toThrow();
    expect(await db.contacts.toArray()).toEqual(before.contacts);
    expect(await db.events.toArray()).toEqual(before.events);
  }
});

it("keeps archive changes isolated to the selected workspace", async () => {
  const demo = new PulseDB("demo");
  await demo.delete();
  await demo.open();
  try {
    await restoreBackup(
      demo,
      JSON.parse(readFileSync("tests/fixtures/backup-v2.json", "utf8")),
    );
    const personalContact = (await db.contacts.toArray())[0];
    await setArchiveStatus(
      db,
      "contact",
      personalContact.id,
      personalContact.updatedAt,
      true,
    );
    expect(
      (await demo.contacts.get(personalContact.id))?.archivedAt,
    ).toBeNull();
  } finally {
    await demo.delete();
  }
});
