import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function demo(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.getByRole("heading", { name: "Today.", exact: true }).waitFor();
}
test("Analytics turns saved evidence into an inspected and pinned Focus record", async ({
  page,
}) => {
  test.setTimeout(120000);
  await demo(page);
  await page.goto("/#/analytics");
  await page
    .getByRole("heading", { name: "Where should your focus go?", exact: true })
    .waitFor();
  await expect(
    page.getByRole("combobox", { name: "Company", exact: true }),
  ).not.toBeVisible();
  const target = page.locator(".focus-evidence").first();
  const title = await target.locator("h4").innerText();
  await target
    .getByRole("button", { name: "Review commitment", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByLabel("Follow-up title"),
  ).toHaveValue(title);
  await page.keyboard.press("Escape");
  await target
    .getByRole("button", { name: "Pin to Focus", exact: true })
    .click();
  await expect(
    target.getByRole("button", { name: "Unpin", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Open My Focus", exact: true }).click();
  const row = page.locator(".focus-row").filter({ hasText: title });
  await expect(row).toHaveCount(1);
  await row.getByRole("button", { name: "Choose today", exact: true }).click();
  await expect(row).toHaveCount(1);
  await expect(page.locator(".focus-today")).toContainText(title);
  await page.reload();
  await expect(row).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "Open My Focus", exact: true }),
  ).toHaveCount(0);
  await page.goto("/#/analytics");
  await page.getByLabel("Date range").selectOption("custom");
  await page.getByLabel("From", { exact: true }).fill("2000-01-01");
  await page.getByLabel("Through", { exact: true }).fill("2000-01-30");
  await expect(
    page
      .locator(".metric-card")
      .filter({ hasText: "Meaningful conversations" })
      .locator("strong"),
  ).toHaveText("0");
  await expect(page.locator(".focus-evidence")).not.toHaveCount(0);
  await page.getByLabel("Date range").selectOption("30");
  await page
    .getByRole("button", { name: "Scope report to Forma Studio", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Company", exact: true }),
  ).toHaveValue("org-0");
  await page
    .getByRole("button", { name: "Clear record filters", exact: true })
    .click();
  await page.getByText("Why these focus lanes?", { exact: true }).click();
  await expect(page.locator(".insight-explainer").first()).toContainText(
    "no hidden score or prediction",
  );
  await page
    .getByRole("navigation", { name: "Analytics sections" })
    .getByRole("button", { name: "Relationships", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Interaction type", exact: true })
    .selectOption("Call");
  await page
    .getByRole("navigation", { name: "Analytics sections" })
    .getByRole("button", { name: "Overview", exact: true })
    .click();
  const bucket = page
    .locator(".analytics-chart .analytics-bar")
    .filter({ has: page.locator("strong").filter({ hasText: /^[1-9]/ }) })
    .first();
  const count = Number(await bucket.locator("strong").innerText());
  await bucket.click();
  await expect(page.locator(".analytics-records li")).toHaveCount(count);
  await expect(
    page.getByRole("combobox", { name: "Interaction type", exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByText("No conversations recorded for this selected date.", {
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Clear date selection", exact: true })
    .click();
});
test("Orbit explains company context and keeps map/list/profile journeys working", async ({
  page,
}) => {
  test.setTimeout(120000);
  await demo(page);
  await page.goto("/#/orbit");
  await page.getByRole("button", { name: "Explore", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Choose a company. Follow the thread.",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Forma Studio.*Explore connections/ })
    .click();
  await expect(page).toHaveURL(/company=org-0/);
  await page.getByRole("button", { name: /Olivia Chen.*Saved person/ }).click();
  const panel = page.getByRole("complementary", {
    name: "Selected relationship",
  });
  await expect(panel).toContainText("Creative Director");
  await panel
    .getByText("Saved connections in this view", { exact: true })
    .click();
  await panel.getByRole("button", { name: /Forma Studio.*Works at/ }).click();
  await expect(panel).toContainText("3 representatives");
  await panel.getByRole("link", { name: "Open Company", exact: true }).click();
  await expect(page.locator("main h1")).toHaveText("Forma Studio");
  await page
    .getByRole("link", { name: "View in Relationship Orbit", exact: true })
    .click();
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await page.locator(".orbit-node.company").filter({hasText: "Forma Studio"}).click();
  await expect(page.locator(".orbit-active-edge")).not.toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Fit network", exact: true }).click();
  await panel
    .getByRole("button", { name: "Close selection", exact: true })
    .click();
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page.locator(".orbit-list-item").filter({hasText: "Forma Studio"}).click();
  await expect(
    panel.getByRole("link", { name: "Open Company", exact: true }),
  ).toBeVisible();
});
test("five insight workspaces remain readable across widths and themes", async ({
  page,
}, info) => {
  test.setTimeout(300000);
  await demo(page);
  for (const route of [
    "analytics",
    "orbit",
    "review",
    "focus",
    "automations",
  ]) {
    await page.goto("/#/" + route);
    await expect(page.locator("main h1")).toBeVisible();
    for (const theme of ["light", "dark"]) {
      await page.evaluate(
        (t) => (document.documentElement.dataset.theme = t),
        theme,
      );
      for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${route} ${theme} ${width}`,
        ).toBe(true);
        if ([390, 1440].includes(width)) {
          await page.evaluate(() => {
            (document.activeElement as HTMLElement)?.blur();
            window.scrollTo(0, 0);
          });
          await page.screenshot({
            path: info.outputPath(`${route}-${theme}-${width}.png`),
            fullPage: true,
          });
          const axe = await new AxeBuilder({ page }).analyze();
          expect(axe.violations, `${route} ${theme} ${width}`).toEqual([]);
        }
      }
    }
  }
});
