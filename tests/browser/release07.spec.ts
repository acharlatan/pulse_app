import fs from "node:fs";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("personal guide can be skipped and reopened without demo data", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/");
  await page.getByRole("button", { name: /Create My Workspace/ }).click();
  await expect(
    page.getByRole("heading", { name: "Your next connection starts here." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hide guide on Home" }).click();
  await expect(
    page.getByRole("button", { name: "Hide guide on Home" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your next connection starts here." }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "Getting started", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A little guidance." }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Show guide on Home" }).click();
  await page.goto("/#/");
  await expect(
    page.getByRole("heading", { name: "Your next connection starts here." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Open settings", exact: true }).click();
  await page
    .getByRole("link", { name: "Help & getting started", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A little guidance." }),
  ).toBeVisible();
});

test("backup transfers real linked demo records into an isolated Personal profile", async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.goto("/#/settings?section=data");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const path = await (await downloaded).path();
  expect(path).toBeTruthy();
  const destination = await browser.newContext();
  try {
    const target = await destination.newPage();
    await target.goto(new URL("/", page.url()).href);
    await target.getByRole("button", { name: /Create My Workspace/ }).click();
    await target.goto(new URL("/#/settings?section=data", page.url()).href);
    await target
      .locator('input[type="file"][accept="application/json,.json"]')
      .setInputFiles(path!);
    await expect(target.getByRole("dialog")).toContainText("24 contacts");
    await expect(target.getByRole("dialog")).toContainText("personal");
    await target
      .getByRole("dialog")
      .getByRole("button", { name: "Validate & restore", exact: true })
      .click();
    await expect(target.getByRole("dialog")).toHaveCount(0);
    await expect(
      target.getByText("24 people · 10 companies · 24 interactions", {
        exact: true,
      }),
    ).toBeVisible();
    await target.goto(new URL("/#/network/people/contact-0", page.url()).href);
    await expect(
      target.getByRole("heading", { name: "Olivia Chen", exact: true }),
    ).toBeVisible();
    await expect(target.locator(".story-entry")).not.toHaveCount(0);
    await target.reload();
    await expect(
      target.getByRole("heading", { name: "Olivia Chen", exact: true }),
    ).toBeVisible();
    await target.goto(new URL("/#/settings?section=data", page.url()).href);
    const restoredDownload = target.waitForEvent("download");
    await target.getByRole("button", { name: "Export", exact: true }).click();
    const restoredPath = await (await restoredDownload).path();
    const original = JSON.parse(fs.readFileSync(path!, "utf8"));
    const restored = JSON.parse(fs.readFileSync(restoredPath!, "utf8"));
    for (const key of Object.keys(original)) {
      if (Array.isArray(original[key]) && key !== "settings" && key !== "automationControl")
        expect(restored[key], key).toEqual(original[key]);
    }
    expect(restored.automationControl).toHaveLength(1);
    expect(restored.automationControl[0].paused).toBe(original.automationControl[0]?.paused ?? false);
    expect(Date.parse(restored.automationControl[0].replayAfter)).toBeGreaterThanOrEqual(Date.parse(original.automationControl[0]?.replayAfter ?? "1970-01-01T00:00:00.000Z"));
  } finally {
    await destination.close();
  }
});

test("edited dialog dismissal warns and stale contact edits cannot overwrite another tab", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.goto("/#/network/people/contact-0");
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await page.getByLabel("Full name", { exact: true }).fill("Unfinished name");
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(page.getByLabel("Full name", { exact: true })).toHaveValue(
    "Unfinished name",
  );
  const second = await context.newPage();
  await second.goto("/#/network/people/contact-0");
  await second
    .getByRole("button", { name: "Edit profile", exact: true })
    .click();
  await second.getByLabel("Full name", { exact: true }).fill("Newer tab name");
  await second
    .getByRole("button", { name: "Save person", exact: true })
    .click();
  await expect(second.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("another tab");
  await second.reload();
  await expect(
    second.getByRole("heading", { name: "Newer tab name", exact: true }),
  ).toBeVisible();
  await second.close();
});

test("denied IndexedDB shows recovery instead of a saved workspace", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(IDBFactory.prototype, "open", {
      value: () => {
        throw new DOMException("Storage access denied", "SecurityError");
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Create My Workspace/ }).click();
  await expect(
    page
      .getByText(/Storage access denied|storage unavailable|could not open/i)
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your next connection starts here." }),
  ).toHaveCount(0);
});
