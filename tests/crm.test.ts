import { afterEach, beforeEach, describe, it, expect } from "vitest";
import { PulseDB } from "../src/data/db";
import { initialize, resetWorkspace } from "../src/data/seed";
import {
  saveOrganization,
  saveContact,
  addInteraction,
  saveTask,
  completeTask,
  deleteOrganization,
  deleteContact,
  updateSettings,
  settings,
  exportBackup,
  restoreBackup,
} from "../src/data/repository";
import {
  eligible,
  recommendations,
  overdue,
  lastInteraction,
} from "../src/services/recommendations";
import {
  stamp,
  defaults,
  type Contact,
  type Organization,
  type Task,
} from "../src/data/models";
let db: PulseDB;
const company = (): Organization => ({
  ...stamp(),
  name: "Test Company",
  industry: "Design",
  location: "Test",
  website: "",
  description: "",
  tags: [],
  avatar: "",
  customFields: {},
});
const person = (organizationId: string | null = null): Contact => ({
  ...stamp(),
  name: "Test Person",
  preferredName: "Test",
  role: "Founder",
  organizationId,
  emails: ["test@example.com"],
  phones: [],
  links: [],
  avatar: "",
  category: "Prospect",
  stage: "New",
  availability: "Available",
  timeoutUntil: null,
  priority: "Normal",
  tags: [],
  nextFollowUp: null,
});
const task = (contactId: string | null = null): Task => ({
  ...stamp(),
  title: "Follow up",
  description: "",
  contactId,
  organizationId: null,
  dueAt: new Date(Date.now() - 86400000).toISOString(),
  completedAt: null,
  priority: "Normal",
  reminderMinutes: 60,
});
beforeEach(async () => {
  db = new PulseDB("personal");
  await db.delete();
  await db.open();
  await initialize(db);
});
afterEach(async () => {
  await db.delete();
});
describe("CRM data integrity", () => {
  it("creates a company and links a representative", async () => {
    const o = company();
    await saveOrganization(db, o);
    const c = person(o.id);
    await saveContact(db, c);
    expect((await db.contacts.get(c.id))?.organizationId).toBe(o.id);
    expect(await db.organizations.count()).toBe(1);
  });
  it("edits a contact and persists across database reopen", async () => {
    const c = person();
    await saveContact(db, c);
    await saveContact(db, { ...c, stage: "Proposal", name: "Updated Person" });
    db.close();
    await db.open();
    expect((await db.contacts.get(c.id))?.name).toBe("Updated Person");
    expect((await db.contacts.get(c.id))?.stage).toBe("Proposal");
  });
  it("rejects missing organization references", async () => {
    await expect(saveContact(db, person("missing"))).rejects.toThrow(
      "existing company",
    );
    expect(await db.contacts.count()).toBe(0);
  });
  it("logs interactions and derives last meaningful contact without counting notes", async () => {
    const c = person();
    await saveContact(db, c);
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const i = {
      ...stamp(),
      contactId: c.id,
      organizationId: null,
      type: "Call" as const,
      occurredAt: yesterday,
      summary: "Discussed next steps",
      outcome: "Send proposal",
      opportunityId: null,
      followUpId: null,
    };
    await addInteraction(db, i);
    await addInteraction(db, {
      ...i,
      ...stamp(),
      type: "Note",
      occurredAt: new Date().toISOString(),
    });
    expect(lastInteraction(c.id, await db.interactions.toArray())).toBe(
      yesterday,
    );
  });
  it("creates, completes, and avoids duplicate completion events for a follow-up", async () => {
    const t = task();
    await saveTask(db, t);
    expect(overdue(t)).toBe(true);
    await completeTask(db, t.id);
    await completeTask(db, t.id);
    expect(overdue((await db.tasks.get(t.id))!)).toBe(false);
    expect(
      (await db.events.toArray()).filter((e) =>
        e.summary.startsWith("Task completed"),
      ),
    ).toHaveLength(1);
  });
  it("detaches related records when deleting a company", async () => {
    const o = company();
    await saveOrganization(db, o);
    const c = person(o.id);
    await saveContact(db, c);
    await saveTask(db, { ...task(c.id), organizationId: o.id });
    await deleteOrganization(db, o.id);
    expect((await db.contacts.get(c.id))?.organizationId).toBeNull();
    expect((await db.tasks.toArray())[0].organizationId).toBeNull();
    expect(await db.contacts.count()).toBe(1);
  });
  it("deletes only the intended contacts related records", async () => {
    const c = person();
    const other = person();
    await saveContact(db, c);
    await saveContact(db, other);
    await saveTask(db, task(c.id));
    await saveTask(db, task(other.id));
    await deleteContact(db, c.id);
    expect(await db.contacts.count()).toBe(1);
    expect(await db.tasks.count()).toBe(1);
  });
  it("persists all theme modes and thresholds", async () => {
    for (const theme of ["light", "dark", "system"] as const) {
      await updateSettings(db, { theme, reconnectDays: 30 });
      expect((await settings(db)).theme).toBe(theme);
    }
    db.close();
    await db.open();
    expect((await settings(db)).reconnectDays).toBe(30);
  });
  it("transactionally exports and restores valid data", async () => {
    const c = person();
    await saveContact(db, c);
    const backup = await exportBackup(db);
    await deleteContact(db, c.id);
    await restoreBackup(db, backup);
    expect((await db.contacts.get(c.id))?.name).toBe(c.name);
  });
  it("rejects corrupt imports and leaves existing data intact", async () => {
    const c = person();
    await saveContact(db, c);
    const b = await exportBackup(db);
    await expect(
      restoreBackup(db, {
        ...b,
        contacts: [{ ...c, organizationId: "missing" }],
      }),
    ).rejects.toThrow();
    expect(await db.contacts.count()).toBe(1);
    await expect(restoreBackup(db, { ...b, contacts: [c, c] })).rejects.toThrow(
      "duplicate",
    );
    expect(await db.contacts.count()).toBe(1);
  });
  it("demo reset does not affect personal data", async () => {
    const c = person();
    await saveContact(db, c);
    const demo = new PulseDB("demo");
    await demo.delete();
    await demo.open();
    await initialize(demo);
    expect(await demo.contacts.count()).toBe(24);
    await demo.contacts.clear();
    await resetWorkspace(demo);
    expect(await demo.contacts.count()).toBe(24);
    expect(await db.contacts.count()).toBe(1);
    await demo.delete();
  });
});
describe("transparent recommendation rules", () => {
  it("respects do-not-contact, indefinite holds, and current timeouts", () => {
    for (const availability of [
      "Do not contact",
      "On hold",
      "Temporarily unavailable",
    ] as const)
      expect(eligible({ ...person(), availability, timeoutUntil: null })).toBe(
        false,
      );
    expect(
      eligible({
        ...person(),
        availability: "Temporarily unavailable",
        timeoutUntil: new Date(Date.now() + 86400000).toISOString(),
      }),
    ).toBe(false);
  });
  it("expired timeouts allow review but do not override denied permissions", () => {
    const c = {
      ...person(),
      availability: "Temporarily unavailable" as const,
      timeoutUntil: new Date(Date.now() - 86400000).toISOString(),
    };
    expect(eligible(c)).toBe(true);
    expect(
      eligible(c, [
        {
          ...stamp(),
          contactId: c.id,
          channel: "Email",
          purpose: "Relationship",
          status: "Withdrawn",
          evidence: "User entered",
          withdrawnAt: new Date().toISOString(),
        },
      ]),
    ).toBe(false);
  });
  it("only recommends eligible inactive contacts and respects dismissals", () => {
    const c = {
      ...person(),
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    };
    const blocked = {
      ...c,
      id: "blocked",
      availability: "Do not contact" as const,
    };
    const recs = recommendations([c, blocked], [], [], defaults);
    expect(recs).toHaveLength(1);
    expect(recs[0].reason).toContain("30 days");
    expect(
      recommendations([c], [], [], { ...defaults, dismissed: [recs[0].key] }),
    ).toHaveLength(0);
  });
  it("uses editable priority thresholds and does not recommend completed tasks alone", () => {
    const c = {
      ...person(),
      priority: "High" as const,
      createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    };
    expect(recommendations([c], [], [], defaults)).toHaveLength(1);
    expect(
      recommendations([c], [], [], { ...defaults, priorityDays: 10 }),
    ).toHaveLength(0);
    expect(
      recommendations(
        [person()],
        [],
        [{ ...task(), completedAt: new Date().toISOString() }],
        defaults,
      ),
    ).toHaveLength(0);
  });
});

describe("restriction preservation", () => {
  it("editing a profile does not remove independently recorded restrictions", async () => {
    const c = person();
    await saveContact(db, c);
    const restriction = {
      ...stamp(),
      contactId: c.id,
      type: "Do not contact" as const,
      startAt: null,
      endAt: null,
      reason: "Explicit request",
      source: "Imported consent record",
    };
    await db.restrictions.add(restriction);
    await saveContact(db, { ...c, name: "Edited Name" });
    expect(await db.restrictions.get(restriction.id)).toBeDefined();
    expect(eligible(c, [], await db.restrictions.toArray())).toBe(false);
  });
  it("profile availability updates replace only their own restriction", async () => {
    const c = person();
    await saveContact(db, { ...c, availability: "On hold" });
    await saveContact(db, { ...c, availability: "Do not contact" });
    expect(await db.restrictions.count()).toBe(1);
    await saveContact(db, { ...c, availability: "Available" });
    expect(await db.restrictions.count()).toBe(0);
  });
});
