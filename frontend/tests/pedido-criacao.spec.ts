import { test, expect } from '@playwright/test';
import { login, selectRadix } from './helpers/ui';
import { apiLogin, getObras, getFornecedores, dispose } from './helpers/api';
import { USUARIOS, OBRAS, FORNECEDORES } from './helpers/seed';

test.describe('Cadastro de pedido de compra', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'carlos');
    await page.goto('/pedidos/novo');
  });

  test('exibe formulário com um item em branco e total zero', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Novo Pedido de Compra' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Adicionar Item' })).toBeEnabled();
    await expect(page.getByLabel('Descrição *')).toHaveCount(1);
    // botão desabilitado enquanto formulário inválido (sem obra/fornecedor/itens válidos)
    await expect(page.getByRole('button', { name: 'Cadastrar Pedido' })).toBeDisabled();
  });

  test('adiciona N itens e totaliza o pedido', async ({ page }) => {
    // Item 1
    await page.getByLabel('Descrição *').fill('Cimento CP II 50kg');
    await page.getByLabel('Qtd *').fill('100');
    await selectRadix(page, 'Unidade *', 'sc', page.getByRole('row').nth(1));
    await page.getByLabel('Preço Unit. *').fill('32.90');

    // Adiciona item 2
    await page.getByRole('button', { name: 'Adicionar Item' }).click();
    await expect(page.getByLabel('Descrição *')).toHaveCount(2);
    await page.getByLabel('Descrição *').nth(1).fill('Areia lavada');
    await page.getByLabel('Qtd *').nth(1).fill('30');
    await selectRadix(page, 'Unidade *', /^m³$/, page.getByRole('row').nth(2));
    await page.getByLabel('Preço Unit. *').nth(1).fill('95');

    // Total: 100×32.90 + 30×95 = 3290 + 2850 = 6140
    await expect(page.getByText('R$ 6.140,00').first()).toBeVisible();

    // Remove item 2 → volta para 3290
    await page.getByRole('button', { name: 'Remover item 2' }).click();
    await expect(page.getByLabel('Descrição *')).toHaveCount(1);
    await expect(page.getByText('R$ 3.290,00').first()).toBeVisible();
  });

  test('mostra erro ao tentar enviar com quantidade negativa', async ({ page }) => {
    await page.getByLabel('Descrição *').fill('Item inválido');
    await page.getByLabel('Qtd *').fill('-5');
    await page.getByLabel('Preço Unit. *').fill('10');

    await expect(page.getByText('Quantidade deve ser maior que zero')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cadastrar Pedido' })).toBeDisabled();
  });

  test('mostra erro ao tentar enviar com preço negativo', async ({ page }) => {
    await page.getByLabel('Descrição *').fill('Item inválido');
    await page.getByLabel('Qtd *').fill('5');
    await page.getByLabel('Preço Unit. *').fill('-10');

    await expect(page.getByText('Preço não pode ser negativo')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cadastrar Pedido' })).toBeDisabled();
  });

  test('mostra erro ao tentar enviar sem descrição no item', async ({ page }) => {
    // Preenche e limpa para disparar a validação do campo (mode: onChange)
    await page.getByLabel('Descrição *').fill('temp');
    await page.getByLabel('Descrição *').fill('');
    await page.getByLabel('Qtd *').fill('5');
    await page.getByLabel('Preço Unit. *').fill('10');

    await expect(page.getByText('Descrição obrigatória')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cadastrar Pedido' })).toBeDisabled();
  });

  test('fluxo feliz: cria pedido com 2 itens e redireciona para a lista', async ({ page }) => {
    // Dados gerais
    await selectRadix(page, 'Obra', new RegExp(OBRAS.obra1.codigo));
    await selectRadix(page, 'Fornecedor', FORNECEDORES.cimentos);
    await page.getByLabel('Data do Pedido').fill('2026-10-28');
    await page.getByLabel('Observações Internas').fill('Pedido criado pelo teste E2E');

    // Item 1
    await page.getByLabel('Descrição *').fill('Cimento CP II 50kg');
    await page.getByLabel('Qtd *').fill('100');
    await selectRadix(page, 'Unidade *', 'sc');
    await page.getByLabel('Preço Unit. *').fill('32.90');

    // Item 2
    await page.getByRole('button', { name: 'Adicionar Item' }).click();
    await page.getByLabel('Descrição *').nth(1).fill('Areia lavada');
    await page.getByLabel('Qtd *').nth(1).fill('30');
    await selectRadix(page, 'Unidade *', /^m³$/, page.getByRole('row').nth(2));
    await page.getByLabel('Preço Unit. *').nth(1).fill('95');

    // Total R$ 6.140,00 → faixa [0, 10k] → 1 aprovador
    await expect(page.getByText('R$ 6.140,00').first()).toBeVisible();

    await expect(page.getByRole('button', { name: 'Cadastrar Pedido' })).toBeEnabled();
    await page.getByRole('button', { name: 'Cadastrar Pedido' }).click();

    // Redireciona para a lista; pedido novo é o primeiro (ordenado por criadoEm desc)
    await expect(page).toHaveURL('/pedidos');
    await expect(page.getByRole('heading', { name: 'Pedidos de Compra' })).toBeVisible();
    const novaLinha = page.getByRole('row').filter({ hasText: 'R$ 6.140,00' }).first();
    await expect(novaLinha).toBeVisible({ timeout: 10000 });
    await expect(novaLinha).toContainText(/Pendente/);
  });

  test('impede criação quando não há regra de alçada para o valor (OBRA-003 gap)', async ({ page }) => {
    // OBRA-003 tem faixas [0,1k) e [25k,∞) — R$ 5.000 fica no gap (1k–25k)
    await selectRadix(page, 'Obra', new RegExp(OBRAS.obra3.codigo));
    await selectRadix(page, 'Fornecedor', FORNECEDORES.pisos);

    await page.getByLabel('Descrição *').fill('Item sem faixa');
    await page.getByLabel('Qtd *').fill('1');
    await selectRadix(page, 'Unidade *', 'un');
    await page.getByLabel('Preço Unit. *').fill('5000');

    await expect(page.getByText('R$ 5.000,00').first()).toBeVisible();
    await page.getByRole('button', { name: 'Cadastrar Pedido' }).click();

    // Backend recusa com mensagem clara
    await expect(
      page.getByRole('alert').filter({ hasText: 'Nao existe regra de alcada' })
    ).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL('/pedidos/novo');
  });

  test('empty state amigável quando não há obras cadastradas', async ({ page, browser }) => {
    // Intercepta o proxy e devolve lista vazia de obras
    await page.route('**/api/backend/obras*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    await page.goto('/pedidos/novo');

    // Select de obra fica vazio — usuário vê placeholder, não tela branca
    await expect(page.getByRole('heading', { name: 'Novo Pedido de Compra' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Obra' })).toBeVisible();
  });
});
