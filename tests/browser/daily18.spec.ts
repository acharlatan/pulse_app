import fs from "node:fs";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function start(page: import("@playwright/test").Page, personal = false) {
  await page.goto("/");
  await page
    .getByRole("button", {
      name: personal ? /Create My Workspace/ : /Explore Demo/,
    })
    .click();
  await page.getByRole("heading", { name: "Today.", exact: true }).waitFor();
}
test("Daily Pulse chooses, reschedules and completes a saved commitment in place", async ({
  page,
}) => {
  test.setTimeout(120000);
  await start(page);
  const suggestion = page
      .locator(".daily-suggestion")
      .filter({ hasText: "Keep a commitment" })
      .first(),
    title = await suggestion.locator("h3").innerText();
  await expect(page.locator(".daily-suggestion")).toHaveCount(3);
  await suggestion
    .getByRole("button", { name: "Choose today", exact: true })
    .click();
  const chosen = page
    .locator(".daily-chosen-list li")
    .filter({ hasText: title });
  await expect(chosen).toHaveCount(1);
  const inspector = page.locator(".daily-inspector");
  await expect(inspector.locator("h2")).toHaveText(title);
  await expect(inspector.locator("h2")).toBeFocused();
  await inspector
    .getByRole("button", { name: "Open commitment", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Follow-up title")).toHaveValue(title);
  await dialog.getByLabel("Due date and time").fill("2028-03-04T14:00");
  await dialog
    .getByRole("button", { name: "Save follow-up", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(inspector).toContainText("Upcoming");
  await expect(inspector.locator("h2")).toHaveText(title);
  const before = Number(
    await page
      .locator(".daily-wrap-facts > div")
      .first()
      .locator("strong")
      .innerText(),
  );
  await inspector
    .getByRole("button", { name: "Mark complete", exact: true })
    .click();
  await expect(
    inspector.getByRole("button", { name: "Completed", exact: true }),
  ).toBeDisabled();
  await expect(inspector.locator("h2")).toHaveText(title);
  await expect(chosen).toContainText("Completed follow-up");
  await expect(
    page.locator(".daily-wrap-facts > div").first().locator("strong"),
  ).toHaveText(String(before + 1));
  await page.reload();
  await expect(chosen).toHaveCount(1);
  await chosen.getByRole("button").first().click();
  await expect(
    inspector.getByRole("button", { name: "Completed", exact: true }),
  ).toBeDisabled();
  await chosen.getByRole("button", { name: /Remove from today:/ }).click();
  await expect(chosen).toHaveCount(0);
  await page.goto("/#/focus");
  await expect(
    page.locator(".focus-row").filter({ hasText: title }),
  ).toHaveCount(1);
  await page.goto("/#/settings?section=data");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const backup = JSON.parse(
    fs.readFileSync(await (await pending).path(), "utf8"),
  );
  expect(backup.version).toBe(6);
  expect(
    backup.tasks.find((t: { title: string }) => t.title === title),
  ).toMatchObject({
    dueAt: expect.stringContaining("2028-03-04"),
    completedAt: expect.any(String),
  });
  expect(
    backup.focusItems.some((f: { today: string | null }) => f.today === null),
  ).toBe(true);
});
test("Daily Pulse offers non-task context and stays accessible in both themes at eight widths", async ({
  page,
}, info) => {
  test.setTimeout(240000);
  await start(page);
  const opportunity = page
    .locator(".daily-suggestion")
    .filter({ hasText: "Protect an opportunity" });
  await opportunity
    .getByRole("button", { name: "Inspect", exact: true })
    .click();
  await page
    .locator(".daily-inspector")
    .getByRole("button", { name: "Review opportunity", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  const person = page
    .locator(".daily-suggestion")
    .filter({ hasText: "Renew a connection" });
  await person
    .getByRole("button", { name: "Choose today", exact: true })
    .click();
  await expect(
    page
      .locator(".daily-inspector")
      .getByRole("link", { name: "Open profile", exact: true }),
  ).toBeVisible();
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
        `${theme} ${width}`,
      ).toBe(true);
      if ([390, 1440].includes(width)) {
        await page.evaluate(() => {
          (document.activeElement as HTMLElement)?.blur();
          window.scrollTo(0, 0);
        });
        await page.screenshot({
          path: info.outputPath(`daily-${theme}-${width}.png`),
          fullPage: true,
        });
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
      }
    }
  }
  await page.getByText("How are these suggested?", { exact: true }).click();
  await expect(page.locator(".daily-explanation")).toContainText(
    "never permission to contact",
  );
  await page.getByText("See today’s evidence", { exact: true }).click();
  await expect(page.locator(".daily-wrap")).toContainText(
    "exclude notes and future entries",
  );
});
test("empty Personal offers a real next foundation and preserves guide preferences", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await start(page, true);
  await expect(page.locator(".getting-started-progress")).toContainText(
    "0 of 6",
  );
  await expect(page.locator(".daily-status-strip")).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Create your first opportunity",
      exact: true,
    }),
  ).not.toBeVisible();
  await page
    .getByRole("button", { name: "Add your first person", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByText("Explore all setup steps", { exact: true }).click();
  await page
    .getByRole("button", { name: "Create your first opportunity", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
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
      ).toBe(true);
    }
    await page.screenshot({
      path: info.outputPath(`first-use-${theme}.png`),
      fullPage: true,
    });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
  await page
    .getByRole("button", { name: "Hide guide on Home", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Your next connection starts here.",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Getting started", exact: true }),
  ).toBeVisible();
});

