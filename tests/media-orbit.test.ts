import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { Blob as NodeBlob } from "node:buffer";
import { PulseDB } from "../src/data/db";
import { initialize } from "../src/data/seed";
import { saveMedia } from "../src/data/media-repository";
import {
  decodeMedia,
  encodeBytes,
  imageSize,
  type MediaAsset,
} from "../src/data/media-models";
import {
  exportBackup,
  restoreBackup,
  deleteContact,
} from "../src/data/repository";
import { deriveOrbit } from "../src/services/orbit";
import Dexie from "dexie";
let db: PulseDB;
const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
function asset(id = "media-test"): MediaAsset {
  const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0));
  return {
    id,
    mime: "image/png",
    width: 1,
    height: 1,
    bytes: bytes.length,
    createdAt: new Date().toISOString(),
    blob: new NodeBlob([bytes], { type: "image/png" }) as Blob,
  };
}
beforeEach(async () => {
  db = new PulseDB("demo");
  await db.delete();
  await db.open();
  await initialize(db);
});
afterEach(async () => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await db.delete();
});
it("saves, replaces and removes a local portrait without replaying rewards", async () => {
  await saveMedia(db, "contact", "contact-0", "avatar", asset(), null);
  expect((await db.contacts.get("contact-0"))?.avatar).toBe("media-test");
  expect(await db.media.count()).toBe(1);
  await saveMedia(
    db,
    "contact",
    "contact-0",
    "avatar",
    asset("media-next"),
    "media-test",
  );
  expect(await db.media.get("media-test")).toBeUndefined();
  await saveMedia(db, "contact", "contact-0", "avatar", null, "media-next");
  expect(await db.media.count()).toBe(0);
  expect(await db.rewards.count()).toBe(0);
});
it("rejects stale image changes and rolls back quota failure, preserving the original", async () => {
  await saveMedia(db, "contact", "contact-0", "avatar", asset(), null);
  await expect(
    saveMedia(db, "contact", "contact-0", "avatar", asset("media-stale"), ""),
  ).rejects.toThrow(/another tab/);
  const fail = () => {
    throw new Error("Quota exceeded");
  };
  db.events.hook("creating", fail);
  await expect(
    saveMedia(
      db,
      "contact",
      "contact-0",
      "avatar",
      asset("media-next"),
      "media-test",
    ),
  ).rejects.toThrow("Quota exceeded");
  db.events.hook("creating").unsubscribe(fail);
  expect((await db.contacts.get("contact-0"))?.avatar).toBe("media-test");
  expect(await db.media.get("media-next")).toBeUndefined();
});
it("exports binary media as a bounded v5 payload and rejects corruption before replacement", async () => {
  await saveMedia(db, "contact", "contact-0", "avatar", asset(), null);
  const b = await exportBackup(db);
  expect(b.version).toBe(6);
  expect(b.media[0].encoded).toBe(png);
  expect(decodeMedia(b.media[0]).bytes).toBe(asset().bytes);
  const broken = structuredClone(b);
  broken.media[0].encoded = "broken";
  await expect(restoreBackup(db, broken)).rejects.toThrow();
  expect((await db.contacts.get("contact-0"))?.avatar).toBe("media-test");
});
it("a decoder failure during restore leaves contacts and photos intact", async () => {
  await saveMedia(db, "contact", "contact-0", "avatar", asset(), null);
  const b = await exportBackup(db);
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockRejectedValue(new Error("corrupt")),
  );
  await expect(restoreBackup(db, b)).rejects.toThrow(/unreadable image/);
  expect(await db.contacts.count()).toBe(24);
  expect(await db.media.count()).toBe(1);
});
it("media cleanup preserves shared refs and contact deletion removes only unreferenced assets", async () => {
  await saveMedia(db, "contact", "contact-0", "avatar", asset(), null);
  await db.organizations.update("org-0", { avatar: "media-test" });
  await deleteContact(db, "contact-0");
  expect(await db.media.count()).toBe(1);
  await saveMedia(db, "organization", "org-0", "avatar", null, "media-test");
  expect(await db.media.count()).toBe(0);
});
it("media stays isolated between Demo and Personal", async () => {
  await saveMedia(db, "contact", "contact-0", "avatar", asset(), null);
  const personal = new PulseDB("personal");
  await personal.delete();
  await personal.open();
  await initialize(personal);
  expect(await personal.media.count()).toBe(0);
  await personal.delete();
  expect(await db.media.count()).toBe(1);
});
it("upgrades a real v4 workspace without rewriting CRM records", async () => {
  const contacts = await db.contacts.toArray(),
    orgs = await db.organizations.toArray();
  const schema = Object.fromEntries(
    db.tables
      .filter((t) => !["media", "transitions", "automationRules", "automationExecutions", "automationControl"].includes(t.name))
      .map((t) => [
        t.name,
        [t.schema.primKey.src, ...t.schema.indexes.map((i) => i.src)].join(","),
      ]),
  );
  await db.delete();
  const old = new Dexie("pulse-demo");
  old.version(4).stores(schema);
  await old.open();
  await old.table("contacts").bulkPut(contacts);
  await old.table("organizations").bulkPut(orgs);
  old.close();
  await db.open();
  expect(db.verno).toBe(6);
  expect(await db.contacts.toArray()).toEqual(contacts);
  expect(await db.media.count()).toBe(0);
});
it("recognizes PNG dimensions and refuses active or truncated content", () => {
  expect(
    imageSize(
      Uint8Array.from(atob(png), (c) => c.charCodeAt(0)),
      "image/png",
    ),
  ).toEqual({ width: 1, height: 1 });
  expect(() =>
    imageSize(new TextEncoder().encode("<svg><script/></svg>"), "image/png"),
  ).toThrow();
  expect(() =>
    decodeMedia({
      ...asset(),
      encoded: encodeBytes(new Uint8Array([1, 2, 3])),
    }),
  ).toThrow();
});
it("Orbit includes only explicit associations and never person-to-person invented links", async () => {
  const data = {
    contacts: await db.contacts.toArray(),
    organizations: await db.organizations.toArray(),
    opportunities: await db.opportunities.toArray(),
  };
  const graph = deriveOrbit(data);
  expect(
    graph.edges.some(
      (e) => e.from === "person:contact-0" && e.to === "company:org-0",
    ),
  ).toBe(true);
  expect(
    graph.edges.some(
      (e) => e.from.startsWith("person:") && e.to.startsWith("person:"),
    ),
  ).toBe(false);
  expect(deriveOrbit(data)).toEqual(graph);
  expect(
    deriveOrbit({ ...data, contacts: [], organizations: [], opportunities: [] })
      .nodes,
  ).toHaveLength(0);
  expect(
    deriveOrbit(data, { company: "org-0" }).nodes.filter(
      (n) => n.kind === "person",
    ),
  ).toHaveLength(3);
});
it("Orbit handles selected people, filtering, deleted nodes, and bounded 1000-contact datasets", async () => {
  const data = {
    contacts: await db.contacts.toArray(),
    organizations: await db.organizations.toArray(),
    opportunities: await db.opportunities.toArray(),
  };
  expect(
    deriveOrbit(data, { person: "contact-0" }).nodes.filter(
      (n) => n.kind === "company",
    ),
  ).toHaveLength(1);
  expect(deriveOrbit(data, { search: "Olivia" }).nodes).toHaveLength(1);
  const c = data.contacts[0];
  for (const size of [10, 100, 1000]) {
    const start = performance.now(),
      g = deriveOrbit(
        {
          ...data,
          contacts: Array.from({ length: size }, (_, i) => ({
            ...c,
            id: "scale-" + i,
            name: "Person " + i,
          })),
        },
        { limit: 60 },
      );
    expect(g.nodes.length).toBeLessThanOrEqual(60);
    expect(
      g.edges.every(
        (e) =>
          g.nodes.some((n) => n.id === e.from) &&
          g.nodes.some((n) => n.id === e.to),
      ),
    ).toBe(true);
    console.log(
      `Orbit ${size} contacts: ${(performance.now() - start).toFixed(1)}ms`,
    );
  }
  const deleted = deriveOrbit({ ...data, organizations: [] });
  expect(deleted.edges.some((e) => e.to.startsWith("company:"))).toBe(false);
});

it("roundtrips valid media and rejects dangling covers before changing any tables", async () => {
  vi.stubGlobal("Blob", NodeBlob);
  await saveMedia(db, "contact", "contact-0", "avatar", asset(), null);
  await saveMedia(db, "organization", "org-0", "cover", asset("media-cover"), null);
  const backup = await exportBackup(db);
  await restoreBackup(db, backup);
  expect((await exportBackup(db)).media).toEqual(backup.media);
  const bad = structuredClone(backup);
  bad.organizations[0].coverMediaId = "missing-cover";
  await expect(restoreBackup(db, bad)).rejects.toThrow(/missing image/);
  expect(await db.media.count()).toBe(2);
  expect((await db.contacts.get("contact-0"))?.avatar).toBe("media-test");
});
