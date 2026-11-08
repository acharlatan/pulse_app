import { expect, test } from "@playwright/test";

test("deferring an update keeps an unfinished edit and saved data through an offline interruption", async ({ page, context }) => {
  test.setTimeout(90000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await expect(page.getByRole("heading", { name: "Today.", exact: true })).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true }));
  });
  await page.goto("/#/settings?section=relationships");
  await page.getByRole("textbox", { name: "Your preferred name" }).fill("Unfinished fictional edit");
  await page.request.post("/test/update");
  await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
  await expect(page.getByRole("button", { name: "Later", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Later", exact: true }).click();
  await expect(page.getByText("Update postponed. Your current session stays open.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Your preferred name" })).toHaveValue("Unfinished fictional edit");
  await context.setOffline(true);
  await expect(page.getByRole("button", { name: "Update & reload" })).toBeDisabled();
  await expect(page.getByRole("textbox", { name: "Your preferred name" })).toHaveValue("Unfinished fictional edit");
  await context.setOffline(false);
  await page.getByRole("button", { name: "Save your rhythm", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Preferences saved" })).toBeVisible();
  const updatedPage = page.waitForEvent("load");
  await page.getByRole("button", { name: "Update & reload" }).click();
  await updatedPage;
  await expect(page.getByRole("textbox", { name: "Your preferred name" })).toHaveValue("Unfinished fictional edit");
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Your preferred name" })).toHaveValue("Unfinished fictional edit");
});

test("an interrupted worker update leaves saved work available offline", async ({ page, context }) => {
  test.setTimeout(90000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true }));
  });
  await page.goto("/#/network/people/contact-0");
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await page.getByLabel("What would you like to remember?").fill("Saved before an interrupted update.");
  await page.getByRole("button", { name: "Save interaction", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.request.post("/test/interrupt-update");
  const failed = await page.evaluate(async () => {
    try { await (await navigator.serviceWorker.ready).update(); return false; }
    catch { return true; }
  });
  expect(failed).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("Saved before an interrupted update.", { exact: true })).toBeVisible();
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByText("Saved before an interrupted update.", { exact: true })).toBeVisible();
});
