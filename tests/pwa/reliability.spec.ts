import { test, expect, type Page } from "@playwright/test";
async function cached(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await expect(page.locator("main h1")).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((r) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => r(),
          { once: true },
        ),
      );
  });
  await expect(
    page.getByRole("button", { name: "Update & reload", exact: true }),
  ).toHaveCount(0);
}
test("production manifest and cached CRM support offline routes, edits and backups without API caching", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  await cached(page);
  const manifest = await (
    await page.request.get("/manifest.webmanifest")
  ).json();
  expect(manifest.name).toContain("PULSE");
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(
    expect.arrayContaining(["192x192", "512x512"]),
  );
  const client = await context.newCDPSession(page);
  const install = await client.send("Page.getInstallabilityErrors");
  console.log("Chromium installability diagnostics", JSON.stringify(install));
  expect(install.installabilityErrors).toEqual([]);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("main h1")).toBeVisible();
  for (const route of [
    "/network",
    "/network/people/contact-0",
    "/network/companies/org-0",
    "/activity",
    "/lists",
    "/review",
    "/activity?view=progress",
    "/settings",
  ]) {
    await page.goto("/#" + route);
    await expect(page.locator("main h1")).toBeVisible();
  }
  await page.goto("/#/network/people/contact-0");
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await page
    .getByRole("textbox", {
      name: "What would you like to remember?",
      exact: true,
    })
    .fill("A fictional note created and saved while offline.");
  await page
    .getByRole("button", { name: "Save interaction", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByText("A fictional note created and saved while offline.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/#/settings?section=data");
  await page
    .getByRole("button", { name: "Privacy & data", exact: true })
    .click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  expect((await downloading).suggestedFilename()).toContain(".json");
  const privateCached = await page.evaluate(async () => {
    for (const key of await caches.keys())
      for (const r of await (await caches.open(key)).keys())
        if (new URL(r.url).pathname.startsWith("/api/")) return true;
    return false;
  });
  expect(privateCached).toBe(false);
  await context.setOffline(false);
});
test("real waiting SW update warns about unfinished work and does not reload another editing tab", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  await cached(page);
  const second = await context.newPage();
  await second.goto("/#/settings?section=relationships");
  await second
    .getByRole("button", { name: "Relationship rhythm", exact: true })
    .click();
  await second
    .getByRole("textbox", { name: "Your preferred name", exact: true })
    .fill("Unfinished second-tab name");
  await page.goto("/#/settings?section=relationships");
  await page
    .getByRole("button", { name: "Relationship rhythm", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Your preferred name", exact: true })
    .fill("Unfinished first-tab name");
  await page.request.post("/test/update");
  await page.evaluate(async () => {
    await (await navigator.serviceWorker.ready).update();
  });
  await expect(
    page.getByRole("button", { name: "Update & reload", exact: true }),
  ).toBeVisible();
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("button", { name: "Update & reload", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Your preferred name", exact: true }),
  ).toHaveValue("Unfinished first-tab name");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Update & reload", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Your preferred name", exact: true }),
  ).toHaveValue("Michelle");
  await expect(
    second.getByRole("textbox", { name: "Your preferred name", exact: true }),
  ).toHaveValue("Unfinished second-tab name");
  await expect(
    second.getByRole("button", { name: "Update & reload", exact: true }),
  ).toBeVisible();
  await page.goto("/#/network");
  await expect(
    page.getByRole("tab", { name: "People 24", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Update & reload", exact: true }),
  ).toHaveCount(0);
  await second.close();
});
test("repository subpath retains scoped registration and offline profile navigation", async ({
  page,
  context,
}) => {
  await page.goto("/pulse_app/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await expect(page.locator("main h1")).toBeVisible();
  const scope = await page.evaluate(async () => {
    const r = await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((done) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => done(),
          { once: true },
        ),
      );
    return new URL(r.scope).pathname;
  });
  expect(scope).toBe("/pulse_app/");
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("main h1")).toBeVisible();
  await page.goto("/pulse_app/#/network/people/contact-0");
  await expect(
    page.getByRole("heading", { name: "Olivia Chen", exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
});
