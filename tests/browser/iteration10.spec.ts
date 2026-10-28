import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
async function demo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await expect(page.getByRole("heading", { name: /^Today\./ })).toBeVisible();
  page.on("dialog", (d) => d.accept());
}
async function createDeal(
  page: Page,
  title: string,
  company = "Forma Studio",
  person = "Olivia Chen",
  currency = "USD",
) {
  await page.goto("/#/pipeline");
  await page
    .getByRole("button", { name: "New opportunity", exact: true })
    .click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Opportunity title").fill(title);
  await d
    .getByRole("combobox", { name: "Company", exact: true })
    .selectOption({ label: company });
  await d.getByRole("checkbox", { name: person, exact: true }).check();
  await d.getByLabel("Stage / outcome").selectOption("New");
  await d.getByLabel("Value (optional)").fill("5000");
  await d.getByLabel("Currency", { exact: true }).fill(currency);
  await d.getByRole("button", { name: "Save changes" }).click();
  await expect(d).toHaveCount(0);
  await expect(
    page.locator(".pipeline-deal").filter({ hasText: title }),
  ).toBeVisible();
}
test("analytics uses real records, scoped filters, accessible charts and local CSV", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await demo(page);
  await page.goto("/#/analytics");
  await expect(page.getByRole("heading", { name: "Analytics." })).toBeVisible();
  const metric = page
    .locator(".metric-card")
    .filter({ hasText: "Meaningful conversations" });
  await page.getByLabel("Date range").selectOption("custom");
  await page.getByLabel("From", { exact: true }).fill("2000-01-01");
  await page.getByLabel("Through", { exact: true }).fill("2000-01-30");
  await expect(metric.locator("strong")).toHaveText("0");
  await page.getByLabel("Date range").selectOption("30");
  await expect(metric.locator("strong")).not.toHaveText("0");
  await metric.click();
  await expect(
    page.getByRole("heading", { name: "Relationship status now" }),
  ).toBeVisible();
  const csv = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export this report" }).click();
  const path = await (await csv).path();
  expect(fs.readFileSync(path!, "utf8")).toContain("Meaningful interaction");
  const source = page.locator(".analytics-records a").first();
  await expect(source).toBeVisible();
  await source.click();
  await expect(
    page.getByRole("link", { name: "View relationship analytics" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "View relationship analytics" }).click();
  await expect(
    page.getByRole("combobox", { name: "Person", exact: true }),
  ).not.toHaveValue("");
  await page.goto("/#/analytics");
  await page
    .getByRole("button", { name: "Opportunities", exact: true })
    .click();
  await expect(page.getByText("Open value by currency")).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: info.outputPath("analytics-opportunities.png"),
    fullPage: true,
    animations: "disabled",
  });
});
test("disabled rule creates one follow-up for an actual stage event, survives tabs and backup without replay", async ({
  page,
  context,
  browser,
}, info) => {
  test.setTimeout(180000);
  await demo(page);
  await page.goto("/#/automations");
  await page.getByRole("button", { name: /^Proposal follow-up/ }).click();
  const d = page.getByRole("dialog");
  await expect(d.getByText("Review before saving")).toBeVisible();
  await expect(d).toContainText("No email or message is sent");
  await page.screenshot({
    path: info.outputPath("rule-preview.png"),
    fullPage: true,
    animations: "disabled",
  });
  await d.getByRole("button", { name: "Save disabled draft" }).click();
  await expect(d).toHaveCount(0);
  await expect(page.locator(".automation-rule")).toContainText(
    "Disabled draft",
  );
  await page
    .locator(".automation-rule")
    .getByRole("button", { name: "Enable", exact: true })
    .click();
  await expect(page.locator(".automation-rule")).toContainText("Enabled");
  await createDeal(page, "P10 verification");
  const card = page
    .locator(".pipeline-deal")
    .filter({ hasText: "P10 verification" });
  await card.getByLabel("Move to stage / reopen").selectOption("Proposal");
  await expect(
    page.getByRole("status").filter({ hasText: "Opportunity updated" }),
  ).toBeVisible();
  await page.goto("/#/automations");
  await expect(
    page
      .locator(".automation-history")
      .filter({ hasText: "Follow-up created locally" }),
  ).toHaveCount(1);
  await page.reload();
  await expect(
    page
      .locator(".automation-history")
      .filter({ hasText: "Follow-up created locally" }),
  ).toHaveCount(1);
  const second = await context.newPage();
  await second.goto("/#/automations");
  await second.getByText("Execution & safety", { exact: true }).click();
  await second
    .getByRole("button", { name: "Check eligible conditions now" })
    .click();
  await expect(
    second
      .locator(".automation-history")
      .filter({ hasText: "Follow-up created locally" }),
  ).toHaveCount(1);
  await second.close();
  await page.goto("/#/analytics");
  await page
    .getByRole("button", { name: "Opportunities", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Recorded stage movements" }),
  ).toBeVisible();
  await expect(
    page.getByText(/New → Relationship pipeline \/ Proposal/),
  ).toBeVisible();
  await page.goto("/#/settings?section=data");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const file = await (await download).path();
  const data = JSON.parse(fs.readFileSync(file!, "utf8"));
  expect(data.version).toBe(6);
  expect(data.automationRules).toHaveLength(1);
  expect(data.automationExecutions).toHaveLength(1);
  expect(data.transitions).toHaveLength(1);
  const target = await browser.newContext();
  const other = await target.newPage();
  other.on("dialog", (d) => d.accept());
  await other.goto("/");
  await other.getByRole("button", { name: /Create My Workspace/ }).click();
  await other.goto("/#/settings?section=data");
  await other.locator('input[type="file"]').setInputFiles(file!);
  await expect(other.getByRole("dialog")).toContainText("Compatible backup v6");
  await other
    .getByRole("button", { name: "Validate & restore", exact: true })
    .click();
  await expect(other.getByRole("dialog")).toHaveCount(0);
  await other.goto("/#/automations");
  await other.getByText("Execution & safety", { exact: true }).click();
  await other
    .getByRole("button", { name: "Check eligible conditions now" })
    .click();
  await expect(
    other
      .locator(".automation-history")
      .filter({ hasText: "Follow-up created locally" }),
  ).toHaveCount(1);
  await target.close();
});
test("restricted person blocks automated action and the rule builder fits responsive themes", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await demo(page);
  await page.goto("/#/automations");
  await page.getByRole("button", { name: /^Proposal follow-up/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save disabled draft" })
    .click();
  await page
    .locator(".automation-rule")
    .getByRole("button", { name: "Enable", exact: true })
    .click();
  await createDeal(
    page,
    "Restricted verification",
    "Sunday Supply",
    "Mia Patel",
  );
  const card = page
    .locator(".pipeline-deal")
    .filter({ hasText: "Restricted verification" });
  await card.getByLabel("Move to stage / reopen").selectOption("Proposal");
  await expect(
    page.getByRole("status").filter({ hasText: "Opportunity updated" }),
  ).toBeVisible();
  await page.goto("/#/automations");
  await expect(
    page
      .locator(".automation-history")
      .filter({ hasText: "restriction or denied/withdrawn permission" }),
  ).toBeVisible();
  await expect(
    page
      .locator(".automation-history")
      .filter({ hasText: "Follow-up created locally" }),
  ).toHaveCount(0);
  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440])
    for (const theme of ["light", "dark"]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(
        (t) => (document.documentElement.dataset.theme = t),
        theme,
      );
      for (const route of ["/analytics", "/automations"]) {
        await page.goto("/#" + route);
        await expect(page.locator("main h1")).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${route} ${width} ${theme}`,
        ).toBe(true);
      }
      if (width === 390 || width === 1440)
        await page.screenshot({
          path: info.outputPath(`automation-${width}-${theme}.png`),
          fullPage: true,
          animations: "disabled",
        });
    }
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/#/automations");
  await page.getByRole("button", { name: /^Closing soon review/ }).click();
  const d = page.getByRole("dialog");
  await expect(d).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
