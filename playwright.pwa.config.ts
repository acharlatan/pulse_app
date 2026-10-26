import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testDir: "./tests/pwa",
  outputDir: ".codex/pwa-results",
  use: { ...base.use, baseURL: "http://127.0.0.1:4174" },
  webServer: {
    command: "node tests/pwa/server.mjs",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: false,
  },
});
