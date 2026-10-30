import { test, expect } from "@playwright/test";

test("Focus, relationship context and Orbit preserve a working journey", async ({page}) => {
  await page.goto("/");
  await page.getByRole("button", {name:/Explore Demo/}).click();
  await page.getByRole("heading", {name:"Today.", exact:true}).waitFor();
  await page.goto("/#/focus");
  await page.getByRole("button", {name:"Add example priorities"}).click();
  const views = page.getByRole("navigation", {name:"Focus views"});
  await expect(views.getByRole("button", {name:/Today/})).toHaveAttribute("aria-pressed", "true");
  await views.getByRole("button", {name:/Saved for later/}).click();
  const task = page.locator(".focus-row").filter({hasText:"Send the updated proposal"});
  await task.getByRole("button", {name:"Review follow-up"}).click();
  const dialog = page.getByRole("dialog");
  const dueBefore = await dialog.getByLabel("Due date and time").inputValue();
  await dialog.getByRole("button", {name:"Close dialog"}).click();
  await task.getByText("Choose another day", {exact:true}).click();
  await task.getByLabel("Focus date").fill("2099-01-01");
  await task.getByRole("button", {name:"Save date"}).click();
  await expect(views.getByRole("button", {name:/Planned ahead/})).toHaveAttribute("aria-pressed", "true");
  await task.getByRole("button", {name:"Review follow-up"}).click();
  await expect(dialog.getByLabel("Due date and time")).toHaveValue(dueBefore);
  await dialog.getByRole("button", {name:"Close dialog"}).click();
  await task.getByRole("link", {name:"Olivia Chen"}).click();
  await expect(page.getByRole("heading", {name:"Olivia Chen", exact:true})).toBeVisible();
  await page.locator(".story-quick-filters").getByRole("button", {name:"Conversations", exact:true}).click();
  await expect(page.locator(".story-followup")).toHaveCount(0);
  await page.getByRole("link", {name:"View in Relationship Orbit"}).click();
  await page.getByRole("link", {name:/Return to profile/}).click();
  await page.getByRole("link", {name:"Back to My Focus"}).click();
  await expect(views.getByRole("button", {name:/Planned ahead/})).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(views.getByRole("button", {name:/Planned ahead/})).toHaveAttribute("aria-pressed", "true");
  await page.goto("/#/network/companies/org-0");
  const company = page.getByLabel("People and opportunities at this company");
  await expect(company.getByRole("link", {name:/Olivia Chen/})).toBeVisible();
  await company.getByRole("button", {name:/Brand identity refresh/}).click();
  await expect(page.getByRole("dialog")).toContainText("Brand identity refresh");
});

test("Focus and profiles reflow in light and dark at the supported widths", async ({page}) => {
  await page.goto("/");
  await page.getByRole("button", {name:/Explore Demo/}).click();
  for (const route of ["/focus", "/network/people/contact-0", "/network/companies/org-0"]) {
    await page.goto(`/#${route}`);
    await expect(page.locator("main h1")).toBeVisible();
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => {document.documentElement.dataset.theme = value;}, theme);
      for (const width of [320,375,390,430,768,1024,1280,1440]) {
        await page.setViewportSize({width,height:900});
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} ${theme} ${width}`).toBe(true);
      }
    }
  }
});
