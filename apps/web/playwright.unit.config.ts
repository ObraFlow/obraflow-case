import { defineConfig } from "@playwright/test";

// Pure modules (money, thresholds, queries, dates, notifications) run in Node: no browser, no servers and no
// database, so this suite is quick and runs on every `npm test`.
export default defineConfig({
  testDir: "./test/unit",
  fullyParallel: true,
  retries: 0,
});
