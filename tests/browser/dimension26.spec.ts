import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("dimensional dashboard retains navigation and supports reduced motion", async ({page}) => {
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto("/"); await page.getByRole("button",{name:/Explore Demo/}).click();
  await expect(page.getByRole("heading",{name:"Today.",exact:true})).toBeVisible();
  await expect(page.locator(".pulse-opening")).toBeVisible();
  await expect(page.locator(".pulse-atmosphere canvas")).toHaveCount(0);
  for (const theme of ["light","dark"]) {
    await page.evaluate(t=>{document.documentElement.dataset.theme=t;},theme);
    for (const width of [320,375,390,430,768,1024,1280,1440]) {await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${theme} ${width}`).toBe(true);}
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  }
});
