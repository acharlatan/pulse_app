import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("filtered network context returns to the same directory and remains usable", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.getByRole("heading", { name: "Today.", exact: true }).waitFor();
  await page.goto("/#/network");
  await page
    .getByRole("textbox", { name: "Search network" })
    .fill("Olivia Chen");
  await expect(page.locator(".profile-card")).toHaveCount(1);
  if (info.project.name === "desktop") {
    await page
      .getByRole("button", { name: "View context for Olivia Chen" })
      .click();
    await page
      .getByRole("complementary", {
        name: "Relationship context for Olivia Chen",
      })
      .getByRole("link", { name: "Open full profile" })
      .click();
  } else await page.locator(".profile-card").click();
  await expect(page.locator("main h1")).toHaveText("Olivia Chen");
  await page.getByRole("link", { name: "View relationship analytics" }).click();
  await page.getByRole("link", { name: "Return to profile" }).click();
  await expect(page.locator("main h1")).toHaveText("Olivia Chen");
  await page.getByRole("link", { name: "View in Relationship Orbit" }).click();
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await page.getByRole("link", { name: "Return to profile" }).click();
  await expect(page.locator("main h1")).toHaveText("Olivia Chen");
  await page.getByRole("link", { name: "Back to your network" }).click();
  await expect(
    page.getByRole("textbox", { name: "Search network" }),
  ).toHaveValue("Olivia Chen");
  await expect(page.locator(".profile-card")).toHaveCount(1);
  for (const route of ["/network", "/network/people/contact-0"]) {
    await page.goto("/#" + route);
    await expect(page.locator("main h1")).toBeVisible();
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
        if ([390, 1440].includes(width))
          await page.screenshot({
            path: info.outputPath(
              `${route.replaceAll("/", "_")}-${theme}-${width}.png`,
            ),
            fullPage: true,
          });
      }
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
  }
});

test("review selection survives a profile and scoped analytics round trip", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.getByRole("heading", { name: "Today.", exact: true }).waitFor();
  await page.goto("/#/review");
  await page.getByRole("button", { name: "Reconnect", exact: true }).click();
  await expect(page).toHaveURL(/view=Reconnect/);
  await page
    .getByRole("link", { name: "Open profile", exact: true })
    .first()
    .click();
  await page.getByRole("link", { name: "View relationship analytics" }).click();
  await page.getByRole("link", { name: "Return to profile" }).click();
  await page.getByRole("link", { name: "Back to review" }).click();
  await expect(
    page.getByRole("button", { name: "Reconnect", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
