import { test, expect } from "@playwright/test";

test("portrait Orbit and language choice work offline", async ({ page, context }) => {
  test.setTimeout(90000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.getByRole("heading", { name: "Today.", exact: true }).waitFor();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true }));
  });
  await context.setOffline(true);
  await page.goto("/#/orbit");
  await expect(page.locator(".orbit-world canvas")).toBeVisible();
  await expect(page.locator(".orbit-3d-node.person").filter({ hasText: "Olivia Chen" }).locator(".avatar")).toHaveCSS("background-image", /demo-portraits/);
  await page.getByRole("button", { name: "Open workspace menu" }).click();
  await page.locator(".unified-profile-dropdown select").selectOption("es-ES");
  await expect(page.locator("html")).toHaveAttribute("lang", "es-ES");
  await page.goto("/#/");
  await expect(page.getByRole("heading", { name: "Hoy.", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Hoy.", exact: true })).toBeVisible();
  await context.setOffline(false);
});
