import { test, expect } from "@playwright/test";
test("Daily Pulse choices and completion remain available offline", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.getByRole("heading", { name: "Today.", exact: true }).waitFor();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await page
    .getByRole("heading", { name: "A day with direction.", exact: true })
    .waitFor();
  const target = page
      .locator(".daily-suggestion")
      .filter({ hasText: "Keep a commitment" })
      .first(),
    title = await target.locator("h3").innerText();
  await target
    .getByRole("button", { name: "Choose today", exact: true })
    .click();
  const inspector = page.locator(".daily-inspector");
  await expect(inspector.locator("h2")).toHaveText(title);
  await inspector
    .getByRole("button", { name: "Mark complete", exact: true })
    .click();
  await expect(
    inspector.getByRole("button", { name: "Completed", exact: true }),
  ).toBeDisabled();
  await page.reload();
  const chosen = page
    .locator(".daily-chosen-list li")
    .filter({ hasText: title });
  await expect(chosen).toHaveCount(1);
  await expect(chosen).toContainText("Completed follow-up");
  await expect(
    page.locator(".daily-wrap-facts > div").first().locator("strong"),
  ).not.toHaveText("0");
});
