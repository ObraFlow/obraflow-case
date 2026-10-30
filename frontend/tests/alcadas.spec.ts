import { test, expect } from '@playwright/test';
import { login } from './helpers/ui';
import { apiLogin, criarObra, dispose } from './helpers/api';
import { USUARIOS, OBRAS } from './helpers/seed';

test.describe('Regras de alçada', () => {
  test('não-ADMIN é redirecionado de /alcadas para /pedidos', async ({ page }) => {
    await login(page, 'carlos');
    await page.goto('/alcadas');
    await expect(page).toHaveURL('/pedidos');
  });

  test('seletor de obras lista obras como links', async ({ page }) => {
    await login(page, 'amanda');
    await page.goto('/alcadas');

    await expect(page.getByRole('heading', { name: 'Regras de Alçada' })).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(OBRAS.obra1.codigo) })).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(OBRAS.obra2.codigo) })).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(OBRAS.obra3.codigo) })).toBeVisible();
  });

  test('OBRA-001 mostra faixas com aprovadores na ordem', async ({ page }) => {
    await login(page, 'amanda');
    await page.goto('/alcadas');
    await page.getByRole('link', { name: new RegExp(OBRAS.obra1.codigo) }).click({ timeout: 20000 });

    await expect(page).toHaveURL(/\/alcadas\/.+/);
    await expect(
      page.getByRole('heading', { name: 'Regras de Alçada', exact: true })
    ).toBeVisible();
    // Duas faixas do seed
    await expect(page.getByRole('cell', { name: /10\.000,00/ }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: /Acima de/ })).toBeVisible();
    // Aprovadores na ordem: faixa 2 = Amanda → João
    const rowAcima = page.getByRole('row').filter({ hasText: 'Acima de' });
    await expect(rowAcima).toContainText(/1\.\s*Amanda Souza/);
    await expect(rowAcima).toContainText(/2\.\s*Joao Pedro Lima/);
  });

  test('CRUD completo de faixa: criar, editar (reordenar), excluir', async ({ browser }) => {
    // Cria uma obra isolada via API para não interferir no seed
    const session = await apiLogin(USUARIOS.amanda.email);
    const codigo = `E2E-${Date.now().toString(36).slice(-6).toUpperCase()}`;
    const obra = await criarObra(session, codigo, 'Obra E2E Alçadas');
    await dispose(session);

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, 'amanda');
    await page.goto(`/alcadas/${obra.id}`);

    // Empty state da obra nova
    await expect(page.getByText('Nenhuma faixa de alçada configurada')).toBeVisible();

    // --- CRIAR ---
    await page.getByRole('button', { name: 'Criar primeira faixa' }).click();
    await expect(page.getByRole('dialog')).toContainText('Nova Faixa de Alçada');

    // Limites em centavos via máscara pt-BR: 500000 → R$ 5.000,00
    await page.locator('input[name="limiteInferior"]').fill('0');
    await page.locator('input[name="limiteSuperior"]').fill('500000');
    await page.locator('input[name="descricao"]').fill('Compras de pequeno valor E2E');

    // Aprovadores: Amanda primeiro, depois João (ordem = ordem dos cliques)
    await page.getByRole('checkbox', { name: new RegExp(USUARIOS.amanda.email) }).check();
    await page.getByRole('checkbox', { name: new RegExp(USUARIOS.joao.email) }).check();
    await expect(page.getByText('2 selecionados')).toBeVisible();

    await page.getByRole('button', { name: 'Criar Faixa' }).click();

    // Faixa aparece na tabela
    await expect(page.getByText('Nenhuma faixa de alçada configurada')).toHaveCount(0);
    const rowCriada = page.getByRole('row').filter({ hasText: '5.000,00' });
    await expect(rowCriada).toContainText(/1\.\s*Amanda Souza/);
    await expect(rowCriada).toContainText(/2\.\s*Joao Pedro Lima/);

    // --- EDITAR (reordenar aprovadores: João → Amanda) ---
    await rowCriada.getByRole('button', { name: 'Editar faixa' }).click();
    await expect(page.getByRole('dialog')).toContainText('Editar Faixa');

    // Desmarca todos e remarca na nova ordem
    await page.getByRole('checkbox', { name: new RegExp(USUARIOS.amanda.email) }).uncheck();
    await page.getByRole('checkbox', { name: new RegExp(USUARIOS.joao.email) }).uncheck();
    await page.getByRole('checkbox', { name: new RegExp(USUARIOS.joao.email) }).check();
    await page.getByRole('checkbox', { name: new RegExp(USUARIOS.amanda.email) }).check();

    await page.getByRole('button', { name: 'Salvar Alterações' }).click();

    // Ordem invertida na tabela
    const rowEditada = page.getByRole('row').filter({ hasText: '5.000,00' });
    await expect(rowEditada).toContainText(/1\.\s*Joao Pedro Lima/);
    await expect(rowEditada).toContainText(/2\.\s*Amanda Souza/);

    // --- EXCLUIR (com confirm dialog do browser) ---
    page.once('dialog', (d) => d.accept());
    await rowEditada.getByRole('button', { name: 'Excluir faixa' }).click();

    await expect(page.getByText('Nenhuma faixa de alçada configurada')).toBeVisible();

    await ctx.close();
  });

  test('excluir faixa com pedidos vinculados é bloqueada com erro claro', async ({ page }) => {
    await login(page, 'amanda');
    await page.goto('/alcadas');
    // OBRA-001 tem pedidos vinculados às faixas do seed
    await page.getByRole('link', { name: new RegExp(OBRAS.obra1.codigo) }).click({ timeout: 20000 });

    const row = page.getByRole('row').filter({ hasText: /Ate R\$/ }).first();
    page.once('dialog', (d) => d.accept());
    await row.getByRole('button', { name: 'Excluir faixa' }).click();

    // Backend bloqueia (409) e a UI mostra o erro
    await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 10000 });
    // A faixa continua na tabela
    await expect(page.getByRole('cell', { name: /10\.000,00/ }).first()).toBeVisible();
  });

  test('simulador mostra a cadeia de aprovadores para um valor', async ({ page }) => {
    await login(page, 'amanda');
    await page.goto('/alcadas');
    await page.getByRole('link', { name: new RegExp(OBRAS.obra1.codigo) }).click({ timeout: 20000 });

    // Seleciona a faixa "Acima de R$ 10.000,00"
    await page.getByRole('combobox', { name: 'Faixa para simulação' }).click();
    await page.getByRole('option', { name: /Acima de/ }).click();

    // Valor R$ 12.500,00 (máscara em centavos: digita 1250000)
    await page.getByPlaceholder('R$ 0,00').fill('1250000');
    await page.getByRole('button', { name: 'Simular' }).click();

    await expect(page.getByText('Resultado da Simulação')).toBeVisible();
    await expect(page.getByText(/Aprovadores: Amanda Souza → Joao Pedro Lima/)).toBeVisible();
  });

  test('validação: faixa sem aprovadores não é criada', async ({ page }) => {
    await login(page, 'amanda');
    await page.goto('/alcadas');
    await page.getByRole('link', { name: new RegExp(OBRAS.obra3.codigo) }).click({ timeout: 20000 });

    await page.getByRole('button', { name: 'Nova Faixa' }).click();
    await page.locator('input[name="limiteInferior"]').fill('100000'); // R$ 1.000,00
    await page.locator('input[name="limiteSuperior"]').fill('2500000'); // R$ 25.000,00
    // Não marca nenhum aprovador
    await page.getByRole('button', { name: 'Criar Faixa' }).click();

    await expect(page.getByText('Mínimo 1 aprovador')).toBeVisible();
  });
});
