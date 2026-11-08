import { defineConfig, devices } from '@playwright/test'

// Sobe uma API e um front próprios (portas 3334 e 5174) com um banco só dos
// testes, recriado do seed a cada execução. Não mexe no banco do `npm run dev`.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5174',
    locale: 'pt-BR',
    trace: 'retain-on-failure',
    // em ambientes com Chromium pré-instalado, aponte para ele com PW_CHROMIUM
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, testIgnore: /mobile\.spec\.ts/ },
    { name: 'celular', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: [
    {
      command: 'npm run e2e -w server',
      url: 'http://localhost:3334/api/health',
      env: { DATABASE_FILE: 'data/e2e.db', PORT: '3334' },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'npm run dev -w web -- --port 5174 --strictPort',
      url: 'http://localhost:5174',
      env: { API_URL: 'http://localhost:3334' },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})
