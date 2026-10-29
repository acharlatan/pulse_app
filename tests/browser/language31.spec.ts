import { test, expect } from "@playwright/test";

test("language changes keep in-progress edits and canonical field values", async ({ page, context }) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.getByRole("heading", { name: "Today.", exact: true }).waitFor();
  await page.goto("/#/network");
  await page.getByRole("button", { name: "Add person", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Full name").fill("Marketing");
  await dialog.locator('select[name="priority"]').selectOption("High");

  // A second tab changes the same workspace's language while this form is dirty.
  const second = await context.newPage();
  await second.goto("/");
  await second.getByRole("heading", { name: "Today.", exact: true }).waitFor();
  await second.getByRole("button", { name: "Open workspace menu" }).click();
  await second.locator(".unified-profile-dropdown select").selectOption("es-ES");
  await expect(dialog.getByLabel("Nombre completo")).toHaveValue("Marketing");
  await expect(dialog.locator('select[name="priority"]')).toHaveValue("High");
  await expect(dialog.locator('select[name="priority"] option[value="High"]')).toHaveText("Alta");
  await dialog.getByRole("button", { name: "Guardar persona" }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await page.getByLabel("Buscar en la red").fill("Marketing");
  await expect(page.locator("#directory-results")).toContainText("Marketing");
});
