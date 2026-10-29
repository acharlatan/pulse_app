import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("unified workspaces, editable lists and interactive 3D preserve the core journeys", async ({ page }, info) => {
  test.setTimeout(240000);
  page.setDefaultTimeout(10000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await expect(page.getByRole("heading", { name: "Today.", exact: true })).toBeVisible();
  await expect(page.locator(".sidebar")).toHaveCount(0);
  const nav = page.getByRole("navigation", { name: info.project.name === "mobile" ? "Mobile navigation" : "Main areas" });
  await expect(nav.getByRole("link")).toHaveCount(4);
  await page.getByRole("link", { name: "My Focus", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "My Focus.", exact: true })).toBeVisible();
  await expect(page.getByText("Example priorities", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Daily Pulse", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Today.", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Rotate artwork right" })).toBeVisible();
  const homeCanvas = page.locator(".constellation-scene-home canvas");
  await expect(homeCanvas).toBeVisible();
  const homeBefore = await homeCanvas.screenshot();
  await page.getByRole("button", { name: "Rotate artwork right" }).click();
  const homeAfter = await homeCanvas.screenshot();
  expect(homeAfter.equals(homeBefore)).toBe(false);
  await nav.getByRole("link", { name: "People" }).click();
  await expect(page.getByRole("heading", { name: "Network.", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Manage lists" }).click();
  await expect(page.getByRole("region", { name: "Manage saved lists" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Smart List" })).toBeVisible();
  await page.getByRole("navigation", { name: "People views" }).getByRole("link", { name: "Orbit", exact: true }).click();
  await expect(page.getByRole("button", { name: "3D Orbit" })).toHaveAttribute("aria-pressed", "true");
  const orbitCanvas = page.locator(".orbit-world canvas");
  await expect(orbitCanvas).toBeVisible();
  const before = await orbitCanvas.screenshot({ path: info.outputPath("orbit-canvas.png") });
  await page.locator(".orbit-3d-node.person").filter({ hasText: "Olivia Chen" }).click();
  await expect(page.getByRole("complementary", { name: "Selected relationship" })).toContainText("Olivia Chen");
  await page.getByRole("button", { name: "Close selection" }).click();
  await page.getByRole("button", { name: "Rotate orbit right" }).click();
  const after = await orbitCanvas.screenshot();
  expect(after.equals(before)).toBe(false);
  await page.locator(".orbit-list-item").first().click();
  await expect(page.getByRole("complementary", { name: "Selected relationship" })).toBeVisible();
  await page.getByRole("button", { name: "2D map" }).click();
  await expect(page.locator(".orbit-node").first()).toBeAttached();
  await nav.getByRole("link", { name: "Work" }).click();
  await expect(page.getByRole("heading", { name: "Pipeline.", exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "Work views" }).getByRole("link", { name: "Follow-ups & activity" }).click();
  await expect(page.getByRole("heading", { name: "Activity.", exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "Work views" }).getByRole("link", { name: "Automations" }).click();
  await expect(page.getByRole("heading", { name: "Automations.", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open workspace menu" }).click();
  await expect(page.getByRole("link", { name: "Settings & backups" })).toBeVisible();
  await page.getByRole("link", { name: "Settings & backups" }).click();
  await expect(page.locator(".settings-page")).toBeVisible();
  for (const route of ["/", "/focus", "/network", "/orbit", "/review", "/pipeline", "/activity", "/automations", "/analytics", "/settings"]) {
    await page.goto(`/#${route}`);
    await expect(page.locator("main h1").first()).toBeVisible();
    for (const theme of ["light", "dark"]) {
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} ${theme} ${width}`).toBe(true);
      }
      await page.setViewportSize({ width: info.project.name === "mobile" ? 390 : 1440, height: 900 });
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, `${route} ${theme}: ${JSON.stringify(results.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })))}`).toEqual([]);
      if (["/", "/orbit", "/pipeline", "/analytics"].includes(route)) await page.screenshot({ path: info.outputPath(`${route === '/' ? 'home' : route.slice(1)}-${theme}.png`), fullPage: true });
    }
  }
});


test("Orbit falls back to the accessible map when WebGL is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type.includes("webgl")) return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await expect(page.getByRole("heading", { name: "Today.", exact: true })).toBeVisible();
  await page.goto("/#/orbit");
  await expect(page.getByText("3D is unavailable on this device.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "2D map" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".orbit-node").first()).toBeAttached();
  await expect(page.locator(".orbit-record-list")).toBeVisible();
});
