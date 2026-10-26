import { beforeEach, afterEach, it, expect, vi } from "vitest";
import Dexie from "dexie";
import { PulseDB } from "../src/data/db";
import {
  defaults,
  stamp,
  type Contact,
  type Task,
  type Interaction,
  type Opportunity,
} from "../src/data/models";
import { initialize, resetWorkspace } from "../src/data/seed";
import {
  saveContact,
  saveTask,
  completeTask,
  reopenTask,
  deleteTask,
  saveOpportunity,
  moveOpportunity,
  deleteOpportunity,
  addInteraction,
  updateInteraction,
  deleteInteraction,
  updateSettings,
  exportBackup,
  restoreBackup,
  validateBackup,
  deleteContact,
  savePermission,
} from "../src/data/repository";
import { ensureDailyQuests } from "../src/data/progress-repository";
import { calendarDay, weekOf, deriveProgress } from "../src/services/progress";
import {
  parseCsv,
  suggestMapping,
  inspectCsv,
  buildImportPlan,
} from "../src/services/csv-import";
import { commitImport } from "../src/data/import-repository";
import type { Reward } from "../src/data/progress-models";
let db: PulseDB, c: Contact;
const task = (title = "Review the planned proposal"): Task => ({
  ...stamp(),
  title,
  description: "Discuss the next agreed steps",
  contactId: c.id,
  organizationId: null,
  dueAt: new Date().toISOString(),
  completedAt: null,
  priority: "Normal",
  reminderMinutes: 60,
});
const interaction = (
  summary = "Discussed the partnership timeline and agreed on the next review meeting.",
): Interaction => ({
  ...stamp(),
  contactId: c.id,
  organizationId: null,
  type: "Meeting",
  occurredAt: new Date().toISOString(),
  summary,
  outcome: "Agreed on next steps",
  opportunityId: null,
  followUpId: null,
});
const opportunity = (): Opportunity => ({
  ...stamp(),
  title: "Fictional partnership",
  organizationId: null,
  contactIds: [c.id],
  pipelineId: "default",
  stageId: "Proposal",
  value: 500,
  currency: "USD",
  status: "open",
  probability: null,
  expectedCloseAt: null,
  notes: "Budget reviewed and agreed on the final decision.",
});
async function progress() {
  return deriveProgress(
    await db.rewards.toArray(),
    await db.dailyQuests.toArray(),
    (await db.progressState.get("progress")) || null,
    (await db.settings.get("settings"))!.progress.weeklyGoal,
  );
}
async function enable() {
  await updateSettings(db, {
    progress: { ...defaults.progress, enabled: true },
  });
}
beforeEach(async () => {
  vi.useRealTimers();
  db = new PulseDB("personal");
  await db.delete();
  await db.open();
  await initialize(db);
  await enable();
  c = {
    ...stamp(),
    name: "Fictional Example",
    preferredName: "",
    role: "Director",
    organizationId: null,
    emails: ["fictional@example.com"],
    phones: [],
    links: [],
    avatar: "",
    category: "Prospect",
    stage: "Engaged",
    availability: "Available",
    timeoutUntil: null,
    priority: "Normal",
    tags: [],
    nextFollowUp: null,
  };
  await saveContact(db, c);
});
afterEach(async () => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  await db.delete();
});
it("grants exactly one entitlement under repeated and concurrent completion", async () => {
  const t = task();
  await saveTask(db, t);
  await Promise.all([completeTask(db, t.id), completeTask(db, t.id)]);
  await completeTask(db, t.id);
  expect((await progress()).xp).toBe(5);
  expect(await db.rewards.count()).toBe(1);
  expect(await db.rewardChanges.count()).toBe(1);
  expect(
    (await db.events.toArray()).find((e) => e.action === "completed"),
  ).toMatchObject({
    entityType: "task",
    entityId: t.id,
    workspace: "personal",
  });
});
it("reverses reopening and restores original date without creating a second milestone", async () => {
  const t = task();
  await saveTask(db, t);
  await completeTask(db, t.id);
  const r = (await db.rewards.toArray())[0];
  await reopenTask(db, t.id);
  expect((await progress()).xp).toBe(0);
  expect((await progress()).achievements[0].unlocked).toBe(false);
  await completeTask(db, t.id);
  expect((await progress()).xp).toBe(5);
  expect((await db.rewards.get(r.id))!.earnedAt).toBe(r.earnedAt);
  expect(
    (await db.rewardChanges.toArray()).map((x) => x.action).sort(),
  ).toEqual(["granted", "restored", "reversed"]);
});
it("rejects injected completion on task save; ordinary edits do not grant", async () => {
  const t = task();
  await saveTask(db, { ...t, completedAt: new Date().toISOString() });
  expect((await db.tasks.get(t.id))!.completedAt).toBeNull();
  await saveTask(db, { ...t, title: "An edited meaningful follow-up" });
  expect(await db.rewards.count()).toBe(0);
});
it("source correction and deletion recalculate totals and preserve correction tombstones", async () => {
  const t = task();
  await saveTask(db, t);
  await completeTask(db, t.id);
  await saveTask(db, {
    ...(await db.tasks.get(t.id))!,
    title: "x",
    description: "",
  });
  expect((await progress()).xp).toBe(0);
  await saveTask(db, {
    ...(await db.tasks.get(t.id))!,
    title: t.title,
    description: t.description,
  });
  expect((await progress()).xp).toBe(5);
  await deleteTask(db, t.id);
  expect((await progress()).xp).toBe(0);
  expect((await db.rewards.toArray())[0]).toMatchObject({
    active: false,
    deleted: true,
  });
  validateBackup(await exportBackup(db));
});
it("same-day equivalent task recreation cannot farm XP, even after deletion", async () => {
  let t = task();
  await saveTask(db, t);
  await completeTask(db, t.id);
  await deleteTask(db, t.id);
  t = task();
  await saveTask(db, t);
  await completeTask(db, t.id);
  expect((await progress()).xp).toBe(0);
  expect(await db.rewards.count()).toBe(1);
});
it("caps original grants at ten per day while preserving all CRM work", async () => {
  for (let i = 0; i < 12; i++) {
    const t = task(`Discuss deliverable number ${i}`);
    await saveTask(db, t);
    await completeTask(db, t.id);
  }
  expect((await progress()).xp).toBe(50);
  expect(await db.tasks.count()).toBe(12);
});
it("records substantive current conversations, with no duplicate, empty, note or historical reward", async () => {
  const i = interaction();
  await addInteraction(db, i);
  await addInteraction(db, interaction());
  await addInteraction(db, { ...interaction(), summary: "Short" });
  await addInteraction(db, {
    ...interaction(
      "A useful written note that is longer than forty characters for this test.",
    ),
    type: "Note",
  });
  await addInteraction(db, {
    ...interaction(
      "An accurate historical meeting about a separately recorded business subject.",
    ),
    occurredAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  });
  expect((await progress()).xp).toBe(10);
  expect(await db.interactions.count()).toBe(5);
});
it("conversation edits and deletion correct rewards without additional XP", async () => {
  const i = interaction();
  await addInteraction(db, i);
  await updateInteraction(db, { ...i, type: "Note" });
  expect((await progress()).xp).toBe(0);
  await updateInteraction(db, { ...i, outcome: "Corrected" });
  expect((await progress()).xp).toBe(10);
  await deleteInteraction(db, i.id);
  expect((await progress()).xp).toBe(0);
});
it("outcome toggles reverse and restore one opportunity entitlement", async () => {
  const o = opportunity();
  await saveOpportunity(db, o);
  await moveOpportunity(db, o.id, "Won");
  expect((await progress()).xp).toBe(5);
  await moveOpportunity(db, o.id, "Proposal");
  expect((await progress()).xp).toBe(0);
  await moveOpportunity(db, o.id, "Lost");
  expect((await progress()).xp).toBe(5);
  await moveOpportunity(db, o.id, "Won");
  expect(await db.rewards.count()).toBe(1);
  await deleteOpportunity(db, o.id);
  expect((await progress()).xp).toBe(0);
});
it("outcomes without notes or associated people do not earn", async () => {
  const o = opportunity();
  await saveOpportunity(db, { ...o, notes: "" });
  await moveOpportunity(db, o.id, "Won");
  expect(await db.rewards.count()).toBe(0);
});
it.each(["Do not contact", "On hold", "Temporarily unavailable"] as const)(
  "%s suppresses rewards without blocking records or tasks",
  async (availability) => {
    await saveContact(db, { ...c, availability });
    const t = task();
    await saveTask(db, t);
    await completeTask(db, t.id);
    await addInteraction(db, interaction());
    const o = opportunity();
    await saveOpportunity(db, o);
    await moveOpportunity(db, o.id, "Won");
    expect(await db.rewards.count()).toBe(0);
    expect((await db.tasks.get(t.id))!.completedAt).toBeTruthy();
    await ensureDailyQuests(db);
    expect(await db.dailyQuests.count()).toBe(0);
  },
);
it("relationship permission withdrawal remains authoritative; marketing is a separate purpose", async () => {
  await savePermission(db, {
    ...stamp(),
    contactId: c.id,
    channel: "All",
    purpose: "Relationship",
    status: "Withdrawn",
    evidence: "Explicit instruction",
    withdrawnAt: new Date().toISOString(),
  });
  const t = task();
  await saveTask(db, t);
  await completeTask(db, t.id);
  expect(await db.rewards.count()).toBe(0);
});
it("disabled earning preserves old history and source corrections, widgets do not pause earning", async () => {
  const t = task();
  await saveTask(db, t);
  await completeTask(db, t.id);
  await updateSettings(db, {
    gamification: false,
    progress: { ...defaults.progress, enabled: false },
  });
  const next = task("Review another future agreement");
  await saveTask(db, next);
  await completeTask(db, next.id);
  expect((await progress()).xp).toBe(5);
  await reopenTask(db, t.id);
  expect((await progress()).xp).toBe(0);
  await completeTask(db, t.id);
  expect((await progress()).xp).toBe(5);
  await enable();
  await completeTask(db, next.id);
  expect((await progress()).xp).toBe(5);
});
it("rolls back CRM completion and reward if the audit insert fails; retry earns once", async () => {
  const t = task();
  await saveTask(db, t);
  const mock = vi
    .spyOn(db.rewardChanges, "add")
    .mockRejectedValueOnce(new Error("Storage failure"));
  await expect(completeTask(db, t.id)).rejects.toThrow("Storage failure");
  expect((await db.tasks.get(t.id))!.completedAt).toBeNull();
  expect(await db.rewards.count()).toBe(0);
  mock.mockRestore();
  await completeTask(db, t.id);
  expect((await progress()).xp).toBe(5);
});
it("deleting a contact reverses dependent rewards without removing unrelated entitlements", async () => {
  const t = task();
  await saveTask(db, t);
  await completeTask(db, t.id);
  const i = interaction();
  await addInteraction(db, i);
  await deleteContact(db, c.id);
  expect((await progress()).xp).toBe(0);
  expect(await db.rewards.count()).toBe(2);
  validateBackup(await exportBackup(db));
});
it("quests persist stable task references and completing/reopening changes their actual progress", async () => {
  const t = task();
  await saveTask(db, t);
  await ensureDailyQuests(db);
  const q = await db.dailyQuests.toArray();
  expect(q).toHaveLength(1);
  await ensureDailyQuests(db);
  expect(await db.dailyQuests.toArray()).toEqual(q);
  await completeTask(db, t.id);
  expect((await progress()).quests[0].complete).toBe(true);
  await reopenTask(db, t.id);
  expect((await progress()).quests[0].complete).toBe(false);
});
it("empty or restricted workspaces have no invented quests; no more than three are saved", async () => {
  await ensureDailyQuests(db);
  expect(await db.dailyQuests.count()).toBe(0);
  for (let i = 0; i < 5; i++)
    await saveTask(db, task(`A meaningful follow-up ${i}`));
  await ensureDailyQuests(db);
  expect(await db.dailyQuests.count()).toBe(3);
});
it("weekly target changes recalculate achievement but do not issue bonuses", async () => {
  const t = task();
  await saveTask(db, t);
  await completeTask(db, t.id);
  await updateSettings(db, {
    progress: { ...defaults.progress, enabled: true, weeklyGoal: 1 },
  });
  expect((await progress()).achievements.at(-1)!.unlocked).toBe(true);
  await updateSettings(db, {
    progress: { ...defaults.progress, enabled: true, weeklyGoal: 3 },
  });
  expect((await progress()).achievements.at(-1)!.unlocked).toBe(false);
  expect((await progress()).xp).toBe(5);
  expect(await db.rewards.count()).toBe(1);
});
it("calendar days and Monday weeks handle timezone and DST without 24-hour assumptions", () => {
  expect(calendarDay("2026-03-08T04:30:00Z", "America/New_York")).toBe(
    "2026-03-07",
  );
  expect(calendarDay("2026-03-08T07:30:00Z", "America/New_York")).toBe(
    "2026-03-08",
  );
  expect(calendarDay("2026-11-01T05:30:00Z", "America/New_York")).toBe(
    calendarDay("2026-11-01T06:30:00Z", "America/New_York"),
  );
  expect(weekOf("2026-03-08")).toBe("2026-03-02");
});
it("changing display timezone leaves original progress calendar and entitlements fixed", async () => {
  const state = (await db.progressState.get("progress"))!;
  const t = task();
  await saveTask(db, t);
  await completeTask(db, t.id);
  await updateSettings(db, { timezone: "Pacific/Auckland" });
  await reopenTask(db, t.id);
  await completeTask(db, t.id);
  expect(await db.progressState.get("progress")).toEqual(state);
  expect(await db.rewards.count()).toBe(1);
  expect((await db.rewards.toArray())[0].timezone).toBe(state.timezone);
});
it("current backups roundtrip ledger and quests without replaying awards", async () => {
  const t = task();
  await saveTask(db, t);
  await ensureDailyQuests(db);
  await completeTask(db, t.id);
  const b = await exportBackup(db);
  expect(b.version).toBe(5);
  await restoreBackup(db, b);
  await ensureDailyQuests(db);
  await completeTask(db, t.id);
  expect((await progress()).xp).toBe(5);
  expect(await db.rewardChanges.count()).toBe(1);
  expect(await db.dailyQuests.count()).toBe(1);
});
it.each([1, 2] as const)(
  "compatible v%s backup restores empty progress with no retroactive XP",
  async (version) => {
    const b = await exportBackup(db);
    const old = {
      ...b,
      version,
      rewards: undefined,
      rewardChanges: undefined,
      progressState: undefined,
      dailyQuests: undefined,
      settings: [{ ...b.settings[0], progress: undefined }],
    };
    await restoreBackup(db, old);
    expect(await db.rewards.count()).toBe(0);
    expect((await db.settings.get("settings"))!.progress.enabled).toBe(false);
    expect(await db.contacts.count()).toBe(1);
  },
);
it("malformed ledger and missing references reject before any replacement", async () => {
  const t = task();
  await saveTask(db, t);
  await completeTask(db, t.id);
  const b = await exportBackup(db);
  for (const reward of [
    { ...b.rewards[0], xp: 999 },
    { ...b.rewards[0], sourceId: "missing", id: "task:missing" },
    { ...b.rewards[0], day: "2026-02-30" },
  ])
    await expect(
      restoreBackup(db, { ...b, rewards: [reward] }),
    ).rejects.toThrow();
  expect((await progress()).xp).toBe(5);
  expect(await db.tasks.count()).toBe(1);
});
it("CSV import and repeat restore do not create reward events", async () => {
  const csv = parseCsv(
      "Name,Email,Company\nImported Example,imported@example.com,Fictional Company",
    ),
    map = suggestMapping(csv.headers),
    inspected = inspectCsv(csv, map, [], []);
  const plan = buildImportPlan(
    inspected,
    await db.contacts.toArray(),
    [],
    [],
    "test.csv",
  );
  await commitImport(db, plan);
  expect(await db.rewards.count()).toBe(0);
  const b = await exportBackup(db);
  await restoreBackup(db, b);
  expect(await db.rewards.count()).toBe(0);
});
it("demo reset preserves personal ledger and does not seed progress", async () => {
  const t = task();
  await saveTask(db, t);
  await completeTask(db, t.id);
  const demo = new PulseDB("demo");
  await demo.delete();
  await demo.open();
  await resetWorkspace(demo);
  expect(await demo.rewards.count()).toBe(0);
  expect((await progress()).xp).toBe(5);
  await demo.delete();
});
it("upgrades a real v2 database without replaying historical task completions", async () => {
  await db.delete();
  const old = new Dexie("pulse-personal");
  old.version(2).stores({
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
    smartLists: "id,name",
    recommendationActions: "id,key,recordId",
    importBatches: "id,createdAt",
  });
  await old.open();
  await old.table("contacts").add(c);
  await old.table("settings").put({ ...defaults, progress: undefined });
  await old
    .table("tasks")
    .add({ ...task(), completedAt: new Date().toISOString() });
  old.close();
  await db.open();
  expect(db.verno).toBe(5);
  expect(await db.contacts.count()).toBe(1);
  expect(await db.tasks.count()).toBe(1);
  expect(await db.rewards.count()).toBe(0);
  expect((await db.settings.get("settings"))!.progress.enabled).toBe(false);
});
it("derives levels, streaks and goals over a 10000-entry synthetic history", () => {
  const rewards: Reward[] = Array.from({ length: 10000 }, (_, i) => ({
    id: `task:${i}`,
    sourceType: "task",
    sourceId: String(i),
    rule: "follow-up",
    xp: 5,
    earnedAt: "2026-10-25T12:00:00Z",
    day: i % 2 ? "2026-10-24" : "2026-10-25",
    week: "2026-10-19",
    timezone: "UTC",
    fingerprint: String(i),
    active: true,
    deleted: false,
    updatedAt: "2026-10-25T12:00:00Z",
  }));
  const v = deriveProgress(
    rewards,
    [],
    { id: "progress", startedAt: "2026-01-01T00:00:00Z", timezone: "UTC" },
    5,
    Date.parse("2026-10-25T18:00:00Z"),
  );
  expect(v.xp).toBe(50000);
  expect(v.level).toBe(501);
  expect(v.streak).toBe(2);
  expect(v.longest).toBe(2);
});

