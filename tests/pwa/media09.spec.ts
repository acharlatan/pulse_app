import { test, expect } from "@playwright/test";
test("saved profile photos remain local and render after offline reload", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.locator("main h1").waitFor();
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
  await page.goto("/#/network/people/contact-0");
  await page.getByRole("button", { name: "Photo & cover" }).click();
  const data = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 600;
    c.height = 600;
    const x = c.getContext("2d")!;
    x.fillStyle = "#7362c8";
    x.fillRect(0, 0, 600, 600);
    x.fillStyle = "#fff";
    x.font = "90px sans-serif";
    x.fillText("LOCAL", 60, 300);
    return c.toDataURL("image/png");
  });
  const d = page.getByRole("dialog");
  await d.getByLabel("Choose image", { exact: false }).setInputFiles({
    name: "local.png",
    mimeType: "image/png",
    buffer: Buffer.from(data.split(",")[1], "base64"),
  });
  await d.getByRole("button", { name: "Save image", exact: true }).click();
  await expect(d).toHaveCount(0);
  await expect(page.locator(".profile-identity .avatar img")).toBeVisible();
  const remoteImages: string[] = [];
  page.on("request", (r) => {
    if (
      r.resourceType() === "image" &&
      /^https?:/.test(r.url()) &&
      new URL(r.url()).origin !== new URL(page.url()).origin
    )
      remoteImages.push(r.url());
  });
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Olivia Chen", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".profile-identity .avatar img")).toBeVisible();
  expect(remoteImages).toEqual([]);
  await context.setOffline(false);
});
