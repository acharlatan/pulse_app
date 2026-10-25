import { test, expect, type Page } from "@playwright/test";
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
}
test("Northstar relationship workflow persists and all new editors work", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.getByRole("button", { name: /Create my workspace/i }).click();
  await page.goto("/#/network");
  await page.getByRole("tab", { name: /Companies/ }).click();
  await page
    .locator(".page-heading")
    .getByRole("button", { name: "Add company", exact: true })
    .click();
  await page.getByLabel("Company name").fill("Northstar Partners");
  await page.getByRole("button", { name: "Save company", exact: true }).click();
  await page
    .locator(".company-card")
    .filter({ hasText: "Northstar Partners" })
    .click();
  const companyURL = page.url();
  for (const name of ["Sarah Example", "Alex Example", "Jordan Example"]) {
    await page
      .getByRole("button", { name: "Add representative", exact: true })
      .click();
    await page.getByLabel("Full name", { exact: true }).fill(name);
    await page.getByLabel("Role or title").fill("Partnership director");
    await page
      .getByRole("button", { name: "Save person", exact: true })
      .click();
    await expect(
      page.locator(".representative-row").filter({ hasText: name }),
    ).toBeVisible();
  }
  await expect(page.locator(".representative-row")).toHaveCount(3);
  await page
    .locator(".representative-row")
    .filter({ hasText: "Sarah Example" })
    .click();
  const personURL = page.url();
  await page
    .getByRole("button", { name: "Log interaction", exact: true })
    .click();
  await page
    .getByLabel("What would you like to remember?")
    .fill("Discussed the partnership scope.");
  await page
    .getByRole("button", { name: "Save interaction", exact: true })
    .click();
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await page
    .getByLabel("What would you like to remember?")
    .fill("Upcoming budget review.");
  await page
    .getByRole("button", { name: "Save interaction", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create opportunity", exact: true })
    .click();
  await page
    .getByLabel("Opportunity title")
    .fill("Northstar annual partnership");
  await page.getByText("Alex Example", { exact: true }).last().click();
  await page.getByLabel("Value (optional)").fill("25000");
  await page
    .getByLabel("Expected close (device time)")
    .fill("2027-01-20T10:00");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page
      .locator(".deal-card")
      .filter({ hasText: "Northstar annual partnership" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Follow up", exact: true }).click();
  await page.getByLabel("Follow-up title").fill("Review budget with Sarah");
  await page
    .getByRole("button", { name: "Save follow-up", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Manage availability", exact: true })
    .click();
  await page.getByLabel("Reason", { exact: true }).fill("Budget review period");
  await page
    .getByLabel("Until (optional, device time)")
    .fill("2027-02-01T10:00");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByRole("button", { name: "Edit task", exact: true }).click();
  await page.getByLabel("Due date and time").fill("2027-02-02T10:00");
  await page
    .getByLabel("Details", { exact: true })
    .fill("Rescheduled after the budget review.");
  await page
    .getByRole("button", { name: "Save follow-up", exact: true })
    .click();
  const call = page
    .locator(".story-entry")
    .filter({ hasText: "Discussed the partnership scope." });
  await call.getByRole("button", { name: "Edit entry" }).click();
  await page
    .getByLabel("What would you like to remember?")
    .fill("Corrected partnership scope.");
  await page
    .getByRole("button", { name: "Save interaction", exact: true })
    .click();
  await expect(
    page.getByText("Corrected partnership scope.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "View / edit opportunity", exact: true })
    .click();
  await page.getByLabel("Stage / outcome").selectOption("Negotiation");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page
    .getByRole("button", { name: "View / edit opportunity", exact: true })
    .click();
  await page.getByLabel("Stage / outcome").selectOption("Won");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("Won · won", { exact: true })).toBeVisible();
  await page.goto("/#/settings");
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goto(personURL);
  await expect(
    page.getByText("Corrected partnership scope.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".managed-task")).toContainText(
    "Rescheduled after the budget review.",
  );
  await page.getByRole("button", { name: "Complete", exact: true }).click();
  await page.getByRole("button", { name: "Reopen", exact: true }).click();
  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await noOverflow(page);
    await page.getByRole("button", { name: "Edit task", exact: true }).click();
    await noOverflow(page);
    const bounds = await page.getByRole("dialog").boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
  }
  await page.goto(companyURL);
  await expect(page.locator(".story-entry")).toHaveCount(2);
  await expect(page.getByText("Won · won", { exact: true })).toBeVisible();
  await noOverflow(page);
});

test("record deletion and purpose-specific permission controls preserve profiles", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.goto("/#/network/people/contact-0");
  await page.getByText("Communication permissions", { exact: true }).click();
  await page
    .getByRole("button", { name: "Record permission", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Purpose").selectOption("Marketing");
  await page.getByLabel("Permission status").selectOption("Withdrawn");
  await page
    .getByLabel("Evidence / source")
    .fill("Client asked to stop promotions");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.locator(".permission-row").filter({ hasText: "Marketing" }),
  ).toContainText("Withdrawn");
  await page.getByRole("button", { name: "Edit entry", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete record", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm delete", exact: true })
    .click();
  await expect(page.locator(".story-entry")).toHaveCount(0);
  await page.getByRole("button", { name: "Edit task", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete record", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm delete", exact: true })
    .click();
  await expect(page.locator(".managed-task")).toHaveCount(0);
  await page
    .getByRole("button", { name: "View / edit opportunity", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete opportunity", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.locator(".deal-card")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Olivia Chen", exact: true }),
  ).toBeVisible();
  await page.getByText("Communication permissions", { exact: true }).click();
  await expect(
    page.locator(".permission-row").filter({ hasText: "Marketing" }),
  ).toContainText("Withdrawn");
});
