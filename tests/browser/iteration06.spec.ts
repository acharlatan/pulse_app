import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function demo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await expect(page.locator("main h1")).toBeVisible();
}
test("major routes pass automated accessibility in light and dark", async ({
  page,
}) => {
  test.setTimeout(180000);
  await demo(page);
  for (const theme of ["Light", "Dark"]) {
    await page.goto("/#/settings");
    await page.getByRole("button", { name: theme, exact: true }).click();
    for (const route of [
      "/",
      "/network",
      "/network/people/contact-0",
      "/network/companies/org-0",
      "/pipeline",
      "/activity",
      "/activity?view=progress",
      "/review",
      "/lists",
      "/import",
      "/assistant",
      "/settings",
    ]) {
      await page.goto("/#" + route);
      await expect(page.locator("main h1")).toBeVisible();
      const report = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        report.violations,
        `${theme} ${route}: ${JSON.stringify(report.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })))}`,
      ).toEqual([]);
    }
  }
});
test("dialog traps focus, restores its opener, fits a short viewport and protects text on Escape-free editing", async ({
  page,
}) => {
  await demo(page);
  await page.goto("/#/network/people/contact-0");
  const opener = page.getByRole("button", {
    name: "Edit profile",
    exact: true,
  });
  await opener.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const first = dialog.locator("button,input,select,textarea").first();
  await first.focus();
  await page.keyboard.press("Shift+Tab");
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(
    true,
  );
  await page.keyboard.press("Tab");
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(
    true,
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await page.setViewportSize({ width: 390, height: 430 });
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await page
    .getByRole("textbox", {
      name: "What would you like to remember?",
      exact: true,
    })
    .fill(
      "A long fictional planning note with international names and details. ".repeat(
        70,
      ),
    );
  await expect(
    page.getByRole("button", { name: "Create a new record", exact: true }),
  ).not.toBeVisible();
  const save = page.getByRole("button", {
    name: "Save interaction",
    exact: true,
  });
  await save.scrollIntoViewIfNeeded();
  const box = await save.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(430);
  await save.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await page
    .getByRole("button", { name: "Read full entry", exact: true })
    .first()
    .click();
  await expect(
    page.getByText(
      "A long fictional planning note with international names and details. ".repeat(
        70,
      ),
      { exact: true },
    ),
  ).toBeVisible();
});
test("directory filters survive profile navigation and tabs support arrow keys", async ({
  page,
}) => {
  await demo(page);
  await page.goto("/#/network");
  await page
    .getByRole("textbox", { name: "Search network", exact: true })
    .fill("Olivia");
  await page.getByRole("link", { name: /Olivia Chen Creative/ }).click();
  await page
    .getByRole("link", { name: "Back to your network", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Search network", exact: true }),
  ).toHaveValue("Olivia");
  await page.getByRole("tab", { name: /People/ }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /Companies/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("tab", { name: /Companies/ })).toBeFocused();
});
test("missing lazy chunk has a bounded manual recovery and preserves saved records", async ({
  page,
}) => {
  await demo(page);
  let reloads = 0;
  page.on("load", () => reloads++);
  const chunks = ["**/src/features/Pipeline.tsx*", "**/assets/Pipeline-*.js"];
  for (const chunk of chunks) await page.route(chunk, (r) => r.abort());
  await page
    .getByRole("link", { name: "Pipeline", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "A newer PULSE is ready.", exact: true }),
  ).toBeVisible();
  expect(reloads).toBe(0);
  for (const chunk of chunks) await page.unroute(chunk);
  await page
    .getByRole("button", { name: "Reload current version", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pipeline.", exact: true }),
  ).toBeVisible();
  expect(reloads).toBe(1);
  await page.goto("/#/network");
  await expect(
    page.getByRole("tab", { name: "People 24", exact: true }),
  ).toBeVisible();
});
test("compact, landscape and enlarged text layouts retain reachable controls", async ({
  page,
}, info) => {
  await demo(page);
  for (const [width, height] of [
    [320, 568],
    [375, 667],
    [390, 844],
    [430, 932],
    [768, 1024],
    [844, 390],
    [1024, 768],
    [1280, 900],
    [1440, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    for (const route of [
      "/",
      "/network",
      "/assistant",
      "/settings?section=integrations",
    ]) {
      await page.goto("/#" + route);
      await expect(page.locator("main h1")).toBeVisible();
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
        `${width} ${height} ${route}`,
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addStyleTag({
    content: ":root{--font-body:20px;--font-label:18px;--font-meta:16px}",
  });
  await page.goto("/#/network");
  await expect(page.locator("main h1")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  if (info.project.name === "mobile")
    await page.screenshot({ path: info.outputPath("enlarged-network.png") });
});
