import { beforeEach, afterEach, it, expect, vi } from "vitest";
import Dexie from "dexie";
import { PulseDB } from "../src/data/db";
import {
  defaults,
  stamp,
  type Contact,
  type Organization,
  type Interaction,
  type Task,
  type Opportunity,
  type SmartList,
} from "../src/data/models";
import {
  analyzeRelationships,
  opportunityReview,
} from "../src/services/recommendations";
import { listMatcher } from "../src/services/smart-lists";
import {
  parseCsv,
  suggestMapping,
  inspectCsv,
  buildImportPlan,
} from "../src/services/csv-import";
import { commitImport } from "../src/data/import-repository";
import {
  saveContact,
  saveOrganization,
  saveTask,
  completeTask,
  saveSmartList,
  deleteSmartList,
  saveRecommendationAction,
  exportBackup,
  restoreBackup,
  validateBackup,
  savePermission,
} from "../src/data/repository";
const days = (d: number) => new Date(Date.now() + d * 86400000).toISOString();
const person = (name = "Sarah Example"): Contact => ({
  ...stamp(),
  name,
  preferredName: "",
  role: "Director",
  organizationId: null,
  emails: [name.replaceAll(" ", "").toLowerCase() + "@example.com"],
  phones: [],
  links: [],
  avatar: "",
  category: "Prospect",
  stage: "Proposal",
  availability: "Available",
  timeoutUntil: null,
  priority: "Normal",
  tags: [],
  nextFollowUp: null,
});
const company = (name = "Northstar Partners"): Organization => ({
  ...stamp(),
  name,
  industry: "Consulting",
  website: "https://northstar.example",
  description: "",
  avatar: "",
  location: "",
  tags: [],
  customFields: {},
});
const conversation = (id: string, ago: number): Interaction => ({
  ...stamp(),
  contactId: id,
  organizationId: null,
  type: "Call",
  occurredAt: days(-ago),
  summary: "Fictional conversation",
  outcome: "",
  opportunityId: null,
  followUpId: null,
});
const task = (id: string, due = -1): Task => ({
  ...stamp(),
  title: "Review the proposal",
  description: "",
  contactId: id,
  organizationId: null,
  dueAt: days(due),
  completedAt: null,
  priority: "Normal",
  reminderMinutes: 60,
});
const data = (
  contacts: Contact[] = [],
  interactions: Interaction[] = [],
  tasks: Task[] = [],
) => ({
  contacts,
  interactions,
  tasks,
  opportunities: [] as Opportunity[],
  permissions: [],
  restrictions: [],
  settings: defaults,
  recommendationActions: [],
});
let db: PulseDB;
beforeEach(async () => {
  db = new PulseDB("personal");
  await db.delete();
  await db.open();
  await db.settings.put(defaults);
});
afterEach(async () => {
  await db.delete();
});
it("classifies known activity with transparent priority, cooling and dormant thresholds", () => {
  const c = person();
  for (const [ago, health] of [
    [2, "Active"],
    [22, "Needs attention"],
    [35, "Cooling"],
    [100, "Dormant"],
  ] as const) {
    const i = analyzeRelationships(data([c], [conversation(c.id, ago)]));
    expect(i.relationships[0].health).toBe(health);
    expect(i.relationships[0].reason).toContain(String(ago));
  }
  const high = { ...c, priority: "VIP" as const };
  expect(
    analyzeRelationships(data([high], [conversation(c.id, 8)])).relationships[0]
      .health,
  ).toBe("Needs attention");
});
it("never uses creation/import time as evidence of a conversation", () => {
  const c: Contact = {
    ...person(),
    createdAt: days(-500),
    importProvenance: {
      batchId: "b",
      fileName: "contacts.csv",
      importedAt: days(0),
      lastContactAt: null,
    },
  };
  const i = analyzeRelationships(data([c]));
  expect(i.relationships[0]).toMatchObject({
    health: "Not enough history",
    days: null,
    history: "Imported unknown",
  });
  expect(i.queue[0].reason).not.toMatch(/cooling|500 days/i);
  c.importProvenance!.lastContactAt = days(-4);
  expect(analyzeRelationships(data([c])).relationships[0].history).toBe(
    "Imported date",
  );
  expect(analyzeRelationships(data([c])).relationships[0].health).toBe(
    "Active",
  );
});
it("orders overdue first and recalculates after task reschedule and interaction edits", () => {
  const a = person(),
    b = person("Jordan Example"),
    t = task(a.id),
    history = [conversation(a.id, 2), conversation(b.id, 40)];
  const d = data([b, a], history, [t]);
  let i = analyzeRelationships(d);
  expect(i.queue[0].contactId).toBe(a.id);
  expect(i.queue[0].category).toBe("Overdue follow-up");
  t.dueAt = days(3);
  i = analyzeRelationships(d);
  expect(i.queue.some((r) => r.contactId === a.id)).toBe(false);
  history[0].occurredAt = days(-50);
  expect(
    analyzeRelationships(d).relationships.find((r) => r.contactId === a.id)
      ?.health,
  ).toBe("Cooling");
});
it("keeps restrictions authoritative after timeout expiry, snooze and marketing withdrawal", () => {
  const c = {
    ...person(),
    availability: "Temporarily unavailable" as const,
    timeoutUntil: days(-1),
  };
  const i = analyzeRelationships(data([c]));
  expect(i.queue[0].category).toBe("Ready to reconnect");
  const restriction = {
    ...stamp(),
    contactId: c.id,
    type: "Do not contact" as const,
    startAt: null,
    endAt: null,
    reason: "Client request",
    source: "Call",
  };
  const permission = {
    ...stamp(),
    contactId: c.id,
    channel: "Email" as const,
    purpose: "Marketing" as const,
    status: "Withdrawn" as const,
    evidence: "Request",
    withdrawnAt: days(-2),
  };
  const blocked = analyzeRelationships({
    ...data([c]),
    restrictions: [restriction],
    permissions: [permission],
  });
  expect(blocked.queue).toHaveLength(0);
  expect(blocked.relationships[0].health).toBe("Restricted");
  expect(permission.status).toBe("Withdrawn");
  expect(
    analyzeRelationships({
      ...data([c]),
      permissions: [{ ...permission, purpose: "Relationship" }],
    }).queue,
  ).toHaveLength(0);
});
it("snoozes persist, expire, and do not hide materially changed evidence", async () => {
  const c = person(),
    t = task(c.id),
    d = data([c], [], [t]),
    first = analyzeRelationships(d).queue[0];
  const a = {
    ...stamp(),
    key: first.key,
    recordId: c.id,
    kind: "snooze" as const,
    until: days(3),
  };
  await saveContact(db, c);
  await saveRecommendationAction(db, a);
  db.close();
  await db.open();
  const actions = await db.recommendationActions.toArray();
  expect(
    analyzeRelationships({ ...d, recommendationActions: actions }).queue,
  ).toHaveLength(0);
  expect(
    analyzeRelationships(
      { ...d, recommendationActions: actions },
      Date.now() + 4 * 86400000,
    ).queue,
  ).toHaveLength(1);
  t.dueAt = days(-2);
  expect(
    analyzeRelationships({ ...d, recommendationActions: actions }).queue,
  ).toHaveLength(1);
  expect(
    analyzeRelationships({
      ...d,
      recommendationActions: [
        {
          ...a,
          key: analyzeRelationships(d).queue[0].key,
          kind: "dismiss",
          until: null,
        },
      ],
    }).queue,
  ).toHaveLength(0);
});
it("flags open opportunities using saved dates/actions and excludes won/lost", () => {
  const c = person(),
    o: Opportunity = {
      ...stamp(),
      title: "Partnership",
      organizationId: null,
      contactIds: [c.id],
      pipelineId: "default",
      stageId: "Proposal",
      value: null,
      currency: "USD",
      status: "open",
      probability: null,
      expectedCloseAt: days(3),
      notes: "",
    };
  expect(opportunityReview(o, [], [], defaults).flags.join(" ")).toMatch(
    /Expected close|No open follow-up/,
  );
  expect(
    opportunityReview(
      { ...o, expectedCloseAt: days(-1) },
      [task(c.id)],
      [],
      defaults,
    ).rank,
  ).toBe(0);
  expect(
    opportunityReview({ ...o, status: "won", stageId: "Won" }, [], [], defaults)
      .flags,
  ).toHaveLength(0);
  expect(
    opportunityReview(
      { ...o, status: "lost", stageId: "Lost" },
      [],
      [],
      defaults,
    ).flags,
  ).toHaveLength(0);
  expect(
    opportunityReview(
      o,
      [],
      [{ ...conversation(c.id, 40), opportunityId: o.id }],
      defaults,
    ).flags.join(" "),
  ).toContain("40 days");
});
it("Smart Lists apply ALL/ANY rules and update when follow-ups complete", async () => {
  const c = { ...person(), priority: "High" as const },
    t = task(c.id);
  await saveContact(db, c);
  await saveTask(db, t);
  const list: SmartList = {
    ...stamp(),
    name: "High priority overdue",
    mode: "all",
    conditions: [
      { field: "priority", operator: "is", value: "High" },
      { field: "taskState", operator: "is", value: "Overdue" },
    ],
  };
  await saveSmartList(db, list);
  expect(listMatcher(data([c], [], [t]))(c, list)).toBe(true);
  await completeTask(db, t.id);
  expect(listMatcher(data([c], [], await db.tasks.toArray()))(c, list)).toBe(
    false,
  );
  expect(listMatcher(data([c]))(c, { ...list, mode: "any" })).toBe(true);
  expect(
    listMatcher(data([c]))(c, {
      ...list,
      conditions: [{ field: "stage", operator: "is", value: "Won" }],
    }),
  ).toBe(false);
  db.close();
  await db.open();
  expect((await db.smartLists.get(list.id))?.name).toBe(list.name);
  await saveSmartList(db, {
    ...list,
    name: "Renamed",
    conditions: [{ field: "category", operator: "is", value: "Prospect" }],
  });
  expect((await db.smartLists.get(list.id))?.name).toBe("Renamed");
  await deleteSmartList(db, list.id);
  expect(await db.smartLists.count()).toBe(0);
  expect(
    listMatcher(data([c]))(c, {
      ...list,
      conditions: [{ field: "unsupported", operator: "is", value: "x" }],
    } as unknown as SmartList),
  ).toBe(false);
});
it("parses BOM, commas, quotes, embedded newlines, empty fields and common endings", () => {
  const c = parseCsv(
    '\uFEFFName,Email,Notes\r\n"Sarah, Example",,"Line one\nLine ""two"""\r\n',
  );
  expect(c.rows).toEqual([["Sarah, Example", "", 'Line one\nLine "two"']]);
  expect(suggestMapping(c.headers)).toEqual(["name", "email", "notes"]);
  expect(() => parseCsv("Name,Name\nA,B")).toThrow("Duplicate");
  expect(() => parseCsv('Name,Email\n"unterminated,foo')).toThrow();
});
it("rejects invalid mapping/email/dates/enums without changing any records", () => {
  const csv = parseCsv(
    "Name,Email,Priority,Last contact\nSarah,bad,Urgent,2026-02-30",
  );
  expect(
    inspectCsv(csv, suggestMapping(csv.headers), [], []).rows[0].errors.length,
  ).toBeGreaterThan(0);
  expect(() =>
    inspectCsv(csv, ["email", "email", "ignore", "ignore"], [], []),
  ).toThrow("once");
  expect(() =>
    inspectCsv(csv, ["ignore", "email", "ignore", "ignore"], [], []),
  ).toThrow("name");
});
it("imports people once per company and labels notes and date provenance accurately", async () => {
  const csv = parseCsv(
    'Name,Email,Company,Notes,Last contact\nSarah,sarah@example.com,Northstar Partners,"Budget review",2025-01-01\nJordan,jordan@example.com, northstar   partners ,,',
  );
  const plan = buildImportPlan(
    inspectCsv(csv, suggestMapping(csv.headers), [], []),
    [],
    [],
    [],
    "fictional.csv",
  );
  expect(plan.batch).toMatchObject({
    createdContacts: 2,
    createdOrganizations: 1,
  });
  await commitImport(db, plan);
  expect(await db.contacts.count()).toBe(2);
  expect(await db.organizations.count()).toBe(1);
  const notes = await db.interactions.toArray();
  expect(notes[0].type).toBe("Note");
  expect(notes[0].source).toContain("fictional.csv");
  expect(
    (await db.contacts.toArray()).find((c) => c.name === "Sarah")
      ?.importProvenance?.lastContactAt,
  ).toBe(new Date("2025-01-01T00:00:00").toISOString());
  const existing = await db.contacts.toArray(),
    orgs = await db.organizations.toArray(),
    again = buildImportPlan(
      inspectCsv(csv, suggestMapping(csv.headers), existing, orgs),
      existing,
      orgs,
      notes,
      "fictional.csv",
    );
  expect(again.batch.skipped).toBe(2);
  expect(again.contacts).toHaveLength(0);
  await commitImport(db, again);
  expect(await db.contacts.count()).toBe(2);
});
it("compares email/phone/name and preserves restrictions/consent during selected merges", async () => {
  const org = company(),
    c = {
      ...person(),
      organizationId: org.id,
      availability: "Do not contact" as const,
    };
  await saveOrganization(db, org);
  await saveContact(db, c);
  await savePermission(db, {
    ...stamp(),
    contactId: c.id,
    channel: "Email",
    purpose: "Marketing",
    status: "Withdrawn",
    evidence: "Explicit request",
    withdrawnAt: days(-2),
  });
  const csv = parseCsv(
      `Name,Email,Role,Company\nSarah Updated,${c.emails[0].toUpperCase()},VP Partnerships,Northstar Partners`,
    ),
    inspected = inspectCsv(csv, suggestMapping(csv.headers), [c], [org]);
  expect(inspected.rows[0].matches[0]).toMatchObject({
    confidence: "Strong match",
    reason: "Exact normalized email",
  });
  expect(inspected.decisions[2].mode).toBe("skip");
  inspected.decisions[2] = { mode: "update", targetId: c.id, fields: ["role"] };
  const plan = buildImportPlan(
    inspected,
    await db.contacts.toArray(),
    await db.organizations.toArray(),
    [],
    "update.csv",
  );
  await commitImport(db, plan);
  expect(await db.contacts.get(c.id)).toMatchObject({
    name: c.name,
    role: "VP Partnerships",
    availability: "Do not contact",
    createdAt: c.createdAt,
  });
  expect((await db.permissions.toArray())[0].status).toBe("Withdrawn");
  expect(await db.restrictions.count()).toBe(1);
  const possible = inspectCsv(
    parseCsv(`Name,Phone\n${c.name},555-555-1212`),
    ["name", "phone"],
    [{ ...c, phones: ["5555551212"], organizationId: null }],
    [],
  );
  expect(possible.rows[0].matches[0].confidence).toBe("Possible match");
});
it("rejects stale or corrupt import plans atomically and preserves workspace isolation", async () => {
  const csv = parseCsv("Name,Company\nA,New Company"),
    plan = buildImportPlan(
      inspectCsv(csv, ["name", "company"], [], []),
      [],
      [],
      [],
      "contacts.csv",
    );
  const broken = {
    ...plan,
    contacts: plan.contacts.map((c) => ({ ...c, organizationId: "missing" })),
  };
  await expect(commitImport(db, broken)).rejects.toThrow("Missing company");
  expect(await db.organizations.count()).toBe(0);
  await saveContact(db, person());
  await expect(commitImport(db, plan)).rejects.toThrow("Workspace changed");
  expect(await db.contacts.count()).toBe(1);
  const demo = new PulseDB("demo");
  await demo.delete();
  await demo.open();
  await demo.settings.put(defaults);
  await commitImport(demo, plan);
  expect(await demo.contacts.count()).toBe(1);
  expect(await db.organizations.count()).toBe(0);
  await demo.delete();
});
it("roundtrips v2 tables and old v1 backups; failed restore leaves all data intact", async () => {
  const c = person();
  await saveContact(db, c);
  await saveSmartList(db, {
    ...stamp(),
    name: "Prospects",
    mode: "all",
    conditions: [{ field: "category", operator: "is", value: "Prospect" }],
  });
  const backup = await exportBackup(db);
  expect(backup.version).toBe(6);
  expect(validateBackup(backup).smartLists).toHaveLength(1);
  await restoreBackup(db, backup);
  expect(await db.smartLists.count()).toBe(1);
  const legacy = {
    ...backup,
    version: 1,
    smartLists: undefined,
    recommendationActions: undefined,
    importBatches: undefined,
    metadata: undefined,
  };
  await restoreBackup(db, legacy);
  expect(await db.contacts.count()).toBe(1);
  expect(await db.smartLists.count()).toBe(0);
  await expect(
    restoreBackup(db, {
      ...backup,
      contacts: [{ ...c, organizationId: "missing" }],
    }),
  ).rejects.toThrow();
  expect(await db.contacts.count()).toBe(1);
});
it("upgrades a real version-one database without dropping CRM records", async () => {
  await db.delete();
  const legacy = new Dexie("pulse-personal");
  legacy.version(1).stores({
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
  });
  await legacy.open();
  const oldSettings: Partial<typeof defaults> = { ...defaults };
  delete oldSettings.intelligence;
  await legacy.table("settings").put(oldSettings);
  const c = person();
  await legacy.table("contacts").put(c);
  legacy.close();
  db = new PulseDB("personal");
  await db.open();
  expect(await db.contacts.get(c.id)).toMatchObject({ name: c.name });
  expect((await db.settings.get("settings"))?.intelligence.coolingDays).toBe(
    30,
  );
  expect(db.verno).toBe(6);
});
it("supports 10, 100 and 1000-contact imports and intelligence without fabricated history", async () => {
  for (const size of [10, 100, 1000]) {
    const csv = parseCsv(
      "Name,Email,Company\n" +
        Array.from(
          { length: size },
          (_, i) => `Person ${i},person${i}@example.com,Company ${i % 15}`,
        ).join("\n"),
    );
    const plan = buildImportPlan(
      inspectCsv(csv, suggestMapping(csv.headers), [], []),
      [],
      [],
      [],
      "scale.csv",
    );
    expect(plan.contacts).toHaveLength(size);
    expect(plan.organizations).toHaveLength(Math.min(size, 15));
    const i = analyzeRelationships(data(plan.contacts));
    expect(
      i.relationships.every((r) => r.health === "Not enough history"),
    ).toBe(true);
    if (size === 1000) {
      await commitImport(db, plan);
      expect(await db.contacts.count()).toBe(size);
    }
  }
});

