import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("search opens globally, navigates records and opens existing editors", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await expect(
    page.getByRole("heading", { name: /^Good (morning|afternoon|evening)/ }),
  ).toBeVisible();
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
