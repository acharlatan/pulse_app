import { expect, test } from "@playwright/test";

test("visual Analytics charts open their underlying records", async ({page}) => {
  await page.goto("/");
  await page.getByRole("button",{name:/Explore Demo/}).click();
  await page.goto("/#/analytics");
  const chart=page.getByLabel("Conversation activity by date");
  await expect(chart).toBeVisible();
  await chart.getByRole("button").last().click();
  await expect(page.locator("#conversation-records")).toContainText("Conversations ·");
  await expect(page.locator("#conversation-records")).toBeFocused();
  await expect(page.getByLabel("Analytics sections").getByRole("button",{name:/Relationships/})).toHaveAttribute("aria-pressed","true");
  await page.getByLabel("Analytics sections").getByRole("button",{name:/Opportunities/}).click();
  await page.locator(".pulse-stage-list button").first().click();
  await expect(page.locator(".pulse-selected-stage")).toBeVisible();
  await page.locator(".pulse-selected-stage > button").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button",{name:"Close dialog"}).click();
  await page.getByLabel("Analytics sections").getByRole("button",{name:/Commitments/}).click();
  await expect(page.getByLabel("Follow-up overview")).toBeVisible();
  await page.locator(".pulse-upcoming > button").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("Analytics visual reports fit supported widths",async({page})=>{
  await page.goto("/"); await page.getByRole("button",{name:/Explore Demo/}).click(); await page.goto("/#/analytics");
  for(const theme of ["light","dark"]) {
    await page.evaluate(t=>{document.documentElement.dataset.theme=t;},theme);
    for(const section of ["Overview","Relationships","Opportunities","Commitments"]) {
      await page.getByLabel("Analytics sections").getByRole("button",{name:new RegExp(section)}).click();
      for(const width of [320,375,390,430,768,1024,1280,1440]) {
        await page.setViewportSize({width,height:900});
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${theme} ${section} ${width}`).toBe(true);
      }
    }
  }
});
