import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("search opens globally, navigates records and opens existing editors", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await expect(page.getByRole("heading", { name: /^Today\./ })).toBeVisible();
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Search PULSE" });
  const search = dialog.getByRole("combobox", {
    name: "Search records and actions",
  });
  await expect(search).toBeFocused();
  await search.fill("Forma Studio");
  await expect(
    dialog.getByRole("option", { name: /Forma Studio.*Company/ }),
  ).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/network\/companies/);
  await page.keyboard.press("Control+k");
  await dialog.getByRole("option", { name: /Add person/ }).click();
  await expect(page.getByRole("dialog")).toContainText(/person/i);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Search PULSE" }).click();
  await search.fill("not-a-real-record-zzzz");
  await expect(dialog.getByText(/No results found/)).toBeVisible();
  await search.fill("opportunity");
  await expect(dialog.getByRole("option").first()).toBeVisible();
  const violations = await new AxeBuilder({ page }).include("dialog").analyze();
  expect(violations.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});
test("Home task completion persists through the shared activity flow", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.getByRole("heading", { name: "Today.", exact: true }).waitFor();
  const task = page.locator(".daily-inspector");
  const title = await task.locator("h2").innerText();
  await task
    .getByRole("button", { name: "Mark complete", exact: true })
    .click();
  await expect(
    task.getByRole("button", { name: "Completed", exact: true }),
  ).toBeDisabled();
  await expect(task.locator("h2")).toHaveText(title);
  await expect(
    page.locator(".daily-suggestion").filter({ hasText: title }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: /^Today\./ })).toBeVisible();
  await expect(
    page.locator(".daily-suggestion").filter({ hasText: title }),
  ).toHaveCount(0);
  await page.goto("/#/activity");
  await page
    .getByRole("combobox", { name: "Filter tasks" })
    .selectOption({ label: "Completed" });
  await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
});
