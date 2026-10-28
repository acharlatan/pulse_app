import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("first week saves an intention and guides real records", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/");
  await page.getByRole("button", { name: /Create My Workspace/ }).click();
  await page.getByRole("heading", { name: "Today.", exact: true }).waitFor();
  const guide = page.locator(".first-week-guide");
  await expect(guide).toContainText("Build your starting network");
  await guide.getByRole("combobox").selectOption("partnerships");
  await expect(
    page.getByRole("status").filter({ hasText: "Intention saved" }),
  ).toBeVisible();
  await page.reload();
  await expect(guide.getByRole("combobox")).toHaveValue("partnerships");
  await guide.getByRole("button", { name: "Add one person" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Full name").fill("Jordan Example");
  await dialog.getByRole("button", { name: "Save person" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(guide).toContainText("Next: Give a next step a date");
  await guide.getByRole("button", { name: "Schedule a follow-up" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Follow-up title")
    .fill("Check in with Jordan");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save follow-up" })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(guide).toContainText("Next: Choose your first priority");
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (t) => (document.documentElement.dataset.theme = t),
      theme,
    );
    for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});
