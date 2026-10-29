import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { languageOptions, translate } from "../../src/i18n/catalog";

test("3D Orbit shows real portraits and sharp labels with useful compact controls", async ({ page }, info) => {
  test.setTimeout(180000);
  page.setDefaultTimeout(12000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await expect(page.getByRole("heading", { name: "Today.", exact: true })).toBeVisible();
  await page.goto("/#/orbit");
  await expect(page.getByRole("heading", { name: "Relationship Orbit." })).toBeVisible();
  await expect(page.locator(".orbit-world canvas")).toBeVisible();
  await expect.poll(() => page.locator(".orbit-3d-node.person").count()).toBeGreaterThanOrEqual(info.project.name === "mobile" ? 6 : 8);
  const portraits = await page.locator(".orbit-3d-node.person .avatar").evaluateAll(nodes => nodes.filter(node => getComputedStyle(node).backgroundImage.includes("demo-portraits")).length);
  expect(portraits).toBeGreaterThanOrEqual(info.project.name === "mobile" ? 4 : 6);
  await expect(page.locator(".orbit-3d-node.company svg").first()).toBeAttached();
  const label = page.locator(".orbit-3d-node.person .orbit-3d-label").first();
  await expect(label).toBeVisible();
  await expect(label).toHaveCSS("font-size", "13px");
  for (const name of ["Olivia Chen", "Marcus Johnson", "Chloe Bennett"]) {
    await page.locator(".orbit-3d-node.person").filter({ hasText: name }).click();
    await expect(page.getByRole("complementary", { name: "Selected relationship" })).toContainText(name);
    await page.getByRole("button", { name: "Close selection" }).click();
  }
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await expect(page.getByLabel("Contact priority")).toBeVisible();
  await page.getByLabel("Contact priority").selectOption("High");
  await expect(page.getByRole("button", { name: /Filters/ })).toContainText("•");
  await page.getByRole("button", { name: /Filters/ }).click();
  await page.getByRole("button", { name: "Reset view" }).click();
  await expect(page.getByRole("button", { name: /Filters/ })).not.toContainText("•");
  for (const theme of ["light", "dark"]) {
    await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
    for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${theme} ${width}`).toBe(true);
    }
    await page.setViewportSize({ width: info.project.name === "mobile" ? 390 : 1440, height: 900 });
    await expect(page.locator(".orbit-viewport")).toBeVisible();
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
    await page.screenshot({ path: info.outputPath(`orbit-${theme}.png`), fullPage: true });
  }
});

test("language choices update core labels and persist independently by workspace", async ({ page }, info) => {
  test.setTimeout(180000);
  page.setDefaultTimeout(12000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await expect(page.getByRole("heading", { name: "Today.", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open workspace menu" }).click();
  for (const [locale] of languageOptions) {
    await page.locator(".unified-profile-dropdown select").selectOption(locale);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    const nav = page.getByRole("navigation", { name: info.project.name === "mobile" ? "Mobile navigation" : "Main areas" });
    await expect(nav.getByRole("link").first()).toHaveText(translate(locale, "today"));
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(() => ({ ok: document.documentElement.scrollWidth <= innerWidth, items: Array.from(document.querySelectorAll("body *")).filter((element) => element.getBoundingClientRect().right > innerWidth + 1).slice(0, 5).map((element) => `${element.tagName}.${element.className}`) }));
      expect(overflow.ok, `${locale} ${width}: ${overflow.items.join(", ")}`).toBe(true);
    }
    await page.setViewportSize({ width: info.project.name === "mobile" ? 390 : 1440, height: 900 });
  }
  await page.locator(".unified-profile-dropdown select").selectOption("es-ES");
  await expect(page.getByRole("heading", { name: "Hoy.", exact: true })).toBeVisible();
  await expect(page.locator(".language-selector-compact small")).toContainText("inglés");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Hoy.", exact: true })).toBeVisible();
  await page.goto("/#/network");
  await expect(page.getByRole("heading", { name: "Red.", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Añadir persona" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre completo").fill("Contacto de prueba");
  await dialog.getByRole("button", { name: "Guardar persona" }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByLabel("Buscar en la red").fill("Contacto de prueba");
  await expect(page.locator("#directory-results")).toContainText("Contacto de prueba");
  await page.locator(".unified-section-nav").getByRole("link", { name: "Órbita", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Órbita de relaciones.", exact: true })).toBeVisible();
  await page.locator(".workspace-switcher summary").click();
  await page.getByRole("button", { name: "Abrir espacio personal" }).click();
  await page.goto("/#/");
  await expect(page.getByRole("heading", { name: "Today.", exact: true })).toBeVisible();
  await page.locator(".workspace-switcher summary").click();
  await page.getByRole("button", { name: "Open Demo" }).click();
  await page.goto("/#/");
  await expect(page.getByRole("heading", { name: "Hoy.", exact: true })).toBeVisible();
});

test("3D Orbit displays a locally saved custom portrait", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.getByRole("heading", { name: "Today.", exact: true }).waitFor();
  const data = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 500; canvas.height = 500;
    const ctx = canvas.getContext("2d")!; ctx.fillStyle = "#7586d2"; ctx.fillRect(0, 0, 500, 500); ctx.fillStyle = "#fff"; ctx.fillRect(120, 80, 260, 300);
    return canvas.toDataURL("image/png");
  });
  await page.goto("/#/network/people/contact-0");
  await page.getByRole("button", { name: "Photo & cover" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Choose image", { exact: false }).setInputFiles({ name: "local.png", mimeType: "image/png", buffer: Buffer.from(data.split(",")[1], "base64") });
  await dialog.getByRole("button", { name: "Save image", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.goto("/#/orbit");
  const avatar = page.locator(".orbit-3d-node.person").filter({ hasText: "Olivia Chen" }).locator(".avatar img");
  await expect(avatar).toBeVisible();
  await expect(avatar).toHaveAttribute("src", /^blob:/);
  await page.reload();
  await expect(avatar).toBeVisible();
});

test("translated workspaces fit narrow and wide screens", async ({ page }, info) => {
  test.setTimeout(180000);
  await page.goto("/"); await page.getByRole("button", { name: /Explore Demo/ }).click(); await page.getByRole("heading", { name: "Today.", exact: true }).waitFor();
  for (const locale of ["es-ES", "de-DE", "fil-PH", "ja-JP"]) {
    await page.locator(".unified-profile-trigger").click();
    await page.locator(".unified-profile-dropdown select").selectOption(locale);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await page.locator(".unified-profile-trigger").click();
    for (const route of ["/", "/network", "/orbit", "/pipeline", "/activity", "/analytics", "/settings"]) {
      await page.goto(`/#${route}`); await expect(page.locator("main h1").first()).toBeVisible();
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        const overflow = await page.evaluate(() => ({ ok: document.documentElement.scrollWidth <= innerWidth, items: Array.from(document.querySelectorAll("body *")).filter(element => element.getBoundingClientRect().right > innerWidth + 1).slice(0, 6).map(element => `${element.tagName}.${element.className}`) }));
        expect(overflow.ok, `${locale} ${route} ${width}: ${overflow.items.join(", ")}`).toBe(true);
      }
      await page.setViewportSize({ width: info.project.name === "mobile" ? 390 : 1440, height: 900 });
    }
  }
});
