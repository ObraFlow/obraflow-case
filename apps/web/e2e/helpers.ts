import { execSync } from 'node:child_process';
import { expect, type Page } from '@playwright/test';

/** Volta o banco de teste aos dados do seed (PED-001…PED-011). */
export function resetDatabase() {
  execSync('pnpm exec tsx test/test-db.ts reset', {
    cwd: '../api',
    stdio: 'pipe',
  });
}

/** Usuários do seed (ids fixos). */
export const USERS = {
  joao: 1,
  amanda: 2,
  carlos: 3,
  beatriz: 4,
  fernando: 5,
} as const;

/** Define a persona de "Visualizando como" antes da página carregar. */
export async function viewAs(page: Page, userId: number) {
  await page.addInitScript((id) => {
    window.localStorage.setItem('dokimos:viewer-id', String(id));
  }, userId);
}

/** Escolhe uma opção num Select (Radix) pelo rótulo do campo. */
export async function selectOption(
  page: Page,
  label: string | RegExp,
  option: string | RegExp,
) {
  await page.getByRole('combobox', { name: label }).click();
  await page.getByRole('option', { name: option }).click();
}

/** Linha (desktop) ou card de um pedido na lista. */
export function orderRow(page: Page, code: string) {
  return page.getByRole('row', { name: new RegExp(`^${code},`) });
}

export async function expectToast(page: Page, text: string | RegExp) {
  // exact: o título do toast, não a descrição que pode repetir o texto.
  await expect(
    page
      .getByRole('region', { name: /Notifications/ })
      .getByText(text, { exact: typeof text === 'string' }),
  ).toBeVisible();
}
