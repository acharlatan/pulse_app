import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Dexie from "dexie";
import { PulseDB } from "../src/data/db";
import { initialize } from "../src/data/seed";
import { defaults, stamp, type Opportunity } from "../src/data/models";
import {
  savePipeline,
  saveField,
  saveFieldValues,
  setFocus,
  bulkTag,
} from "../src/data/expansion-repository";
import {
  exportBackup,
  restoreBackup,
  saveOpportunity,
  deleteContact,
  validateBackup,
} from "../src/data/repository";
import { planLegacyPipelines } from "../src/services/pipelines";
import { companyListMatcher } from "../src/services/smart-lists";
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
function custom() {
  const pipeline = {
    ...stamp(),
    name: "Partnerships",
    description: "",
    position: 1,
    color: "#7161e8",
    isDefault: false,
    archived: false,
  };
  const stages = (
    [
      ["Potential partner", "open"],
      ["Active partnership", "won"],
      ["Declined", "lost"],
    ] as const
  ).map(([name, category], position) => ({
    ...stamp(),
    pipelineId: pipeline.id,
    name,
    category,
    position,
    color: "#7161e8",
  }));
  return { pipeline, stages };
}
it("saves custom stages, outcome labels and stable renames; rejects cross-pipeline stages and stale configuration", async () => {
  const { pipeline, stages } = custom();
  const saved = await savePipeline(db, pipeline, stages);
  const o = (await db.opportunities.toArray())[0];
  await saveOpportunity(db, {
    ...o,
    pipelineId: pipeline.id,
    stageId: stages[1].id,
  });
  expect((await db.opportunities.get(o.id))?.status).toBe("won");
  const renamed = stages.map((s) => ({ ...s, name: s.name + " renamed" }));
  await savePipeline(
    db,
    { ...saved, name: "Strategic partnerships" },
    renamed,
    saved.updatedAt,
  );
  expect((await db.opportunities.get(o.id))?.stageId).toBe(stages[1].id);
  await expect(
    savePipeline(db, saved, stages, saved.updatedAt),
  ).rejects.toThrow(/another tab/);
  await expect(
    saveOpportunity(db, { ...o, pipelineId: pipeline.id, stageId: "Proposal" }),
  ).rejects.toThrow(/valid pipeline/);
  expect(await db.rewards.count()).toBe(0);
});
it("used stage removal needs mapping and impact confirmation; failures leave graph untouched", async () => {
  const { pipeline, stages } = custom();
  const saved = await savePipeline(db, pipeline, stages);
  const o = (await db.opportunities.toArray())[0];
  await saveOpportunity(db, {
    ...o,
    pipelineId: pipeline.id,
    stageId: stages[0].id,
  });
  const extra = {
    ...stamp(),
    pipelineId: pipeline.id,
    name: "Discussion",
    category: "open" as const,
    position: 3,
    color: "#7161e8",
  };
  const s2 = await savePipeline(db, saved, [...stages, extra], saved.updatedAt);
  const rows = stages.filter((s) => s.id !== stages[0].id).concat(extra);
  await expect(savePipeline(db, s2, rows, s2.updatedAt)).rejects.toThrow(
    /Map every/,
  );
  await expect(
    savePipeline(db, s2, rows, s2.updatedAt, { [stages[0].id]: extra.id }),
  ).rejects.toThrow(/confirm/);
  expect((await db.opportunities.get(o.id))?.stageId).toBe(stages[0].id);
  await savePipeline(
    db,
    s2,
    rows,
    s2.updatedAt,
    { [stages[0].id]: extra.id },
    true,
  );
  expect((await db.opportunities.get(o.id))?.stageId).toBe(extra.id);
  expect(await db.rewards.count()).toBe(0);
});
it("custom values validate, survive renaming and roundtrip with focus and pipelines", async () => {
  const id = (await db.organizations.toArray())[0].id;
  const field = {
    ...stamp(),
    entityType: "organization" as const,
    label: "Partnership category",
    description: "",
    type: "select" as const,
    choices: ["Strategic", "Community"],
    position: 0,
    visible: true,
    archived: false,
  };
  await saveField(db, field);
  await saveFieldValues(
    db,
    "organization",
    id,
    [{ fieldId: field.id, value: "Strategic" }],
    "[]",
  );
  await expect(
    saveFieldValues(
      db,
      "organization",
      id,
      [{ fieldId: field.id, value: "Invalid" }],
      JSON.stringify(await db.fieldValues.toArray()),
    ),
  ).rejects.toThrow(/Invalid value/);
  const saved = (await db.fieldDefinitions.get(field.id))!;
  await saveField(db, { ...saved, label: "Partner category" }, saved.updatedAt);
  await setFocus(db, "organization", id, "today", "2026-10-26");
  const backup = await exportBackup(db);
  await restoreBackup(db, backup);
  expect((await db.fieldValues.toArray())[0].value).toBe("Strategic");
  expect(await db.focusItems.count()).toBe(1);
  expect(await db.rewards.count()).toBe(0);
  expect(validateBackup(backup).pipelines).toHaveLength(1);
  const broken = structuredClone(backup);
  broken.focusItems[0].recordId = "missing";
  await expect(restoreBackup(db, broken)).rejects.toThrow(/focus/);
  expect(await db.focusItems.count()).toBe(1);
});
it("bulk tagging is selection-only, stale-safe and rolls back a storage failure", async () => {
  const people = await db.contacts.toArray(),
    selected = people
      .slice(0, 2)
      .map((c) => ({ id: c.id, updatedAt: c.updatedAt }));
  const fail = () => {
    throw new Error("Quota");
  };
  db.events.hook("creating", fail);
  await expect(bulkTag(db, "contact", selected, "Chosen")).rejects.toThrow(
    "Quota",
  );
  db.events.hook("creating").unsubscribe(fail);
  expect((await db.contacts.get(people[0].id))?.tags).not.toContain("Chosen");
  await bulkTag(db, "contact", selected, "Chosen");
  expect((await db.contacts.get(people[0].id))?.tags).toContain("Chosen");
  expect((await db.contacts.get(people[2].id))?.tags).not.toContain("Chosen");
  await expect(bulkTag(db, "contact", selected, "Again")).rejects.toThrow(
    /Selection changed/,
  );
  expect((await db.contacts.get(people[0].id))?.availability).toBe(
    people[0].availability,
  );
});
it("pins are cleaned when the source is deleted", async () => {
  const c = (await db.contacts.toArray())[0];
  await setFocus(db, "contact", c.id, "pin");
  await deleteContact(db, c.id);
  expect(await db.focusItems.count()).toBe(0);
});
it("company segments use historical company attribution and typed numeric values", async () => {
  const backup = await exportBackup(db),
    org = backup.organizations[0];
  const field = {
    ...stamp(),
    entityType: "organization" as const,
    label: "Budget",
    description: "",
    type: "number" as const,
    choices: [],
    position: 0,
    visible: true,
    archived: false,
  };
  const value = {
    ...stamp(),
    id: JSON.stringify([field.id, org.id]),
    fieldId: field.id,
    recordId: org.id,
    value: 100,
  };
  const data = {
    ...backup,
    settings: defaults,
    fieldDefinitions: [field],
    fieldValues: [value],
  };
  const match = companyListMatcher(data);
  const list = {
    ...stamp(),
    name: "Target accounts",
    entityType: "organization" as const,
    mode: "all" as const,
    conditions: [
      {
        field: "customField" as const,
        fieldId: field.id,
        operator: "atLeast" as const,
        value: "20",
      },
      {
        field: "opportunityStatus" as const,
        operator: "is" as const,
        value: "open",
      },
    ],
  };
  expect(match(org, list)).toBe(true);
  expect(companyListMatcher({ ...data, fieldDefinitions: [] })(org, list)).toBe(
    false,
  );
  expect(
    companyListMatcher({ ...data, interactions: [] })(org, {
      ...list,
      conditions: [{ field: "daysSince", operator: "atLeast", value: "1" }],
    }),
  ).toBe(false);
});
it("upgrades an actual v3 database atomically preserving IDs, dates, outcomes and contact lifecycle", async () => {
  const b = await exportBackup(db);
  await db.delete();
  const old = new Dexie("pulse-demo");
  old.version(3).stores({
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
    rewards: "id,&[day+fingerprint],fingerprint,sourceId,earnedAt,day,week",
    rewardChanges: "id,rewardId,at",
    progressState: "id",
    dailyQuests: "id,day,taskId",
  });
  await old.open();
  await old.table("settings").put(defaults);
  await old.table("contacts").bulkPut(b.contacts);
  const deals: Opportunity[] = b.opportunities.slice(0, 3).map((o, i) => ({
    ...o,
    stageId: ["Proposal", "Won", "Lost"][i],
    status: ["open", "won", "lost"][i] as Opportunity["status"],
  }));
  await old.table("opportunities").bulkPut(deals);
  old.close();
  await db.open();
  expect(db.verno).toBe(5);
  expect(await db.opportunities.toArray()).toEqual(
    [...deals].sort((a, b) => a.id.localeCompare(b.id)),
  );
  expect(await db.contacts.toArray()).toEqual(b.contacts);
  expect(await db.rewards.count()).toBe(0);
  expect(await db.pipelineStages.count()).toBe(9);
  db.close();
  await db.open();
  expect(await db.pipelineStages.count()).toBe(9);
});
it("legacy plan rejects an invalid stage without writing new records", async () => {
  expect(() =>
    planLegacyPipelines(
      defaults,
      [{ ...awaitless(), stageId: "missing" }],
      new Date().toISOString(),
    ),
  ).toThrow();
  function awaitless(): Opportunity {
    return {
      ...stamp(),
      title: "Broken",
      organizationId: null,
      contactIds: [],
      pipelineId: "default",
      stageId: "New",
      status: "open",
      value: null,
      currency: "USD",
      probability: null,
      expectedCloseAt: null,
      notes: "",
    };
  }
});
it("benchmarks a representative 1000-contact / 300-opportunity local workspace", async () => {
  const before = performance.now(),
    c = (await db.contacts.toArray())[0],
    o = (await db.opportunities.toArray())[0];
  await db.contacts.bulkPut(
    Array.from({ length: 1000 }, (_, i) => ({
      ...c,
      id: `scale-${i}`,
      name: `Scale ${i}`,
      emails: [],
    })),
  );
  await db.opportunities.bulkPut(
    Array.from({ length: 300 }, (_, i) => ({
      ...o,
      id: `scale-deal-${i}`,
      contactIds: [`scale-${i}`],
    })),
  );
  const saved = performance.now(),
    backup = await exportBackup(db),
    checked = performance.now();
  validateBackup(backup);
  const end = performance.now();
  expect(backup.contacts.length).toBe(1024);
  expect(backup.opportunities.length).toBe(306);
  console.log(
    `PULSE scale benchmark (fake-indexeddb/jsdom): save ${(saved - before).toFixed(1)}ms, export ${(checked - saved).toFixed(1)}ms, validate ${(end - checked).toFixed(1)}ms`,
  );
});
it("configuration outcome remapping corrects an existing reward but never earns a fresh one", async () => {
  const { updateSettings, completeTask } =
    await import("../src/data/repository");
  await updateSettings(db, {
    progress: { ...defaults.progress, enabled: true },
  });
  const task = (await db.tasks.toArray()).find(
    (t) => !t.completedAt && t.contactId === "contact-0",
  )!;
  await completeTask(db, task.id);
  const originalRewards = await db.rewards.toArray();
  const { pipeline, stages } = custom();
  await savePipeline(db, pipeline, stages);
  const o = (await db.opportunities.toArray())[0];
  await saveOpportunity(db, {
    ...o,
    pipelineId: pipeline.id,
    stageId: stages[0].id,
    contactIds: ["contact-0"],
    organizationId: "org-0",
    notes: "A substantive business decision was recorded.",
  });
  const saved = (await db.pipelines.get(pipeline.id))!;
  // Category edit affects current opportunities, but must not mint outcome XP.
  await savePipeline(
    db,
    saved,
    [
      ...stages.map((s) =>
        s.id === stages[0].id ? { ...s, category: "won" as const } : s,
      ),
      {
        ...stamp(),
        pipelineId: pipeline.id,
        name: "New open",
        category: "open",
        position: 3,
        color: "#7161e8",
      },
    ],
    saved.updatedAt,
    {},
    true,
  );
  expect(await db.rewards.toArray()).toEqual(originalRewards);
  const b = await exportBackup(db);
  await restoreBackup(db, b);
  expect(await db.rewards.toArray()).toEqual(originalRewards);
});
it("pipeline writes roll back atomically on activity storage failure", async () => {
  const { pipeline, stages } = custom();
  const before = await db.pipelineStages.count();
  const fail = () => {
    throw new Error("Storage unavailable");
  };
  db.events.hook("creating", fail);
  await expect(savePipeline(db, pipeline, stages)).rejects.toThrow(
    "Storage unavailable",
  );
  db.events.hook("creating").unsubscribe(fail);
  expect(await db.pipelines.get(pipeline.id)).toBeUndefined();
  expect(await db.pipelineStages.count()).toBe(before);
});
it("v3 upgrade preserves real reward correction history, saved lists and legacy organization fields", async () => {
  const { updateSettings, completeTask, saveSmartList } =
    await import("../src/data/repository");
  await updateSettings(db, {
    progress: { ...defaults.progress, enabled: true },
  });
  const t = (await db.tasks.toArray()).find(
    (t) => t.contactId === "contact-0",
  )!;
  await completeTask(db, t.id);
  await saveSmartList(db, {
    ...stamp(),
    name: "Legacy proposals",
    mode: "all",
    conditions: [
      { field: "opportunityStage", operator: "is", value: "Proposal" },
    ],
  });
  await db.organizations.update("org-0", {
    customFields: { "Original note": "Keep this value" },
  });
  const b = await exportBackup(db);
  const newTables = new Set([
    "pipelines",
    "pipelineStages",
    "fieldDefinitions",
    "fieldValues",
    "focusItems",
    "media",
  ]);
  const schema = Object.fromEntries(
    db.tables
      .filter((t) => !newTables.has(t.name))
      .map((t) => [
        t.name,
        [
          t.schema.primKey.src,
          ...t.schema.indexes
            .filter((i) => i.name !== "pipelineId")
            .map((i) => i.src),
        ].join(","),
      ]),
  );
  await db.delete();
  const old = new Dexie("pulse-demo");
  old.version(3).stores(schema);
  await old.open();
  for (const name of Object.keys(schema))
    await old
      .table(name)
      .bulkPut((b as unknown as Record<string, unknown[]>)[name]);
  old.close();
  await db.open();
  expect(await db.rewards.toArray()).toEqual(b.rewards);
  expect(await db.rewardChanges.toArray()).toEqual(b.rewardChanges);
  expect(await db.smartLists.toArray()).toEqual(b.smartLists);
  expect((await db.organizations.get("org-0"))?.customFields).toEqual({
    "Original note": "Keep this value",
  });
});
it("a failed real v3 upgrade rolls back every schema and opportunity change", async () => {
  const bad = {
    ...stamp(),
    title: "Legacy invalid stage",
    stageId: "Unknown",
    pipelineId: "default",
    status: "open",
  };
  await db.delete();
  const old = new Dexie("pulse-demo");
  old
    .version(3)
    .stores({ settings: "id", opportunities: "id,organizationId,stageId" });
  await old.open();
  await old.table("settings").put(defaults);
  await old.table("opportunities").put(bad);
  old.close();
  await expect(db.open()).rejects.toThrow();
  db.close();
  await old.open();
  expect(await old.table("opportunities").get(bad.id)).toEqual(bad);
  expect(old.tables.some((t) => t.name === "pipelineStages")).toBe(false);
  await old.delete();
});
