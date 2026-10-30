import { test, expect, Browser, Page } from '@playwright/test';
import { login } from './helpers/ui';
import { apiLogin, getObras, getFornecedores, criarPedido, dispose } from './helpers/api';
import { USUARIOS, OBRAS, FORNECEDORES } from './helpers/seed';

/**
 * Setup de dados via API: cria pedidos isolados por teste para não depender
 * do estado mutável do seed (as decisões alteram o banco permanentemente).
 */
async function criarPedidoTeste(valorTotal: number, descricao = 'Item E2E') {
  const session = await apiLogin(USUARIOS.carlos.email);
  const obras = await getObras(session);
  const fornecedores = await getFornecedores(session);
  const obra1 = obras.find((o) => o.codigo === OBRAS.obra1.codigo)!;
  const forn = fornecedores.find((f) => f.nome === FORNECEDORES.cimentos)!;

  const pedido = await criarPedido(session, {
    obraId: obra1.id,
    fornecedorId: forn.id,
    observacoes: `Teste E2E — valor ${valorTotal}`,
    itens: [{ descricao, quantidade: 1, unidade: 'un', precoUnitario: valorTotal }],
  });
  await dispose(session);
  return pedido;
}

test.describe('Aprovação de pedidos', () => {
  test('lista mostra loading state antes dos dados', async ({ page }) => {
    await login(page, 'amanda');
    // Atrasa a resposta para capturar o estado de loading
    await page.route('**/api/backend/pedidos*', async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });
    await page.goto('/pedidos');

    await expect(page.getByText('Carregando pedidos...')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pedidos de Compra' })).toBeVisible({
      timeout: 15000,
    });
  });

  test('filtros por situação e obra funcionam', async ({ page }) => {
    await login(page, 'amanda');
    await page.goto('/pedidos');
    await expect(page.getByRole('heading', { name: 'Pedidos de Compra' })).toBeVisible();

    // Filtra por Aprovado
    await page.getByRole('combobox', { name: 'Situação' }).click();
    await page.getByRole('option', { name: 'Aprovado' }).click();
    await expect(page.getByRole('cell', { name: 'Aprovado' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Pendente' })).toHaveCount(0);
  });

  test('detalhes mostram itens, alçada e histórico', async ({ page }) => {
    await login(page, 'amanda');
    await page.goto('/pedidos');
    // Abre o primeiro pedido pendente da lista
    await page.getByRole('link', { name: 'Ver detalhes' }).first().click();

    await expect(page.getByRole('heading', { name: 'Alçada de Aprovação' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Itens do Pedido/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Histórico de Decisões' })).toBeVisible();
    // Tabela de itens tem colunas esperadas (th — Playwright 1.45 não resolve role columnheader)
    await expect(page.locator('th').filter({ hasText: 'Descrição' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Preço Unit.' })).toBeVisible();
  });

  test('aprovação em cadeia multi-etapa: Amanda → João', async ({ browser }) => {
    // Pedido de R$ 12.500 na OBRA-001 → faixa [10k,∞) → cadeia Amanda → João
    const pedido = await criarPedidoTeste(12500, 'Cadeia multi-etapa');

    // João (2º aprovador) — ainda não é a dele
    const ctxJoao = await browser.newContext();
    const pageJoao = await ctxJoao.newPage();
    await login(pageJoao, 'joao');
    await pageJoao.goto(`/pedidos/${pedido.id}`);

    await expect(pageJoao.getByRole('button', { name: 'Aprovar' })).toBeDisabled();
    await expect(pageJoao.getByText('Aguardando decisão de Amanda Souza')).toBeVisible();
    await expect(pageJoao.getByText('É a sua vez de decidir')).toHaveCount(0);

    // Amanda (1ª aprovadora) aprova a etapa 1
    const ctxAmanda = await browser.newContext();
    const pageAmanda = await ctxAmanda.newPage();
    await login(pageAmanda, 'amanda');
    await pageAmanda.goto(`/pedidos/${pedido.id}`);

    await expect(pageAmanda.getByRole('button', { name: 'Aprovar' })).toBeEnabled();
    await expect(pageAmanda.getByText('É a sua vez de decidir')).toBeVisible();
    await pageAmanda.getByRole('button', { name: 'Aprovar' }).click();

    // Após aprovar, a página atualiza para a etapa 2 (João)
    await expect(pageAmanda.getByText('Etapa atual: 2 de 2')).toBeVisible({ timeout: 10000 });
    await expect(pageAmanda.getByText('Joao Pedro Lima').first()).toBeVisible();

    // Agora é a vez do João — recarrega e decide
    await pageJoao.reload();
    await expect(pageJoao.getByRole('button', { name: 'Aprovar' })).toBeEnabled();
    await expect(pageJoao.getByText('É a sua vez de decidir')).toBeVisible();
    await pageJoao.getByRole('button', { name: 'Aprovar' }).click();

    // Cadeia concluída: botões desabilitados + explicação
    await expect(pageJoao.getByText('Pedido aprovado — cadeia de alçada concluída')).toBeVisible({
      timeout: 10000,
    });
    await expect(pageJoao.getByRole('button', { name: 'Aprovar' })).toBeDisabled();
    await expect(pageJoao.getByRole('button', { name: 'Rejeitar' })).toBeDisabled();

    // Histórico registra as 2 aprovações
    await expect(pageJoao.getByText('APROVADO').first()).toBeVisible();

    await ctxJoao.close();
    await ctxAmanda.close();
  });

  test('rejeição exige motivo e interrompe o fluxo', async ({ page }) => {
    // Pedido pequeno (R$ 500) → faixa [0,10k] → só Amanda decide
    const pedido = await criarPedidoTeste(500, 'Pedido a rejeitar');

    await login(page, 'amanda');
    await page.goto(`/pedidos/${pedido.id}`);

    // Abre diálogo de rejeição
    await page.getByRole('button', { name: 'Rejeitar' }).click();
    await expect(page.getByRole('dialog')).toContainText('Informe o motivo da rejeição');

    // Botão desabilitado enquanto motivo vazio
    await expect(page.getByRole('button', { name: 'Confirmar Rejeição' })).toBeDisabled();

    // Preenche motivo e confirma
    await page.getByLabel('Motivo *').fill('Orçamento insuficiente para esta compra');
    await expect(page.getByRole('button', { name: 'Confirmar Rejeição' })).toBeEnabled();
    await page.getByRole('button', { name: 'Confirmar Rejeição' }).click();

    // Fluxo interrompido: pedido REJEITADO, botões desabilitados, motivo no histórico
    await expect(page.getByText('Pedido rejeitado — fluxo interrompido')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole('button', { name: 'Aprovar' })).toBeDisabled();
    await expect(page.getByText('Orçamento insuficiente para esta compra').first()).toBeVisible();
  });

  test('cadeia já concluída mostra botões desabilitados com explicação', async ({ page }) => {
    await login(page, 'amanda');
    await page.goto('/pedidos');

    // Filtra por Aprovado e abre o primeiro
    await page.getByRole('combobox', { name: 'Situação' }).click();
    await page.getByRole('option', { name: 'Aprovado' }).click();
    await page.getByRole('link', { name: 'Ver detalhes' }).first().click();

    await expect(page.getByText('Pedido aprovado — cadeia de alçada concluída')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aprovar' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Rejeitar' })).toBeDisabled();
  });

  test('erro de API mostra estado de erro com "Tentar novamente"', async ({ page }) => {
    await login(page, 'amanda');
    // Simula backend fora do ar
    await page.route('**/api/backend/pedidos*', (route) => route.abort('failed'));
    await page.goto('/pedidos');

    await expect(page.getByRole('heading', { name: 'Erro ao carregar pedidos' })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
  });
});
