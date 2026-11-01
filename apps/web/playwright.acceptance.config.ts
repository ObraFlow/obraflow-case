import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// A separate API/browser run keeps real credential acceptance independent of the
// regression suite's per-IP login rate-limit budget. No auth bypass or relaxed limit.
export default defineConfig({
  ...base,
  testIgnore: [],
  testMatch: "**/reviewer-workflow.acceptance.spec.ts",
  timeout: 90000,
});
