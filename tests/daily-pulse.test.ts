import { beforeEach, afterEach, it, expect } from "vitest";
import { PulseDB } from "../src/data/db";
import { initialize } from "../src/data/seed";
import { dailyPulse, type DailyPulseData } from "../src/services/daily-pulse";
import type {
  Recommendation,
  OpportunityInsight,
} from "../src/services/recommendations";
let db: PulseDB;
const now = Date.parse("2026-10-28T12:00:00Z");
beforeEach(async () => {
  db = new PulseDB("demo");
  await db.delete();
  await db.open();
  await initialize(db);
});
afterEach(async () => {
  await db.delete();
});
async function data(): Promise<DailyPulseData> {
  return {
    contacts: await db.contacts.toArray(),
    organizations: await db.organizations.toArray(),
    tasks: await db.tasks.toArray(),
    opportunities: await db.opportunities.toArray(),
    interactions: await db.interactions.toArray(),
    focusItems: [],
    queue: [],
    opportunityInsights: [],
  };
}
function rec(id: string, patch: Partial<Recommendation> = {}): Recommendation {
  return {
    key: id,
    recordId: id,
    contactId: id,
    category: "Cooling relationship",
    reason: "Existing shared review evidence",
    rank: 2,
    priority: 1,
    date: "2026-10-01T12:00:00Z",
    changedAt: "2026-10-01T12:00:00Z",
    days: 27,
    blocked: false,
    ...patch,
  };
}
function pin(
  type: "task" | "contact" | "opportunity" | "organization",
  id: string,
  day: string | null = "2026-10-28",
) {
  return {
    id: JSON.stringify([type, id]),
    entityType: type,
    recordId: id,
    today: day,
    createdAt: "2026-10-01T12:00:00Z",
    updatedAt: "2026-10-01T12:00:00Z",
  };
}
it("offers one commitment, eligible opportunity and relationship before filling remaining slots", async () => {
  const d = await data(),
    task = d.tasks[0],
    deal = d.opportunities.find((o) => o.status === "open")!,
    c = d.contacts[2];
  d.tasks = [
    { ...task, dueAt: "2026-10-27T12:00:00Z", completedAt: null },
    {
      ...task,
      id: "other-task",
      dueAt: "2026-10-28T09:00:00Z",
      completedAt: null,
    },
  ];
  d.queue = [
    rec(deal.id, {
      contactId: undefined,
      opportunityId: deal.id,
      category: "Opportunity requires review",
    }),
    rec(c.id),
  ];
  d.opportunityInsights = [
    {
      opportunityId: deal.id,
      flags: ["Stalled"],
      reason: "Saved stage evidence",
      rank: 1,
      date: "2026-10-01T12:00:00Z",
    } as OpportunityInsight,
  ];
  const p = dailyPulse(d, "UTC", now);
  expect(p.suggestions.map((s) => s.type)).toEqual([
    "task",
    "opportunity",
    "contact",
  ]);
  expect(p.suggestions[2].reason).toBe("Existing shared review evidence");
});
it("excludes chosen and completed records, fills available slots and never treats ordinary pins as today's selections", async () => {
  const d = await data(),
    t = d.tasks[0];
  d.tasks = [
    { ...t, id: "a", dueAt: "2026-10-28T09:00:00Z", completedAt: null },
    { ...t, id: "b", dueAt: "2026-10-28T10:00:00Z", completedAt: null },
    {
      ...t,
      id: "done",
      dueAt: "2026-10-28T08:00:00Z",
      completedAt: "2026-10-28T11:00:00Z",
    },
  ];
  d.focusItems = [
    pin("task", "a"),
    pin("task", "b", null),
    pin("task", "done"),
    pin("contact", "deleted"),
  ];
  const p = dailyPulse(d, "UTC", now);
  expect(p.chosen.map((f) => f.recordId)).toEqual(["a", "done"]);
  expect(p.suggestions.map((s) => s.id)).toEqual(["b"]);
  expect(p.finished).toHaveLength(1);
  expect(p.remaining).toHaveLength(1);
});
it("honors blocked and deferred queue evidence without inventing conversation eligibility", async () => {
  const d = await data(),
    [a, b, c] = d.contacts;
  d.tasks = [];
  d.queue = [
    rec(a.id, { blocked: true }),
    rec(b.id, {
      action: {
        id: "defer",
        key: b.id,
        action: "snooze",
        until: "2026-11-01T12:00:00Z",
        createdAt: "2026-10-28T12:00:00Z",
        updatedAt: "2026-10-28T12:00:00Z",
      } as Recommendation["action"],
    }),
    rec(c.id),
    rec(c.id),
  ];
  const p = dailyPulse(d, "UTC", now);
  expect(p.suggestions.map((s) => s.id)).toEqual([c.id]);
});
it("separates future scheduled work from administrative due work in workspace time", async () => {
  const d = await data(),
    t = d.tasks[0];
  d.tasks = [
    {
      ...t,
      id: "later-today",
      completedAt: null,
      dueAt: "2026-10-28T15:00:00Z",
    },
    {
      ...t,
      id: "tomorrow-local",
      completedAt: null,
      dueAt: "2026-10-28T17:00:00Z",
    },
    { ...t, id: "old", completedAt: null, dueAt: "2026-10-27T12:00:00Z" },
  ];
  const p = dailyPulse(d, "Asia/Manila", now);
  expect(p.day).toBe("2026-10-28");
  expect(p.attention.map((t) => t.id)).toEqual(["old", "later-today"]);
  expect(p.later.map((t) => t.id)).toEqual(["tomorrow-local"]);
  expect(p.suggestions.some((s) => s.id === "tomorrow-local")).toBe(false);
});
it("wrap-up uses actual completion and conversation dates, excluding notes, future entries and reopenings", async () => {
  const d = await data(),
    t = d.tasks[0],
    i = d.interactions[0];
  d.tasks = [
    { ...t, id: "completed", completedAt: "2026-10-28T10:00:00Z" },
    { ...t, id: "reopened", completedAt: null },
    { ...t, id: "future", completedAt: "2026-10-29T12:00:00Z" },
    { ...t, id: "old", completedAt: "2026-10-27T10:00:00Z" },
  ];
  d.interactions = [
    { ...i, id: "call", type: "Call", occurredAt: "2026-10-28T11:00:00Z" },
    { ...i, id: "note", type: "Note", occurredAt: "2026-10-28T10:00:00Z" },
    { ...i, id: "future", type: "Meeting", occurredAt: "2026-10-29T11:00:00Z" },
    {
      ...i,
      id: "yesterday",
      type: "Email",
      occurredAt: "2026-10-27T11:00:00Z",
      createdAt: "2026-10-28T11:00:00Z",
    },
  ];
  const p = dailyPulse(d, "UTC", now);
  expect(p.completed.map((t) => t.id)).toEqual(["completed"]);
  expect(p.conversations.map((i) => i.id)).toEqual(["call"]);
});
it("keeps record types distinct even if imported IDs collide and returns quiet empty days", async () => {
  const d = await data(),
    c = d.contacts[0],
    t = d.tasks[0];
  d.contacts = [{ ...c, id: "same" }];
  d.tasks = [
    {
      ...t,
      id: "same",
      contactId: "same",
      dueAt: "2026-10-27T12:00:00Z",
      completedAt: null,
    },
  ];
  d.queue = [rec("same")];
  d.focusItems = [pin("contact", "same")];
  expect(dailyPulse(d, "UTC", now).suggestions.map((s) => s.type)).toEqual([
    "task",
  ]);
  const empty = dailyPulse(
    {
      ...d,
      contacts: [],
      organizations: [],
      tasks: [],
      opportunities: [],
      interactions: [],
      focusItems: [],
      queue: [],
      opportunityInsights: [],
    },
    "UTC",
    now,
  );
  expect(empty.suggestions).toEqual([]);
  expect(empty.completed).toEqual([]);
  expect(empty.chosen).toEqual([]);
});
