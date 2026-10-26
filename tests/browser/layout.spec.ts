import { test, expect } from "@playwright/test";
test("all primary screens and editors fit supported widths in both themes", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  const routes = [
    "/",
    "/network",
    "/network/companies/org-0",
    "/network/people/contact-0",
    "/pipeline",
    "/activity",
    "/settings",
    "/review",
    "/lists",
    "/import",
  ];
  for (const theme of ["light", "dark"]) {
    await page.goto("/#/settings");
    await page
      .getByRole("button", {
        name: theme === "light" ? "Light" : "Dark",
        exact: true,
      })
      .click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of routes) {
        await page.goto("/#" + route);
        await expect(
          page
            .locator("main .page:visible")
            .filter({ has: page.locator("h1") }),
        ).toBeVisible();
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth,
          ),
          `${theme} ${width} ${route}`,
        ).toBe(true);
      }
      if (width >= 768)
        expect(
          await page
            .locator(".sidebar")
            .evaluate((el) => el.scrollWidth <= el.clientWidth),
          "sidebar text wraps within the navigation rail",
        ).toBe(true);
      await page.goto("/#/network/people/contact-0");
      await expect(
        page.getByRole("button", { name: "Edit profile", exact: true }),
      ).toBeVisible();
      for (const name of [
        "Edit profile",
        "Create opportunity",
        "Manage availability",
      ]) {
        await page.getByRole("button", { name, exact: true }).click();
        const d = page.getByRole("dialog");
        await expect(d).toBeVisible();
        const b = await d.boundingBox();
        expect(b!.x).toBeGreaterThanOrEqual(0);
        expect(b!.x + b!.width).toBeLessThanOrEqual(width);
        expect(b!.y).toBeGreaterThanOrEqual(0);
        expect(b!.y + b!.height).toBeLessThanOrEqual(900);
        expect(await d.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
          true,
        );
        await page.getByRole("button", { name: "Cancel", exact: true }).click();
      }
      if ((width === 390 || width === 1440) && info.project.name === "mobile") {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: info.outputPath(`profile-${theme}-${width}.png`),
          fullPage: true,
        });
      }
    }
  }
});
