import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const screens = [
  ["Today", "/"],
  ["Directory", "/network"],
  ["Orbit", "/orbit"],
  ["Company", "/network/companies/org-0"],
  ["Person", "/network/people/contact-0"],
  ["Settings", "/settings"],
  ["Follow-ups", "/activity"],
  ["Pipeline", "/pipeline"],
  ["Focus", "/focus"],
  ["Insights", "/analytics"],
  ["Review", "/review"],
  ["Automations", "/automations"],
  ["Customize", "/customize"],
  ["Import", "/import"],
  ["Assistant", "/assistant"],
  ["Lists", "/lists"],
  ["Help", "/help"],
] as const;

for (const [name, route] of screens) {
  test(`visual completion: ${name} reflows with readable controls in both themes`, async ({
    page,
  }, info) => {
    test.setTimeout(120000);
    await page.goto("/");
    await page.getByRole("button", { name: /Explore Demo/ }).click();
    await expect(page.locator("main h1")).toBeVisible();
    for (const theme of ["Light", "Dark"]) {
      await page.goto("/#/settings");
      await page.getByRole("button", { name: theme, exact: true }).click();
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        theme.toLowerCase(),
      );
      await page.goto("/#" + route);
      await expect(page.locator("main .page h1")).toBeVisible();
      await expect(
        page.getByRole("heading", {
          name: "A newer PULSE is ready.",
          exact: true,
        }),
      ).toHaveCount(0);
      for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => resolve()),
              ),
            ),
        );
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth,
          ),
          `${name} ${theme} ${width}`,
        ).toBe(true);
        if (width === 390 || width === 1440) {
          const report = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
            .analyze();
          expect(
            report.violations.map((v) => ({
              id: v.id,
              nodes: v.nodes.map((n) => ({
                target: n.target,
                summary: n.failureSummary,
              })),
            })),
            `${name} ${theme} ${width}`,
          ).toEqual([]);
          if (
            width === info.project.use.viewport?.width &&
            ["Today", "Directory", "Pipeline", "Insights"].includes(name)
          ) {
            await page.screenshot({
              path: info.outputPath(
                `${name.toLowerCase()}-${theme.toLowerCase()}.png`,
              ),
            });
          }
        }
      }
    }
  });
}
