import { test, expect, type Page } from "@playwright/test";
async function upload(page: Page, text: string, name = "contacts.csv") {
  await page.goto("/#/import");
  const input = page.getByLabel("Contact CSV file"),
    restart = page.getByRole("button", {
      name: "Import another CSV",
      exact: true,
    });
  await expect(input.or(restart)).toBeVisible();
  if (await restart.isVisible()) await restart.click();
  await page
    .getByLabel("Contact CSV file")
    .setInputFiles({ name, mimeType: "text/csv", buffer: Buffer.from(text) });
  await page
    .getByRole("button", { name: "Continue to mapping", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Validate rows", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Review duplicates", exact: true })
    .click();
}
async function apply(page: Page) {
  await page
    .getByRole("button", { name: "Preview import summary", exact: true })
    .click();
  await page
    .getByLabel(
      "I reviewed the mappings, duplicate choices, selected updates and rejected rows.",
    )
    .check();
  await page
    .getByRole("button", { name: "Apply import to personal", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Import complete", exact: true }),
  ).toBeVisible();
}

test("80-contact CSV import, explicit duplicate updates, provenance and safe restore preview", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.getByRole("button", { name: /Create My Workspace/ }).click();
  await upload(
    page,
    "Name,Email,Role,Company\nPerson 0,person0@example.com,Original role,Company 0\nPerson 1,person1@example.com,Original role,Company 1",
  );
  await apply(page);
  const csv =
    "Name,Email,Role,Company,Priority,Category\n" +
    Array.from(
      { length: 80 },
      (_, i) =>
        `Person ${i},person${i}@example.com,Partnership Director,Company ${i % 15},High,Prospect`,
    ).join("\n");
  await upload(page, csv, "eighty-fictional-contacts.csv");
  const row = page
    .locator(".import-row")
    .filter({ hasText: "Row 2 · Person 0" });
  await expect(row).toContainText("Strong match");
  await row.getByLabel("Action for row 2").selectOption("update");
  await row.getByLabel("role", { exact: true }).check();
  await apply(page);
  await expect(page.locator(".import-summary")).toContainText("78");
  await expect(page.locator(".import-summary")).toContainText("13");
  await page
    .getByRole("link", { name: "Open your Network", exact: true })
    .click();
  await expect(page.locator(".results-label")).toContainText("80 people");
  await page
    .getByRole("textbox", { name: "Search network", exact: true })
    .fill("person0@example.com");
  await page.locator(".profile-card").filter({ hasText: "Person 0" }).click();
  await expect(page.locator(".profile-subtitle")).toContainText(
    "Partnership Director",
  );
  await expect(page.locator(".health-summary")).toContainText(
    "Not enough history",
  );
  await expect(page.locator(".story-entry")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".profile-subtitle")).toContainText(
    "Partnership Director",
  );
  await page.goto("/#/settings");
  await page
    .getByRole("button", { name: "Privacy & data", exact: true })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  await page
    .locator('input[type="file"][accept="application/json,.json"]')
    .setInputFiles(path!);
  await expect(page.getByRole("dialog")).toContainText("Compatible backup v6");
  await expect(page.getByRole("dialog")).toContainText("80 contacts");
  await expect(page.getByRole("dialog")).toContainText("REPLACES ALL");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  const invalid = Buffer.from(
    JSON.stringify({ format: "pulse-backup", version: 2, contacts: [] }),
  );
  await page
    .locator('input[type="file"][accept="application/json,.json"]')
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: invalid,
    });
  await expect(page.getByRole("alert")).toContainText(
    "No records have changed",
  );
  await page.goto("/#/network");
  await expect(page.locator(".results-label")).toContainText("80 people");
});

test("review snoozes persist and Smart List membership follows task completion", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore Demo/ }).click();
  await page.goto("/#/review");
  await expect(
    page.getByRole("heading", { name: "Relationships to review." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Overdue", exact: true }).click();
  await expect(page.locator(".review-card").first()).toContainText(
    "Overdue follow-up",
  );
  await page
    .locator(".review-card")
    .first()
    .getByRole("button", { name: "Reschedule follow-up", exact: true })
    .click();
  await page.getByLabel("Due date and time").fill("2028-01-01T10:00");
  await page
    .getByRole("button", { name: "Save follow-up", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Reconnect", exact: true }).click();
  const name = await page
    .locator(".review-card")
    .first()
    .locator("h2")
    .innerText();
  await page
    .locator(".review-card")
    .first()
    .getByRole("button", { name: "Snooze", exact: true })
    .click();
  await page.getByLabel("Snooze for").selectOption("7");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Snoozed", exact: true }).click();
  await expect(page.locator(".review-card")).toContainText(name);
  await page
    .locator(".review-card")
    .getByRole("button", { name: "Unsnooze", exact: true })
    .click();
  await expect(page.locator(".review-card")).toHaveCount(0);
  await page.goto("/#/lists");
  await page
    .getByRole("button", { name: "Create Smart List", exact: true })
    .click();
  await page.getByLabel("List name").fill("High priority overdue");
  await page.getByLabel("Value 1").selectOption("High");
  await page
    .getByRole("button", { name: "Add condition", exact: true })
    .click();
  await page.getByLabel("Field 2").selectOption("taskState");
  await page.getByLabel("Value 2").selectOption("Overdue");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await page
    .getByLabel("Choose a Smart List")
    .selectOption({ label: "High priority overdue · 1" });
  await expect(page.locator(".smart-layout .representative-row")).toHaveCount(
    1,
  );
  await page.locator(".smart-layout .representative-row").click();
  await page.getByRole("button", { name: "Complete", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Reopen", exact: true }),
  ).toBeVisible();
  await page.goto("/#/lists");
  await page
    .getByLabel("Choose a Smart List")
    .selectOption({ label: "High priority overdue · 0" });
  await expect(page.locator(".smart-layout .representative-row")).toHaveCount(
    0,
  );
});
