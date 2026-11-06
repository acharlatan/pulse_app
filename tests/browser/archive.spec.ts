import fs from "node:fs";
import { expect, test } from "@playwright/test";

test("archive and restore preserve linked records across a backup", async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  page.setDefaultTimeout(12000);
  await page.goto("/");
  await page.getByRole("button", { name: /Create My Workspace/ }).click();
  await page.goto("/#/network");
  await page.getByRole("tab", { name: /Companies/ }).click();
  await page
    .getByRole("button", { name: "Add company", exact: true })
    .first()
    .click();
  await page.getByLabel("Company name").fill("Fictional Archive Studio");
  await page.getByRole("button", { name: "Save company", exact: true }).click();
  await page
    .locator(".company-card")
    .filter({ hasText: "Fictional Archive Studio" })
    .click();
  const companyURL = page.url();
  await page
    .getByRole("button", { name: "Add representative", exact: true })
    .click();
  await page.getByLabel("Full name").fill("Taylor Archive Test");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await page
    .getByLabel("People and opportunities at this company")
    .getByRole("link", { name: /Taylor Archive Test/ })
    .click();
  const personURL = page.url();
  await page
    .getByRole("button", { name: "Log interaction", exact: true })
    .first()
    .click();
  await page
    .getByLabel("What would you like to remember?")
    .fill("A real conversation stays in the relationship history.");
  await page
    .getByRole("button", { name: "Save interaction", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Follow up", exact: true })
    .first()
    .click();
  await page.getByLabel("Follow-up title").fill("Archive journey follow-up");
  await page
    .getByRole("button", { name: "Save follow-up", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create opportunity", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Opportunity title")
    .fill("Archive journey opportunity");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page
    .getByRole("button", { name: "Archive contact", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "follow-ups and existing automations remain active",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Archive", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".profile-badges")).toContainText("Archived");
  await page.goto(companyURL);
  await page
    .getByRole("button", { name: "Archive company", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Archive", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/#/network");
  const results = page.locator("#directory-results");
  await expect(results).not.toContainText("Taylor Archive Test");
  await page.getByRole("tab", { name: /Companies/ }).click();
  await expect(results).not.toContainText("Fictional Archive Studio");
  await page.getByLabel("Archive status").selectOption("archived");
  await expect(results).toContainText("Fictional Archive Studio");
  await expect(results).toContainText("Archived");
  await page.getByRole("tab", { name: /People/ }).click();
  await expect(results).toContainText("Taylor Archive Test");
  await page.keyboard.press("Control+k");
  const searchDialog = page.getByRole("dialog", { name: "Search PULSE" });
  await searchDialog
    .getByRole("combobox", { name: "Search records and actions" })
    .fill("Taylor Archive Test");
  await searchDialog
    .getByRole("option", { name: /Taylor Archive Test.*Archived contact/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Taylor Archive Test", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#next-steps")).toContainText(
    "Archive journey follow-up",
  );

  await page.goto("/#/settings?section=data");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const file = await (await downloading).path();
  expect(file).toBeTruthy();
  const backup = JSON.parse(fs.readFileSync(file!, "utf8"));
  const contact = backup.contacts.find(
    (r: { name: string }) => r.name === "Taylor Archive Test",
  );
  const company = backup.organizations.find(
    (r: { name: string }) => r.name === "Fictional Archive Studio",
  );
  expect(contact.archivedAt).toBeTruthy();
  expect(company.archivedAt).toBeTruthy();
  expect(contact.organizationId).toBe(company.id);
  expect(backup.interactions[0].contactId).toBe(contact.id);
  expect(backup.tasks[0].contactId).toBe(contact.id);
  expect(backup.opportunities[0].contactIds).toContain(contact.id);

  const clean = await browser.newContext();
  try {
    const target = await clean.newPage();
    await target.goto(new URL("/", page.url()).href);
    await target.getByRole("button", { name: /Create My Workspace/ }).click();
    await target.goto(new URL("/#/settings?section=data", page.url()).href);
    await target
      .locator('input[type="file"][accept="application/json,.json"]')
      .setInputFiles(file!);
    await expect(target.getByRole("dialog")).toContainText(
      "Compatible backup v7",
    );
    await target
      .getByRole("button", { name: "Validate & restore", exact: true })
      .click();
    await expect(target.getByRole("dialog")).toHaveCount(0);
    await target.goto(
      new URL(`/#/network/people/${contact.id}`, page.url()).href,
    );
    await expect(target.locator(".profile-badges")).toContainText("Archived");
    await expect(
      target
        .getByText("A real conversation stays in the relationship history.", {
          exact: true,
        })
        .first(),
    ).toBeVisible();
    await expect(target.locator("#next-steps")).toContainText(
      "Archive journey follow-up",
    );
    await target
      .getByRole("button", { name: "Restore from archive", exact: true })
      .click();
    await target
      .getByRole("dialog")
      .getByRole("button", { name: "Restore", exact: true })
      .click();
    await expect(target.locator(".profile-badges")).not.toContainText(
      "Archived",
    );
    await target.goto(
      new URL(`/#/network/companies/${company.id}`, page.url()).href,
    );
    await target
      .getByRole("button", { name: "Restore from archive", exact: true })
      .click();
    await target
      .getByRole("dialog")
      .getByRole("button", { name: "Restore", exact: true })
      .click();
    await target.goto(new URL("/#/network", page.url()).href);
    await expect(target.locator("#directory-results")).toContainText(
      "Taylor Archive Test",
    );
    await target.getByRole("tab", { name: /Companies/ }).click();
    await expect(target.locator("#directory-results")).toContainText(
      "Fictional Archive Studio",
    );
    await target.goto(new URL(personURL).href);
    await expect(target.locator("#next-steps")).toContainText(
      "Archive journey follow-up",
    );
  } finally {
    await clean.close();
  }
});
