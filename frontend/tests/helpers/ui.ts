import { Page, Locator, expect } from '@playwright/test';
import { USUARIOS, SENHA_DEMO } from './seed';

type UsuarioKey = keyof typeof USUARIOS;

/** Faz login pela UI e espera cair em /pedidos. */
export async function login(
  page: Page,
  usuario: UsuarioKey | { email: string; senha?: string }
) {
  const email = typeof usuario === 'string' ? USUARIOS[usuario].email : usuario.email;
  const senha = typeof usuario === 'string' ? SENHA_DEMO : usuario.senha ?? SENHA_DEMO;

  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL('/pedidos', { timeout: 15000 });
}

/** Abre o menu do avatar no Header e clica em "Sair". */
export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Menu do usuário' }).click();
  await page.getByRole('menuitem', { name: 'Sair' }).click();
  await expect(page).toHaveURL('/login');
}

/**
 * Seleciona opção em um Select Radix (dispara pelo trigger, escolhe a option).
 * Aceita `scope` (Locator de container/linha) quando há múltiplos comboboxes
 * com o mesmo nome na página (ex.: linhas da tabela de itens).
 */
export async function selectRadix(
  page: Page,
  triggerName: RegExp | string,
  option: RegExp | string,
  scope?: Locator
) {
  const root = scope ?? page;
  await root.getByRole('combobox', { name: triggerName }).click();
  await page.getByRole('option', { name: option }).click();
}
