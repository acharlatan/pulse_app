import { defineConfig } from "@playwright/test";
import base from "./playwright.production.config";

// Engine projects exercise the compiled application; PWA tests use their own
// configuration because they require a real service worker rather than blocking it.
export default defineConfig({
  ...base,
  use: { ...base.use, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "chromium", use: { browserName: "chromium", viewport: { width: 1440, height: 900 } } },
    { name: "firefox", use: { browserName: "firefox", viewport: { width: 1440, height: 900 } } },
    { name: "webkit", use: { browserName: "webkit", viewport: { width: 1440, height: 900 } } },
  ],
});
