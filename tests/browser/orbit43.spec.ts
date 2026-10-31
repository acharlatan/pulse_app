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
  await expect(detail.getByRole("button", { name: /Open opportunities/ })).toBeVisible();
  const selectedName = await detail.locator("h2").innerText();
  const linked = detail.locator(".orbit-inspector-links button").first();
  await linked.click();
  await expect(detail.getByRole("button", {name:/Back to previous selection/})).toBeVisible();
  await expect(detail.locator("h2")).toBeFocused();
  await detail.getByRole("button", {name:/Back to previous selection/}).click();
  await expect(detail.locator("h2")).toHaveText(selectedName);
  await detail.getByRole("button", {name:/Open opportunities/}).click();
  await detail.locator(".orbit-inspector-records button").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("focused map follows explicit saved connections and returns to the original map", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.goto("/#/orbit");
  await page.locator(".orbit-list-item").filter({hasText:"Olivia Chen"}).click();
  const detail = page.getByRole("complementary", { name: "Selected relationship" });
  await detail.getByRole("button", {name:"Focus saved connections"}).click();
  await expect(page.locator(".orbit-focus-notice")).toContainText("Olivia Chen");
  await expect(page.locator(".orbit-viewport .orbit-node, .orbit-viewport .orbit-3d-node")).toHaveCount(3);
  await detail.getByRole("button", {name:/Forma Studio Works at/}).click();
  await expect(detail.locator("h2")).toHaveText("Forma Studio");
  await expect(page.locator(".orbit-viewport .orbit-node, .orbit-viewport .orbit-3d-node")).toHaveCount(5);
  await detail.getByRole("button", {name:/Back to previous selection/}).click();
  await expect(detail.locator("h2")).toHaveText("Olivia Chen");
  await detail.getByRole("button", {name:"Return to map"}).click();
  await expect(page.locator(".orbit-focus-notice")).toHaveCount(0);
  const is3d = await page.getByRole("button", {name:"3D Orbit"}).getAttribute("aria-pressed") === "true";
  const expected = test.info().project.name === "mobile" ? (is3d ? 12 : 18) : 24;
  await expect(page.locator(".orbit-viewport .orbit-node, .orbit-viewport .orbit-3d-node")).toHaveCount(expected);
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
