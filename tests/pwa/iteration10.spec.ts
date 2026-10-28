import { test, expect } from "@playwright/test";

test("analytics and due reminders work offline without duplicate execution", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await context.addInitScript(() => {
    const realNow = Date.now.bind(Date);
    Date.now = () =>
      Number(localStorage.getItem("pulse-test-clock")) || realNow();
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await expect(page.locator("main h1")).toBeVisible();
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
  await page.goto("/#/network/people/contact-0");
  await page.getByRole("button", { name: "Follow up", exact: true }).click();
  await page
    .getByLabel("Follow-up title")
    .fill("Offline reminder verification");
  const due = await page.evaluate(() => {
    const d = new Date(Date.now() + 2 * 86400000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });
  await page.getByLabel("Due date and time").fill(due);
  await page
    .getByRole("button", { name: "Save follow-up", exact: true })
    .click();
  await page.goto("/#/automations");
  await page.getByRole("button", { name: /^Overdue reminder/ }).click();
  const d = page.getByRole("dialog");
  await d
    .getByRole("combobox", { name: "When", exact: true })
    .selectOption("due");
  await d
    .getByRole("spinbutton", { name: "Threshold in elapsed days" })
    .fill("1");
  await d
    .getByRole("combobox", { name: "Then", exact: true })
    .selectOption("reminder");
  await d.getByRole("button", { name: "Save disabled draft" }).click();
  await page
    .locator(".automation-rule")
    .getByRole("button", { name: "Enable", exact: true })
    .click();
  await page.evaluate(() =>
    localStorage.setItem(
      "pulse-test-clock",
      String(Date.now() + 86400000 + 120000),
    ),
  );
  await context.setOffline(true);
  await page.goto("/#/analytics");
  await expect(page.getByRole("heading", { name: "Analytics." })).toBeVisible();
  await page.goto("/#/automations");
  if (
    !(await page
      .getByRole("button", {
        name: "Check eligible conditions now",
        exact: true,
      })
      .isVisible())
  )
    await page.getByText("Execution & safety", { exact: true }).click();
  await page
    .getByRole("button", { name: "Check eligible conditions now" })
    .click();
  await expect(
    page
      .locator(".automation-history")
      .filter({ hasText: "Local reminder recorded" }),
  ).toHaveCount(1);
  await page.reload();
  if (
    !(await page
      .getByRole("button", {
        name: "Check eligible conditions now",
        exact: true,
      })
      .isVisible())
  )
    await page.getByText("Execution & safety", { exact: true }).click();
  await page
    .getByRole("button", { name: "Check eligible conditions now" })
    .click();
  await expect(
    page
      .locator(".automation-history")
      .filter({ hasText: "Local reminder recorded" }),
  ).toHaveCount(1);
  await context.setOffline(false);
});
