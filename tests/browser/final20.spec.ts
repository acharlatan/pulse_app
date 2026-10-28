import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("weekly review and relationship context remain usable across screen sizes", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.getByRole("heading", { name: "Today.", exact: true }).waitFor();
  for (const route of ["/analytics", "/network", "/network/people/contact-0"]) {
    await page.goto("/#" + route);
    await expect(page.locator("main h1")).toBeVisible();
    for (const theme of ["light", "dark"]) {
      await page.evaluate(
        (t) => (document.documentElement.dataset.theme = t),
        theme,
      );
      for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${route} ${width}`,
        ).toBe(true);
        if (width === 390 || width === 1440)
          await page.screenshot({
            path: info.outputPath(
              `${route.split("/").filter(Boolean).join("-")}-${theme}-${width}.png`,
            ),
            fullPage: true,
          });
      }
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
  }
  await page.goto("/#/analytics");
  await page
    .getByRole("heading", { name: "See what moved. Decide what matters." })
    .waitFor();
  await page
    .getByRole("button", { name: "Explore this week’s conversations" })
    .click();
  await expect(page.getByLabel("Date range")).toHaveValue("7");
  await expect(
    page
      .getByRole("navigation", { name: "Analytics sections" })
      .getByRole("button", { name: "Relationships", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
