import { test, expect, type Page } from "@playwright/test";
async function enable(page: Page) {
  await page.goto("/#/settings");
  await page
    .getByRole("button", { name: "Your momentum", exact: true })
    .click();
  await page
    .getByLabel("Earn XP from meaningful work", { exact: true })
    .check();
  await page
    .getByLabel("Weekly follow-up goal (0 disables)", { exact: true })
    .fill("1");
  await page
    .getByRole("button", { name: "Save progress preferences", exact: true })
    .click();
  await expect(page.locator(".toast")).toContainText(
    "Progress preferences saved",
  );
}
async function createPerson(page: Page) {
  await page.goto("/#/network");
  await page
    .locator(".page-heading")
    .getByRole("button", { name: "Add person", exact: true })
    .click();
  await page
    .getByLabel("Full name", { exact: true })
    .fill("Fictional Progress Example");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await page
    .locator(".profile-card")
    .filter({ hasText: "Fictional Progress Example" })
    .click();
  return page.url();
}
test("personal productivity earns once, corrects, persists and backs up without replay", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.getByRole("button", { name: /Create my workspace/i }).click();
  await enable(page);
  const personURL = await createPerson(page);
  await page.getByRole("button", { name: "Follow up", exact: true }).click();
  await page
    .getByLabel("Follow-up title")
    .fill("Review the agreed partnership plan");
  const due = new Date();
  due.setHours(23, 0, 0, 0);
  const local = new Date(due.getTime() - due.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  await page.getByLabel("Due date and time").fill(local);
  await page
    .getByRole("button", { name: "Save follow-up", exact: true })
    .click();
  await page.goto("/#/activity?view=progress");
  await expect(page.locator(".quest-row")).toHaveCount(1);
  await page
    .locator(".quest-row")
    .getByRole("button", { name: "Complete", exact: true })
    .click();
  await expect(page.locator(".momentum-summary")).toContainText("5 XP");
  await expect(
    page.locator(".quest-row").getByText("Completed", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.locator(".milestone").filter({ hasText: "A promise kept" }),
  ).toContainText("Unlocked");
  await expect(
    page.locator(".milestone").filter({ hasText: "Your weekly intention" }),
  ).toContainText("Unlocked");
  await page
    .locator(".quest-row")
    .getByRole("button", { name: "Reopen", exact: true })
    .click();
  await expect(page.locator(".momentum-summary")).toContainText("0 XP");
  await page
    .locator(".quest-row")
    .getByRole("button", { name: "Complete", exact: true })
    .click();
  await expect(page.locator(".momentum-summary")).toContainText("5 XP");
  await page.goto(personURL);
  await page
    .getByRole("button", { name: "Log interaction", exact: true })
    .click();
  await page.locator('select[name="type"]').selectOption("Meeting");
  await page
    .getByLabel("What would you like to remember?")
    .fill(
      "Discussed the complete partnership schedule and agreed on the next milestone review.",
    );
  await page
    .getByRole("button", { name: "Save interaction", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/#/activity?view=progress");
  await expect(page.locator(".momentum-summary")).toContainText("15 XP");
  await page.reload();
  await expect(page.locator(".momentum-summary")).toContainText("15 XP");
  await expect(page.locator(".reward-history")).toHaveCount(4);
  await page.goto("/#/settings");
  await page
    .getByRole("button", { name: "Your momentum", exact: true })
    .click();
  await page
    .getByLabel("Allow subtle success animations", { exact: true })
    .uncheck();
  await page.getByLabel("Show progress widgets", { exact: true }).uncheck();
  await page
    .getByRole("button", { name: "Save progress preferences", exact: true })
    .click();
  await expect(page.locator(".toast")).toContainText(
    "Progress preferences saved",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Your momentum", exact: true })
    .click();
  await expect(
    page.getByLabel("Allow subtle success animations", { exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByLabel("Show progress widgets", { exact: true }),
  ).not.toBeChecked();
  await page.goto("/#/activity?view=progress");
  await expect(page.locator(".momentum-summary")).toHaveCount(0);
  await expect(page.locator(".reward-history")).toHaveCount(4);
  await page.goto("/#/activity");
  await page.getByLabel("Filter tasks").selectOption("complete");
  await expect(page.locator(".managed-task")).toHaveCount(1);
  await page.getByLabel("Filter tasks").selectOption("upcoming");
  await expect(page.locator(".managed-task")).toHaveCount(0);
  await page.goto("/#/settings");
  await page
    .getByRole("button", { name: "Privacy & data", exact: true })
    .click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = await pending;
  const backupPath = await download.path();
  expect(backupPath).toBeTruthy();
  await page.locator('input[type="file"]').setInputFiles(backupPath!);
  await expect(page.getByRole("dialog")).toContainText("Compatible backup v3");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
});

test("progress, preferences and task views fit all supported widths and both themes", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await enable(page);
  for (const theme of ["light", "dark"]) {
    await page.goto("/#/settings");
    await page
      .getByRole("button", {
        name: theme === "light" ? "Light" : "Dark",
        exact: true,
      })
      .click();
    for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ["/activity?view=progress", "/activity", "/"]) {
        await page.goto("/#" + route);
        await expect(page.locator("main h1")).toBeVisible();
        if (route.includes("progress"))
          await expect(
            page.getByText("Reward & correction history", { exact: true }),
          ).toBeVisible();
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth,
          ),
          `${theme} ${width} ${route}`,
        ).toBe(true);
        if (
          route.includes("progress") &&
          (width === 390 || width === 1440) &&
          info.project.name === "mobile"
        )
          await page.screenshot({
            path: info.outputPath(`momentum-${theme}-${width}.png`),
            fullPage: true,
          });
      }
      await page.goto("/#/settings");
      await page
        .getByRole("button", { name: "Your momentum", exact: true })
        .click();
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);
      const save = page.getByRole("button", {
        name: "Save progress preferences",
        exact: true,
      });
      await save.scrollIntoViewIfNeeded();
      const box = await save.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(box!.y + box!.height).toBeLessThanOrEqual(width < 768 ? 810 : 900);
    }
  }
});
