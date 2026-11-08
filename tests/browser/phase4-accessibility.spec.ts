import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeAll(async ({ browser }, info) => {
  console.log(`PHASE4_ENGINE ${JSON.stringify({ project: info.project.name, version: browser.version(), platform: process.platform })}`);
});

test("keyboard search activates the focused result and restores focus on Escape", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await expect(page.getByRole("heading", { name: "Today.", exact: true })).toBeVisible();
  const opener = page.getByRole("button", { name: "Search PULSE" });
  await opener.focus();
  await page.keyboard.press("Enter");
  const searchDialog = page.getByRole("dialog", { name: "Search PULSE" });
  const input = searchDialog.getByRole("combobox", { name: "Search records and actions" });
  await expect(input).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(searchDialog.getByRole("option", { name: /Add person/ })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(searchDialog.getByRole("option", { name: /Add company/ })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "New company" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await opener.focus();
  await page.keyboard.press("Space");
  await expect(input).toBeFocused();
  await input.fill("Olivia Chen");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Olivia Chen", exact: true })).toBeVisible();
  const edit = page.getByRole("button", { name: "Edit profile", exact: true });
  await edit.focus();
  await page.keyboard.press("Enter");
  const editDialog = page.getByRole("dialog");
  await expect(editDialog).toBeVisible();
  const close = editDialog.getByRole("button", { name: "Close dialog" });
  await close.focus();
  await page.keyboard.press("Shift+Tab");
  expect(await editDialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Tab");
  expect(await editDialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(editDialog).toHaveCount(0);
  await expect(edit).toBeFocused();
});

test("invalid form data remains editable and identifies the field", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Create My Workspace/ }).click();
  await page.goto("/#/network");
  await page.getByRole("button", { name: "Add person", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Full name").fill("Morgan Synthetic");
  const email = dialog.getByLabel("Email", { exact: true });
  await email.fill("not-an-email");
  await dialog.getByRole("button", { name: "Save person", exact: true }).click();
  await expect(dialog).toBeVisible();
  expect(await email.evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(false);
  await expect(email).toBeFocused();
  await email.fill("morgan@example.com");
  await dialog.getByRole("button", { name: "Save person", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".profile-card").filter({ hasText: "Morgan Synthetic" })).toBeVisible();
});

test("reduced-motion profile navigation and Orbit list remain usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const calls: string[] = [];
    Object.defineProperty(window, "__phase4ScrollCalls", { value: calls });
    Element.prototype.scrollIntoView = function (options) {
      if (typeof options === "object") calls.push(String(options.behavior));
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.goto("/#/network/people/contact-0");
  await page.getByRole("navigation", { name: "Profile sections" }).getByRole("button", { name: "Story" }).click();
  const calls = await page.evaluate(() => (window as unknown as { __phase4ScrollCalls: string[] }).__phase4ScrollCalls);
  expect(calls).toContain("instant");
  expect(calls).not.toContain("smooth");
  await page.goto("/#/orbit");
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.locator(".orbit-record-list")).toBeVisible();
  const person = page.locator(".orbit-list-item").filter({ hasText: "Olivia Chen" });
  await person.focus();
  await page.keyboard.press("Enter");
  const detail = page.getByRole("complementary", { name: "Selected relationship" });
  await expect(detail.getByRole("heading", { name: "Olivia Chen" })).toBeVisible();
  await expect(detail.getByRole("link", { name: /Open Profile/ })).toBeVisible();
});

test("major navigation and an open editor have no axe A/AA violations", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.goto("/#/network/people/contact-0");
  await expect(page.getByRole("heading", { name: "Olivia Chen", exact: true })).toBeVisible();
  const analyze = () => new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect((await analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect((await analyze()).violations).toEqual([]);
});
