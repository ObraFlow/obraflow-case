import { expect, test } from '@playwright/test';
import { expectToast, resetDatabase } from './helpers';

test.beforeEach(() => resetDatabase());

test.describe('Alçadas', () => {
  test('lista as faixas salvas da obra selecionada, com a cadeia na ordem do fluxo', async ({
    page,
  }) => {
    await page.goto('/alcadas?obra=1');
    const table = page.getByRole('table');

    await expect(table.getByText('Até R$ 10.000,00')).toBeVisible();
    await expect(
      table.getByText('De R$ 10.000,01 até R$ 50.000,00'),
    ).toBeVisible();
    await expect(table.getByText('Acima de R$ 50.000,00')).toBeVisible();
    const lastChain = table
      .getByRole('list', { name: 'Aprovadores na ordem do fluxo' })
      .last();
    await expect(lastChain.getByRole('listitem')).toHaveText([
      '1João Ribeiro',
      '2Amanda Costa',
      '3Carlos Mendes',
    ]);
  });

  test('trocar de obra mostra as faixas dela e avisa sobre valores sem regra', async ({
    page,
  }) => {
    await page.goto('/alcadas');
    await page.getByRole('tab', { name: /Residencial Sol Nascente/ }).click();
    await expect(page).toHaveURL(/obra=2/);
    await expect(
      page.getByRole('alert').filter({ hasText: 'Sem regra de alçada' }),
    ).toContainText('R$ 30.000,01');
  });

  test('cria faixa "sem limite" validando duplicidade e reordenando aprovadores', async ({
    page,
  }) => {
    await page.goto('/alcadas?obra=2');
    await page.getByRole('button', { name: 'Nova faixa' }).click();
    const dialog = page.getByRole('dialog', { name: 'Nova faixa' });

    await dialog.getByLabel('Limite superior da faixa').fill('30.000');
    await dialog.getByRole('button', { name: 'Salvar faixa' }).click();
    await expect(
      dialog.getByRole('alert').filter({
        hasText: 'Já existe uma faixa com o limite de R$ 30.000,00',
      }),
    ).toBeVisible();
    await expect(
      dialog
        .getByRole('alert')
        .filter({ hasText: 'Adicione pelo menos 1 aprovador.' }),
    ).toBeVisible();

    await dialog.getByRole('checkbox').click();
    await expect(dialog.getByText('R$ 30.000,01')).toBeVisible(); // início calculado
    for (const name of ['Amanda Costa', 'Carlos Mendes']) {
      await dialog
        .getByRole('combobox', { name: 'Adicionar aprovador' })
        .click();
      await page.getByRole('option', { name }).click();
    }
    await dialog
      .getByRole('button', { name: 'Mover Carlos Mendes para cima' })
      .click();
    await dialog.getByRole('button', { name: 'Salvar faixa' }).click();

    await expectToast(page, 'Faixa criada');
    const table = page.getByRole('table');
    await expect(table.getByText('Acima de R$ 30.000,00')).toBeVisible();
    await expect(
      table
        .getByRole('list', { name: 'Aprovadores na ordem do fluxo' })
        .last()
        .getByRole('listitem'),
    ).toHaveText(['1Carlos Mendes', '2Amanda Costa']);
    await expect(
      page.getByRole('alert').filter({ hasText: 'Sem regra de alçada' }),
    ).toHaveCount(0);
  });

  test('edita o limite e remove aprovador de uma faixa', async ({ page }) => {
    await page.goto('/alcadas?obra=1');
    await page.getByRole('button', { name: 'Editar faixa 2' }).click();
    const dialog = page.getByRole('dialog', { name: 'Editar faixa 2' });

    await dialog.getByLabel('Limite superior da faixa').fill('40.000,00');
    await dialog
      .getByRole('button', { name: 'Remover João Ribeiro da faixa' })
      .click();
    await dialog.getByRole('button', { name: 'Salvar faixa' }).click();

    await expectToast(page, 'Faixa 2 atualizada');
    await expect(
      page.getByRole('table').getByText('De R$ 10.000,01 até R$ 40.000,00'),
    ).toBeVisible();
  });

  test('remove faixa com confirmação explicando o efeito', async ({ page }) => {
    await page.goto('/alcadas?obra=2');
    await page.getByRole('button', { name: 'Remover faixa 2' }).click();
    const confirm = page.getByRole('alertdialog', {
      name: 'Remover a faixa 2?',
    });
    await expect(confirm).toContainText('Pedidos já cadastrados não mudam');

    await confirm.getByRole('button', { name: 'Remover faixa' }).click();
    await expectToast(page, 'Faixa 2 removida');
    await expect(
      page.getByRole('table').getByText('De R$ 5.000,01 até R$ 30.000,00'),
    ).toHaveCount(0);
  });

  test('"Testar valor" mostra a faixa aplicada ou o bloqueio', async ({
    page,
  }) => {
    await page.goto('/alcadas?obra=2');
    const input = page.getByLabel('Valor do pedido para testar');

    await input.fill('4.999,99');
    await expect(page.getByText(/se enquadra na/)).toContainText('faixa 1');
    await input.fill('45000');
    await expect(
      page.getByText(/Um pedido com este valor seria bloqueado/),
    ).toBeVisible();
  });

  test('obra sem faixas: empty state explicando que os pedidos estão bloqueados', async ({
    page,
  }) => {
    await page.goto('/alcadas?obra=3');
    await expect(page.getByText('Nenhuma faixa configurada')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Criar primeira faixa' }),
    ).toBeVisible();
  });
});
