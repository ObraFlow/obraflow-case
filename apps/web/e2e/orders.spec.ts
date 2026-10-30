import { expect, test } from '@playwright/test';
import { API_URL } from '../playwright.config';
import { expectToast, orderRow, resetDatabase, USERS, viewAs } from './helpers';

test.beforeEach(() => resetDatabase());

test.describe('Pedidos (aprovação)', () => {
  test('lista mostra identificador, obra, fornecedor, data, itens, total, situação e alçada', async ({
    page,
  }) => {
    await page.goto('/pedidos');

    const row = orderRow(page, 'PED-009');
    await expect(row).toContainText('Edifício Maré');
    await expect(row).toContainText('Votorantim Cimentos');
    await expect(row).toContainText('18/10/2026');
    await expect(row).toContainText('R$ 12.500,00');
    await expect(row).toContainText('Pendente');
    // Alçada atual: João aprovou (etapa 1), Amanda é a etapa atual.
    await expect(
      row.getByLabel('1ª etapa: João Ribeiro — Aprovado'),
    ).toBeVisible();
    await expect(
      row.getByLabel('2ª etapa: Amanda Costa — Aguardando decisão'),
    ).toBeVisible();
    await expect(row).toContainText('Aguardando Amanda');

    await expect(page.getByRole('row', { name: /^PED-/ })).toHaveCount(11);
  });

  test('aba "Aguardando minha decisão" reflete a etapa atual de cada aprovador', async ({
    page,
  }) => {
    await viewAs(page, USERS.amanda);
    await page.goto('/pedidos?aba=minha');

    await expect(page.getByRole('row', { name: /^PED-/ })).toHaveCount(3);
    for (const code of ['PED-011', 'PED-009', 'PED-007']) {
      await expect(
        orderRow(page, code).getByRole('button', { name: `Aprovar ${code}` }),
      ).toBeVisible();
    }
  });

  test('aprovar pela lista avança a alçada e o pedido sai da aba do aprovador', async ({
    page,
  }) => {
    await viewAs(page, USERS.amanda);
    await page.goto('/pedidos?aba=minha');

    await page.getByRole('button', { name: 'Aprovar PED-007' }).click();
    await expectToast(page, 'PED-007 aprovado');
    await expect(orderRow(page, 'PED-007')).toHaveCount(0);
    await expect(page.getByRole('row', { name: /^PED-/ })).toHaveCount(2);
  });

  test('rejeitar exige motivo antes do envio e registra o motivo no histórico', async ({
    page,
  }) => {
    await viewAs(page, USERS.amanda);
    await page.goto('/pedidos?pedido=9');

    const drawer = page.getByRole('dialog', { name: 'PED-009' });
    await drawer.getByRole('button', { name: 'Rejeitar pedido' }).click();

    const modal = page.getByRole('dialog', { name: 'Motivo da rejeição' });
    await modal.getByRole('button', { name: 'Rejeitar pedido' }).click();
    await expect(modal.getByRole('alert')).toHaveText(
      'O motivo é obrigatório para rejeitar o pedido.',
    );

    await modal.getByLabel(/Descreva o motivo/).fill('curto');
    await modal.getByRole('button', { name: 'Rejeitar pedido' }).click();
    await expect(modal.getByRole('alert')).toContainText(
      'mínimo de 10 caracteres',
    );

    await modal
      .getByLabel(/Descreva o motivo/)
      .fill('Preço do vergalhão acima da cotação.');
    await modal.getByRole('button', { name: 'Rejeitar pedido' }).click();

    await expectToast(page, 'PED-009 rejeitado');
    await expect(
      drawer.getByText('Pedido encerrado por rejeição'),
    ).toBeVisible();
    await expect(
      drawer.getByText('Preço do vergalhão acima da cotação.'),
    ).toBeVisible();
    await expect(
      drawer.getByRole('button', { name: 'Aprovar pedido' }),
    ).toBeDisabled();
  });

  test('detalhe mostra itens e histórico; cadeia concluída deixa as ações desabilitadas com explicação', async ({
    page,
  }) => {
    await page.goto('/pedidos?pedido=3');
    const drawer = page.getByRole('dialog', { name: 'PED-003' });

    for (const text of [
      'Locação de grua torre (mensal)',
      'R$ 38.000,00',
      'Total',
      'R$ 67.880,00',
    ]) {
      await expect(
        drawer.getByText(text, { exact: true }).first(),
      ).toBeVisible();
    }
    for (const name of ['João Ribeiro', 'Amanda Costa', 'Carlos Mendes']) {
      await expect(drawer.getByText(`Aprovado por ${name}`)).toBeVisible();
    }
    await expect(
      drawer.getByText('Fluxo de aprovação concluído'),
    ).toBeVisible();
    await expect(
      drawer.getByRole('button', { name: 'Aprovar pedido' }),
    ).toBeDisabled();
    await expect(
      drawer.getByRole('button', { name: 'Rejeitar pedido' }),
    ).toBeDisabled();
  });

  test('quem não é o aprovador da vez vê os botões desabilitados e o motivo', async ({
    page,
  }) => {
    await viewAs(page, USERS.beatriz);
    await page.goto('/pedidos?pedido=8');
    const drawer = page.getByRole('dialog', { name: 'PED-008' });

    await expect(
      drawer.getByText('Aguardando Carlos Mendes').first(),
    ).toBeVisible();
    await expect(
      drawer.getByText(/só Carlos Mendes pode decidir a 3ª etapa/),
    ).toBeVisible();
    await expect(
      drawer.getByRole('button', { name: 'Aprovar pedido' }),
    ).toBeDisabled();
  });

  test('decisão já tomada por outra pessoa (409): aviso e lista atualizada', async ({
    page,
    request,
  }) => {
    await viewAs(page, USERS.amanda);
    await page.goto('/pedidos?aba=minha');
    await expect(orderRow(page, 'PED-011')).toBeVisible();

    // Outra pessoa aprova o PED-011 enquanto a tela está aberta.
    const order = await (
      await request.get(`${API_URL}/purchase-orders/11`)
    ).json();
    const stepId = order.steps[order.currentStep - 1].id;
    expect(
      (
        await request.post(`${API_URL}/purchase-orders/11/approve`, {
          data: { stepId },
        })
      ).ok(),
    ).toBe(true);

    await page.getByRole('button', { name: 'Aprovar PED-011' }).click();
    await expectToast(page, 'Este pedido já foi decidido');
    await expect(orderRow(page, 'PED-011')).toHaveCount(0);
  });

  test('busca por código e filtro por obra', async ({ page }) => {
    await page.goto('/pedidos');
    await page
      .getByLabel('Buscar por fornecedor ou número do pedido')
      .fill('ped-9');
    await expect(page.getByRole('row', { name: /^PED-/ })).toHaveCount(1);
    await expect(orderRow(page, 'PED-009')).toBeVisible();

    await page.getByLabel('Buscar por fornecedor ou número do pedido').fill('');
    await page.getByRole('combobox', { name: 'Filtrar por obra' }).click();
    await page
      .getByRole('option', { name: 'Residencial Sol Nascente' })
      .click();
    await expect(page.getByRole('row', { name: /^PED-/ })).toHaveCount(4);
  });

  test('API fora do ar: erro com "Tentar novamente", que recupera a lista', async ({
    page,
  }) => {
    await page.route('**/api/purchase-orders**', (route) => route.abort());
    await page.goto('/pedidos');
    await expect(
      page.getByText('Não foi possível carregar os pedidos'),
    ).toBeVisible({ timeout: 20_000 });

    await page.unroute('**/api/purchase-orders**');
    await page.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(page.getByRole('row', { name: /^PED-/ })).toHaveCount(11);
  });

  test('loading: skeleton enquanto a lista carrega', async ({ page }) => {
    await page.route('**/api/purchase-orders**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });
    await page.goto('/pedidos');
    await expect(page.getByLabel('Carregando pedidos')).toBeVisible();
    await expect(page.getByRole('row', { name: /^PED-/ })).toHaveCount(11);
  });
});
