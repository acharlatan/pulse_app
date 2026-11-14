import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const widths = [320, 375, 390, 430, 768, 1024, 1280, 1440];
const routes = ["/", "/focus", "/network", "/orbit", "/pipeline", "/activity", "/analytics", "/help", "/network/people/contact-0", "/network/companies/org-0"];

test("release surfaces fit every supported width and both saved themes", async ({ page }, info) => {
  test.setTimeout(240000);
  // This matrix is shared, rather than repeating it in both viewport projects.
  test.skip(info.project.name !== "desktop", "shared responsive matrix");
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  for (const theme of ["light", "dark"]) {
    await page.goto("/#/settings");
    await page.getByRole("button", { name: theme === "light" ? "Light" : "Dark", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    for (const route of routes) {
      await page.goto("/#" + route);
      await expect(page.locator("main h1")).toBeVisible();
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        // Changing width crosses Orbit's map/list breakpoint; allow its real
        // layout and React media-query listener to finish before measuring.
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), { message: `${theme} ${width} ${route}` }).toBe(true);
        if ((width === 390 || width === 1440) && ["/", "/orbit", "/pipeline", "/analytics", "/help"].includes(route)) {
          await page.screenshot({ path: info.outputPath(`${route === "/" ? "daily" : route.slice(1)}-${theme}-${width}.png`), fullPage: true });
        }
      }
    }
  }
});

test("core screens have no serious automated accessibility findings", async ({ page }, info) => {
  test.setTimeout(180000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  for (const theme of ["light", "dark"]) {
    await page.goto("/#/settings");
    await page.getByRole("button", { name: theme === "light" ? "Light" : "Dark", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    for (const route of ["/", "/network", "/orbit", "/pipeline", "/analytics", "/help"]) {
      await page.goto("/#" + route);
      await expect(page.locator("main h1")).toBeVisible();
      const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      await info.attach(`${theme}-${route || "daily"}-axe`, { body: JSON.stringify(audit.violations), contentType: "application/json" });
      expect(audit.violations.filter(v => v.impact === "serious" || v.impact === "critical"), `${theme} ${route}: ${audit.violations.map(v => v.id).join(", ")}`).toEqual([]);
    }
  }
});

test("appearance shortcut persists and guide links open the real screens", async ({ page }, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await expect(page.locator("main h1")).toBeVisible();
  if (info.project.name === "mobile") await page.getByRole("button", { name: "Open workspace menu", exact: true }).click();
  await page.getByRole("button", { name: "Switch to dark mode", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator(".footer-links").getByRole("link", { name: "Getting started", exact: true }).click();
  await expect(page.getByRole("heading", { name: "A little guidance.", exact: true })).toBeVisible();
  await expect(page.locator(".workspace-guide-card")).toHaveCount(5);
  await page.locator(".workspace-guide-card").filter({ hasText: "See what connects." }).click();
  await expect(page.getByRole("heading", { name: "Relationship Orbit.", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("empty personal workspace stays useful without demo records", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Create My Workspace/ }).click();
  await expect(page.getByRole("heading", { name: "Today.", exact: true })).toBeVisible();
  await expect(page.locator(".world-person")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Start with a person. Give the next step a home.", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "New connection", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Full name", { exact: true })).toBeVisible();
  const dialog = await page.getByRole("dialog").boundingBox();
  const viewport = page.viewportSize()!;
  expect(dialog!.x).toBeGreaterThanOrEqual(0);
  expect(dialog!.x + dialog!.width).toBeLessThanOrEqual(viewport.width);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("completed follow-ups show the completion time and keep the original due date on reopening", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.goto("/#/network/people/contact-0");
  await page.getByRole("button", { name: "Follow up", exact: true }).first().click();
  await page.getByLabel("Follow-up title").fill("Fictional release date-label regression");
  await page.getByRole("button", { name: "Save follow-up", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const card = page.locator("#next-steps .managed-task").filter({ hasText: "Fictional release date-label regression" });
  const due = await card.locator("time").getAttribute("datetime");
  expect(due).toBeTruthy();
  const started = Date.now();
  await card.getByRole("button", { name: "Complete", exact: true }).click();
  await expect(card.getByRole("button", { name: "Reopen", exact: true })).toBeVisible();
  const completed = await card.locator("time").getAttribute("datetime");
  expect(completed).not.toBe(due);
  expect(Date.parse(completed!)).toBeGreaterThanOrEqual(started - 1000);
  expect(Date.parse(completed!)).toBeLessThanOrEqual(Date.now());
  await card.getByRole("button", { name: "Reopen", exact: true }).click();
  await expect(card.getByRole("button", { name: "Complete", exact: true })).toBeVisible();
  await expect(card.locator("time")).toHaveAttribute("datetime", due!);
});
