import { expect, type Page, test } from '@playwright/test';
import { resetDatabase, selectOption, USERS, viewAs } from './helpers';

// Gera os screenshots do README (docs/screenshots). Não roda nos testes normais:
//   SCREENSHOTS=1 pnpm test:e2e e2e/screenshots.spec.ts
test.skip(!process.env.SCREENSHOTS, 'Só gera screenshots com SCREENSHOTS=1');

const DIR = '../../docs/screenshots';
const shot = (page: Page, name: string) =>
  page.screenshot({ path: `${DIR}/${name}.png`, animations: 'disabled' });

test.beforeEach(() => resetDatabase());

test('pedidos', async ({ page }) => {
  await viewAs(page, USERS.amanda);
  await page.goto('/pedidos');
  await expect(page.getByRole('row', { name: /^PED-/ })).toHaveCount(11);
  await shot(page, '01-pedidos');

  await page.goto('/pedidos?pedido=9');
  await expect(page.getByText('Aguardando sua decisão')).toBeVisible();
  await shot(page, '02-pedido-detalhe');

  await page
    .getByRole('dialog', { name: 'PED-009' })
    .getByRole('button', { name: 'Rejeitar pedido' })
    .click();
  const modal = page.getByRole('dialog', { name: 'Motivo da rejeição' });
  await modal.getByRole('button', { name: 'Rejeitar pedido' }).click();
  await expect(modal.getByRole('alert')).toBeVisible();
  await shot(page, '03-rejeicao-motivo-obrigatorio');

  await page.keyboard.press('Escape');
  await page.goto('/pedidos?pedido=4');
  await expect(page.getByText('Pedido encerrado por rejeição')).toBeVisible();
  await shot(page, '04-pedido-rejeitado');
});

test('novo pedido', async ({ page }) => {
  await viewAs(page, USERS.beatriz);
  await page.goto('/pedidos/novo');
  await page.getByRole('button', { name: 'Selecione a obra.' }).click();
  await shot(page, '05-novo-pedido-validacao');

  await selectOption(page, 'Obra', 'Edifício Maré');
  await page.getByRole('combobox', { name: 'Fornecedor' }).click();
  await page.getByPlaceholder('Buscar fornecedor…').fill('Votorantim');
  await page.getByRole('option', { name: 'Votorantim Cimentos' }).click();
  const items = [
    ['Cimento CP-II 50kg', '100', '32,00'],
    ['Areia média lavada', '12', '145,00'],
    ['Vergalhão CA-50 10mm', '300', '25,20'],
  ];
  for (const [index, [description, quantity, price]] of items.entries()) {
    if (index > 0)
      await page.getByRole('button', { name: 'Adicionar item' }).click();
    const row = page.getByRole('listitem', { name: `Item ${index + 1}` });
    await row.getByLabel('Descrição').fill(description);
    await row.getByLabel('Quantidade').fill(quantity);
    await row.getByLabel('Preço unitário').fill(price);
  }
  await expect(
    page
      .getByRole('region', { name: 'Resumo do pedido' })
      .getByText('Amanda Costa'),
  ).toBeVisible();
  await shot(page, '06-novo-pedido');

  await selectOption(page, 'Obra', 'Residencial Sol Nascente');
  await page
    .getByRole('listitem', { name: 'Item 3' })
    .getByLabel('Preço unitário')
    .fill('125,20');
  await expect(page.getByText('Sem regra de alçada')).toBeVisible();
  await shot(page, '07-novo-pedido-sem-regra');
});

test('alçadas', async ({ page }) => {
  await page.goto('/alcadas?obra=1');
  await expect(
    page.getByRole('table').getByText('Acima de R$ 50.000,00'),
  ).toBeVisible();
  await shot(page, '08-alcadas');

  await page.goto('/alcadas?obra=2');
  await expect(page.getByText(/pedidos a partir de/)).toBeVisible();
  await shot(page, '09-alcadas-cobertura-parcial');

  await page.getByRole('button', { name: 'Editar faixa 2' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Editar faixa 2' }),
  ).toBeVisible();
  await shot(page, '10-alcadas-editar-faixa');
});

test('modo escuro e celular', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await viewAs(page, USERS.amanda);
  await page.goto('/pedidos?pedido=9');
  await expect(page.getByText('Aguardando sua decisão')).toBeVisible();
  await shot(page, '11-modo-escuro');

  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pedidos?aba=minha');
  await expect(page.getByRole('article').first()).toBeVisible();
  await shot(page, '12-celular-pedidos');
  await page.goto('/pedidos/novo');
  await expect(page.getByRole('listitem', { name: 'Item 1' })).toBeVisible();
  await shot(page, '13-celular-novo-pedido');
});
