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
