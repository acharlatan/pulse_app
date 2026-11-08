import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("keyboard can create and find a person, escape a dialog and use Orbit list", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: /Create My Workspace/ }).click();
  await page.goto("/#/network");
  const opener = page
    .getByRole("button", { name: "Add person", exact: true })
    .first();
  await opener.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const first = dialog
    .locator(
      'button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),a[href]',
    )
    .first();
  await first.focus();
  await page.keyboard.press("Shift+Tab");
  expect(
    await dialog.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Tab");
  expect(
    await dialog.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await page.keyboard.press("Enter");
  await page.getByLabel("Full name").fill("Morgan Keyboard Fictional");
  await page.getByLabel("Email", { exact: true }).fill("invalid-email");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await expect(dialog).toBeVisible();
  expect(
    await page
      .getByLabel("Email", { exact: true })
      .evaluate((el: HTMLInputElement) => el.validity.valid),
  ).toBe(false);
  await page
    .getByLabel("Email", { exact: true })
    .fill("morgan-keyboard@example.com");
  const save = page.getByRole("button", { name: "Save person", exact: true });
  await save.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.locator("main h1")).toBeVisible();
  await page.keyboard.press("Control+k");
  const search = page.getByRole("dialog", { name: "Search PULSE" });
  const field = search.getByRole("combobox", {
    name: "Search records and actions",
  });
  await expect(field).toBeFocused();
  await field.fill("Morgan Keyboard Fictional");
  await expect(
    search.getByRole("option", { name: /Morgan Keyboard Fictional/ }),
  ).toBeVisible();
  const report = await new AxeBuilder({ page })
    .include("dialog")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    report.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/network\/people\//);
  await expect(
    page.getByRole("heading", { name: "Morgan Keyboard Fictional", level: 1 }),
  ).toBeVisible();
  await page.goto("/#/orbit");
  const list = page.getByRole("button", { name: "List", exact: true });
  await list.focus();
  await page.keyboard.press("Space");
  await expect(page.locator(".orbit-record-list")).toBeVisible();
  await expect(page.locator(".orbit-record-list")).toContainText(
    "Morgan Keyboard Fictional",
  );
  await page
    .locator(".orbit-list-item")
    .filter({ hasText: "Morgan Keyboard Fictional" })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("complementary", { name: "Selected relationship" }),
  ).toContainText("Morgan Keyboard Fictional");
  console.log(
    "PHASE4_ENGINE",
    JSON.stringify({
      engine: info.project.name,
      browser: browser.version(),
      node: process.version,
      userAgent: await page.evaluate(() => navigator.userAgent),
      reducedMotion: await page.evaluate(
        () => matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
    }),
  );
});

test("Tab and Enter activate the focused search result", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await expect(page.locator("main h1")).toBeVisible();
  await page.keyboard.press("Control+k");
  const search = page.getByRole("dialog", { name: "Search PULSE" });
  await expect(search.getByRole("combobox")).toBeFocused();
  const person = search.getByRole("option", { name: /Add person/ });
  const company = search.getByRole("option", { name: /Add company/ });
  await page.keyboard.press("Tab");
  await expect(person).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(company).toBeFocused();
  const focusRing = await company.evaluate((element) => ({
    style: getComputedStyle(element).outlineStyle,
    width: parseFloat(getComputedStyle(element).outlineWidth),
  }));
  expect(focusRing.style).not.toBe("none");
  expect(focusRing.width).toBeGreaterThanOrEqual(2);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "New company" })).toBeVisible();
  await expect(page.getByLabel("Company name")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("device reduced motion suppresses animated profile scrolling", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const original = Element.prototype.scrollIntoView;
    (
      window as typeof window & {
        pulseScrollOptions: (ScrollIntoViewOptions | boolean | undefined)[];
      }
    ).pulseScrollOptions = [];
    Element.prototype.scrollIntoView = function (
      options?: ScrollIntoViewOptions | boolean,
    ) {
      (
        window as typeof window & {
          pulseScrollOptions: (ScrollIntoViewOptions | boolean | undefined)[];
        }
      ).pulseScrollOptions.push(options);
      original.call(this, options);
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.goto("/#/network/people/contact-0");
  await page.evaluate(() => {
    (
      window as typeof window & { pulseScrollOptions: unknown[] }
    ).pulseScrollOptions = [];
  });
  await page
    .getByRole("navigation", { name: "Profile sections" })
    .getByRole("button", { name: "Story", exact: true })
    .click();
  const options = await page.evaluate(
    () =>
      (
        window as typeof window & {
          pulseScrollOptions: ScrollIntoViewOptions[];
        }
      ).pulseScrollOptions,
  );
  expect(options.some((value) => value?.behavior === "instant")).toBe(true);
  expect(options.some((value) => value?.behavior === "smooth")).toBe(false);
});

test("Orbit offers a list and 2D map without WebGL", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (type.includes("webgl")) return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.goto("/#/orbit");
  await expect(
    page.getByText("3D is unavailable on this device.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "2D map" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.locator(".orbit-record-list")).toBeVisible();
  await expect(page.locator(".orbit-list-item").first()).toBeVisible();
});

test("a duplicate email is announced in the open editor without losing text", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Create My Workspace/ }).click();
  await page.goto("/#/network");
  const add = page
    .getByRole("button", { name: "Add person", exact: true })
    .first();
  await add.click();
  await page.getByLabel("Full name").fill("Avery Error Fixture");
  await page.getByLabel("Email", { exact: true }).fill("unique-qa@example.com");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await add.click();
  const editor = page.getByRole("dialog");
  await page.getByLabel("Full name").fill("Taylor Error Fixture");
  await page.getByLabel("Email", { exact: true }).fill("unique-qa@example.com");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await expect(editor.getByRole("alert")).toContainText(
    "A contact with this email already exists.",
  );
  await expect(editor.locator("form")).toHaveAttribute(
    "aria-describedby",
    "form-error",
  );
  await expect(page.getByLabel("Full name")).toHaveValue(
    "Taylor Error Fixture",
  );
});
