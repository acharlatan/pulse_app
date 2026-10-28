import {test, expect} from "@playwright/test";
test("fictional demo portraits remain available offline", async ({page,context}) => {
  await page.goto("/");
  await page.getByRole("button", {name:/Explore Demo/}).click();
  await page.locator(".daily-inspector .avatar").first().waitFor();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), {once:true})); });
  await context.setOffline(true);
  await page.reload();
  const avatar=page.locator(".daily-inspector .avatar").first();
  await expect(avatar).toHaveCSS("background-image", /demo-portraits/);
  const imageOk=await avatar.evaluate(async el => {
    const css=getComputedStyle(el).backgroundImage;
    const url=css.match(/url\(["']?(.*?)["']?\)/)?.[1];
    if (!url) return false;
    const res=await fetch(url);
    return res.ok && (await res.blob()).size > 1000;
  });
  expect(imageOk).toBe(true);
  await context.setOffline(false);
});
