import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("editorial compositions preserve workflows, segments and responsive accessibility", async ({
  page,
}, info) => {
  test.setTimeout(240000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await expect(page.getByRole("heading", { name: "Today." })).toBeVisible();
  const commitment = page.locator(".priority-feature h2");
  const title = await commitment.innerText();
  await page
    .getByRole("button", { name: "Open commitment", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByLabel("Follow-up title"),
  ).toHaveValue(title);
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Open network", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Network." })).toBeVisible();
  if (info.project.name === "desktop") {
    await page
      .getByRole("button", {
        name: "View context for Olivia Chen",
        exact: true,
      })
      .click();
    const context = page.getByRole("complementary", {
      name: "Relationship context for Olivia Chen",
    });
    await expect(context).toBeVisible();
    await expect(
      context.getByRole("heading", { name: "Olivia Chen", exact: true }),
    ).toBeVisible();
    await context
      .getByRole("button", { name: "Pin to Focus", exact: true })
      .click();
    await expect(
      context.getByRole("button", { name: "Unpin", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Pinned", exact: true }).click();
    await expect(page.locator(".profile-card")).toHaveCount(1);
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Pinned", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".profile-card")).toHaveCount(1);
    await page.getByRole("button", { name: "Everyone", exact: true }).click();
  }
  await page
    .getByRole("textbox", { name: "Search network" })
    .fill("Olivia Chen");
  await expect(page.locator(".profile-card")).toHaveCount(1);
  await page.locator(".profile-card").click();
  await expect(page.locator("main h1")).toHaveText("Olivia Chen");
  await page
    .getByRole("link", { name: "Back to your network", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Search network" }),
  ).toHaveValue("Olivia Chen");
  await page.getByRole("textbox", { name: "Search network" }).fill("");
  await page.getByText("Directory tools", { exact: true }).click();
  await page.getByRole("button", { name: "Cards", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Cards", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByText("Directory tools", { exact: true }).click();
  for (const route of ["/", "/network", "/network/people/contact-0"]) {
    await page.goto("/#" + route);
    await expect(page.locator("main h1")).toBeVisible();
    for (const theme of ["light", "dark"]) {
      await page.evaluate(
        (t) => (document.documentElement.dataset.theme = t),
        theme,
      );
      for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${route} ${theme} ${width}`,
        ).toBe(true);
        if ([390, 1440].includes(width))
          await page.screenshot({
            path: info.outputPath(
              `editorial-${route.replaceAll("/", "_") || "home"}-${theme}-${width}.png`,
            ),
            fullPage: true,
          });
      }
      const result = await new AxeBuilder({ page }).analyze();
      expect(result.violations, `${route} ${theme}`).toEqual([]);
    }
  }
});
