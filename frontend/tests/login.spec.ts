import { test, expect } from '@playwright/test';
import { USUARIOS, SENHA_DEMO } from './helpers/seed';

test.describe('Login', () => {
  test('credenciais válidas redirecionam para /pedidos', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail').fill(USUARIOS.amanda.email);
    await page.getByLabel('Senha').fill(SENHA_DEMO);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL('/pedidos');
    await expect(page.getByRole('heading', { name: 'Pedidos de Compra' })).toBeVisible();
  });

  test('credenciais inválidas mostram erro sem sair do login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail').fill('amanda.souza@obraflow.com.br');
    await page.getByLabel('Senha').fill('senhaerrada');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(
      page.getByRole('alert').filter({ hasText: 'E-mail ou senha inválidos' })
    ).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('campos vazios mostram erros de validação', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail').fill('nao-e-email');
    await page.getByLabel('Senha').fill('');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.locator('#email-error')).toContainText('E-mail inválido');
    await expect(page.locator('#senha-error')).toContainText('Senha é obrigatória');
  });

  test('rota protegida redireciona para /login sem sessão', async ({ page }) => {
    await page.goto('/pedidos');
    await expect(page).toHaveURL(/\/login/);
  });
});
