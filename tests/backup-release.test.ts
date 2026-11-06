import { readFileSync } from "node:fs";
import { it, expect } from "vitest";
import { PulseDB } from "../src/data/db";
import {
  restoreBackup,
  exportBackup,
  validateBackup,
} from "../src/data/repository";

it.each([1, 2])(
  "restores a real historical v%s demo export and roundtrips its complete graph",
  async (version) => {
    const fixture = JSON.parse(
      readFileSync(`tests/fixtures/backup-v${version}.json`, "utf8"),
    );
    expect(fixture.version).toBe(version);
    const db = new PulseDB("personal");
    await db.delete();
    await db.open();
    try {
      await restoreBackup(db, fixture);
      expect(await db.contacts.count()).toBe(24);
      expect(await db.organizations.count()).toBe(10);
      const migrated = await exportBackup(db);
      expect(migrated.settings[0].onboarding).toEqual({
        hidden: false,
        intention: "",
        exportInitiatedAt: null,
      });
      expect(migrated.settings[0].ai.enabled).toBe(false);
      expect(migrated.settings[0].progress.enabled).toBe(false);
      expect(migrated.rewards).toEqual([]);
      expect(validateBackup(migrated).contacts).toHaveLength(24);
      await restoreBackup(db, migrated);
      const roundtrip = await exportBackup(db);
      for (const key of Object.keys(migrated)) {
        if (key === "automationControl") {
          expect(roundtrip.automationControl[0]?.paused).toBe(
            migrated.automationControl[0]?.paused,
          );
          expect(
            roundtrip.automationControl[0]?.replayAfter >=
              migrated.automationControl[0]!.replayAfter,
          ).toBe(true);
        } else if (key !== "metadata")
          expect(roundtrip[key as keyof typeof roundtrip], key).toEqual(
            migrated[key as keyof typeof migrated],
          );
      }
    } finally {
      await db.delete();
    }
  },
);

it("rejects incomplete v6 backups before replacing any existing data", async () => {
  const fixture = JSON.parse(
    readFileSync("tests/fixtures/backup-v2.json", "utf8"),
  );
  const db = new PulseDB("personal");
  await db.delete();
  await db.open();
  try {
    await restoreBackup(db, fixture);
    const before = await exportBackup(db);
    const keys = Object.keys(before).filter((key) =>
      Array.isArray(before[key as keyof typeof before]),
    );
    for (const key of keys) {
      const damaged: Record<string, unknown> = { ...before };
      delete damaged[key];
      await expect(restoreBackup(db, damaged), key).rejects.toThrow(
        /Incomplete version 6 backup/,
      );
      const after = await exportBackup(db);
      for (const store of keys) {
        expect(after[store as keyof typeof after], `${key}: ${store}`).toEqual(
          before[store as keyof typeof before],
        );
      }
    }
  } finally {
    await db.delete();
  }
});

it.each([1, 2, 3, 4, 5] as const)(
  "rejects missing stores from version %s backups without replacing the workspace",
  async (version) => {
    const db = new PulseDB("personal");
    await db.delete();
    await db.open();
    try {
      const fixture = JSON.parse(
        readFileSync("tests/fixtures/backup-v2.json", "utf8"),
      );
      await restoreBackup(db, fixture);
      const before = await exportBackup(db);
      const versionStores = [
        [
          "organizations",
          "contacts",
          "interactions",
          "tasks",
          "opportunities",
          "events",
          "settings",
          "restrictions",
          "permissions",
          "gamification",
          "integrations",
        ],
        ["smartLists", "recommendationActions", "importBatches"],
        ["rewards", "rewardChanges", "progressState", "dailyQuests"],
        [
          "pipelines",
          "pipelineStages",
          "fieldDefinitions",
          "fieldValues",
          "focusItems",
        ],
        ["media"],
      ];
      const required = versionStores.slice(0, version).flat();
      const legacy = { ...before, version };
      for (const key of required) {
        const damaged: Record<string, unknown> = { ...legacy };
        delete damaged[key];
        await expect(
          restoreBackup(db, damaged),
          `${version}: ${key}`,
        ).rejects.toThrow(/Incomplete version/);
      }
      const after = await exportBackup(db);
      for (const key of Object.keys(before)) {
        if (key !== "metadata")
          expect(after[key as keyof typeof after], key).toEqual(
            before[key as keyof typeof before],
          );
      }
    } finally {
      await db.delete();
    }
  },
);

it.each([1, 2, 3, 4, 5] as const)(
  "upgrades historical database version %s and preserves linked records",
  async (version) => {
    const { default: Dexie } = await import("dexie");
    const db = new PulseDB("personal");
    await db.delete();
    const stores = [
      [
        "organizations",
        "contacts",
        "interactions",
        "tasks",
        "opportunities",
        "events",
        "settings",
        "restrictions",
        "permissions",
        "gamification",
        "integrations",
      ],
      ["smartLists", "recommendationActions", "importBatches"],
      ["rewards", "rewardChanges", "progressState", "dailyQuests"],
      [
        "pipelines",
        "pipelineStages",
        "fieldDefinitions",
        "fieldValues",
        "focusItems",
      ],
      ["media"],
    ]
      .slice(0, version)
      .flat();
    const schema = Object.fromEntries(
      db.tables
        .filter((table) => stores.includes(table.name))
        .map((table) => [
          table.name,
          [
            table.schema.primKey.src,
            ...table.schema.indexes.map((index) => index.src),
          ].join(","),
        ]),
    );
    if (version < 4) schema.opportunities = "id,organizationId,stageId";
    const fixture = JSON.parse(
      readFileSync("tests/fixtures/backup-v2.json", "utf8"),
    );
    const old = new Dexie("pulse-personal");
    old.version(version).stores(schema);
    await old.open();
    for (const key of stores)
      if (Array.isArray(fixture[key]))
        await old.table(key).bulkPut(fixture[key]);
    old.close();
    try {
      await db.open();
      expect(db.verno).toBe(6);
      for (const key of [
        "organizations",
        "contacts",
        "interactions",
        "tasks",
        "events",
        "restrictions",
        "permissions",
      ]) {
        expect(await db.table(key).toArray(), key).toEqual(fixture[key]);
      }
      expect(await db.opportunities.count()).toBe(fixture.opportunities.length);
      const migrated = await exportBackup(db);
      expect(() => validateBackup(migrated)).not.toThrow();
      expect(migrated.automationExecutions).toEqual([]);
      expect(migrated.rewards).toEqual([]);
    } finally {
      await db.delete();
    }
  },
);
