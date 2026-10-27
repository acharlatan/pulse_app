import { test, expect } from "@playwright/test";
test("demo acceptance journey persists CRM records and appearance", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await expect(
    page.getByRole("heading", { name: /^Good (morning|afternoon|evening)/ }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Explore your network", exact: true })
    .click();
  await page.getByRole("button", { name: "Add person", exact: true }).click();
  await page
    .getByLabel("Full name", { exact: true })
    .fill("Browser Test Person");
  await page
    .locator('select[name="organizationId"]')
    .selectOption({ label: "Forma Studio" });
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search network" })
    .fill("Browser Test Person");
  await page
    .getByRole("link")
    .filter({ hasText: "Browser Test Person" })
    .click();
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await page
    .getByLabel("What would you like to remember?")
    .fill("A meaningful browser test note.");
  await page
    .getByRole("button", { name: "Save interaction", exact: true })
    .click();
  await expect(page.getByText("A meaningful browser test note.")).toBeVisible();
  await page.getByRole("button", { name: "Follow up", exact: true }).click();
  await page.getByLabel("Follow-up title").fill("Prepare the proposal");
  await page
    .getByRole("button", { name: "Save follow-up", exact: true })
    .click();
  await expect(
    page.getByText("Prepare the proposal", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await page.locator('select[name="stage"]').selectOption("Proposal");
  await page
    .locator('select[name="availability"]')
    .selectOption("Temporarily unavailable");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("A meaningful browser test note.")).toBeVisible();
  await expect(page.getByText(/Temporarily unavailable · until/)).toBeVisible();
  await page.getByRole("link", { name: "Open settings", exact: true }).click();
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});
