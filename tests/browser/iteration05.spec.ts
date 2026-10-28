import { test, expect, type Page } from "@playwright/test";
async function setup(page: Page) {
  await page.route("**/api/ai/status", (r) =>
    r.fulfill({
      json: {
        available: true,
        message: "Test-only mocked provider available.",
      },
    }),
  );
  await page.route("**/api/ai/generate", async (r) => {
    const v = r.request().postDataJSON();
    const ref =
      v.context.records.find(
        (s: { kind: string }) => s.kind === "interaction",
      ) || v.context.records[0];
    const result = {
      facts:
        v.operation === "ask"
          ? []
          : [{ text: "Reviewed record: " + ref.text, refs: [ref.id] }],
      suggestions: [],
      missing:
        v.operation === "ask"
          ? ["No budget amount is recorded in this selected context."]
          : [],
      draft:
        v.operation === "draft"
          ? {
              subject: "Partnership follow-up",
              body: "Hello, thank you for our discussion. Could we review the agreed next steps?",
            }
          : null,
      actions:
        v.operation === "extract-actions"
          ? [
              {
                title: "Prepare the revised proposal",
                description:
                  "Review the source and prepare a revised proposal.",
                dueAt: null,
                refs: [ref.id],
                reason: "User review required.",
              },
              {
                title: "Discuss a possible meeting",
                description: "Optional next step",
                dueAt: null,
                refs: [ref.id],
                reason: "No certain deadline.",
              },
            ]
          : [],
    };
    await r.fulfill({ json: { result } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.goto("/#/settings?section=integrations");
  await page.getByLabel("Enable optional AI features", { exact: true }).check();
  await page
    .getByRole("button", { name: "Save AI preferences", exact: true })
    .click();
  await expect(page.locator(".toast")).toContainText("AI preferences saved");
  await page.goto("/#/assistant?scope=contact&id=contact-0");
  await expect(
    page.getByRole("heading", { name: "PULSE Intelligence." }),
  ).toBeVisible();
}
async function approve(page: Page) {
  await page
    .getByRole("button", { name: "Review context", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Approve context sharing",
  );
  await page
    .getByRole("button", {
      name: "Send approved context to Gemini",
      exact: true,
    })
    .click();
  await expect(page.locator(".ai-answer")).toBeVisible();
}
test("selected context, cancel, grounded summary, scoped QA, editable draft, accepted task and ephemeral clearing", async ({
  page,
}) => {
  test.setTimeout(90000);
  await setup(page);
  let requests = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/ai/generate")) requests++;
  });
  await page
    .getByRole("button", { name: "Review context", exact: true })
    .click();
  const preview = page.locator(".ai-preview");
  await expect(preview).not.toContainText("olivia.chen@");
  await expect(preview).not.toContainText("permission");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(requests).toBe(0);
  await approve(page);
  await page.locator(".ai-fact summary").first().click();
  await expect(
    page
      .getByRole("button", { name: "Open saved interaction", exact: true })
      .first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open saved interaction", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("combobox", { name: "AI operation", exact: true })
    .selectOption("ask");
  await page
    .getByLabel("Your question", { exact: true })
    .fill("What budget amount is known?");
  await approve(page);
  await expect(page.locator(".ai-answer")).toContainText(
    "No budget amount is recorded",
  );
  await page
    .getByRole("combobox", { name: "AI operation", exact: true })
    .selectOption("draft");
  await page
    .getByLabel("Message goal", { exact: true })
    .fill("Friendly partnership follow-up");
  await page
    .getByRole("combobox", { name: "Tone", exact: true })
    .selectOption("Friendly");
  await approve(page);
  await page
    .getByRole("textbox", { name: "Draft message", exact: true })
    .fill("An edited draft for manual review.");
  await expect(
    page.getByRole("textbox", { name: "Draft message", exact: true }),
  ).toHaveValue("An edited draft for manual review.");
  await page
    .getByRole("combobox", { name: "AI operation", exact: true })
    .selectOption("extract-actions");
  await page
    .getByLabel("Optional note to extract (also sent if approved)")
    .fill(
      "I promised to prepare an updated proposal. The date is not decided.",
    );
  await approve(page);
  await page
    .getByLabel("Reviewed due date 1", { exact: true })
    .fill("2027-01-21T10:00");
  await page
    .locator(".ai-proposal")
    .first()
    .getByRole("button", { name: "Save reviewed task", exact: true })
    .click();
  await expect(page.locator(".ai-proposal").first()).toContainText(
    "Saved or rejected",
  );
  await page
    .locator(".ai-proposal")
    .nth(1)
    .getByRole("button", { name: "Reject proposal", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "PULSE Intelligence.", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".ai-answer")).toHaveCount(0);
  await page.goto("/#/activity");
  await expect(
    page
      .locator(".managed-task")
      .filter({ hasText: "Prepare the revised proposal" }),
  ).toHaveCount(1);
  await expect(
    page
      .locator(".managed-task")
      .filter({ hasText: "Discuss a possible meeting" }),
  ).toHaveCount(0);
  await page
    .locator(".managed-task")
    .filter({ hasText: "Prepare the revised proposal" })
    .getByText("Details & tools", { exact: true })
    .click();
  await page
    .locator(".managed-task")
    .filter({ hasText: "Prepare the revised proposal" })
    .getByRole("button", { name: "Calendar export", exact: true })
    .click();
  await page
    .getByLabel("All-day event (uses selected device calendar date)")
    .check();
  const d = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download .ics", exact: true })
    .click();
  expect((await d).suggestedFilename()).toBe("pulse-event.ics");
  await page.goto("/#/assistant?scope=contact&id=contact-0");
  await page
    .getByRole("button", { name: "Clear temporary conversation", exact: true })
    .click();
  await expect(page.locator(".ai-answer")).toHaveCount(0);
});
test("AI panels and approval dialogs fit every requested width and both themes", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await setup(page);
  for (const theme of ["light", "dark"]) {
    await page.goto("/#/settings");
    await page
      .getByRole("button", {
        name: theme === "light" ? "Light" : "Dark",
        exact: true,
      })
      .click();
    await page.goto("/#/assistant?scope=contact&id=contact-0");
    for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page
        .getByText("Choose included information", { exact: true })
        .click();
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);
      await page
        .getByText("Choose included information", { exact: true })
        .click();
      await page
        .getByRole("button", { name: "Review context", exact: true })
        .click();
      const box = await page.getByRole("dialog").boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(
        await page
          .getByRole("dialog")
          .evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
    }
    await approve(page);
    if (info.project.name === "mobile") {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: info.outputPath(`assistant-${theme}.png`),
      });
    }
  }
});

test("unconfigured AI remains off and local communication review works without provider requests", async ({
  page,
}) => {
  let generated = 0;
  await page.route("**/api/ai/status", (r) =>
    r.fulfill({ json: { available: false, message: "AI is not configured." } }),
  );
  await page.route("**/api/ai/generate", (r) => {
    generated++;
    return r.abort();
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.goto("/#/assistant?scope=contact&id=contact-0");
  await expect(
    page.getByRole("status").filter({ hasText: "AI is not configured" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Review context", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Enable optional AI");
  await page.goto("/#/network/people/contact-0");
  await page.getByText("More relationship tools", { exact: true }).click();
  await page
    .getByRole("button", { name: "Message handoff", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("No AI");
  await page
    .getByRole("textbox", { name: "Message body", exact: true })
    .fill("A locally reviewed relationship message.");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  expect(generated).toBe(0);
});
