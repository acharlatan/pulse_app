import { defineConfig } from "@playwright/test";
import production from "./playwright.production.config";

// The project currently claims no specific Firefox/WebKit support; these jobs
// report actual engine results on the compiled app without implying device QA.
export default defineConfig({
  ...production,
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium", viewport: { width: 1024, height: 768 } },
    },
    {
      name: "firefox",
      use: { browserName: "firefox", viewport: { width: 1024, height: 768 } },
    },
    {
      name: "webkit",
      use: { browserName: "webkit", viewport: { width: 1024, height: 768 } },
    },
  ],
});
