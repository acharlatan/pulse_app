import { expect, test } from "@playwright/test";

test("the Home stage uses saved records and opens its real actions", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  const stage = page.getByLabel("Your relationship workspace");
  await expect(page.getByRole("heading", { name: "Today.", exact: true })).toBeVisible();
  await expect(stage.getByRole("heading", { name: "Your world, in motion." })).toBeVisible();
  await expect(stage.getByRole("link", { name: /24 people in your world/ })).toBeVisible();
  await stage.getByRole("button", { name: /Send the updated proposal/ }).click();
  await expect(page.getByRole("dialog", { name: "Edit follow-up" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await stage.getByRole("button", { name: "New connection" }).click();
  await expect(page.getByRole("dialog", { name: "New person" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await stage.getByRole("link", { name: /Olivia Chen/ }).click();
  await expect(page).toHaveURL(/network\/people\/contact-0/);
});

test("Home stage fits supported widths in both themes", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await expect(page.getByRole("heading", { name: "Today.", exact: true })).toBeVisible();
  for (const theme of ["light", "dark"]) {
    await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
    for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${theme} ${width}`).toBe(true);
    }
  }
});
