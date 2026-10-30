import { defineConfig, devices } from '@playwright/test';

// Testes de ponta a ponta no navegador, contra uma API e um front próprios para teste:
//   API em :3334 usando o banco dokimos_test (os dados de desenvolvimento nunca são tocados)
//   front em :3030+1 = :3031, apontando para essa API
// Navegador: o Chromium do Playwright (`pnpm exec playwright install chromium`) ou, se definido,
// qualquer Chromium já instalado via PLAYWRIGHT_CHROMIUM_PATH (ex.: /usr/bin/brave).

const API_PORT = 3334;
const WEB_PORT = 3031;
export const API_URL = `http://localhost:${API_PORT}/api`;

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://obraflow:obraflow@localhost:5433/dokimos_test?schema=public';

export default defineConfig({
  testDir: './e2e',
  // Todos os testes compartilham o mesmo banco de teste: rodam em sequência.
  workers: 1,
  fullyParallel: false,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    locale: 'pt-BR',
    timezoneId: 'America/Bahia',
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: [
    {
      command: 'pnpm build && node dist/src/main.js',
      cwd: '../api',
      url: `${API_URL}/health`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        PORT: String(API_PORT),
        DATABASE_URL: TEST_DATABASE_URL,
        TEST_DATABASE_URL,
        WEB_ORIGIN: `http://localhost:${WEB_PORT}`,
      },
    },
    {
      command: `pnpm exec next dev --port ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}/pedidos`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: { NEXT_PUBLIC_API_URL: API_URL, E2E: '1' },
    },
  ],
});
