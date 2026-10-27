import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { PulseDB } from "../src/data/db";
import { initialize } from "../src/data/seed";
import { stamp, type Opportunity, type Task } from "../src/data/models";
import {
  saveOpportunity,
  saveTask,
  deleteOpportunity,
  deleteContact,
  deleteTask,
  exportBackup,
  restoreBackup,
  validateBackup,
} from "../src/data/repository";
import {
  saveAutomationRule,
  setRuleEnabled,
  evaluateScheduledAutomations,
  onOpportunityTransition,
  pauseAutomations,
  deleteAutomationRule,
} from "../src/data/automation-repository";
import { savePipeline, setFocus } from "../src/data/expansion-repository";
import {
  calculateAnalytics,
  period,
  safeCsv,
  type ReportFilter,
} from "../src/services/analytics";
import type { AutomationRule } from "../src/data/intelligence-models";
let db: PulseDB;
beforeEach(async () => {
  db = new PulseDB("demo");
  await db.delete();
  await db.open();
  await initialize(db);
});
afterEach(async () => {
  vi.restoreAllMocks();
  await db.delete();
});
async function opportunity(contactId = "contact-0") {
  const c = (await db.contacts.get(contactId))!;
  const o: Opportunity = {
    ...stamp(),
    title: "Verification deal",
    organizationId: c.organizationId,
    contactIds: [c.id],
    pipelineId: "default",
    stageId: "New",
    status: "open",
    value: 500,
    currency: "USD",
    probability: null,
    expectedCloseAt: null,
    notes: "",
  };
  await saveOpportunity(db, o);
  return (await db.opportunities.get(o.id))!;
}
function draft(trigger: AutomationRule["trigger"] = "stage"): AutomationRule {
  return {
    ...stamp(),
    name: "Verification rule",
    description: "",
    enabled: false,
    enabledAt: null,
    archived: false,
    trigger,
    pipelineId: trigger === "stage" ? "default" : "",
    stageId: trigger === "stage" ? "Proposal" : "",
    days: 1,
    priority: "",
    category: "",
    action: "task",
    taskTitle: "Review verification",
    delayDays: 3,
  };
}
async function enabledRule(trigger: AutomationRule["trigger"] = "stage") {
  const r = await saveAutomationRule(db, draft(trigger));
  return setRuleEnabled(db, r.id, true, r.updatedAt);
}
async function move(o: Opportunity, stageId: string) {
  await saveOpportunity(db, { ...o, stageId }, o.updatedAt);
  return (await db.opportunities.get(o.id))!;
}
const filter: ReportFilter = {
  preset: "30",
  start: "2026-03-01",
  end: "2026-03-31",
  timezone: "America/New_York",
  pipelineId: "",
  organizationId: "",
  interactionType: "",
  priority: "",
  category: "",
  outcome: "",
};
it("records real stage moves with immutable labels, no fictional creation entry, and records outcome transitions", async () => {
  let o = await opportunity();
  expect(await db.transitions.count()).toBe(0);
  o = await move(o, "Discovery");
  o = await move(o, "Proposal");
  o = await move(o, "Won");
  expect(o.status).toBe("won");
  o = await move(o, "Lost");
  expect(o.status).toBe("lost");
  o = await move(o, "Negotiation");
  expect(o.status).toBe("open");
  const before = (await db.transitions.toArray()).sort((a, b) =>
    a.occurredAt.localeCompare(b.occurredAt),
  );
  expect(before).toHaveLength(5);
  expect(before.map((t) => [t.previousStageId, t.stageId])).toEqual([
    ["New", "Discovery"],
    ["Discovery", "Proposal"],
    ["Proposal", "Won"],
    ["Won", "Lost"],
    ["Lost", "Negotiation"],
  ]);
  const p = (await db.pipelines.get("default"))!,
    stages = await db.pipelineStages
      .where("pipelineId")
      .equals("default")
      .toArray();
  await savePipeline(
    db,
    p,
    stages.map((s) =>
      s.id === "Proposal" ? { ...s, name: "Discussion renamed" } : s,
    ),
    p.updatedAt,
  );
  expect((await db.transitions.get(before[1].id))?.stageName).toBe("Proposal");
  expect(await db.transitions.count()).toBe(5);
});
it("stage rule creates exactly one local task and no XP, with durable occurrence deduplication", async () => {
  const r = await enabledRule(),
    o = await opportunity(),
    rewardCount = await db.rewards.count();
  await move(o, "Proposal");
  const executions = await db.automationExecutions.toArray();
  expect(executions).toHaveLength(1);
  expect(executions[0].status).toBe("completed");
  const task = (await db.tasks.get(executions[0].resultId!))!;
  expect(task.source).toBe(`automation:${r.id}`);
  expect(await db.rewards.count()).toBe(rewardCount);
  const t = (await db.transitions.toArray())[0];
  await db.transaction("rw", db.tables, () =>
    onOpportunityTransition(db, t, { ...o, stageId: "Proposal" }),
  );
  await evaluateScheduledAutomations(db);
  expect(await db.automationExecutions.count()).toBe(1);
  expect(
    (await db.tasks.toArray()).filter((t) => t.source === `automation:${r.id}`),
  ).toHaveLength(1);
});
it("blocks restricted people and withdrawn permissions at the action transaction", async () => {
  await enabledRule();
  const o = await opportunity();
  await db.contacts.update("contact-0", { availability: "Do not contact" });
  await move(o, "Proposal");
  expect((await db.automationExecutions.toArray())[0].status).toBe("blocked");
  expect(
    (await db.tasks.toArray()).some((t) => t.source?.startsWith("automation:")),
  ).toBe(false);
});
it("removes pins to deleted contact follow-ups and preserves a valid automation ledger", async () => {
  await enabledRule();
  const o = await opportunity();
  await move(o, "Proposal");
  const execution = (await db.automationExecutions.toArray())[0];
  await setFocus(db, "task", execution.resultId!, "pin");
  await deleteContact(db, "contact-0");
  expect(await db.focusItems.count()).toBe(0);
  expect((await db.automationExecutions.get(execution.id))?.resultDeleted).toBe(true);
  const awaitedBackup = await exportBackup(db);
  expect(() => validateBackup(awaitedBackup)).not.toThrow();
});
it("rolls back a transition, task and opportunity change when the execution ledger cannot commit", async () => {
  await enabledRule();
  const o = await opportunity();
  const count = await db.tasks.count();
  const fail = () => {
    throw new Error("quota failure");
  };
  db.automationExecutions.hook("creating", fail);
  await expect(move(o, "Proposal")).rejects.toThrow("quota failure");
  db.automationExecutions.hook("creating").unsubscribe(fail);
  expect((await db.opportunities.get(o.id))?.stageId).toBe("New");
  expect(await db.transitions.count()).toBe(0);
  expect(await db.tasks.count()).toBe(count);
});
it("enforces disabled drafts, stale edits, pause and invalid references", async () => {
  const d = draft();
  const saved = await saveAutomationRule(db, {
    ...d,
    enabled: true,
    enabledAt: new Date().toISOString(),
  });
  expect(saved.enabled).toBe(false);
  const r = await setRuleEnabled(db, saved.id, true, saved.updatedAt);
  await expect(
    saveAutomationRule(db, { ...r, name: "stale" }, saved.updatedAt),
  ).rejects.toThrow(/another tab/);
  await pauseAutomations(db, true);
  const o = await opportunity();
  await move(o, "Proposal");
  expect(await db.automationExecutions.count()).toBe(0);
  await expect(
    saveAutomationRule(db, { ...draft(), stageId: "missing" }),
  ).rejects.toThrow(/stage/);
});
it("serializes scheduled checks across two tabs, suppresses repeats and prevents restore replay", async () => {
  const r = await enabledRule("due"),
    now = Date.now();
  const task: Task = {
    ...stamp(),
    title: "Manual commitment",
    description: "",
    contactId: "contact-0",
    organizationId: "org-0",
    dueAt: new Date(now + 2 * 86400000).toISOString(),
    completedAt: null,
    priority: "Normal",
    reminderMinutes: 0,
  };
  await saveTask(db, task);
  const second = new PulseDB("demo");
  await second.open();
  const when = now + 86400000 + 1000;
  const results = await Promise.all([
    evaluateScheduledAutomations(db, when),
    evaluateScheduledAutomations(second, when),
  ]);
  expect(results.reduce((a, b) => a + b, 0)).toBe(1);
  expect(await db.automationExecutions.count()).toBe(1);
  await evaluateScheduledAutomations(second, when);
  expect(await db.automationExecutions.count()).toBe(1);
  second.close();
  const backup = await exportBackup(db);
  await restoreBackup(db, backup);
  await evaluateScheduledAutomations(db, when);
  expect(await db.automationExecutions.count()).toBe(1);
  expect((await db.automationRules.get(r.id))?.enabled).toBe(true);
});
it("records an inactivity reminder only after a real conversation reaches its threshold", async () => {
  const saved = await saveAutomationRule(db, { ...draft("inactive"), action: "reminder" });
  const rule = await setRuleEnabled(db, saved.id, true, saved.updatedAt);
  const at = Date.parse(rule.enabledAt!) + 1000;
  const example = (await db.interactions.toArray()).find((i) => i.contactId === "contact-0")!;
  await db.interactions.add({ ...example, id: "new-conversation", type: "Call", occurredAt: new Date(at).toISOString() });
  await db.interactions.add({ ...example, id: "later-note", type: "Note", occurredAt: new Date(at + 1000).toISOString() });
  expect(await evaluateScheduledAutomations(db, at + 86400000 - 1)).toBe(0);
  expect(await evaluateScheduledAutomations(db, at + 86400000 + 1)).toBe(1);
  const execution = (await db.automationExecutions.toArray())[0];
  expect(execution).toMatchObject({ action: "reminder", status: "completed", sourceId: "contact-0", resultId: null });
  await evaluateScheduledAutomations(db, at + 86400000 + 2);
  expect(await db.automationExecutions.count()).toBe(1);
  await deleteAutomationRule(db, rule.id, rule.updatedAt);
  expect((await db.automationRules.get(rule.id))?.archived).toBe(true);
  expect(await db.automationExecutions.count()).toBe(1);
});
it("retains deduplication tombstones after source and generated task deletion", async () => {
  await enabledRule();
  let o = await opportunity();
  o = await move(o, "Proposal");
  const e = (await db.automationExecutions.toArray())[0];
  await deleteTask(db, e.resultId!);
  await deleteOpportunity(db, o.id);
  const row = (await db.automationExecutions.get(e.id))!;
  expect(row.sourceDeleted).toBe(true);
  expect(row.resultDeleted).toBe(true);
  expect(await db.transitions.count()).toBe(0);
  const backup = await exportBackup(db);
  expect(() => validateBackup(backup)).not.toThrow();
});
it("restores v5 data with no invented transitions and rejects invalid v6 ledger references", async () => {
  const original = await exportBackup(db);
  const old = {
    ...original,
    version: 5,
    transitions: [],
    automationRules: [],
    automationExecutions: [],
    automationControl: [],
  };
  await restoreBackup(db, old);
  expect(await db.transitions.count()).toBe(0);
  expect(await db.contacts.count()).toBe(24);
  await enabledRule();
  const o = await opportunity();
  await move(o, "Proposal");
  const current = await exportBackup(db);
  current.automationExecutions[0].sourceId = "missing";
  expect(() => validateBackup(current)).toThrow(/reference/);
});
it("counts actual conversations in selected local calendar days, excludes notes and future records, separates currencies", async () => {
  const now = Date.parse("2026-03-09T06:00:00Z"),
    c = (await db.contacts.get("contact-0"))!,
    org = (await db.organizations.get("org-0"))!;
  const base = {
    ...stamp(),
    contactId: c.id,
    organizationId: org.id,
    summary: "Recorded",
    outcome: "",
    opportunityId: null,
    followUpId: null,
  };
  const interactions = [
    {
      ...base,
      id: "a",
      type: "Call" as const,
      occurredAt: "2026-03-08T04:59:00.000Z",
    },
    {
      ...base,
      id: "b",
      type: "Meeting" as const,
      occurredAt: "2026-03-08T05:00:00.000Z",
    },
    {
      ...base,
      id: "c",
      type: "Note" as const,
      occurredAt: "2026-03-08T06:00:00.000Z",
    },
    {
      ...base,
      id: "d",
      type: "Call" as const,
      occurredAt: "2026-03-10T06:00:00.000Z",
    },
  ];
  const o = await opportunity();
  const data = {
    contacts: [c],
    organizations: [org],
    interactions,
    tasks: [],
    opportunities: [
      { ...o, value: 10, currency: "USD" },
      { ...o, id: "euro", value: 20, currency: "EUR" },
    ],
    transitions: [],
    relationships: [],
  };
  const f = {
    ...filter,
    preset: "custom" as const,
    start: "2026-03-08",
    end: "2026-03-08",
  };
  const r = calculateAnalytics(data, f, now);
  expect(r.interactions.map((i) => i.id)).toEqual(["b"]);
  expect(r.previousInteractions.map((i) => i.id)).toEqual(["a"]);
  expect(r.currency).toEqual([
    ["EUR", 20],
    ["USD", 10],
  ]);
  expect(r.currentStageAge.every((x) => x.days === null)).toBe(true);
  expect(r.winRate).toBeNull();
  expect(period(f, now).days).toBe(1);
  expect(safeCsv([["=HYPERLINK(1)", " +formula", "a,b", 'a"b']])).toBe(
    `"'=HYPERLINK(1)","' +formula","a,b","a""b"`,
  );
});
it("blocks withdrawn marketing permission independently of rule conditions", async () => {
  await enabledRule();
  const o = await opportunity();
  await db.permissions.add({
    ...stamp(),
    contactId: "contact-0",
    channel: "Email",
    purpose: "Marketing",
    status: "Withdrawn",
    evidence: "",
    withdrawnAt: new Date().toISOString(),
  });
  await move(o, "Proposal");
  const e = (await db.automationExecutions.toArray())[0];
  expect(e.status).toBe("blocked");
  expect(e.resultId).toBeNull();
});
it("does not attach a historical opportunity task to a representative's new employer", async () => {
  await enabledRule();
  const o = await opportunity();
  await db.contacts.update("contact-0", { organizationId: "org-1" });
  await move(o, "Proposal");
  const e = (await db.automationExecutions.toArray())[0],
    t = await db.tasks.get(e.resultId!);
  expect(t?.organizationId).toBe("org-0");
  expect(t?.contactId).toBeNull();
});
it("keeps closed or already-past-due opportunities from a closing-soon catch-up", async () => {
  const d = { ...draft("closing"), action: "reminder" as const };
  const saved = await saveAutomationRule(db, d);
  await setRuleEnabled(db, saved.id, true, saved.updatedAt);
  const now = Date.now();
  const o = await opportunity();
  await db.opportunities.update(o.id, {
    expectedCloseAt: new Date(now + 2 * 86400000).toISOString(),
  });
  await evaluateScheduledAutomations(db, now + 3 * 86400000);
  expect(
    (await db.automationExecutions.toArray()).some((e) => e.sourceId === o.id),
  ).toBe(false);
});
it("does not execute pre-restore historical conditions or make network calls", async () => {
  const fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
  const saved = await saveAutomationRule(db, {
    ...draft("due"),
    action: "reminder",
  });
  const enabled = await setRuleEnabled(db, saved.id, true, saved.updatedAt);
  const now = Date.now();
  await db.automationRules.update(enabled.id, {
    enabledAt: new Date(now - 2 * 86400000).toISOString(),
  });
  const task: Task = {
    ...stamp(),
    title: "Historical deadline",
    description: "",
    contactId: "contact-0",
    organizationId: "org-0",
    dueAt: new Date(now + 12 * 3600000).toISOString(),
    completedAt: null,
    priority: "Normal",
    reminderMinutes: 0,
  };
  await saveTask(db, task);
  const backup = await exportBackup(db);
  await restoreBackup(db, backup);
  await evaluateScheduledAutomations(db, now + 100);
  expect(await db.automationExecutions.count()).toBe(0);
  expect(fetchSpy).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});
