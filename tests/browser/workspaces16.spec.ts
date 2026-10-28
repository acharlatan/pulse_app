import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("working board preserves currency, stage and agenda edit/complete/reopen journeys", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.getByRole("heading", { name: "Today." }).waitFor();
  await page.goto("/#/pipeline");
  await page.getByRole("heading", { name: "Pipeline." }).waitFor();
  await expect(page.locator('.pipeline-column[data-empty="true"]')).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Empty stages", exact: true }).click();
  await expect(
    page.locator('.pipeline-column[data-empty="true"]').first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Empty stages", exact: true }).click();
  await expect(page.locator('.pipeline-column[data-empty="true"]')).toHaveCount(
    0,
  );

  await page
    .getByRole("button", { name: "New opportunity", exact: true })
    .click();
  const d = page.getByRole("dialog");
  const title =
    "A long fictional partnership opportunity for the regional autumn launch";
  await d.getByLabel("Opportunity title").fill(title);
  await d.getByLabel("Value (optional)", { exact: true }).fill("1250");
  await d.getByLabel("Currency", { exact: true }).fill("EUR");
  await d
    .getByRole("combobox", { name: "Company", exact: true })
    .selectOption({ label: "Forma Studio" });
  await d.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(d).toHaveCount(0);
  const card = page
    .locator(".pipeline-deal")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  await expect(card).toBeVisible();
  await expect(page.locator(".pipeline-money")).toContainText("EUR");
  await expect(page.locator(".pipeline-money")).toContainText("USD");
  await card.getByLabel("Move to stage / reopen").selectOption("Won");
  await expect(card.locator(".board-card-kicker .badge")).toHaveText(
    "Won · won",
  );
  await expect(page.locator(".pipeline-money")).not.toContainText("EUR");
  await card.getByLabel("Move to stage / reopen").selectOption("Proposal");
  await expect(card.locator(".board-card-kicker .badge")).toHaveText(
    "Proposal · open",
  );
  await page.reload();
  await expect(card).toBeVisible();
  await expect(page.locator(".pipeline-money")).toContainText("EUR");
  await card.getByRole("button", { name: title, exact: true }).click();
  await expect(d.getByLabel("Opportunity title")).toHaveValue(title);
  await page.keyboard.press("Escape");
  await page.goto("/#/activity");
  await page.getByRole("heading", { name: "Activity." }).waitFor();
  const task = page.locator(".agenda-task").first();
  const taskTitle = await task.locator(".agenda-task-title").innerText();
  await task.getByRole("button", { name: "Edit task", exact: true }).click();
  await d.getByLabel("Due date and time").fill("2027-03-04T14:00");
  await d.getByRole("button", { name: "Save follow-up", exact: true }).click();
  await expect(d).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Filter tasks" })
    .selectOption("upcoming");
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Filter tasks" }),
  ).toHaveValue("upcoming");
  await page
    .getByRole("navigation", { name: "Follow-up overview" })
    .getByRole("button", { name: /Overdue/ })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Filter tasks" }),
  ).toHaveValue("overdue");
  await page.goBack();
  await expect(
    page.getByRole("combobox", { name: "Filter tasks" }),
  ).toHaveValue("upcoming");
  const updated = page.locator(".agenda-task").filter({
    has: page.getByRole("heading", { name: taskTitle, exact: true }),
  });
  await expect(updated).toBeVisible();
  await updated.getByRole("button", { name: "Complete", exact: true }).click();
  await expect(updated).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Filter tasks" })
    .selectOption("complete");
  await expect(updated).toBeVisible();
  await updated.getByRole("button", { name: "Reopen", exact: true }).click();
  await expect(updated).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Filter tasks" })
    .selectOption("upcoming");
  await expect(updated).toBeVisible();
  await updated.getByText("Details & tools", { exact: true }).click();
  await expect(
    updated.getByRole("button", { name: "Pin to Focus", exact: true }),
  ).toBeVisible();
});
test("distinct workspaces fit eight widths and both themes with accessible controls", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.getByRole("heading", { name: "Today." }).waitFor();
  for (const route of ["pipeline", "activity"]) {
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
test("empty personal workspaces keep creation reachable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: /Create My Workspace/ }).click();
  await page.getByRole("heading", { name: "Today." }).waitFor();
  await page.goto("/#/pipeline");
  await expect(
    page.getByRole("button", { name: "New opportunity", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Make room for possibility" }),
  ).toBeVisible();
  await page.goto("/#/activity");
  await expect(
    page.getByRole("heading", { name: "A little breathing room" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Plan a next step", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByLabel("Follow-up title"),
  ).toBeVisible();
});
