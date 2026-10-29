import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("demo Michelle, company marks, focus examples and map-first Orbit", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await expect(
    page.getByRole("heading", { name: "Today.", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".topbar-actions .avatar")).toHaveCSS(
    "background-image",
    /demo-michelle/,
  );
  await expect(
    page.getByText("Hello, Michelle.", { exact: false }),
  ).toBeVisible();
  await page.goto("/#/focus");
  await expect(
    page.getByText("Example priorities", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".demo-focus-preview > div")).toHaveCount(3);
  await page.reload();
  await expect(
    page.getByText("Example priorities", { exact: true }),
  ).toBeVisible();
  await page.goto("/#/orbit");
  await expect(page.locator(".orbit-viewport")).toBeVisible();
  await expect(page.locator(".orbit-browse")).toBeVisible();
  expect((await page.locator(".orbit-viewport").boundingBox())!.y).toBeLessThan(
    (await page.locator(".orbit-browse").boundingBox())!.y,
  );
  await page.getByRole("button", { name: "2D map" }).click();
  await expect(page.locator(".orbit-node.company svg").first()).toBeVisible();
  await page.getByRole("button", { name: "Explore", exact: true }).click();
  await expect(page.locator(".orbit-viewport")).toBeVisible();
  await page
    .getByRole("button", { name: /Forma Studio.*Explore connections/ })
    .click();
  await page.getByRole("button", { name: /Olivia Chen.*Saved person/ }).click();
  await expect(
    page.getByRole("complementary", { name: "Selected relationship" }),
  ).toContainText("Creative Director");
  for (const theme of ["light", "dark"]) {
    await page.evaluate((t) => {
      document.documentElement.dataset.theme = t;
    }, theme);
    for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${theme} ${width}`,
      ).toBe(true);
    }
    await page.setViewportSize({
      width: info.project.name === "mobile" ? 390 : 1440,
      height: 900,
    });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`orbit-${theme}.png`),
      fullPage: true,
    });
  }
});
