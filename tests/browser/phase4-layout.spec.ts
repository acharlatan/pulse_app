import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const widths = [320, 375, 390, 430, 768, 1024, 1280, 1440];
const routes = [
  "/", "/network", "/network/people/contact-0", "/pipeline",
  "/activity", "/orbit", "/analytics", "/settings?section=data",
];

for (const theme of ["light", "dark"] as const) {
  for (const accent of ["periwinkle", "forest", "coral", "blue"] as const) {
    test(`${theme} / ${accent}: essential screens and person editor reflow`, async ({ page }, info) => {
      test.setTimeout(240000);
      await page.goto("/");
      await page.getByRole("button", { name: /Explore Demo/ }).click();
      await page.goto("/#/settings");
      await page.getByRole("button", { name: theme === "light" ? "Light" : "Dark", exact: true }).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await page.getByLabel("Accent preset").selectOption(accent);
      await expect(page.locator("html")).toHaveAttribute("data-accent", accent);
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        for (const route of routes) {
          await page.goto(`/#${route}`);
          await expect(page.locator("main h1")).toBeVisible();
          expect.soft(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${theme}/${accent} ${width}px ${route}`).toBe(true);
          if (route === "/network" && (width === 390 || width === 1440)) {
            const report = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
            expect.soft(report.violations, `${theme}/${accent} ${width}px network axe`).toEqual([]);
          }
          if (route === "/network" && accent === "periwinkle" && (width === 320 || width === 1440)) {
            await page.screenshot({ path: info.outputPath(`${theme}-${accent}-${width}.png`) });
          }
        }
        await page.goto("/#/network/people/contact-0");
        await page.getByRole("button", { name: "Edit profile", exact: true }).click();
        const dialog = page.getByRole("dialog");
        await expect(dialog.getByLabel("Full name")).toBeVisible();
        const bounds = await dialog.boundingBox();
        expect(bounds, `${theme}/${accent} ${width}px dialog`).not.toBeNull();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
        expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
        const save = dialog.getByRole("button", { name: "Save person", exact: true });
        await save.scrollIntoViewIfNeeded();
        const saveBounds = await save.boundingBox();
        expect(saveBounds).not.toBeNull();
        expect(saveBounds!.x).toBeGreaterThanOrEqual(0);
        expect(saveBounds!.x + saveBounds!.width).toBeLessThanOrEqual(width);
        expect(saveBounds!.y + saveBounds!.height).toBeLessThanOrEqual(900);
        await dialog.getByRole("button", { name: "Cancel", exact: true }).scrollIntoViewIfNeeded();
        await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
      }
      await page.goto("/#/network");
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.locator("main h1")).toBeVisible();
      await page.screenshot({ path: info.outputPath(`${theme}-${accent}-390.png`) });
      console.log(`PHASE4_LAYOUT ${JSON.stringify({ theme, accent, widths, routes, editor: "person" })}`);
    });
  }
}
