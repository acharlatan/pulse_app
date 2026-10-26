import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
test.use({ actionTimeout: 20000 });
async function demo(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.getByRole("heading", { name: "A good day to connect." }).waitFor();
  page.on("dialog", (d) => d.accept());
}
async function image(
  page: import("@playwright/test").Page,
  type = "image/png",
) {
  const data = await page.evaluate((t) => {
    const c = document.createElement("canvas");
    c.width = 800;
    c.height = 600;
    const x = c.getContext("2d")!;
    x.fillStyle = "#a2a3d0";
    x.fillRect(0, 0, 800, 600);
    x.fillStyle = "#36735e";
    x.fillRect(150, 80, 400, 450);
    x.fillStyle = "#fff";
    x.font = "60px sans-serif";
    x.fillText("PULSE", 180, 320);
    return c.toDataURL(t);
  }, type);
  return {
    name: "portrait." + type.split("/")[1],
    mimeType: type,
    buffer: Buffer.from(data.split(",")[1], "base64"),
  };
}
test("local profile portraits, company logo/cover, workspace identity and v5 backup roundtrip", async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  await demo(page);
  const file = await image(page);
  await page.goto("/#/network/people/contact-0");
  await page.getByRole("button", { name: "Photo & cover" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Choose image", { exact: false }).setInputFiles({
    name: "bad.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg/>"),
  });
  await expect(d.getByRole("alert")).toContainText("JPEG, PNG or WebP");
  await d.getByLabel("Choose image", { exact: false }).setInputFiles({
    name: "corrupt.png",
    mimeType: "image/png",
    buffer: Buffer.from("not a png"),
  });
  await expect(d.getByRole("alert")).toContainText("corrupt");
  await d
    .getByLabel("Choose image", { exact: false })
    .setInputFiles({
      name: "too-large.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(8 * 1024 * 1024 + 1),
    });
  await expect(d.getByRole("alert")).toContainText("8 MB");
  await d.getByLabel("Choose image", { exact: false }).setInputFiles(file);
  await expect(d.getByLabel("Image crop preview")).toBeVisible();
  await d.getByLabel("Zoom", { exact: true }).fill("1.5");
  await d.getByRole("button", { name: "Save image", exact: true }).click();
  await expect(d).toHaveCount(0);
  await expect(page.locator(".profile-identity .avatar img")).toBeVisible();
  await page.reload();
  await expect(page.locator(".profile-identity .avatar img")).toBeVisible();
  for (const mime of ["image/jpeg", "image/webp"]) {
    await page.getByRole("button", { name: "Photo & cover" }).click();
    await d
      .getByLabel("Choose image", { exact: false })
      .setInputFiles(await image(page, mime));
    await expect(d.getByLabel("Image crop preview")).toBeVisible();
    await d.getByRole("button", { name: "Save image", exact: true }).click();
    await expect(d).toHaveCount(0);
  }
  await page.getByRole("button", { name: "Photo & cover" }).click();
  await d
    .getByRole("combobox", { name: "Image kind", exact: true })
    .selectOption("cover");
  await d.getByLabel("Choose image", { exact: false }).setInputFiles(file);
  await d.getByLabel("Horizontal position").fill("80");
  await d.getByRole("button", { name: "Save image", exact: true }).click();
  await expect(d).toHaveCount(0);
  await expect(page.locator(".profile-cover-image")).toBeVisible();
  await page.goto("/#/network/companies/org-0");
  for (const slot of ["avatar", "cover"]) {
    await page.getByRole("button", { name: "Logo & cover" }).click();
    await d
      .getByRole("combobox", { name: "Image kind", exact: true })
      .selectOption(slot);
    await d.getByLabel("Choose image", { exact: false }).setInputFiles(file);
    await d.getByRole("button", { name: "Save image", exact: true }).click();
    await expect(d).toHaveCount(0);
  }
  await expect(page.locator(".profile-identity .avatar img")).toBeVisible();
  await expect(page.locator(".profile-cover-image")).toBeVisible();
  await page.goto("/#/settings");
  await page
    .getByRole("button", { name: "Workspace photo", exact: true })
    .click();
  await d.getByLabel("Choose image", { exact: false }).setInputFiles(file);
  await d.getByRole("button", { name: "Save image", exact: true }).click();
  await expect(d).toHaveCount(0);
  await page.getByLabel("Workspace name", { exact: true }).fill("Studio Atlas");
  await page.getByRole("button", { name: "Save workspace name" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Preferences saved" })
    .waitFor();
  await page
    .getByRole("combobox", { name: "Accent preset", exact: true })
    .selectOption("forest");
  await expect(page.locator("html")).toHaveAttribute("data-accent", "forest");
  await page.goto("/#/settings?section=data");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const path = await (await download).path();
  const backup = JSON.parse(fs.readFileSync(path!, "utf8"));
  expect(backup.version).toBe(5);
  expect(backup.media).toHaveLength(5);
  expect(
    backup.media.every((m: { bytes: number }) => m.bytes < 512 * 1024),
  ).toBe(true);
  const target = await browser.newContext();
  const other = await target.newPage();
  other.on("dialog", (d) => d.accept());
  await other.goto("/");
  await other.getByRole("button", { name: /Create My Workspace/ }).click();
  await other.goto("/#/settings?section=data");
  await other.locator("input[type=file]").setInputFiles(path!);
  await expect(other.getByRole("dialog")).toContainText("Compatible backup v5");
  await other
    .getByRole("button", { name: "Validate & restore", exact: true })
    .click();
  await expect(other.getByRole("dialog")).toHaveCount(0);
  await other.goto("/#/network/companies/org-0");
  await expect(other.locator(".profile-identity .avatar img")).toBeVisible();
  await expect(other.locator(".profile-cover-image")).toBeVisible();
  await other.reload();
  await expect(other.locator(".profile-cover-image")).toBeVisible();
  await target.close();
  await page.goto("/#/network/people/contact-0");
  await page.getByRole("button", { name: "Photo & cover" }).click();
  await d.getByRole("button", { name: "Remove saved image" }).click();
  await expect(d).toHaveCount(0);
  await expect(page.locator(".profile-identity .avatar img")).toHaveCount(0);
});
test("Orbit uses saved connections, supports focused views, keyboard/list access and zoom", async ({
  page,
}) => {
  test.setTimeout(90000);
  await demo(page);
  await page.goto("/#/orbit?company=org-0");
  await page.getByRole("heading", { name: "Relationship Orbit." }).waitFor();
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page.getByRole("button", { name: /Forma Studio.*company/ }).click();
  const detail = page.getByRole("complementary", {
    name: "Selected relationship",
  });
  await expect(detail).toContainText("3 representatives");
  await detail.getByRole("link", { name: "Open Company", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Forma Studio", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "View in Relationship Orbit" }).click();
  await page.getByRole("button", { name: "Reset view" }).click();
  await page.getByRole("textbox", { name: "Search Orbit" }).fill("Olivia");
  await page.getByRole("button", { name: /Olivia Chen/ }).click();
  await expect(detail).toContainText("Creative Director");
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Center selected" }).click();
  await page.getByRole("button", { name: "Fit network" }).click();
  await detail.getByRole("link", { name: "Open Profile" }).click();
  await expect(
    page.getByRole("heading", { name: "Olivia Chen", exact: true }),
  ).toBeVisible();
  await page.goto("/#/orbit");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
test("the experience fits key widths and both themes, with usable media controls and mobile More", async ({
  page,
}, info) => {
  test.setTimeout(240000);
  await demo(page);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["light", "dark"])
      for (const route of [
        "/",
        "/network",
        "/network?view=companies",
        "/network/people/contact-0",
        "/network/companies/org-0",
        "/pipeline",
        "/focus",
        "/orbit",
        "/settings",
      ]) {
        await page.goto("/#" + route);
        await page.locator("main h1").waitFor();
        await page.evaluate(
          (t) => (document.documentElement.dataset.theme = t),
          theme,
        );
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${route} ${width} ${theme}`,
        ).toBe(true);
        if (
          (width === 390 || width === 1440) &&
          ["/", "/network/people/contact-0", "/orbit"].includes(route)
        )
          await page.screenshot({
            path: info.outputPath(
              `experience-${route.replaceAll("/", "_") || "home"}-${width}-${theme}.png`,
            ),
            fullPage: true,
            animations: "disabled",
            timeout: 60000,
          });
      }
  }
  await page.setViewportSize({ width: 320, height: 800 });
  await page
    .getByRole("button", { name: "More destinations", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Relationship Orbit" })
    .click();
  await page.getByRole("heading", { name: "Relationship Orbit." }).waitFor();
  await page.goto("/#/network/people/contact-0");
  await page.getByRole("button", { name: "Photo & cover" }).click();
  const d = page.getByRole("dialog");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await d.getByRole("button", { name: "Cancel", exact: true }).click();
});
test("curated appearance presets stay readable in light and dark", async ({
  page,
}) => {
  test.setTimeout(120000);
  await demo(page);
  await page.goto("/#/settings");
  for (const theme of ["light", "dark"])
    for (const accent of ["periwinkle", "forest", "coral", "blue"]) {
      await page
        .getByRole("combobox", { name: "Accent preset", exact: true })
        .selectOption(accent);
      await expect(page.locator("html")).toHaveAttribute("data-accent", accent);
      await page.evaluate(
        (t) => (document.documentElement.dataset.theme = t),
        theme,
      );
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(result.violations, `${theme} ${accent}`).toEqual([]);
    }
});
