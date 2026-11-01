import { defineConfig } from "@playwright/test";
import { loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import { assertTestDatabase } from "../api/test/database-guard";

// Preserve the isolated runner's environment over local development settings.
for (const [key, value] of Object.entries(
  loadEnv("development", fileURLToPath(new URL("../api", import.meta.url)), ""),
))
  process.env[key] ??= value;
assertTestDatabase();

export default defineConfig({
  testDir: "./test",
  testIgnore: ["**/reviewer-workflow.acceptance.spec.ts", "**/unit/**"],
  workers: 1,
  retries: 0,
  use: { baseURL: "http://127.0.0.1:5174", trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: [
    {
      command: "npm run build --workspace @dokimos/api && npm start --workspace @dokimos/api",
      cwd: fileURLToPath(new URL("../../", import.meta.url)),
      env: { PORT: "4100" },
      url: "http://127.0.0.1:4100/healthz",
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5174 --strictPort",
      env: { DOKIMOS_API_TARGET: "http://127.0.0.1:4100" },
      url: "http://127.0.0.1:5174",
    },
  ],
});
