import { expect, test } from "@playwright/test";

test("Orbit starting points lead to saved work and preserve the selection trail", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.goto("/#/orbit");
  const radar = page.getByLabel("Orbit starting points");
  await expect(radar.getByText("Linked follow-ups due")).toBeVisible();
  await radar.locator(".followups .orbit-signal").first().click();
  const detail = page.getByRole("complementary", { name: "Selected relationship" });
  await expect(detail).toBeVisible();
  await expect(page.getByLabel("Map filters").getByRole("button", { name: "Follow-ups" })).toHaveAttribute("aria-pressed", "true");
  await expect(detail.getByRole("heading", { name: "Open opportunities" })).toBeVisible();
  const selectedName = await detail.locator("h2").innerText();
  const linked = detail.locator(".orbit-link-cards button").first();
  await linked.click();
  await expect(detail.getByRole("button", {name:/Back to previous selection/})).toBeVisible();
  await expect(detail.locator("h2")).toBeFocused();
  await detail.getByRole("button", {name:/Back to previous selection/}).click();
  await expect(detail.locator("h2")).toHaveText(selectedName);
  await detail.locator(".orbit-workbench-block").filter({has:page.getByRole("heading",{name:"Open opportunities"})}).locator(".orbit-activity-entry").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("Orbit fits supported widths in both themes", async ({page}) => {
  await page.goto("/");
  await page.getByRole("button", {name:/Explore Demo/}).click();
  await page.goto("/#/orbit");
  await page.locator(".orbit-radar .followups .orbit-signal").first().click();
  for (const theme of ["light", "dark"]) {
    await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
    for (const width of [320,375,390,430,768,1024,1280,1440]) {
      await page.setViewportSize({width,height:900});
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${theme} ${width}`).toBe(true);
    }
  }
});
