import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function switchTo(
  page: import("@playwright/test").Page,
  target: "Demo" | "Personal",
) {
  await page.locator(".workspace-switcher summary").click();
  await page
    .getByRole("button", { name: `Open ${target}`, exact: true })
    .click();
  await page.getByRole("heading", { name: "Today.", exact: true }).waitFor();
}
test("switching workspaces preserves isolated data and navigation on reload", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.getByRole("heading", { name: "Today.", exact: true }).waitFor();
  await page.goto("/#/network/people/contact-0");
  await expect(page.locator("main h1")).toHaveText("Olivia Chen");
  await switchTo(page, "Personal");
  await expect(page.locator(".workspace-switcher summary")).toHaveText(
    "Personal",
  );
  await page.getByRole("button", { name: "Add someone", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Full name").fill("Personal Example");
  await dialog
    .getByRole("button", { name: "Save person", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Backup reminder" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Review backups", exact: true }).click();
  await expect(
    page.getByText("No backup download requested yet."),
  ).toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await pending;
  await expect(page.getByText(/Last download requested/)).toBeVisible();
  await page.goto("/#/");
  await page.getByRole("heading", { name: "Today.", exact: true }).waitFor();
  await expect(
    page.getByRole("complementary", { name: "Backup reminder" }),
  ).toHaveCount(0);
  await switchTo(page, "Demo");
  await page.goto("/#/network");
  await page
    .getByRole("textbox", { name: "Search network" })
    .fill("Personal Example");
  await expect(page.locator(".profile-card")).toHaveCount(0);
  await switchTo(page, "Personal");
  await page.goto("/#/network");
  await page
    .getByRole("textbox", { name: "Search network" })
    .fill("Personal Example");
  await expect(page.locator(".profile-card")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".profile-card")).toHaveCount(1);
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
      if (width === 320) {
        await page.locator(".workspace-switcher summary").click();
        const bounds = await page
          .locator(".workspace-switcher-menu")
          .boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
        await page.locator(".workspace-switcher summary").click();
      }
      if ([390, 1440].includes(width))
        await page.screenshot({
          path: info.outputPath(`switch-${theme}-${width}.png`),
          fullPage: true,
        });
    }
    await page.locator(".workspace-switcher summary").click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.locator(".workspace-switcher summary").click();
  }
});
test("guidance and feedback can be read and prepared without sending", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.getByRole("heading", { name: "Today.", exact: true }).waitFor();
  await page.goto("/#/help");
  await page
    .getByRole("heading", { name: "Share feedback in your own words." })
    .waitFor();
  await page
    .getByLabel("What happened or felt confusing?")
    .fill("A fictional test issue");
  await page
    .getByLabel("What did you expect instead?")
    .fill("A clearer result");
  await expect(page.getByLabel("Feedback text for manual copying")).toHaveValue(
    "What happened: A fictional test issue\nWhat I expected: A clearer result",
  );
  await page.getByText("When information is missing", { exact: true }).click();
  await expect(
    page.getByText(/unknown history, not a bad relationship/),
  ).toBeVisible();
});