it("rolls back every import write if a storage operation fails after records are inserted", async () => {
  const csv = parseCsv("Name,Company\nFictional,Fresh Company"),
    plan = buildImportPlan(
      inspectCsv(csv, ["name", "company"], [], []),
      [],
      [],
      [],
      "fail.csv",
    );
  const spy = vi
    .spyOn(db.importBatches, "add")
    .mockRejectedValueOnce(new Error("Storage failed"));
  await expect(commitImport(db, plan)).rejects.toThrow("Storage failed");
  spy.mockRestore();
  expect(await db.contacts.count()).toBe(0);
  expect(await db.organizations.count()).toBe(0);
  expect(await db.importBatches.count()).toBe(0);
});
it("treats same-name organizations with conflicting websites as possible matches", () => {
  const org = company();
  const csv = parseCsv(
    "Name,Company,Website\nAnother,Northstar Partners,https://unrelated.example",
  );
  const result = inspectCsv(csv, suggestMapping(csv.headers), [], [org]);
  expect(result.companies[0].reason).toContain("Possible match");
  expect(result.organizationChoices[result.companies[0].key]).toBe("new");
});
it("keeps opportunity review keys stable as elapsed day counts change without new evidence", () => {
  const c = person(),
    i = conversation(c.id, 40),
    o: Opportunity = {
      ...stamp(),
      title: "Review",
      organizationId: null,
      contactIds: [c.id],
      pipelineId: "default",
      stageId: "Proposal",
      value: null,
      currency: "USD",
      status: "open",
      probability: null,
      expectedCloseAt: null,
      notes: "",
    };
  i.opportunityId = o.id;
  const d = { ...data([c], [i]), opportunities: [o] };
  expect(analyzeRelationships(d).queue.find((r) => r.opportunityId)?.key).toBe(
    analyzeRelationships(d, Date.now() + 86400000).queue.find(
      (r) => r.opportunityId,
    )?.key,
  );
});
it.each([
  ["Name,Email\nSarah,not-an-email", ["name", "email"]],
  ["Name,Stage\nSarah,Unsupported", ["name", "stage"]],
  ["Name,Priority\nSarah,Urgent", ["name", "priority"]],
  ["Name,Website\nSarah,javascript:alert(1)", ["name", "website"]],
  ["Name,Last contact\nSarah,2026-02-30", ["name", "lastContact"]],
  ["Name,Email\n,sarah@example.com", ["name", "email"]],
] as const)(
  "reports invalid CSV data before any write: %s",
  (text, mapping) => {
    expect(
      inspectCsv(parseCsv(text), [...mapping], [], []).rows[0].errors.length,
    ).toBeGreaterThan(0);
  },
);
it("warns about duplicates inside a single file and does not combine punctuated company names", () => {
  const csv = parseCsv(
    "Name,Email,Company\nSarah,sarah@example.com,Northstar Partners\nSomeone else,sarah@example.com,Northstar-Partners",
  );
  const r = inspectCsv(csv, suggestMapping(csv.headers), [], []);
  expect(r.rows[1].fileDuplicate).toBe(true);
  expect(r.decisions[3].mode).toBe("skip");
  expect(r.companies).toHaveLength(2);
});
it("does not let a blank selected field overwrite a useful existing value", async () => {
  const c = person();
  await saveContact(db, c);
  const stored = (await db.contacts.get(c.id))!;
  const csv = parseCsv(`Name,Email,Role\nSarah,${c.emails[0]},`),
    r = inspectCsv(csv, suggestMapping(csv.headers), [stored], []);
  r.decisions[2] = { mode: "update", targetId: c.id, fields: ["role"] };
  const plan = buildImportPlan(r, [stored], [], [], "blank.csv");
  await commitImport(db, plan);
  expect((await db.contacts.get(c.id))?.role).toBe("Director");
});
it("availability segments expire independently of permission-based health restrictions", () => {
  const c = {
    ...person(),
    availability: "Temporarily unavailable" as const,
    timeoutUntil: days(-1),
  };
  const permission = {
    ...stamp(),
    contactId: c.id,
    channel: "Email" as const,
    purpose: "Relationship" as const,
    status: "Denied" as const,
    evidence: "No relationship outreach",
    withdrawnAt: null,
  };
  const d = { ...data([c]), permissions: [permission] };
  expect(analyzeRelationships(d).relationships[0]).toMatchObject({
    health: "Restricted",
    availability: "Available",
  });
  const match = listMatcher(d);
  expect(
    match(c, {
      ...stamp(),
      name: "Available",
      mode: "all",
      conditions: [
        { field: "availability", operator: "is", value: "Available" },
      ],
    }),
  ).toBe(true);
  expect(match(c, "paused")).toBe(false);
  expect(analyzeRelationships(d).queue).toHaveLength(0);
});
it("does not combine same-named CSV companies with conflicting website domains", async () => {
  const csv = parseCsv(
    "Name,Email,Company,Website\nSarah,sarah@example.com,Shared Name,https://first.example\nJordan,jordan@example.com,Shared Name,https://second.example",
  );
  const r = inspectCsv(csv, suggestMapping(csv.headers), [], []);
  expect(r.companies).toHaveLength(2);
  const plan = buildImportPlan(r, [], [], [], "conflicting.csv");
  expect(plan.batch.createdOrganizations).toBe(2);
  await commitImport(db, plan);
  expect(
    new Set((await db.contacts.toArray()).map((c) => c.organizationId)).size,
  ).toBe(2);
});
it("treats unusual company names as ordinary data rather than object keys", async () => {
  const csv = parseCsv("Name,Company\nSarah,__proto__\nJordan,constructor");
  const r = inspectCsv(csv, suggestMapping(csv.headers), [], []),
    plan = buildImportPlan(r, [], [], [], "names.csv");
  await commitImport(db, plan);
  expect(await db.organizations.count()).toBe(2);
});

it("requires review when conflicting file domains meet an existing company with no website", () => {
  const org = { ...company("Shared Name"), website: "" },
    csv = parseCsv(
      "Name,Company,Website\nSarah,Shared Name,https://first.example\nJordan,Shared Name,https://second.example",
    );
  const r = inspectCsv(csv, suggestMapping(csv.headers), [], [org]);
  expect(Object.values(r.organizationChoices)).toEqual(["new", "new"]);
  expect(r.companies.every((c) => c.reason.includes("Possible match"))).toBe(
    true,
  );
});
