import { afterEach, beforeEach, describe, it, expect } from "vitest";
import { PulseDB } from "../src/data/db";
import { initialize, resetWorkspace } from "../src/data/seed";
import {
  saveOpportunity,
  deleteOpportunity,
  moveOpportunity,
  updateInteraction,
  deleteInteraction,
  reopenTask,
  deleteTask,
  saveRestriction,
  endRestriction,
  savePermission,
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
  taskState,
} from "../src/services/recommendations";
import {
  stamp,
  defaults,
  type Contact,
  type Organization,
  type Task,
  type Opportunity,
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
    const history = [
      {
        ...stamp(),
        contactId: c.id,
        organizationId: null,
        type: "Call" as const,
        occurredAt: c.createdAt,
        summary: "Recorded conversation",
        outcome: "",
        opportunityId: null,
        followUpId: null,
      },
    ];
    const recs = recommendations([c, blocked], history, [], defaults);
    expect(recs).toHaveLength(1);
    expect(recs[0].reason).toContain("30 days");
    expect(
      recommendations([c], history, [], {
        ...defaults,
        dismissed: [recs[0].key],
      }),
    ).toHaveLength(0);
  });
  it("uses editable priority thresholds and does not recommend completed tasks alone", () => {
    const c = {
      ...person(),
      priority: "High" as const,
      createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    };
    const history = [
      {
        ...stamp(),
        contactId: c.id,
        organizationId: null,
        type: "Meeting" as const,
        occurredAt: c.createdAt,
        summary: "Recorded meeting",
        outcome: "",
        opportunityId: null,
        followUpId: null,
      },
    ];
    expect(recommendations([c], history, [], defaults)).toHaveLength(1);
    expect(
      recommendations([c], history, [], { ...defaults, priorityDays: 10 }),
    ).toHaveLength(0);
    expect(
      recommendations(
        [person()],
        [],
        [{ ...task(), completedAt: new Date().toISOString() }],
        {
          ...defaults,
          intelligence: { ...defaults.intelligence, noHistory: false },
        },
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

describe("Iteration 02 complete workflows", () => {
  const deal = (
    organizationId: string | null,
    contactIds: string[] = [],
  ): Opportunity => ({
    ...stamp(),
    title: "Northstar partnership",
    organizationId,
    contactIds,
    pipelineId: "default",
    stageId: "Proposal",
    value: 25000,
    currency: "USD",
    status: "open",
    probability: 60,
    expectedCloseAt: null,
    notes: "Budget review",
  });
  it("keeps historical interactions at the original company when representatives move", async () => {
    const a = company(),
      b = company();
    await saveOrganization(db, a);
    await saveOrganization(db, b);
    const c = person(a.id);
    await saveContact(db, c);
    const i = {
      ...stamp(),
      contactId: c.id,
      organizationId: a.id,
      type: "Call" as const,
      occurredAt: new Date().toISOString(),
      summary: "Budget review",
      outcome: "",
      opportunityId: null,
      followUpId: null,
    };
    await addInteraction(db, i);
    await saveContact(db, {
      ...c,
      organizationId: b.id,
      priority: "VIP",
      stage: "Negotiation",
    });
    expect(await db.contacts.where("organizationId").equals(a.id).count()).toBe(
      0,
    );
    expect(await db.contacts.where("organizationId").equals(b.id).count()).toBe(
      1,
    );
    await updateInteraction(db, { ...i, summary: "Corrected budget review" });
    expect((await db.interactions.get(i.id))?.organizationId).toBe(a.id);
    db.close();
    await db.open();
    expect((await db.contacts.get(c.id))?.priority).toBe("VIP");
  });
  it("corrects interactions in place, recalculates last contact and preserves linked tasks", async () => {
    const c = person();
    await saveContact(db, c);
    const t = task(c.id);
    await saveTask(db, t);
    const i = {
      ...stamp(),
      contactId: c.id,
      organizationId: null,
      type: "Call" as const,
      occurredAt: new Date().toISOString(),
      summary: "Call",
      outcome: "",
      opportunityId: null,
      followUpId: t.id,
    };
    await addInteraction(db, i);
    await updateInteraction(db, {
      ...i,
      type: "Note",
      summary: "Actually a note",
    });
    expect(
      lastInteraction(c.id, await db.interactions.toArray()),
    ).toBeUndefined();
    expect(await db.interactions.count()).toBe(1);
    expect((await db.interactions.get(i.id))?.createdAt).toBe(i.createdAt);
    await deleteInteraction(db, i.id);
    expect(await db.tasks.count()).toBe(1);
  });
  it("reschedules, completes, reopens and deletes without duplicate tasks or dangling links", async () => {
    const c = person();
    await saveContact(db, c);
    const t = task(c.id);
    await saveTask(db, t);
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    await saveTask(db, {
      ...t,
      dueAt: tomorrow,
      title: "Rescheduled",
      priority: "High",
    });
    expect(await db.tasks.count()).toBe(1);
    expect(overdue((await db.tasks.get(t.id))!)).toBe(false);
    await completeTask(db, t.id);
    await reopenTask(db, t.id);
    expect((await db.tasks.get(t.id))?.completedAt).toBeNull();
    const i = {
      ...stamp(),
      contactId: c.id,
      organizationId: null,
      type: "Note" as const,
      occurredAt: tomorrow,
      summary: "Plan",
      outcome: "",
      opportunityId: null,
      followUpId: t.id,
    };
    await addInteraction(db, i);
    await deleteTask(db, t.id);
    expect((await db.interactions.get(i.id))?.followUpId).toBeNull();
    expect(await db.contacts.count()).toBe(1);
  });
  it("creates and manages deal outcomes and validates representatives", async () => {
    const org = company();
    await saveOrganization(db, org);
    const c = person(org.id),
      other = person();
    await saveContact(db, c);
    await saveContact(db, other);
    const o = deal(org.id, [c.id]);
    await saveOpportunity(db, o);
    await expect(
      saveOpportunity(db, { ...o, contactIds: [other.id] }),
    ).rejects.toThrow("belong");
    await moveOpportunity(db, o.id, "Negotiation");
    expect((await db.opportunities.get(o.id))?.status).toBe("open");
    await moveOpportunity(db, o.id, "Won");
    expect((await db.opportunities.get(o.id))?.status).toBe("won");
    await moveOpportunity(db, o.id, "Lost");
    expect((await db.opportunities.get(o.id))?.status).toBe("lost");
    await moveOpportunity(db, o.id, "Discovery");
    expect((await db.opportunities.get(o.id))?.status).toBe("open");
    await saveOpportunity(db, { ...o, title: "Revised", value: 30000 });
    expect((await db.opportunities.get(o.id))?.createdAt).toBe(o.createdAt);
    const i = {
      ...stamp(),
      contactId: c.id,
      organizationId: org.id,
      type: "Meeting" as const,
      occurredAt: new Date().toISOString(),
      summary: "Discovery",
      outcome: "",
      opportunityId: o.id,
      followUpId: null,
    };
    await addInteraction(db, i);
    await deleteOpportunity(db, o.id);
    expect((await db.interactions.get(i.id))?.opportunityId).toBeNull();
    expect(await db.organizations.count()).toBe(1);
    expect(await db.contacts.count()).toBe(2);
  });
  it("archives timeout edits and retains authoritative restrictions and marketing withdrawal", async () => {
    const c = person();
    await saveContact(db, c);
    const now = Date.now();
    const r = {
      ...stamp(),
      id: `profile-${c.id}`,
      contactId: c.id,
      type: "Temporarily unavailable" as const,
      startAt: new Date(now - 10000).toISOString(),
      endAt: new Date(now + 10000).toISOString(),
      reason: "Budget review",
      source: "Call",
    };
    await saveRestriction(db, r);
    await savePermission(db, {
      ...stamp(),
      contactId: c.id,
      channel: "Email",
      purpose: "Marketing",
      status: "Withdrawn",
      evidence: "Client request",
      withdrawnAt: null,
    });
    await saveRestriction(db, {
      ...r,
      endAt: new Date(now + 20000).toISOString(),
      reason: "Extended",
    });
    expect(await db.restrictions.count()).toBe(2);
    const contact = (await db.contacts.get(c.id))!;
    expect(
      eligible(
        contact,
        await db.permissions.toArray(),
        await db.restrictions.toArray(),
        now + 5000,
      ),
    ).toBe(false);
    expect(
      eligible(
        contact,
        await db.permissions.toArray(),
        await db.restrictions.toArray(),
        now + 30000,
      ),
    ).toBe(true);
    const dnc = {
      ...stamp(),
      contactId: c.id,
      type: "Do not contact" as const,
      startAt: null,
      endAt: null,
      reason: "No outreach",
      source: "Client",
    };
    await saveRestriction(db, dnc);
    await endRestriction(db, r.id);
    expect(
      eligible(
        (await db.contacts.get(c.id))!,
        await db.permissions.toArray(),
        await db.restrictions.toArray(),
      ),
    ).toBe(false);
    expect((await db.permissions.toArray())[0].status).toBe("Withdrawn");
    await expect(
      savePermission(db, {
        ...(await db.permissions.toArray())[0],
        id: stamp().id,
      }),
    ).rejects.toThrow("existing permission");
  });
  it("applies start windows and explicitly ends indefinite restrictions", async () => {
    const c = person();
    await saveContact(db, c);
    const r = {
      ...stamp(),
      id: `profile-${c.id}`,
      contactId: c.id,
      type: "Temporarily unavailable" as const,
      startAt: new Date(Date.now() + 86400000).toISOString(),
      endAt: new Date(Date.now() + 2 * 86400000).toISOString(),
      reason: "Vacation",
      source: "User",
    };
    await saveRestriction(db, r);
    expect(
      eligible(
        (await db.contacts.get(c.id))!,
        [],
        await db.restrictions.toArray(),
      ),
    ).toBe(true);
    const dnc = {
      ...stamp(),
      contactId: c.id,
      type: "Do not contact" as const,
      startAt: null,
      endAt: null,
      reason: "",
      source: "",
    };
    await saveRestriction(db, dnc);
    await endRestriction(db, dnc.id);
    expect(
      eligible(
        (await db.contacts.get(c.id))!,
        [],
        await db.restrictions.toArray(),
      ),
    ).toBe(true);
  });
  it("compares due-today using the chosen timezone", () => {
    const t = { ...task(), dueAt: "2026-03-08T12:00:00.000Z" };
    expect(
      taskState(t, "America/New_York", Date.parse("2026-03-08T07:00:00Z")),
    ).toBe("Due today");
    expect(
      taskState(t, "America/New_York", Date.parse("2026-03-09T07:00:00Z")),
    ).toBe("Overdue");
  });
  it("roundtrips original version-one backups and rejects broken new links atomically", async () => {
    const c = person();
    await saveContact(db, c);
    const legacy = await exportBackup(db);
    await restoreBackup(db, legacy);
    const o = deal(null, [c.id]);
    await saveOpportunity(db, o);
    const current = await exportBackup(db);
    await restoreBackup(db, current);
    expect(await db.opportunities.count()).toBe(1);
    await expect(
      restoreBackup(db, {
        ...current,
        opportunities: [{ ...o, contactIds: ["missing"] }],
      }),
    ).rejects.toThrow();
    expect(await db.opportunities.count()).toBe(1);
  });
});

it("preserves detailed availability evidence when the general profile editor reschedules a timeout", async () => {
  const c = person();
  await saveContact(db, c);
  const r = {
    ...stamp(),
    id: `profile-${c.id}`,
    contactId: c.id,
    type: "Temporarily unavailable" as const,
    startAt: null,
    endAt: new Date(Date.now() + 86400000).toISOString(),
    reason: "Budget review",
    source: "Client call",
  };
  await saveRestriction(db, r);
  await saveContact(db, {
    ...(await db.contacts.get(c.id))!,
    timeoutUntil: new Date(Date.now() + 2 * 86400000).toISOString(),
  });
  expect(await db.restrictions.get(r.id)).toMatchObject({
    createdAt: r.createdAt,
    reason: r.reason,
    source: r.source,
  });
});
