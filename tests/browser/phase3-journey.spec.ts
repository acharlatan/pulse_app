import fs from "node:fs";
import { expect, test } from "@playwright/test";

test("a new consultant manages and recovers a complete relationship", async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  page.setDefaultTimeout(12000);
  const company = "Northstar Fictional Studio";
  const person = "Avery Fictional";
  const conversation = "Discussed the upcoming campaign review.";
  const task = "Send the campaign proposal";
  const deal = "Northstar campaign project";
  let profile = "";

  await test.step("Create and link a company and person", async () => {
    await page.goto("/");
    await page.getByRole("button", { name: /Create My Workspace/ }).click();
    await expect(
      page.getByRole("heading", { name: "Today.", exact: true }),
    ).toBeVisible();
    await page.goto("/#/network");
    await page.getByRole("tab", { name: /Companies/ }).click();
    await page
      .getByRole("button", { name: "Add company", exact: true })
      .first()
      .click();
    await page.getByLabel("Company name").fill(company);
    await page
      .getByRole("button", { name: "Save company", exact: true })
      .click();
    await page.locator(".company-card").filter({ hasText: company }).click();
    await expect(
      page.getByRole("heading", { name: company, exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Add representative", exact: true })
      .click();
    await page.getByLabel("Full name").fill(person);
    await page.getByLabel("Role or title").fill("Marketing lead");
    await page
      .getByRole("button", { name: "Save person", exact: true })
      .click();
    await page
      .getByLabel("People and opportunities at this company")
      .getByRole("link", { name: new RegExp(person) })
      .click();
    await expect(
      page.getByRole("heading", { name: person, exact: true }),
    ).toBeVisible();
    profile = page.url();
  });

  await test.step("Record a conversation and follow-up", async () => {
    await page
      .getByRole("button", { name: "Log interaction", exact: true })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Interaction type").selectOption("Call");
    await dialog
      .getByLabel("What would you like to remember?")
      .fill(conversation);
    await dialog
      .getByRole("button", { name: "Save interaction", exact: true })
      .click();
    await expect(
      page.getByText(conversation, { exact: true }).first(),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Follow up", exact: true })
      .first()
      .click();
    await page.getByLabel("Follow-up title").fill(task);
    await page
      .getByRole("button", { name: "Save follow-up", exact: true })
      .click();
    await expect(page.locator("#next-steps")).toContainText(task);
  });

  await test.step("Create an opportunity and move it through stages", async () => {
    await page
      .getByRole("button", { name: "Create opportunity", exact: true })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Opportunity title").fill(deal);
    await dialog.getByLabel("Value (optional)").fill("12000");
    await dialog.getByLabel("Currency", { exact: true }).fill("USD");
    await dialog
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await page.goto("/#/pipeline");
    const card = page.locator(".pipeline-deal").filter({ hasText: deal });
    await expect(card).toBeVisible();
    await card.getByLabel("Move to stage / reopen").selectOption("Proposal");
    await expect(
      page.getByRole("status").filter({ hasText: "Opportunity updated" }),
    ).toBeVisible();
    await card.getByLabel("Move to stage / reopen").selectOption("Negotiation");
    await expect(card.getByLabel("Move to stage / reopen")).toHaveValue(
      "Negotiation",
    );
  });

  await test.step("Choose the follow-up in Focus, complete it and reopen it", async () => {
    await page.goto("/#/focus");
    await page
      .getByRole("button", { name: "Add a priority", exact: true })
      .first()
      .click();
    await page.getByLabel("Record type").selectOption("task");
    await page.getByLabel("Focus record").selectOption({ label: task });
    await page
      .getByRole("button", { name: "Add to today", exact: true })
      .click();
    const row = page.locator(".focus-row").filter({ hasText: task });
    await expect(row).toBeVisible();
    await row
      .getByRole("button", { name: "Complete task", exact: true })
      .click();
    await page
      .getByLabel("Focus views")
      .getByRole("button", { name: /Recently completed/ })
      .click();
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Reopen", exact: true }).click();
    await expect(
      row.getByRole("button", { name: "Complete task", exact: true }),
    ).toBeVisible();
    await row
      .getByRole("button", { name: "Complete task", exact: true })
      .click();
    await page.goto(profile);
    await expect(page.locator("#next-steps")).toContainText(task);
    await expect(page.locator("#next-steps")).toContainText("Reopen");
  });

  await test.step("Check saved activity and pipeline values in Analytics", async () => {
    await page.goto("/#/analytics");
    const conversations = page.getByLabel("Recorded conversations over time");
    await expect(
      conversations.locator(".pulse-conversation-total strong"),
    ).toHaveText("1");
    await page
      .getByLabel("Analytics sections")
      .getByRole("button", { name: /Opportunities/ })
      .click();
    const pipeline = page.getByLabel("Current pipeline snapshot");
    await expect(pipeline.locator(".pulse-pipeline-value")).toContainText(
      "12,000",
    );
    await expect(pipeline.locator(".pulse-pipeline-value")).toContainText(
      "USD",
    );
    await expect(pipeline.locator(".pulse-stage-list")).toContainText(
      "Negotiation",
    );
    await page
      .getByLabel("Analytics sections")
      .getByRole("button", { name: /Commitments/ })
      .click();
    const followups = page.getByLabel("Follow-up overview");
    await expect(followups).toContainText("0 overdue now");
    await expect(followups.locator(".pulse-commitment-trend")).toContainText(
      "1",
    );
  });

  await test.step("Inspect actual Orbit connections and return to the record", async () => {
    await page.goto("/#/orbit");
    await page.getByRole("button", { name: "List", exact: true }).click();
    await page.locator(".orbit-list-item").filter({ hasText: person }).click();
    const selected = page.getByRole("complementary", {
      name: "Selected relationship",
    });
    await expect(selected).toContainText(person);
    await expect(selected).toContainText(company);
    await selected.getByRole("link", { name: /Open Profile/ }).click();
    await expect(
      page.getByRole("heading", { name: person, exact: true }),
    ).toBeVisible();
  });

  await test.step("Export and restore into a clean browser profile", async () => {
    await page.goto("/#/settings?section=data");
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export", exact: true }).click();
    const file = await (await downloading).path();
    expect(file).toBeTruthy();
    const original = JSON.parse(fs.readFileSync(file!, "utf8"));
    const contact = original.contacts.find(
      (r: { name: string }) => r.name === person,
    );
    const organization = original.organizations.find(
      (r: { name: string }) => r.name === company,
    );
    const interaction = original.interactions.find(
      (r: { summary: string }) => r.summary === conversation,
    );
    const opportunity = original.opportunities.find(
      (r: { title: string }) => r.title === deal,
    );
    const followup = original.tasks.find(
      (r: { title: string }) => r.title === task,
    );
    expect(contact.organizationId).toBe(organization.id);
    expect(interaction.contactId).toBe(contact.id);
    expect(interaction.organizationId).toBe(organization.id);
    expect(opportunity.contactIds).toContain(contact.id);
    expect(opportunity.organizationId).toBe(organization.id);
    expect(followup.contactId).toBe(contact.id);
    expect(followup.completedAt).toBeTruthy();
    expect(
      original.transitions.filter(
        (t: { opportunityId: string }) => t.opportunityId === opportunity.id,
      ),
    ).toHaveLength(2);

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
        "Compatible backup v6",
      );
      await target
        .getByRole("button", { name: "Validate & restore", exact: true })
        .click();
      await expect(target.getByRole("dialog")).toHaveCount(0);
      await target.goto(
        new URL(`/#/network/people/${contact.id}`, page.url()).href,
      );
      await expect(
        target.getByRole("heading", { name: person, exact: true }),
      ).toBeVisible();
      await expect(
        target.getByText(conversation, { exact: true }).first(),
      ).toBeVisible();
      await target.reload();
      await expect(
        target.getByText(conversation, { exact: true }).first(),
      ).toBeVisible();
      await target.goto(new URL("/#/settings?section=data", page.url()).href);
      const afterDownload = target.waitForEvent("download");
      await target.getByRole("button", { name: "Export", exact: true }).click();
      const afterFile = await (await afterDownload).path();
      const restored = JSON.parse(fs.readFileSync(afterFile!, "utf8"));
      for (const key of [
        "contacts",
        "organizations",
        "interactions",
        "tasks",
        "opportunities",
        "transitions",
        "focusItems",
      ])
        expect(restored[key], key).toEqual(original[key]);
    } finally {
      await clean.close();
    }
  });
});
