import { test, expect } from '@playwright/test';
import { login, logout } from './helpers/ui';
import { OBRAS } from './helpers/seed';

test.describe('Estados de UI e navegação', () => {
  test('logout pelo Header redireciona para /login e bloqueia /pedidos', async ({ page }) => {
    await login(page, 'amanda');
    await logout(page);

    // Sessão encerrada: rota protegida volta para login
    await page.goto('/pedidos');
    await expect(page).toHaveURL(/\/login/);
  });

  test('lista de pedidos mostra empty state quando não há resultados', async ({ page }) => {
    await login(page, 'amanda');
    // Intercepta a API e devolve lista vazia (filtro sem resultados)
    await page.route('**/api/backend/pedidos*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          conteudo: [],
          pagina: 0,
          tamanho: 20,
          totalElementos: 0,
          totalPaginas: 1,
        }),
      })
    );
    await page.goto('/pedidos');

    await expect(page.getByText('Nenhum pedido encontrado')).toBeVisible();
    await expect(page.getByText('Nenhum pedido corresponde aos filtros selecionados.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Criar primeiro pedido' })).toBeVisible();
  });

  test('navegação lateral leva a Pedidos e Alçadas', async ({ page }) => {
    await login(page, 'amanda');

    await page.getByRole('link', { name: 'Alçadas' }).click();
    await expect(page).toHaveURL('/alcadas');
    await expect(page.getByRole('heading', { name: 'Regras de Alçada' })).toBeVisible();

    await page.getByRole('link', { name: 'Pedidos' }).click();
    await expect(page).toHaveURL('/pedidos');
    await expect(page.getByRole('heading', { name: 'Pedidos de Compra' })).toBeVisible();
  });

  test('toggle de tema não quebra a página (sem hydration error)', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await login(page, 'amanda');
    await page.getByRole('button', { name: /Modo (claro|escuro)/ }).click();
    await expect(page.getByRole('button', { name: /Modo (claro|escuro)/ })).toBeVisible();

    // Nenhum erro de hydration no console
    expect(errors.filter((e) => e.includes('Hydration') || e.includes('hydration'))).toEqual([]);
  });

  test.describe('Responsividade (mobile)', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('lista de pedidos renderiza em viewport mobile', async ({ page }) => {
      await login(page, 'amanda');
      await expect(page.getByRole('heading', { name: 'Pedidos de Compra' })).toBeVisible();
      // Tabela existe e o primeiro pedido é navegável
      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Ver detalhes' }).first()).toBeVisible();
    });

    test('formulário de novo pedido renderiza em viewport mobile', async ({ page }) => {
      await login(page, 'carlos');
      await page.goto('/pedidos/novo');
      await expect(page.getByRole('heading', { name: 'Novo Pedido de Compra' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Adicionar Item' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cadastrar Pedido' })).toBeVisible();
    });
  });
});
