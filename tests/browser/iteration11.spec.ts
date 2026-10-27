import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("reviewed Google contact selection uses the existing import wizard", async ({
  page,
  context,
}) => {
  test.skip(process.env.PULSE_TEST_GOOGLE_MOCK !== "1", "Requires the mocked Google-client build.");
  test.setTimeout(120000);
  await context.addInitScript(() => {
    Object.assign(window, {
      google: {
        accounts: {
          oauth2: {
            initTokenClient: (options: {
              scope: string;
              callback: (v: unknown) => void;
            }) => ({
              requestAccessToken: () =>
                options.callback({
                  access_token: "mock",
                  expires_in: 3600,
                  scope: options.scope,
                }),
            }),
            revoke: (_token: string, cb: () => void) => cb(),
          },
        },
      },
    });
  });
  await page.route("https://people.googleapis.com/**", async (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({
        connections: [
          {
            resourceName: "people/a",
            names: [{ displayName: "Fictional Google Person" }],
            emailAddresses: [{ value: "fake@example.com" }],
            organizations: [{ name: "Fictional Company" }],
          },
          {
            resourceName: "people/b",
            names: [{ displayName: "Not Selected" }],
          },
        ],
      }),
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Create My Workspace/i }).click();
  await expect(page.getByRole("heading", { name: /^Good (morning|afternoon|evening)/ })).toBeVisible();
  await page.goto("/#/settings?section=integrations");
  await page
    .getByRole("button", { name: "Connect and preview contacts" })
    .click();
  await expect(
    page.getByText("2 retrieved · 0 selected.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: /Fictional Google Person/ }).check();
  await page.getByRole("button", { name: "Review selected contacts" }).click();
  await expect(
    page.getByRole("heading", { name: "Preview your file" }),
  ).toBeVisible();
  await expect(page.getByText("Fictional Google Person")).toBeVisible();
  await expect(page.getByText("Not Selected")).toHaveCount(0);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Continue to mapping" }).click();
  await page.getByRole("button", { name: "Validate rows" }).click();
  await page.getByRole("button", { name: "Review duplicates" }).click();
  await page.getByRole("button", { name: "Preview import summary" }).click();
  await page.getByRole("checkbox", { name: /I reviewed the mappings/ }).check();
  await page.getByRole("button", { name: "Apply import to personal" }).click();
  await expect(
    page.getByRole("heading", { name: "Import complete" }),
  ).toBeVisible();
  await page.goto("/#/network");
  await expect(
    page
      .locator(".profile-card")
      .filter({ hasText: "Fictional Google Person" }),
  ).toBeVisible();
  await expect(
    page.locator(".profile-card").filter({ hasText: "Not Selected" }),
  ).toHaveCount(0);
});

test("Calendar creates only the reviewed event and recognizes its stable duplicate", async ({
  page,
  context,
}) => {
  test.skip(process.env.PULSE_TEST_GOOGLE_MOCK !== "1", "Requires the mocked Google-client build.");
  test.setTimeout(120000);
  await context.addInitScript(() => {
    Object.assign(window, {
      google: {
        accounts: {
          oauth2: {
            initTokenClient: (options: {
              scope: string;
              callback: (v: unknown) => void;
            }) => ({
              requestAccessToken: () =>
                options.callback({
                  access_token: "mock",
                  expires_in: 3600,
                  scope: options.scope,
                }),
            }),
            revoke: (_token: string, cb: () => void) => cb(),
          },
        },
      },
    });
  });
  let created: { id: string; description: string } | null = null;
  await page.route("https://www.googleapis.com/calendar/**", async (route) => {
    const req = route.request();
    if (req.method() === "POST") {
      const body = req.postDataJSON() as { id: string; description: string };
      if (created)
        return route.fulfill({
          status: 409,
          headers: { "access-control-allow-origin": "*" },
          body: "{}",
        });
      created = body;
      return route.fulfill({
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({
          id: body.id,
          htmlLink: "https://calendar.google.com/calendar/event?eid=test",
        }),
      });
    }
    return route.fulfill({
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({
        id: created?.id,
        htmlLink: "https://calendar.google.com/calendar/event?eid=test",
      }),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Create My Workspace/i }).click();
  await expect(page.getByRole("heading", { name: /^Good (morning|afternoon|evening)/ })).toBeVisible();
  await page.goto("/#/network");
  await page
    .locator(".page-heading")
    .getByRole("button", { name: "Add person", exact: true })
    .click();
  await page
    .getByLabel("Full name", { exact: true })
    .fill("Calendar Test Person");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await page
    .locator(".profile-card")
    .filter({ hasText: "Calendar Test Person" })
    .click();
  await page.getByRole("button", { name: "Follow up", exact: true }).click();
  await page.getByLabel("Follow-up title").fill("Calendar Test Follow-up");
  await page
    .getByRole("button", { name: "Save follow-up", exact: true })
    .click();
  await page.getByRole("button", { name: "Calendar export" }).first().click();
  let dialog = page.getByRole("dialog");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await dialog.getByRole("button", { name: "Add to Google Calendar" }).click();
  await expect(dialog.getByRole("status")).toContainText("Event created");
  expect(created?.description).toBe("");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Calendar export" }).first().click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Add to Google Calendar" }).click();
  await expect(dialog.getByRole("status")).toContainText("already exists");
});

test("integration controls fit documented widths and themes", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.getByRole("button", { name: /Create My Workspace/i }).click();
  await expect(page.getByRole("heading", { name: /^Good (morning|afternoon|evening)/ })).toBeVisible();
  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440])
    for (const theme of ["light", "dark"]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/#/settings?section=integrations");
      await expect(
        page.getByRole("heading", { name: "Google Contacts" }),
      ).toBeVisible();
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${width} ${theme}`,
      ).toBe(true);
      if (width === 390 || width === 1440)
        await page.screenshot({
          path: info.outputPath(`integrations-${width}-${theme}.png`),
          fullPage: true,
          animations: "disabled",
        });
    }
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test("unconfigured Google controls stay disabled while local handoffs remain available", async ({
  page,
}) => {
  test.skip(process.env.PULSE_TEST_GOOGLE_MOCK === "1", "Requires the unconfigured build.");
  await page.goto("/");
  await page.getByRole("button", { name: /Create My Workspace/i }).click();
  await expect(page.getByRole("heading", { name: /^Good (morning|afternoon|evening)/ })).toBeVisible();
  await page.goto("/#/settings?section=integrations");
  await expect(
    page.getByRole("button", { name: "Connect and preview contacts" }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "Google Cloud OAuth configuration is needed before connecting.",
    ),
  ).toBeVisible();
  await expect(
    page.getByText("Gmail API drafts", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Unavailable pending Google approval", { exact: false }),
  ).toBeVisible();
});

test("closing Calendar review during authorization prevents event creation", async ({
  page,
  context,
}) => {
  test.skip(process.env.PULSE_TEST_GOOGLE_MOCK !== "1", "Requires the mocked Google-client build.");
  test.setTimeout(120000);
  await context.addInitScript(() => {
    Object.assign(window, {
      google: {
        accounts: {
          oauth2: {
            initTokenClient: (options: {
              callback: (v: unknown) => void;
              scope: string;
            }) => ({
              requestAccessToken: () =>
                Object.assign(window, {
                  testGoogleCallback: () =>
                    options.callback({
                      access_token: "mock",
                      expires_in: 3600,
                      scope: options.scope,
                    }),
                }),
            }),
            revoke: (_token: string, cb: () => void) => cb(),
          },
        },
      },
    });
  });
  let apiCalls = 0;
  await page.route("https://www.googleapis.com/calendar/**", async (route) => {
    apiCalls++;
    await route.abort();
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Create My Workspace/i }).click();
  await expect(page.getByRole("heading", { name: /^Good (morning|afternoon|evening)/ })).toBeVisible();
  await page.goto("/#/network");
  await page
    .locator(".page-heading")
    .getByRole("button", { name: "Add person", exact: true })
    .click();
  await page
    .getByLabel("Full name", { exact: true })
    .fill("Cancellation Test Person");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await page
    .locator(".profile-card")
    .filter({ hasText: "Cancellation Test Person" })
    .click();
  await page.getByRole("button", { name: "Follow up", exact: true }).click();
  await page.getByLabel("Follow-up title").fill("Cancellation Test Follow-up");
  await page
    .getByRole("button", { name: "Save follow-up", exact: true })
    .click();
  await page.getByRole("button", { name: "Calendar export" }).first().click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add to Google Calendar" })
    .click();
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { testGoogleCallback?: unknown })
        .testGoogleCallback === "function",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page.evaluate(() =>
    (
      window as unknown as { testGoogleCallback: () => void }
    ).testGoogleCallback(),
  );
  await page.waitForTimeout(300);
  expect(apiCalls).toBe(0);
});