it("recompletion on a later day cannot move streak evidence or create an impossible quest", async () => {
  const t = task();
  await saveTask(db, t);
  await completeTask(db, t.id);
  const original = (await db.rewards.toArray())[0];
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(Date.parse(original.earnedAt) + 2 * 86400000);
  await reopenTask(db, t.id);
  await ensureDailyQuests(db);
  expect((await progress()).quests).toHaveLength(0);
  await completeTask(db, t.id);
  expect((await db.rewards.toArray())[0].day).toBe(original.day);
  expect((await progress()).streak).toBe(0);
});
it("failed restore rolls back replacement of ledger and all CRM tables", async () => {
  const t = task();
  await saveTask(db, t);
  await completeTask(db, t.id);
  const b = await exportBackup(db);
  const fail = () => {
    throw new Error("Restore storage failure");
  };
  db.contacts.hook("creating", fail);
  try {
    await expect(
      restoreBackup(db, {
        ...b,
        contacts: b.contacts.map((c) => ({ ...c, name: "A replacement name" })),
      }),
    ).rejects.toThrow("Restore storage failure");
  } finally {
    db.contacts.hook("creating").unsubscribe(fail);
  }
  expect((await db.contacts.get(c.id))!.name).toBe(c.name);
  expect((await progress()).xp).toBe(5);
  expect(await db.rewardChanges.count()).toBe(1);
});
it("rejects incoherent active ledger history even when source IDs exist", async () => {
  const t = task();
  await saveTask(db, t);
  await completeTask(db, t.id);
  const b = await exportBackup(db);
  expect(() => validateBackup({ ...b, rewardChanges: [] })).toThrow(
    "Invalid reward correction history",
  );
  expect(() =>
    validateBackup({
      ...b,
      tasks: b.tasks.map((t) => ({ ...t, completedAt: null })),
    }),
  ).toThrow("Active reward source no longer qualifies");
});
it("turning quests off prevents new definitions while retaining existing history", async () => {
  const t = task();
  await saveTask(db, t);
  await updateSettings(db, {
    progress: { ...defaults.progress, enabled: true, quests: false },
  });
  await ensureDailyQuests(db);
  expect(await db.dailyQuests.count()).toBe(0);
  await enable();
  await ensureDailyQuests(db);
  expect(await db.dailyQuests.count()).toBe(1);
  await updateSettings(db, {
    progress: { ...defaults.progress, enabled: true, quests: false },
  });
  await ensureDailyQuests(db);
  expect(await db.dailyQuests.count()).toBe(1);
});

it("deleted-source signatures also block equivalent recreation on a later day", async () => {
  const t = task();
  await saveTask(db, t);
  await completeTask(db, t.id);
  await deleteTask(db, t.id);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(Date.now() + 2 * 86400000);
  const next = task();
  await saveTask(db, next);
  await ensureDailyQuests(db);
  expect((await progress()).quests).toHaveLength(0);
  await completeTask(db, next.id);
  expect((await progress()).xp).toBe(0);
  expect(await db.rewards.count()).toBe(1);
});
it("daily quests do not offer duplicate-content tasks or new awards after the cap", async () => {
  for (let i = 0; i < 2; i++) await saveTask(db, task());
  await ensureDailyQuests(db);
  expect(await db.dailyQuests.count()).toBe(1);
});
