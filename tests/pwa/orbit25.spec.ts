import {test,expect} from "@playwright/test";
test("demo identity and Orbit map remain available offline", async ({page,context})=>{
  await page.goto("/"); await page.getByRole("button",{name:/Explore Demo/}).click();
  await page.getByRole("heading",{name:"Today.",exact:true}).waitFor();
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller) await new Promise<void>(resolve=>navigator.serviceWorker.addEventListener("controllerchange",()=>resolve(),{once:true}));});
  await context.setOffline(true); await page.goto("/#/orbit");
  await expect(page.locator(".orbit-viewport")).toBeVisible();
  await expect(page.locator(".topbar-actions .avatar")).toHaveCSS("background-image",/demo-michelle/);
  const cached=await page.locator(".topbar-actions .avatar").evaluate(async el=>{const url=getComputedStyle(el).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1]; if(!url)return false;const r=await fetch(url);return r.ok&&(await r.blob()).size>1000;});
  expect(cached).toBe(true); await context.setOffline(false);
});
