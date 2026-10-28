import { beforeEach, afterEach, it, expect } from "vitest";
import { PulseDB } from "../src/data/db";
import { initialize } from "../src/data/seed";
import {
  calculateAnalytics,
  type ReportFilter,
  type AnalyticsData,
} from "../src/services/analytics";
import { analyticsGuidance } from "../src/services/analytics-guidance";
import type {
  Recommendation,
  OpportunityInsight,
} from "../src/services/recommendations";
let db: PulseDB;
const now = Date.parse("2026-10-28T12:00:00Z");
const filter: ReportFilter = {
  preset: "custom",
  start: "2026-10-01",
  end: "2026-10-28",
  timezone: "UTC",
  pipelineId: "",
  organizationId: "",
  interactionType: "",
  priority: "",
  category: "",
  outcome: "",
};
beforeEach(async () => {
  db = new PulseDB("demo");
  await db.delete();
  await db.open();
  await initialize(db);
});
afterEach(async () => {
  await db.delete();
});
async function data(): Promise<AnalyticsData> {
  return {
    contacts: await db.contacts.toArray(),
    organizations: await db.organizations.toArray(),
    tasks: await db.tasks.toArray(),
    opportunities: await db.opportunities.toArray(),
    interactions: await db.interactions.toArray(),
    transitions: [],
    relationships: [],
  };
}
function review(
  id: string,
  patch: Partial<Recommendation> = {},
): Recommendation {
  return {
    key: id,
    recordId: id,
    contactId: id,
    category: "Cooling relationship",
    reason: "Existing authoritative rule evidence",
    rank: 2,
    priority: 1,
    date: "2026-10-01T12:00:00Z",
    changedAt: "2026-10-01T12:00:00Z",
    days: 27,
    blocked: false,
    ...patch,
  };
}
it("keeps notes and future entries out of coverage and fills actual zero calendar buckets", async () => {
  const d = await data(),
    c = d.contacts[0],
    i = d.interactions[0];
  d.interactions = [
    { ...i, contactId: c.id, type: "Call", occurredAt: "2026-10-03T12:00:00Z" },
    {
      ...i,
      id: "note",
      contactId: c.id,
      type: "Note",
      occurredAt: "2026-10-04T12:00:00Z",
    },
    {
      ...i,
      id: "future",
      contactId: c.id,
      type: "Call",
      occurredAt: "2026-10-29T12:00:00Z",
    },
  ];
  const r = calculateAnalytics(d, filter, now),
    g = analyticsGuidance(r, [], [], "UTC");
  expect(g.coverage).toEqual({ reached: 1, total: d.contacts.length });
  expect(g.trend).toHaveLength(28);
  expect(g.trend.find(([day]) => day === "2026-10-04")).toEqual([
    "2026-10-04",
    0,
  ]);
  expect(g.trend.reduce((sum, [, n]) => sum + n, 0)).toBe(1);
});
it("preserves historical company attribution after a person moves employers", async () => {
  const d = await data(),
    c = d.contacts[0],
    org = d.organizations[0],
    i = d.interactions[0];
  d.contacts = [{ ...c, organizationId: "new-company" }];
  d.organizations = [
    { ...org, id: "old-company" },
    { ...org, id: "new-company" },
  ];
  d.interactions = [
    {
      ...i,
      contactId: c.id,
      organizationId: "old-company",
      type: "Meeting",
      occurredAt: "2026-10-03T12:00:00Z",
    },
  ];
  d.tasks = [];
  d.opportunities = [];
  const g = analyticsGuidance(
    calculateAnalytics(d, { ...filter, organizationId: "old-company" }, now),
    [],
    [],
    "UTC",
  );
  expect(g.coverage).toEqual({ reached: 0, total: 0 });
  expect(g.companyActivity).toEqual([
    { organizationId: "old-company", conversations: 1, overdue: 0, open: 0 },
  ]);
});
it("honors scope, blocks, deferrals and deduplication before relationship focus suggestions", async () => {
  const d = await data(),
    [a, b, c] = d.contacts;
  const scoped = calculateAnalytics(d, { ...filter, personId: a.id }, now);
  const deferred = review(a.id, {
    action: {
      id: "defer",
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
      key: "defer",
      recordId: a.id,
      kind: "snooze",
      until: "2027-01-01T00:00:00Z",
    },
  });
  const queue = [
    review(a.id, { blocked: true }),
    deferred,
    review(b.id),
    review(c.id),
    review(a.id, { key: "first", rank: 1 }),
    review(a.id, { key: "second", rank: 3 }),
  ];
  const g = analyticsGuidance(scoped, queue, [], "UTC");
  expect(g.relationships).toHaveLength(1);
  expect(g.relationships[0].id).toBe(a.id);
  expect(g.relationships[0].reason).toBe(
    "Existing authoritative rule evidence",
  );
  expect(
    analyticsGuidance(
      scoped,
      [deferred, review(a.id, { blocked: true })],
      [],
      "UTC",
    ).relationships,
  ).toEqual([]);
});
it("presents opportunity flags only when the shared review queue permits the suggestion", async () => {
  const d = await data(),
    o = d.opportunities[0];
  const r = calculateAnalytics(d, filter, now);
  const insight: OpportunityInsight = {
    opportunityId: o.id,
    flags: ["Saved flag"],
    reason: "Saved shared rule explanation",
    rank: 0,
    date: "2026-10-01",
    signature: "sig",
  };
  const q = review(o.id, {
    contactId: undefined,
    opportunityId: o.id,
    category: "Opportunity requires review",
  });
  expect(analyticsGuidance(r, [], [insight], "UTC").opportunities).toEqual([]);
  expect(
    analyticsGuidance(r, [{ ...q, blocked: true }], [insight], "UTC")
      .opportunities,
  ).toEqual([]);
  expect(
    analyticsGuidance(r, [q], [insight], "UTC").opportunities[0],
  ).toMatchObject({ id: o.id, type: "opportunity", reason: insight.reason });
});
it("keeps current overdue commitments separate from period completions and currency values", async () => {
  const d = await data(),
    t = d.tasks[0],
    o = d.opportunities[0];
  d.tasks = [{ ...t, dueAt: "2026-09-01T00:00:00Z", completedAt: null }];
  d.opportunities = [
    { ...o, value: 100, currency: "USD" },
    { ...o, id: "eur", value: 200, currency: "EUR" },
    { ...o, id: "won", status: "won", value: 900, currency: "USD" },
  ];
  const r = calculateAnalytics(d, filter, now),
    g = analyticsGuidance(r, [], [], "UTC");
  expect(g.commitments).toHaveLength(1);
  expect(r.completed).toHaveLength(0);
  expect(r.currency).toEqual([
    ["EUR", 200],
    ["USD", 100],
  ]);
  expect(g.commitments[0].reason).toContain("2026-09-01");
});
it("has bounded monthly buckets and no fabricated focus targets for an empty workspace", () => {
  const r = calculateAnalytics(
      {
        contacts: [],
        organizations: [],
        tasks: [],
        opportunities: [],
        interactions: [],
        transitions: [],
        relationships: [],
      },
      { ...filter, preset: "year" },
      now,
    ),
    g = analyticsGuidance(r, [], [], "UTC");
  expect(g.trend.length).toBe(10);
  expect(g.trend.every(([, n]) => n === 0)).toBe(true);
  expect(g.coverage.total).toBe(0);
  expect([...g.commitments, ...g.relationships, ...g.opportunities]).toEqual(
    [],
  );
});
it("seven-day chart groups retain counts and exact drill-down date membership", async () => {
  const { analyticsDisplayTrend, inAnalyticsBucket } =
    await import("../src/services/analytics-guidance");
  const d = await data(),
    i = d.interactions[0];
  d.interactions = [
    { ...i, type: "Call", occurredAt: "2026-10-01T10:00:00Z" },
    { ...i, id: "last", type: "Meeting", occurredAt: "2026-10-07T23:59:00Z" },
    { ...i, id: "next", type: "Call", occurredAt: "2026-10-08T00:00:00Z" },
  ];
  const r = calculateAnalytics(d, filter, now),
    trend = analyticsDisplayTrend(r, true, "UTC");
  expect(trend[0]).toEqual(["2026-10-01..2026-10-07", 2]);
  expect(trend.reduce((sum, [, n]) => sum + n, 0)).toBe(3);
  expect(inAnalyticsBucket("2026-10-07T23:59:00Z", trend[0][0], "UTC")).toBe(
    true,
  );
  expect(inAnalyticsBucket("2026-10-08T00:00:00Z", trend[0][0], "UTC")).toBe(
    false,
  );
  expect(analyticsDisplayTrend(r, false, "UTC")).toHaveLength(28);
});
it("distinguishes an unlinked company bucket from a valid imported identifier", async () => {
  const d = await data(),
    i = d.interactions[0];
  d.interactions = [
    {
      ...i,
      organizationId: null,
      type: "Call",
      occurredAt: "2026-10-03T12:00:00Z",
    },
    {
      ...i,
      id: "named",
      organizationId: "__unlinked",
      type: "Call",
      occurredAt: "2026-10-03T12:00:00Z",
    },
  ];
  d.tasks = [];
  d.opportunities = [];
  const g = analyticsGuidance(
    calculateAnalytics(d, filter, now),
    [],
    [],
    "UTC",
  );
  expect(g.companyActivity).toHaveLength(2);
  expect(new Set(g.companyActivity.map((r) => r.organizationId))).toEqual(
    new Set([null, "__unlinked"]),
  );
});

it("does not present future calendar buckets as observed zero activity", async () => {
  const { analyticsDisplayTrend } =
    await import("../src/services/analytics-guidance");
  const d = await data();
  d.interactions = [];
  const r = calculateAnalytics(d, { ...filter, end: "2026-11-15" }, now);
  const daily = analyticsDisplayTrend(r, false, "UTC");
  expect(daily.at(-1)?.[0]).toBe("2026-10-28");
  expect(daily.length).toBe(28);
});
