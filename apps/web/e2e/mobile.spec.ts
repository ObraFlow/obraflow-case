import { expect, test } from '@playwright/test';
import { expectToast, resetDatabase, USERS, viewAs } from './helpers';

// Responsividade: as mesmas telas num celular (390 × 844).
test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

test.beforeEach(() => resetDatabase());

test.describe('Celular', () => {
  test('sem rolagem horizontal nas três telas', async ({ page }) => {
    for (const path of ['/pedidos', '/pedidos/novo', '/alcadas']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow, `rolagem horizontal em ${path}`).toBeLessThanOrEqual(0);
    }
  });

  test('menu lateral abre pelo botão do topo e navega', async ({ page }) => {
    await page.goto('/pedidos');
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    await page.getByRole('link', { name: 'Alçadas' }).click();
    await expect(page).toHaveURL(/\/alcadas/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Alçadas' }),
    ).toBeVisible();
  });

  test('lista vira cards e permite aprovar', async ({ page }) => {
    await viewAs(page, USERS.amanda);
    await page.goto('/pedidos?aba=minha');

    const card = page.getByRole('article', { name: /^PED-007,/ });
    await expect(card).toContainText('R$ 3.850,00');
    await card.getByRole('button', { name: 'Aprovar PED-007' }).click();
    await expectToast(page, 'PED-007 aprovado');
  });

  test('novo pedido: itens em cards e barra fixa com total e botão', async ({
    page,
  }) => {
    await page.goto('/pedidos/novo');
    const item = page.getByRole('listitem', { name: 'Item 1' });
    await item.getByLabel('Quantidade').fill('2');
    await item.getByLabel('Preço unitário').fill('10,50');

    await expect(item.getByLabel('Total do item 1')).toHaveText('R$ 21,00');
    await expect(page.getByText('Total · 1 item')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Cadastrar pedido' }),
    ).toBeVisible();
  });
});
