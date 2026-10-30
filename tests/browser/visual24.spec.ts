import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("demo portraits, example priorities, navigation and themes", async ({page}, info) => {
  test.setTimeout(180000);
  await page.goto("/");
  await page.getByRole("button", {name:/Explore Demo/}).click();
  await expect(page.getByRole("heading", {name:"Today.", exact:true})).toBeVisible();
  const avatar = page.locator(".daily-inspector .avatar").first();
  await expect(avatar).toHaveCSS("background-image", /demo-portraits/);
  if (info.project.name === "desktop") {
    await expect(page.getByRole("navigation", {name:"Main areas"}).getByRole("link")).toHaveCount(4);
    await expect(page.locator(".sidebar")).toHaveCount(0);
  }
  await page.goto("/#/focus");
  await page.getByRole("button", {name:"Add example priorities"}).click();
  await expect(page.locator(".focus-row")).toHaveCount(1);
  await page.getByRole("navigation", {name:"Focus views"}).getByRole("button", {name:/Saved for later/}).click();
  await expect(page.locator(".focus-row")).toHaveCount(2);
  await page.reload();
  await expect(page.locator(".focus-row")).toHaveCount(2);
  await page.getByRole("navigation", {name:"Focus views"}).getByRole("button", {name:/Today/}).click();
  await expect(page.locator(".focus-row")).toHaveCount(1);
  await page.goto("/#/");
  await page.getByRole("heading", {name:"Today.", exact:true}).waitFor();
  for (const theme of ["light", "dark"]) {
    await page.evaluate((t) => { document.documentElement.dataset.theme=t; }, theme);
    for (const width of [320,375,390,430,768,1024,1280,1440]) {
      await page.setViewportSize({width,height:900});
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${theme} ${width}`).toBe(true);
    }
    await page.setViewportSize({width: info.project.name === "mobile" ? 390 : 1440,height:900});
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
    await page.screenshot({path:info.outputPath(`visual24-${theme}.png`),fullPage:true});
  }
  await page.locator(".workspace-switcher summary").click();
  await page.getByRole("button", {name:"Open Personal",exact:true}).click();
  await page.goto("/#/focus");
  await expect(page.getByRole("button", {name:"Add example priorities"})).toHaveCount(0);
  await expect(page.locator(".focus-row")).toHaveCount(0);
});

test("the refreshed workspaces remain readable and usable across themes", async ({page}, info) => {
  test.setTimeout(180000);
  await page.goto("/");
  await page.getByRole("button", {name:/Explore Demo/}).click();
  for (const route of ["/network", "/pipeline", "/activity", "/analytics", "/review", "/focus", "/orbit", "/automations"]) {
    await page.goto(`/#${route}`);
    await expect(page.locator("main h1")).toBeVisible();
    for (const theme of ["light", "dark"]) {
      await page.evaluate((t) => { document.documentElement.dataset.theme=t; }, theme);
      for (const width of [320, 768, 1440]) {
        await page.setViewportSize({width,height:900});
        const overflow = await page.evaluate(() => ({ok: document.documentElement.scrollWidth <= innerWidth, items: [...document.querySelectorAll("*")].filter(el => el.getBoundingClientRect().right > innerWidth + 1).slice(0, 10).map(el => `${el.tagName}.${el.className}`)}));
        expect(overflow.ok, `${route} ${theme} ${width}: ${overflow.items.join(", ")}`).toBe(true);
      }
      await page.setViewportSize({width:info.project.name === "mobile" ? 390 : 1440,height:900});
      expect((await new AxeBuilder({page}).analyze()).violations, `${route} ${theme}`).toEqual([]);
    }
  }
});