test("long saved follow-up context wraps on narrow screens", async ({
  page,
}) => {
  await start(page);
  await page
    .locator(".daily-inspector")
    .getByRole("button", { name: "Open commitment", exact: true })
    .click();
  const d = page.getByRole("dialog");
  const title = "A saved commitment with a very long title "
    .repeat(6)
    .slice(0, 290);
  await d.getByLabel("Follow-up title").fill(title);
  await d
    .getByRole("textbox", { name: "Details", exact: true })
    .fill("longunbrokencontext".repeat(70));
  await d.getByRole("button", { name: "Save follow-up", exact: true }).click();
  await expect(d).not.toBeVisible();
  await expect(page.locator(".daily-inspector h2")).toHaveText(title);
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("Home honors Focus visibility and layout without deleting chosen priorities", async ({
  page,
}) => {
  await start(page);
  const target = page.locator(".daily-suggestion").first(),
    title = await target.locator("h3").innerText();
  await target
    .getByRole("button", { name: "Choose today", exact: true })
    .click();
  await page.goto("/#/customize");
  await page
    .getByRole("combobox", { name: "Home layout", exact: true })
    .selectOption("focused");
  await page.getByRole("status").filter({ hasText: "Layout saved" }).waitFor();
  await expect(
    page.getByRole("combobox", { name: "Home layout", exact: true }),
  ).toHaveValue("focused");
  await page
    .getByRole("checkbox", { name: "Show My Focus on Home", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Show My Focus on Home", exact: true }),
  ).not.toBeChecked();
  await page
    .getByRole("status")
    .filter({ hasText: "Preference saved" })
    .waitFor();
  await page.goto("/#/");
  await expect(page.locator(".daily-chosen-list")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Your schedule", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".home-focused")).toHaveCount(1);
  const work = await page.locator(".daily-workspace").boundingBox(),
    suggestions = await page.locator(".daily-suggestions").boundingBox();
  expect(work!.y).toBeLessThan(suggestions!.y);
  await page.reload();
  await page.getByRole("heading", { name: "Today.", exact: true }).waitFor();
  await expect(
    page.getByRole("heading", { name: "Your schedule", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".daily-chosen-list")).toHaveCount(0);
  await page.goto("/#/focus");
  await expect(
    page.locator(".focus-row").filter({ hasText: title }),
  ).toHaveCount(1);
});
