import { expect, type Page, test } from '@playwright/test';
import {
  expectToast,
  orderRow,
  resetDatabase,
  selectOption,
  USERS,
  viewAs,
} from './helpers';

test.beforeEach(() => resetDatabase());

async function chooseSupplier(page: Page, name: string) {
  await page.getByRole('combobox', { name: 'Fornecedor' }).click();
  await page.getByPlaceholder('Buscar fornecedor…').fill(name);
  await page.getByRole('option', { name }).click();
}

async function fillItem(
  page: Page,
  index: number,
  item: { description: string; quantity: string; price: string },
) {
  const row = page.getByRole('listitem', { name: `Item ${index + 1}` });
  await row.getByLabel('Descrição').fill(item.description);
  await row.getByLabel('Quantidade').fill(item.quantity);
  await row.getByLabel('Preço unitário').fill(item.price);
  return row;
}

const submit = (page: Page) =>
  page
    .getByRole('complementary')
    .or(page.locator('form'))
    .getByRole('button', { name: 'Cadastrar pedido' })
    .first();

test.describe('Novo pedido', () => {
  test('começa com 1 item em branco e o botão desabilitado, listando as pendências', async ({
    page,
  }) => {
    await page.goto('/pedidos/novo');

    await expect(page.getByRole('listitem', { name: /^Item \d$/ })).toHaveCount(
      1,
    );
    await expect(submit(page)).toBeDisabled();
    for (const issue of [
      'Selecione a obra.',
      'Selecione o fornecedor.',
      'Item 1: informe a descrição do item.',
    ]) {
      await expect(page.getByRole('button', { name: issue })).toBeVisible();
    }
  });

  test('clicar numa pendência mostra o erro em cada campo obrigatório vazio', async ({
    page,
  }) => {
    await page.goto('/pedidos/novo');
    await page.getByRole('button', { name: 'Selecione a obra.' }).click();

    await expect(
      page.getByRole('alert').filter({ hasText: 'Selecione a obra.' }),
    ).toBeVisible();
    await expect(
      page.getByRole('alert').filter({ hasText: 'Selecione o fornecedor.' }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('alert')
        .filter({ hasText: 'Informe a descrição do item.' }),
    ).toBeVisible();
    await expect(
      page.getByRole('alert').filter({ hasText: 'Informe a quantidade.' }),
    ).toBeVisible();
  });

  test('depois de clicar numa pendência o formulário continua utilizável e o erro some ao corrigir', async ({
    page,
  }) => {
    await page.goto('/pedidos/novo');
    await page.getByRole('button', { name: 'Selecione o fornecedor.' }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'Selecione o fornecedor.' }),
    ).toBeVisible();

    await chooseSupplier(page, 'Votorantim Cimentos');
    await expect(
      page.getByRole('alert').filter({ hasText: 'Selecione o fornecedor.' }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Adicionar item' }).click();
    await expect(page.getByRole('listitem', { name: /^Item \d$/ })).toHaveCount(
      2,
    );
  });

  test('quantidade negativa e preço não numérico mostram erro no item e não habilitam o envio', async ({
    page,
  }) => {
    await page.goto('/pedidos/novo');
    const row = await fillItem(page, 0, {
      description: 'Areia média',
      quantity: '-5',
      price: 'abc',
    });
    await row.getByLabel('Descrição').click(); // sai do campo de preço

    await expect(
      row
        .getByRole('alert')
        .filter({ hasText: 'A quantidade deve ser maior que zero' }),
    ).toBeVisible();
    await expect(
      row.getByRole('alert').filter({ hasText: 'Preço inválido' }),
    ).toBeVisible();
    await expect(row.getByLabel('Total do item 1')).toHaveText('—');
    await expect(submit(page)).toBeDisabled();
  });

  test('adiciona e remove itens; sem itens mostra erro claro e não envia', async ({
    page,
  }) => {
    await page.goto('/pedidos/novo');
    await page.getByRole('button', { name: 'Adicionar item' }).click();
    await expect(page.getByRole('listitem', { name: /^Item \d$/ })).toHaveCount(
      2,
    );

    await page.getByRole('button', { name: 'Remover item 2' }).click();
    await page.getByRole('button', { name: 'Remover item 1' }).click();
    await expect(
      page
        .getByRole('alert')
        .filter({ hasText: 'O pedido precisa ter pelo menos 1 item.' }),
    ).toBeVisible();
    await expect(submit(page)).toBeDisabled();
  });

  test('calcula os totais ao vivo (formato brasileiro) e mostra a cadeia prevista', async ({
    page,
  }) => {
    await page.goto('/pedidos/novo');
    await selectOption(page, 'Obra', 'Edifício Maré');
    await fillItem(page, 0, {
      description: 'Cimento CP-II 50kg',
      quantity: '100',
      price: '32,00',
    });
    await page.getByRole('button', { name: 'Adicionar item' }).click();
    await fillItem(page, 1, {
      description: 'Areia média',
      quantity: '12,5',
      price: '1.000',
    });

    await expect(page.getByLabel('Total do item 1')).toHaveText('R$ 3.200,00');
    await expect(page.getByLabel('Total do item 2')).toHaveText('R$ 12.500,00');
    // R$ 15.700,00 → faixa 2 do Edifício Maré: João → Amanda.
    const summary = page.getByRole('region', { name: 'Resumo do pedido' });
    await expect(summary.getByText('R$ 15.700,00')).toBeVisible();
    await expect(
      summary.getByText('De R$ 10.000,01 até R$ 50.000,00'),
    ).toBeVisible();
    await expect(summary.getByText('João Ribeiro')).toBeVisible();
    await expect(summary.getByText('Amanda Costa')).toBeVisible();
  });

  test('valor sem faixa de alçada bloqueia o cadastro com mensagem clara', async ({
    page,
  }) => {
    await page.goto('/pedidos/novo');
    await selectOption(page, 'Obra', 'Residencial Sol Nascente');
    await chooseSupplier(page, 'Gerdau');
    await fillItem(page, 0, {
      description: 'Locação de grua',
      quantity: '1',
      price: '45.000,00',
    });

    const summary = page.getByRole('region', { name: 'Resumo do pedido' });
    await expect(summary.getByRole('alert')).toContainText(
      'Nenhuma faixa de alçada cobre R$ 45.000,00 na obra Residencial Sol Nascente.',
    );
    await expect(
      summary.getByRole('link', { name: 'Configurar alçadas' }),
    ).toHaveAttribute('href', '/alcadas?obra=2');
    await expect(submit(page)).toBeDisabled();
  });

  test('cadastra o pedido, volta para a lista com destaque e limpa o formulário', async ({
    page,
  }) => {
    await viewAs(page, USERS.beatriz);
    await page.goto('/pedidos/novo');
    await selectOption(page, 'Obra', 'Edifício Maré');
    await chooseSupplier(page, 'Votorantim Cimentos');
    await page.getByLabel('Observações internas').fill('Concretagem na sexta.');
    await fillItem(page, 0, {
      description: 'Cimento CP-II 50kg',
      quantity: '100',
      price: '32',
    });

    await expect(submit(page)).toBeEnabled();
    await submit(page).click();

    await expectToast(page, 'PED-012 cadastrado');
    await expect(page).toHaveURL(/\/pedidos/);
    const row = orderRow(page, 'PED-012');
    await expect(row).toContainText('R$ 3.200,00');
    await expect(
      row.getByLabel('1ª etapa: João Ribeiro — Aguardando decisão'),
    ).toBeVisible();

    await page.getByRole('link', { name: 'Novo pedido' }).click();
    await expect(
      page.getByRole('listitem', { name: 'Item 1' }).getByLabel('Descrição'),
    ).toHaveValue('');
  });

  test('nenhuma obra cadastrada: empty state amigável', async ({ page }) => {
    await page.route('**/api/projects', (route) =>
      route.fulfill({ json: { data: [] } }),
    );
    await page.goto('/pedidos/novo');
    await expect(page.getByText('Nenhuma obra cadastrada')).toBeVisible();
  });

  test('API fora do ar: erro com "Tentar novamente"', async ({ page }) => {
    await page.route('**/api/projects', (route) =>
      route.fulfill({
        status: 500,
        json: {
          statusCode: 500,
          code: 'INTERNAL_ERROR',
          message: 'Erro inesperado no servidor. Tente novamente.',
          details: [],
        },
      }),
    );
    await page.goto('/pedidos/novo');
    await expect(
      page.getByText('Não foi possível carregar as obras'),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole('button', { name: 'Tentar novamente' }),
    ).toBeVisible();
  });
});
