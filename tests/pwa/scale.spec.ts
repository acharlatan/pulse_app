import { test, expect } from "@playwright/test";
for (const size of [100, 1000])
  test(`production directory imports and searches ${size} fictional contacts with bounded rendering`, async ({
    page,
  }, info) => {
    test.setTimeout(120000);
    await page.goto("/");
    await page.getByRole("button", { name: /Create My Workspace/ }).click();
    await page.goto("/#/import");
    const csv =
      "Name,Email,Role,Company\n" +
      Array.from(
        { length: size },
        (_, i) =>
          `Fictional Person ${String(i).padStart(4, "0")},fixture${i}@example.com,Partnership Director,Fictional Company ${i % 20}`,
      ).join("\n");
    await page
      .getByLabel("Contact CSV file")
      .setInputFiles({
        name: "synthetic-scale.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(csv),
      });
    for (const name of [
      "Continue to mapping",
      "Validate rows",
      "Review duplicates",
      "Preview import summary",
    ])
      await page.getByRole("button", { name, exact: true }).click();
    await page
      .getByLabel(
        "I reviewed the mappings, duplicate choices, selected updates and rejected rows.",
      )
      .check();
    const start = Date.now();
    await page
      .getByRole("button", { name: "Apply import to personal", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Import complete", exact: true }),
    ).toBeVisible();
    const importMs = Date.now() - start;
    const nav = Date.now();
    await page
      .getByRole("link", { name: "Open your Network", exact: true })
      .click();
    await expect(page.locator(".results-label")).toContainText(
      `${size} people`,
    );
    const directoryMs = Date.now() - nav;
    expect(await page.locator(".profile-card").count()).toBeLessThanOrEqual(60);
    const search = Date.now();
    await page
      .getByRole("textbox", { name: "Search network", exact: true })
      .fill(`fixture${size - 1}@example.com`);
    await expect(page.locator(".profile-card")).toHaveCount(1);
    await expect(page.locator(".profile-card")).toContainText(
      `Fictional Person ${String(size - 1).padStart(4, "0")}`,
    );
    const searchActionMs = Date.now() - search;
    const measures = {
      size,
      project: info.project.name,
      importMs,
      directoryMs,
      searchActionMs,
    };
    console.log("Scale measurements", JSON.stringify(measures));
    await info.attach("browser-scale.json", {
      body: JSON.stringify(measures),
      contentType: "application/json",
    });
  });
