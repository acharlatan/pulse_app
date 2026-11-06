import fs from "node:fs";
import { test, expect } from "@playwright/test";

test("invalid, incomplete, unsupported and oversized backups never replace saved records", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.goto("/#/settings?section=data");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const path = await (await download).path();
  expect(path).toBeTruthy();
  const backup = JSON.parse(fs.readFileSync(path!, "utf8"));
  delete backup.events;
  const input = page.locator(
    'input[type="file"][accept="application/json,.json"]',
  );
  for (const buffer of [
    Buffer.from("{corrupt"),
    Buffer.from(JSON.stringify(backup)),
    Buffer.from(JSON.stringify({ ...backup, version: 99 })),
  ]) {
    await input.setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer,
    });
    await expect(page.getByRole("alert")).toContainText(
      "No records have changed",
    );
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await input.setInputFiles({
    name: "large.json",
    mimeType: "application/json",
    buffer: Buffer.alloc(32 * 1024 * 1024 + 1),
  });
  await expect(page.getByRole("alert")).toContainText(
    "Choose a backup smaller than 32 MB",
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/#/network/people/contact-0");
  await expect(
    page.getByRole("heading", { name: "Olivia Chen", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".story-entry")).not.toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Olivia Chen", exact: true }),
  ).toBeVisible();
});

test("warns when a downloaded backup exceeds the restore limit", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.goto("/#/settings?section=data");
  await expect(
    page.getByRole("button", { name: "Export", exact: true }),
  ).toBeVisible();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("pulse-demo");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("organizations", "readwrite");
      const store = tx.objectStore("organizations");
      const get = store.get("org-0");
      get.onsuccess = () =>
        store.put({ ...get.result, description: "x".repeat(33 * 1024 * 1024) });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await download;
  await expect(page.getByRole("alert")).toContainText(
    "exceeds the 32 MB restore limit",
  );
  await expect(
    page.getByText("No backup download requested yet."),
  ).toBeVisible();
});
