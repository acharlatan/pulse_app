import { expect, test } from "@playwright/test";

test("3D Orbit portraits move continuously and reduced motion stays still", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await expect(
    page.getByRole("heading", { name: "Today.", exact: true }),
  ).toBeVisible();
  await page.goto("/#/orbit");
  const canvas = page.locator(".orbit-world canvas");
  await expect(canvas).toBeVisible();
  const marker = page.locator(".orbit-3d-node.person").first();
  await expect(marker).toBeVisible();
  await canvas.scrollIntoViewIfNeeded();
  const start = await canvas.evaluate((el) => {
    const b = el.getBoundingClientRect();
    for (let y = 20; y < b.height - 20; y += 20) {
      for (let x = 20; x < b.width - 100; x += 20) {
        if (document.elementFromPoint(b.left + x, b.top + y) === el)
          return { x: b.left + x, y: b.top + y };
      }
    }
    throw new Error("No uncovered canvas point for a drag");
  });
  const position = async () => {
    const box = await marker.boundingBox();
    if (!box) throw new Error("Orbit marker disappeared");
    return { x: box.x, y: box.y };
  };
  const initial = await position();
  let previous = initial;
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let x = 5; x <= 50; x += 5) {
    await page.mouse.move(start.x + x, start.y);
    await page.waitForTimeout(60);
    const next = await position();
    expect(Math.hypot(next.x - previous.x, next.y - previous.y)).toBeLessThan(
      45,
    );
    previous = next;
  }
  await page.mouse.up();
  expect(
    Math.hypot(previous.x - initial.x, previous.y - initial.y),
  ).toBeGreaterThan(1);
  await page.waitForTimeout(300);
  const settled = await position();
  expect(
    Math.hypot(settled.x - previous.x, settled.y - previous.y),
  ).toBeLessThan(1);
  await page.screenshot({
    path: info.outputPath("orbit-reduced-motion.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "2D map" }).click();
  await expect(page.locator(".orbit-node").first()).toBeAttached();
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.locator(".orbit-record-list")).toBeVisible();
});
