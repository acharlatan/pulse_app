import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.use({ actionTimeout: 15000 });
async function demo(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await expect(
    page.getByRole("heading", { name: "A good day to connect." }),
  ).toBeVisible();
}
test("custom pipeline, stable rename, custom company field, segmentation and focus persist", async ({
  page,
}) => {
  test.setTimeout(240000);
  page.on("dialog", (d) => d.accept());
  await demo(page);
  await page.goto("/#/customize");
  await page
    .getByRole("button", { name: "Create pipeline", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Pipeline name", { exact: true })
    .fill("Strategic Partnerships");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toHaveCount(0);
  await page.goto("/#/pipeline");
  await page
    .getByRole("combobox", { name: "Pipeline", exact: true })
    .selectOption({ label: "Strategic Partnerships" });
  await page
    .getByRole("button", { name: "New opportunity", exact: true })
    .click();
  await dialog
    .getByLabel("Opportunity title")
    .fill("Fictional strategic agreement");
  await dialog
    .getByRole("combobox", { name: "Company", exact: true })
    .selectOption({ label: "Forma Studio" });
  await dialog
    .getByRole("combobox", { name: /Stage \/ outcome/ })
    .selectOption({ label: "Initial Discussion · open" });
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("heading", { name: "Fictional strategic agreement" }),
  ).toBeVisible();
  await page.goto("/#/customize");
  await page
    .getByRole("button", { name: "Manage Strategic Partnerships" })
    .click();
  await dialog
    .getByLabel("Stage 3 name", { exact: true })
    .fill("Discovery Conversation");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toHaveCount(0);
  await page.goto("/#/pipeline");
  const card = page.locator(".pipeline-deal").filter({
    has: page.getByRole("heading", { name: "Fictional strategic agreement" }),
  });
  await expect(card).toContainText("Discovery Conversation");
  await card
    .getByLabel("Move to stage / reopen")
    .selectOption({ label: "Active Partnership · won" });
  await expect(card).toContainText("Active Partnership · won");
  await page.goto("/#/customize");
  await page.getByRole("button", { name: "Create custom field" }).click();
  await dialog
    .getByLabel("Field label", { exact: true })
    .fill("Partnership Category");
  await dialog
    .getByRole("combobox", { name: "Field type", exact: true })
    .selectOption("select");
  await dialog
    .getByLabel("Choices (one per line, up to 30)")
    .fill("Strategic\nCommunity");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toHaveCount(0);
  await page.goto("/#/network/companies/org-0");
  await page.getByRole("button", { name: "Edit additional details" }).click();
  await dialog
    .getByRole("combobox", { name: /Partnership Category/ })
    .selectOption("Strategic");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Partnership Category:")).toBeVisible();
  await page
    .getByRole("button", { name: "Pin to Focus", exact: true })
    .first()
    .click();
  await page.goto("/#/focus");
  await expect(
    page.locator(".focus-row").filter({ hasText: "Forma Studio" }),
  ).toHaveCount(1);
  await page
    .getByRole("combobox", { name: "Record type", exact: true })
    .selectOption("task");
  await page
    .getByRole("combobox", { name: "Focus record", exact: true })
    .selectOption({ label: "Send the updated proposal" });
  await page.getByRole("button", { name: "Add to today", exact: true }).click();
  await page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Today", exact: true }) })
    .getByRole("button", { name: "Complete task" })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Follow-up completed" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.locator("section").filter({
      has: page.getByRole("heading", { name: "Recently completed" }),
    }),
  ).toContainText("Send the updated proposal");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: `test-results/focus-${test.info().project.name}.png`,
    fullPage: true,
    animations: "disabled",
    timeout: 60000,
  });
});
test("company segment and selected-only bulk tag", async ({ page }) => {
  test.setTimeout(90000);
  page.on("dialog", (d) => d.accept());
  await demo(page);
  await page.goto("/#/lists");
  await page.getByRole("button", { name: "Create Smart List" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("List contains").selectOption("organization");
  await d.getByLabel("List name").fill("Open company deals");
  await d
    .getByRole("combobox", { name: "Field 1", exact: true })
    .selectOption("opportunityStatus");
  await d
    .getByRole("combobox", { name: "Value 1", exact: true })
    .selectOption("open");
  await d.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("heading", { name: "6 matching companies" }),
  ).toBeVisible();
  await page.goto("/#/network");
  await page.getByRole("button", { name: "Bulk add tag" }).click();
  await d.getByLabel("Tag", { exact: true }).fill("Priority review");
  await d.getByRole("checkbox", { name: "Amara Okafor", exact: true }).check();
  await d.getByRole("checkbox", { name: "Aria Collins", exact: true }).check();
  await d.getByRole("button", { name: "Review 2 selected records" }).click();
  await d.getByRole("button", { name: "Confirm tag update" }).click();
  await expect(d).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Search network" })
    .fill("Priority review");
  await expect(page.locator(".profile-card")).toHaveCount(2);
});
test("customization fits 320 and 390 pixels in both themes", async ({
  page,
}) => {
  test.setTimeout(240000);
  await demo(page);
  await page.goto("/#/customize");
  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate(
        (t) => (document.documentElement.dataset.theme = t),
        theme,
      );
      await expect(
        page.getByRole("heading", { name: "Personalize PULSE." }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/customize-${width}-${theme}-${test.info().project.name}.png`,
        fullPage: true,
        animations: "disabled",
        timeout: 60000,
      });
    }
  }
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
