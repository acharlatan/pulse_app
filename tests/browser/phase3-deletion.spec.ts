import fs from "node:fs";
import { expect, test } from "@playwright/test";

test("editing and deletion preserve the documented linked records", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.getByRole("button", { name: /Create My Workspace/ }).click();
  await page.goto("/#/network");
  await page.getByRole("tab", { name: /Companies/ }).click();
  await page
    .getByRole("button", { name: "Add company", exact: true })
    .first()
    .click();
  await page.getByLabel("Company name").fill("Fictional Deletion Co");
  await page.getByRole("button", { name: "Save company", exact: true }).click();
  await page
    .locator(".company-card")
    .filter({ hasText: "Fictional Deletion Co" })
    .click();
  const companyURL = page.url();
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await page.getByLabel("Company name").fill("Fictional Updated Co");
  await page.getByRole("button", { name: "Save company", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Fictional Updated Co", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add representative", exact: true })
    .click();
  await page.getByLabel("Full name").fill("Casey Delete Test");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await page
    .getByLabel("People and opportunities at this company")
    .getByRole("link", { name: /Casey Delete Test/ })
    .click();
  const personURL = page.url();
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await page.getByLabel("Full name").fill("Casey Updated Test");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await page
    .getByRole("button", { name: "Log interaction", exact: true })
    .first()
    .click();
  await page
    .getByLabel("What would you like to remember?")
    .fill("Saved test conversation stays after deleting the company.");
  await page
    .getByRole("button", { name: "Save interaction", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Follow up", exact: true })
    .first()
    .click();
  await page.getByLabel("Follow-up title").fill("Saved test follow-up");
  await page
    .getByRole("button", { name: "Save follow-up", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Create opportunity", exact: true })
    .first()
    .click();
  await page.getByLabel("Opportunity title").fill("Preserved test opportunity");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto(companyURL);
  await page
    .getByRole("button", { name: "Delete company", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "preserved and detached",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/network$/);
  await page.goto(personURL);
  await expect(
    page.getByRole("heading", { name: "Casey Updated Test", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByText("Saved test conversation stays after deleting the company.", {
        exact: true,
      })
      .first(),
  ).toBeVisible();
  await expect(page.locator("#next-steps")).toContainText(
    "Saved test follow-up",
  );
  await page.goto("/#/settings?section=data");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const file = await (await pending).path();
  expect(file).toBeTruthy();
  const backup = JSON.parse(fs.readFileSync(file!, "utf8"));
  expect(backup.organizations).toHaveLength(0);
  expect(backup.contacts[0].organizationId).toBeNull();
  expect(backup.interactions[0].organizationId).toBeNull();
  expect(backup.tasks[0].organizationId).toBeNull();
  expect(backup.opportunities[0].organizationId).toBeNull();
  expect(backup.opportunities[0].contactIds).toContain(backup.contacts[0].id);
  await page.goto(personURL);
  await page
    .getByRole("button", { name: "Delete contact", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "deletes the contact and their interactions, tasks",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/network$/);
  await page.goto(personURL);
  await expect(page.getByText("This connection isn't here")).toBeVisible();
  await page.goto("/#/settings?section=data");
  const finalDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const finalFile = await (await finalDownload).path();
  const after = JSON.parse(fs.readFileSync(finalFile!, "utf8"));
  expect(after.contacts).toHaveLength(0);
  expect(after.interactions).toHaveLength(0);
  expect(after.tasks).toHaveLength(0);
  expect(after.opportunities).toHaveLength(1);
  expect(after.opportunities[0].contactIds).toEqual([]);
});
