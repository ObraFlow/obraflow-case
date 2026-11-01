import { defineConfig, devices } from "@playwright/test";

// Testes de ponta a ponta contra o app de verdade: Next + Postgres (docker local ou serviço
// no CI) com os dados do seed. Cada spec reinicia o banco antes de rodar, então os testes
// não podem correr em paralelo (workers: 1). Localmente reaproveita o `npm run dev` que já
// estiver na porta 3000; no CI sobe o build de produção (`npm run start`).

const CI = !!process.env.CI;

export default defineConfig({
  testDir: "e2e",
  workers: 1,
  fullyParallel: false,
  retries: CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
  },
  globalSetup: "./e2e/global-setup.ts",
  webServer: {
    command: CI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000/aprovacoes",
    reuseExistingServer: !CI,
    timeout: 180_000,
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
      testIgnore: /celular/,
    },
    {
      name: "celular",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
      testMatch: /celular/,
    },
  ],
});
