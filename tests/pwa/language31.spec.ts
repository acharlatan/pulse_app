import { test, expect } from "@playwright/test";

test("stored interface translations work offline without translation requests", async ({ page, context }) => {
  test.setTimeout(90000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.getByRole("heading", { name: "Today.", exact: true }).waitFor();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true }));
  });
  const external: string[] = [];
  page.on("request", (request) => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== new URL(page.url()).origin) external.push(request.url());
  });
  await context.setOffline(true);
  await page.getByRole("button", { name: "Open workspace menu" }).click();
  await page.locator(".unified-profile-dropdown select").selectOption("es-ES");
  await page.goto("/#/network");
  await expect(page.getByText("Cada conexión tiene un próximo capítulo.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Cada conexión tiene un próximo capítulo.")).toBeVisible();
  expect(external).toEqual([]);
  await context.setOffline(false);
});