it("measures stage duration only between observed entry and exit transitions", async () => {
  const o = await opportunity();
  const now = Date.parse("2026-03-10T12:00:00.000Z"),
    base = {
      opportunityId: o.id,
      previousPipelineId: "default",
      pipelineId: "default",
      previousPipelineName: "Pipeline",
      pipelineName: "Pipeline",
      previousOutcome: "open" as const,
      outcome: "open" as const,
      source: "user" as const,
    };
  const transitions = [
    {
      ...base,
      id: "t1",
      occurredAt: "2026-03-01T12:00:00.000Z",
      previousStageId: "New",
      stageId: "Discovery",
      previousStageName: "New",
      stageName: "Discovery",
    },
    {
      ...base,
      id: "t2",
      occurredAt: "2026-03-04T12:00:00.000Z",
      previousStageId: "Discovery",
      stageId: "Proposal",
      previousStageName: "Discovery",
      stageName: "Proposal",
    },
  ];
  const data = {
    contacts: [],
    organizations: [],
    interactions: [],
    tasks: [],
    opportunities: [{ ...o, contactIds: [], stageId: "Proposal" }],
    transitions,
    relationships: [],
  };
  const r = calculateAnalytics(
    data,
    { ...filter, preset: "custom", start: "2026-03-01", end: "2026-03-10" },
    now,
  );
  expect(r.completedStageDurations).toHaveLength(1);
  expect(r.completedStageDurations[0].average).toBe(3);
  expect(r.completedStageDurations[0].median).toBe(3);
  expect(r.currentStageAge[0].days).toBe(6);
  expect(
    calculateAnalytics(
      { ...data, transitions: [] },
      { ...filter, preset: "custom", start: "2026-03-01", end: "2026-03-10" },
      now,
    ).completedStageDurations,
  ).toHaveLength(0);
});
it("uses the saved company snapshot for conversation reporting after a person changes employers", async () => {
  const now = Date.parse("2026-03-10T12:00:00Z"),
    c = (await db.contacts.get("contact-0"))!,
    o = (await db.organizations.get("org-0"))!;
  const interaction = {
    ...stamp(),
    contactId: c.id,
    organizationId: o.id,
    type: "Call" as const,
    occurredAt: "2026-03-09T12:00:00.000Z",
    summary: "Past call",
    outcome: "",
    opportunityId: null,
    followUpId: null,
  };
  const data = {
    contacts: [{ ...c, organizationId: "org-1" }],
    organizations: [o],
    interactions: [interaction],
    tasks: [],
    opportunities: [],
    transitions: [],
    relationships: [],
  };
  const result = calculateAnalytics(
    data,
    {
      ...filter,
      preset: "custom",
      start: "2026-03-09",
      end: "2026-03-09",
      organizationId: "org-0",
    },
    now,
  );
  expect(result.interactions).toHaveLength(1);
});
