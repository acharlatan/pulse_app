import { defineConfig } from "@playwright/test";
import production from "./playwright.production.config";

// Phase 4's larger matrix has its own jobs; retain all existing browser tests.
export default defineConfig({
  ...production,
  testIgnore: ["**/phase4-*.spec.ts"],
});
