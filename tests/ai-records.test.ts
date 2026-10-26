import { beforeEach, afterEach, it, expect } from "vitest";
import { PulseDB } from "../src/data/db";
import { initialize } from "../src/data/seed";
import { defaults, stamp } from "../src/data/models";
import {
  updateSettings,
  exportBackup,
  restoreBackup,
} from "../src/data/repository";
import { acceptAITask, saveAINote } from "../src/data/ai-repository";
let db: PulseDB;
beforeEach(async () => {
  db = new PulseDB("personal");
  await db.delete();
  await db.open();
  await initialize(db);
  await updateSettings(db, { ai: { ...defaults.ai, enabled: true } });
});
afterEach(async () => {
  await db.delete();
});
it("reviewed AI task acceptance is idempotent, validated and creates no XP", async () => {
  const proposal = {
    title: "Prepare the discussed proposal",
    description: "Reviewed by the user",
    dueAt: "2027-01-01T12:00:00.000Z",
    contactId: null,
    organizationId: null,
  };
  const ids = await Promise.all([
    acceptAITask(db, proposal),
    acceptAITask(db, proposal),
  ]);
  expect(ids[0]).toBe(ids[1]);
  expect(await db.tasks.count()).toBe(1);
  expect(await db.rewards.count()).toBe(0);
  await expect(
    acceptAITask(db, { ...proposal, contactId: "missing" }),
  ).rejects.toThrow();
  expect(await db.tasks.count()).toBe(1);
});
it("AI notes are explicitly labeled and never count as meaningful contact or XP", async () => {
  await db.organizations.add({
    ...stamp(),
    id: "company",
    name: "Fictional Company",
    industry: "",
    website: "",
    description: "",
    avatar: "",
    location: "",
    tags: [],
    customFields: {},
  });
  await saveAINote(
    db,
    null,
    "company",
    "A reviewed AI summary for this company.",
  );
  const note = (await db.interactions.toArray())[0];
  expect(note.type).toBe("Note");
  expect(note.source).toContain("PULSE AI");
  expect(await db.rewards.count()).toBe(0);
});
it("AI preference defaults preserve old backup compatibility and isolate workspaces", async () => {
  const b = await exportBackup(db);
  await restoreBackup(db, {
    ...b,
    settings: b.settings.map((s) => ({ ...s, ai: undefined })),
  });
  expect((await db.settings.get("settings"))!.ai.enabled).toBe(false);
  const demo = new PulseDB("demo");
  await demo.delete();
  await demo.open();
  await initialize(demo);
  expect((await demo.settings.get("settings"))!.ai.enabled).toBe(false);
  expect(await demo.tasks.count()).toBeGreaterThan(0);
  expect(await db.tasks.count()).toBe(0);
  await demo.delete();
});
it("disabling AI prevents saving generated proposals", async () => {
  await updateSettings(db, { ai: { ...defaults.ai, enabled: false } });
  await expect(
    acceptAITask(db, {
      title: "A proposal",
      description: "",
      dueAt: "2027-01-01T00:00:00.000Z",
      contactId: null,
      organizationId: null,
    }),
  ).rejects.toThrow("disabled");
  expect(await db.tasks.count()).toBe(0);
});
it("failed reviewed-task audit storage leaves no partial task", async () => {
  const fail = () => {
    throw new Error("Synthetic audit storage failure");
  };
  db.events.hook("creating", fail);
  try {
    await expect(
      acceptAITask(db, {
        title: "Prepare the discussed proposal",
        description: "Reviewed by the user",
        dueAt: "2027-01-01T12:00:00.000Z",
        contactId: null,
        organizationId: null,
      }),
    ).rejects.toThrow("Synthetic audit storage failure");
    expect(await db.tasks.count()).toBe(0);
    expect(await db.rewards.count()).toBe(0);
  } finally {
    db.events.hook("creating").unsubscribe(fail);
  }
});
