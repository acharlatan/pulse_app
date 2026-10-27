import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("Studio branding, responsive screens and contextual controls", async ({
  page,
}, info) => {
  test.setTimeout(240000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await expect(page.locator("main h1")).toBeVisible();
  for (const route of [
    "/",
    "/network",
    "/pipeline",
    "/activity",
    "/network/people/contact-0",
    "/analytics",
    "/automations",
    "/settings",
  ]) {
    await page.goto(`/#${route}`);
    await expect(page.locator("main h1")).toBeVisible();
    for (const theme of ["light", "dark"]) {
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
      }, theme);
      for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${route} ${theme} ${width}`,
        ).toBe(true);
        if ([390, 1440].includes(width))
          await page.screenshot({
            path: `/tmp/studio14-${info.project.name}-${route.replaceAll("/", "-") || "home"}-${theme}-${width}.png`,
            fullPage: true,
          });
      }
      const result = await new AxeBuilder({ page }).analyze();
      expect.soft(result.violations, `${route} ${theme}`).toEqual([]);
    }
  }
  await page.goto("/#/pipeline");
  const stage = page
    .getByRole("navigation", { name: "Pipeline stage overview" })
    .getByRole("button")
    .first();
  await stage.click();
  await expect(stage).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".pipeline-column")).toHaveCount(1);
  await stage.click();
  await expect(stage).toHaveAttribute("aria-pressed", "false");
  await page.goto("/#/activity");
  await page
    .getByRole("navigation", { name: "Follow-up overview" })
    .getByRole("button", { name: /Overdue/ })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Filter tasks" }),
  ).toHaveValue("overdue");
});
