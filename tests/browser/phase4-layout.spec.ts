import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const widths = [320, 390, 768, 1024, 1440];
const themes = ["light", "dark"];
const accents = ["periwinkle", "forest", "coral", "blue"];
const routes = [
  "/",
  "/network",
  "/network/people/contact-0",
  "/pipeline",
  "/activity",
  "/focus",
  "/analytics",
  "/orbit",
  "/settings?section=data",
];

test("essential pages fit every requested width and expose accessible content across themes and accents", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(600000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await expect(page.locator("main h1")).toBeVisible();
  const findings: unknown[] = [];
  const visited: string[] = [];
  console.log(
    "PHASE4_ENV",
    JSON.stringify({
      engine: info.project.name,
      browser: browser.version(),
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    }),
  );
  for (const route of routes) {
    await page.goto(`/#${route}`);
    await expect(page.locator("main h1").first(), route).toBeVisible();
    for (const theme of themes) {
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        for (const accent of accents) {
          await page.evaluate(
            ({ theme, accent }) => {
              document.documentElement.dataset.theme = theme;
              document.documentElement.dataset.accent = accent;
            },
            { theme, accent },
          );
          const overflow = await page.evaluate(() => ({
            width: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth,
            offenders: [...document.querySelectorAll("body *")]
              .filter(
                (el) =>
                  el.getBoundingClientRect().right >
                  document.documentElement.clientWidth + 1,
              )
              .slice(0, 5)
              .map(
                (el) =>
                  `${el.tagName.toLowerCase()}.${typeof el.className === "string" ? el.className : ""}`,
              ),
          }));
          visited.push(`${route}|${theme}|${width}|${accent}`);
          if (overflow.scrollWidth > overflow.width + 1)
            findings.push({
              kind: "overflow",
              route,
              theme,
              width,
              accent,
              ...overflow,
            });
          if (
            route === "/network" &&
            width === 320 &&
            accent === "periwinkle"
          ) {
            const pieces = await page
              .locator(".network-orientation-facts span")
              .last()
              .evaluate((el) => {
                const node = el.firstChild;
                if (!node?.textContent) return 0;
                const start = node.textContent.indexOf("connections");
                if (start < 0) return 0;
                const range = document.createRange();
                range.setStart(node, start);
                range.setEnd(node, start + "connections".length);
                return range.getClientRects().length;
              });
            if (pieces !== 1)
              findings.push({
                kind: "broken-word",
                route,
                width,
                theme,
                pieces,
              });
          }
          if (
            width === 390 ||
            (accent === "periwinkle" && (width === 320 || width === 1440))
          ) {
            const report = await new AxeBuilder({ page })
              .withTags([
                "wcag2a",
                "wcag2aa",
                "wcag21a",
                "wcag21aa",
                "wcag22aa",
              ])
              .analyze();
            for (const v of report.violations)
              findings.push({
                kind: "axe",
                route,
                theme,
                width,
                accent,
                id: v.id,
                impact: v.impact,
                nodes: v.nodes.map((node) => ({
                  target: node.target,
                  summary: node.failureSummary,
                })),
              });
          }
          if (
            accent === "periwinkle" &&
            ["/", "/network", "/pipeline", "/analytics", "/orbit"].includes(
              route,
            )
          ) {
            await page.screenshot({
              path: info.outputPath(
                `${route === "/" ? "today" : route.slice(1)}-${theme}-${width}.png`,
              ),
            });
          }
        }
      }
    }
  }
  console.log(
    "PHASE4_MATRIX",
    JSON.stringify({
      count: visited.length,
      routes,
      themes,
      widths,
      accents,
      axe: "all accents at 390; periwinkle at 320 and 1440",
      findings,
    }),
  );
  await info.attach("phase4-matrix.json", {
    body: JSON.stringify({ visited, findings }, null, 2),
    contentType: "application/json",
  });
  expect(
    findings,
    "See PHASE4_MATRIX and the attached report for exact locations",
  ).toEqual([]);
});

test("appearance controls persist and enlarged content keeps the editor usable", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.goto("/#/settings");
  for (const theme of ["Dark", "Light"]) {
    await page.getByRole("button", { name: theme, exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      theme.toLowerCase(),
    );
    for (const accent of accents) {
      await page.getByLabel("Accent preset").selectOption(accent);
      await expect(page.locator("html")).toHaveAttribute("data-accent", accent);
    }
  }
  await page.getByRole("switch", { name: /Reduce motion/ }).click();
  await expect(
    page.getByRole("switch", { name: /Reduce motion/ }),
  ).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  await page.reload();
  await expect(
    page.getByRole("switch", { name: /Reduce motion/ }),
  ).toBeChecked();
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/#/network");
  // CSS zoom approximates enlarged content; it is not a real browser-UI zoom test.
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await page
    .getByRole("button", { name: "Add person", exact: true })
    .first()
    .click();
  await page.getByLabel("Full name").fill("Enlarged Fictional Person");
  await page.screenshot({
    path: info.outputPath("enlarged-person-editor.png"),
  });
  console.log("PHASE4_ZOOM_DIALOG", JSON.stringify(await page.getByRole("dialog").evaluate((el) => ({
    width: el.getBoundingClientRect().width,
    layoutWidth: (el as HTMLElement).offsetWidth,
    height: el.getBoundingClientRect().height,
    viewportHeight: window.visualViewport?.height,
    maxHeight: (el as HTMLElement).style.maxHeight,
  }))));
  await page
    .getByRole("button", { name: "Save person", exact: true })
    .click({ timeout: 15000 });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("#directory-results")).toContainText(
    "Enlarged Fictional Person",
  );
});

test("empty Personal and Analytics sections expose accessible controls", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.getByRole("button", { name: /Create My Workspace/ }).click();
  await expect(page.locator("main h1")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.locator(".workspace-switcher summary").click();
  await page.getByRole("button", { name: "Open Demo", exact: true }).click();
  await page.goto("/#/analytics");
  for (const section of [
    "Overview",
    "Relationships",
    "Opportunities",
    "Commitments",
  ]) {
    await page
      .getByLabel("Analytics sections")
      .getByRole("button", { name: new RegExp(section) })
      .click();
    for (const theme of themes) {
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      await page.setViewportSize({ width: 320, height: 900 });
      const size = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(size.content, `${section} ${theme} 320px`).toBeLessThanOrEqual(
        size.viewport,
      );
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        result.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
        `${section} ${theme}`,
      ).toEqual([]);
    }
  }
});

test("pipeline overview and board have a logical heading hierarchy", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.goto("/#/pipeline");
  const views = page.getByRole("group", { name: "Pipeline views" });
  for (const view of ["Overview", "Board"]) {
    await views.getByRole("button", { name: view, exact: true }).click();
    await expect(page.locator(".pipeline-deal").first()).toBeVisible();
    const result = await new AxeBuilder({ page }).analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
      view,
    ).toEqual([]);
  }
});
