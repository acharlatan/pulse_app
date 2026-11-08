import { expect, test } from "@playwright/test";

test("global search respects private notes and workspace boundaries", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/");
  await page.getByRole("button", { name: /Create My Workspace/ }).click();
  await expect(
    page.getByRole("heading", { name: "Today.", exact: true }),
  ).toBeVisible();
  await page.goto("/#/network");
  await page
    .getByRole("button", { name: "Add person", exact: true })
    .first()
    .click();
  await page.getByLabel("Full name").fill("Merritt Private Test");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await page
    .locator(".profile-card")
    .filter({ hasText: "Merritt Private Test" })
    .click();
  await page
    .getByRole("button", { name: "Add note", exact: true })
    .first()
    .click();
  await page
    .getByLabel("What would you like to remember?")
    .fill("Confidential test note zinnia");
  await page
    .getByRole("button", { name: "Save interaction", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Search PULSE" });
  const search = dialog.getByRole("combobox", {
    name: "Search records and actions",
  });
  await search.fill("Confidential test note zinnia");
  await expect(dialog.getByText(/No results found/)).toBeVisible();
  await search.fill("Merritt Private Test");
  await dialog
    .getByRole("option", { name: /Merritt Private Test.*Contact/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Merritt Private Test", exact: true }),
  ).toBeVisible();
  await page.locator(".workspace-switcher summary").click();
  await page.getByRole("button", { name: "Open Demo", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Today.", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Control+k");
  await search.fill("Merritt Private Test");
  await expect(dialog.getByText(/No results found/)).toBeVisible();
  await page.keyboard.press("Escape");
});
