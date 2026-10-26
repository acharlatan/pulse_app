import { test, expect, type Page } from "@playwright/test";
async function bounds(page: Page) {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
}
test("CSV mapping, duplicate comparison and confirm screens fit mobile/desktop in both themes", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await expect(
    page.getByRole("heading", { name: "A good day to connect.", exact: true }),
  ).toBeVisible();
  for (const theme of ["light", "dark"]) {
    await page.goto("/#/settings");
    await page
      .getByRole("button", {
        name: theme === "light" ? "Light" : "Dark",
        exact: true,
      })
      .click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.goto("/#/import");
    await page.getByLabel("Contact CSV file").setInputFiles({
      name: "layout.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        'Name,Email,Role,Company,Notes\nOlivia Chen,olivia.chen@company-0.example,"Director of strategic relationships and ongoing business development","A fictional organization with an intentionally long name for wrapping checks","An imported note, with a quoted comma and a meaningful next action."',
      ),
    });
    await page
      .getByRole("button", { name: "Continue to mapping", exact: true })
      .click();
    for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await bounds(page);
    }
    await page
      .getByRole("button", { name: "Validate rows", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Review duplicates", exact: true })
      .click();
    await page
      .locator(".import-row")
      .getByLabel("Action for row 2")
      .selectOption("update");
    await page
      .locator(".import-row")
      .getByLabel("role", { exact: true })
      .check();
    await page.locator(".import-row details summary").click();
    for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await bounds(page);
    }
    await page
      .getByRole("button", { name: "Preview import summary", exact: true })
      .click();
    for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await bounds(page);
      await page
        .getByRole("button", { name: "Apply import to demo", exact: true })
        .scrollIntoViewIfNeeded();
      const b = await page
        .getByRole("button", { name: "Apply import to demo", exact: true })
        .boundingBox();
      const nav = page.locator(".bottom-nav");
      if (await nav.isVisible()) {
        const n = await nav.boundingBox();
        expect(b!.y + b!.height).toBeLessThanOrEqual(n!.y);
      }
    }
    if (info.project.name === "mobile") {
      await page.setViewportSize({ width: 390, height: 900 });
      await page.screenshot({
        path: info.outputPath(`import-confirm-${theme}.png`),
      });
    }
  }
});
