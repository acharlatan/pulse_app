import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("the living constellation keeps people and Orbit useful across themes and sizes", async ({ page }, info) => {
  test.setTimeout(180000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await expect(page.getByRole("heading", { name: "Today.", exact: true })).toBeVisible();
  await expect(page.locator(".constellation-scene-home")).toBeVisible();
  await expect(page.getByRole("link", { name: /Enter Orbit/ })).toBeVisible();
  for (const [route, selector] of [["/", ".pulse-opening"], ["/network", ".network-recent"], ["/orbit", ".orbit-viewport"]] as const) {
    await page.goto(`/#${route}`);
    await expect(page.locator(selector)).toBeVisible();
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
      for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} ${theme} ${width}`).toBe(true);
      }
      await page.setViewportSize({ width: info.project.name === "mobile" ? 390 : 1440, height: 900 });
      await expect(page.locator(selector)).toBeVisible();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, `${route} ${theme}: ${JSON.stringify(results.violations.map(v => ({id:v.id, nodes:v.nodes.map(n=>n.target)})))}`).toEqual([]);
      await page.screenshot({ path: info.outputPath(`${route === '/' ? 'home' : route.slice(1)}-${theme}.png`), fullPage: true });
    }
  }
  await page.goto("/#/network");
  await expect(page.getByRole("button", { name: "Cards", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Compact list", exact: true }).click();
  await expect(page.locator(".directory-list")).toBeVisible();
  await page.getByRole("button", { name: "Cards", exact: true }).click();
  await page.getByLabel("Search network").fill("Olivia");
  await expect(page.locator("#directory-results")).toContainText("Olivia");
  await page.goto("/#/orbit");
  await page.getByRole("button", { name: "2D map" }).click();
  await expect(page.locator(".constellation-scene-orbit")).toBeVisible();
  await page.locator(".orbit-node.person").first().click();
  await expect(page.getByRole("complementary", { name: "Selected relationship" })).toBeVisible();
  await expect(page.locator(".orbit-record-list")).toBeVisible();
});

test("reduced motion leaves a static scene and a usable map", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await expect(page.getByRole("heading", { name: "Today.", exact: true })).toBeVisible();
  await expect(page.locator(".opening-art-fallback")).toBeAttached();
  await page.goto("/#/orbit");
  await expect(page.locator(".orbit-viewport")).toBeVisible();
  await expect(page.locator(".orbit-record-list")).toBeVisible();
});
