import { expect, it } from "vitest";
import { PulseDB } from "../src/data/db";
import { initialize } from "../src/data/seed";
import { stamp } from "../src/data/models";
import { calculateAnalytics, type ReportFilter } from "../src/services/analytics";
import { saveAutomationRule, setRuleEnabled, evaluateScheduledAutomations } from "../src/data/automation-repository";

it("handles representative synthetic reporting and rule checks", async () => {
  const db = new PulseDB("demo");
  await db.delete();
  await db.open();
  try {
    await initialize(db);
    const basePeople = await db.contacts.toArray();
    const baseEvents = await db.interactions.toArray();
    const baseDeals = await db.opportunities.toArray();
    const companies = await db.organizations.toArray();
    const people = Array.from({ length: 1000 }, (_, i) => ({ ...basePeople[i % basePeople.length], id: `scale-person-${i}` }));
    const events = Array.from({ length: 5000 }, (_, i) => ({ ...baseEvents[i % baseEvents.length], id: `scale-event-${i}`, contactId: people[i % people.length].id, occurredAt: new Date(Date.now() - (i % 1400) * 86400000).toISOString() }));
    const deals = Array.from({ length: 400 }, (_, i) => ({ ...baseDeals[i % baseDeals.length], id: `scale-deal-${i}`, contactIds: [people[i % people.length].id] }));
    const transitions = Array.from({ length: 2000 }, (_, i) => ({
      id: `scale-transition-${i}`, opportunityId: deals[i % deals.length].id,
      occurredAt: new Date(Date.now() - (i % 1000) * 86400000).toISOString(),
      previousPipelineId: "default", pipelineId: "default", previousStageId: "New", stageId: "Discovery",
      previousPipelineName: "Relationship pipeline", pipelineName: "Relationship pipeline",
      previousStageName: "New", stageName: "Discovery", previousOutcome: "open" as const,
      outcome: "open" as const, source: "user" as const,
    }));
    await db.contacts.bulkPut(people);
    await db.interactions.bulkPut(events);
    await db.opportunities.bulkPut(deals);
    const filter: ReportFilter = { preset: "year", start: "", end: "", timezone: "UTC", pipelineId: "", organizationId: "", interactionType: "", priority: "", category: "", outcome: "" };
    const data = { contacts: people, organizations: companies, interactions: events, tasks: [], opportunities: deals, transitions, relationships: [] };
    for (const size of [0, 100, 1000]) {
      const subset = people.slice(0, size);
      const ids = new Set(subset.map((p) => p.id));
      const matchingEvents = events.filter((e) => e.contactId && ids.has(e.contactId));
      const started = performance.now();
      const report = calculateAnalytics({ ...data, contacts: subset, interactions: matchingEvents }, filter);
      expect(report.range.days).toBeGreaterThan(0);
      console.log(`P10 synthetic analytics ${size} contacts: ${(performance.now() - started).toFixed(1)}ms`);
    }
    for (let i = 0; i < 5; i++) {
      const saved = await saveAutomationRule(db, { ...stamp(), name: `Scale ${i}`, description: "", enabled: false, enabledAt: null, archived: false, trigger: "inactive", pipelineId: "", stageId: "", days: 1, priority: "", category: "", action: "reminder", taskTitle: "Review", delayDays: 1 });
      await setRuleEnabled(db, saved.id, true, saved.updatedAt);
    }
    const start = performance.now();
    await evaluateScheduledAutomations(db);
    console.log(`P10 synthetic 5 rules, 1024 contacts and 5000+ events: ${(performance.now() - start).toFixed(1)}ms`);
  } finally { await db.delete(); }
}, 30000);
