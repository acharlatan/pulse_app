import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
// Exercise the compiled release without development transforms/HMR. PWA registration
// has its own suite; blocking it here lets missing-chunk interception reach the network.
export default defineConfig({
  ...base,
  use: {
    ...base.use,
    baseURL: "http://127.0.0.1:4174",
    serviceWorkers: "block",
  },
  webServer: {
    command: "node tests/pwa/server.mjs",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: false,
  },
});
