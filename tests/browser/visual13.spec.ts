import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("visual workspace additions fit both themes and navigate to working features", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await expect(page.getByRole("heading", { name: /^Today\./ })).toBeVisible();
  for (const theme of ["light", "dark"]) {
    await page.evaluate((t) => {
      document.documentElement.dataset.theme = t;
    }, theme);
    for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if ([390, 1440].includes(width))
        await page.screenshot({
          path: `/tmp/pulse-visual-${info.project.name}-${theme}-${width}.png`,
          fullPage: true,
        });
    }
    const results = await new AxeBuilder({ page }).include("main").analyze();
    expect(results.violations).toEqual([]);
  }
  await page
    .getByRole("link", { name: "Open network", exact: true })
    .click();
  await expect(page).toHaveURL(/network/);
  await page.getByText("Directory tools", {exact:true}).click();
  await page.locator(".network-tools").getByRole("link", {name:"Relationship Orbit", exact:true}).click();
  await expect(page).toHaveURL(/orbit/);
});
