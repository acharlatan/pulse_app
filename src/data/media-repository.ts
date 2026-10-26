import type { PulseDB } from "./db";
import { stamp, settingsSchema, defaults } from "./models";
import {
  mediaMetadataSchema,
  mediaLimits,
  imageSize,
  type MediaAsset,
} from "./media-models";
export type MediaOwner = "contact" | "organization" | "workspace";
export async function referencedMedia(db: PulseDB) {
  const refs = new Set<string>();
  for (const c of [
    ...(await db.contacts.toArray()),
    ...(await db.organizations.toArray()),
  ]) {
    if (c.avatar) refs.add(c.avatar);
    if (c.coverMediaId) refs.add(c.coverMediaId);
  }
  const s = await db.settings.get("settings");
  if (s?.identity?.avatarMediaId) refs.add(s.identity.avatarMediaId);
  return refs;
}
export async function cleanMedia(db: PulseDB) {
  const refs = await referencedMedia(db);
  for (const a of await db.media.toArray())
    if (!refs.has(a.id)) await db.media.delete(a.id);
}
export async function saveMedia(
  db: PulseDB,
  owner: MediaOwner,
  recordId: string,
  slot: "avatar" | "cover",
  asset: MediaAsset | null,
  expected: string | null,
) {
  if (owner === "workspace" && slot !== "avatar")
    throw new Error("Workspace supports an avatar only.");
  await db.transaction("rw", db.tables, async () => {
    const table =
      owner === "contact"
        ? db.contacts
        : owner === "organization"
          ? db.organizations
          : db.settings;
    const row = await table.get(owner === "workspace" ? "settings" : recordId);
    if (!row) throw new Error("Record no longer exists.");
    const current =
      owner === "workspace"
        ? "identity" in row
          ? row.identity.avatarMediaId
          : ""
        : "avatar" in row
          ? slot === "avatar"
            ? row.avatar
            : row.coverMediaId || ""
          : "";
    if (current !== (expected || ""))
      throw new Error("This image changed in another tab. Reopen the editor.");
    if (asset) {
      mediaMetadataSchema.parse(asset);
      const bytes = new Uint8Array(
        await Dexie.waitFor(asset.blob.arrayBuffer()),
      );
      const size = imageSize(bytes, asset.mime);
      if (typeof createImageBitmap === "function") {
        let image: ImageBitmap;
        try {
          image = await Dexie.waitFor(createImageBitmap(asset.blob));
        } catch {
          throw new Error("This image is unreadable.");
        }
        if (image.width !== asset.width || image.height !== asset.height) {
          image.close();
          throw new Error("Image dimensions do not match.");
        }
        image.close();
      }
      if (
        asset.blob.type !== asset.mime ||
        asset.blob.size !== asset.bytes ||
        size.width !== asset.width ||
        size.height !== asset.height
      )
        throw new Error("Invalid image.");
      const all = await db.media.toArray();
      if (
        all.length >= mediaLimits.count ||
        all.reduce((s, a) => s + a.bytes, 0) + asset.bytes >
          mediaLimits.totalBytes
      )
        throw new Error(
          "Local image limit reached (128 images / 12 MB). Remove unneeded images first.",
        );
      await db.media.add(asset);
    }
    const now = new Date(
      Math.max(
        Date.now(),
        "updatedAt" in row ? Date.parse(row.updatedAt) + 1 : 0,
      ),
    ).toISOString();
    if (owner === "workspace") {
      const s = settingsSchema.parse(row || defaults);
      await db.settings.put({
        ...s,
        identity: { ...s.identity, avatarMediaId: asset?.id || "" },
      });
    } else
      await db
        .table(owner === "contact" ? "contacts" : "organizations")
        .update(recordId, {
          [slot === "avatar" ? "avatar" : "coverMediaId"]: asset?.id || "",
          updatedAt: now,
        });
    await cleanMedia(db);
    await db.events.add({
      ...stamp(),
      category: "profile",
      contactId: owner === "contact" ? recordId : null,
      organizationId: owner === "organization" ? recordId : null,
      summary: `${slot === "cover" ? "Cover" : "Profile image"} ${asset ? "updated" : "removed"}`,
    });
  });
}
import Dexie from "dexie";
