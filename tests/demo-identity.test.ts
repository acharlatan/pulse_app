import { expect, it } from "vitest";
import { PulseDB } from "../src/data/db";
import { initialize } from "../src/data/seed";
import { setFocus } from "../src/data/expansion-repository";

it("updates the legacy demo identity without resetting records or custom settings", async () => {
  const db = new PulseDB("demo");
  await db.delete();
  await db.open();
  try {
    await initialize(db);
    expect((await db.settings.get("settings"))?.name).toBe("Michelle");
    await setFocus(db, "contact", "contact-0", "pin");
    const settings = (await db.settings.get("settings"))!;
    await db.settings.put({ ...settings, name: "Alex" });
    await initialize(db);
    expect((await db.settings.get("settings"))?.name).toBe("Michelle");
    expect(await db.focusItems.count()).toBe(1);
    expect(await db.contacts.count()).toBe(24);
    await db.settings.put({ ...settings, name: "Custom demo name" });
    await initialize(db);
    expect((await db.settings.get("settings"))?.name).toBe("Custom demo name");
  } finally {
    await db.delete();
  }
});
