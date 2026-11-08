import { expect, test } from '@playwright/test'

test('cria a faixa sem teto da OB-102 e o simulador passa a encontrá-la', async ({ page }) => {
  await page.goto('/regras?obra=2')
  await expect(page.getByText(/não há regra: pedidos nesse valor são/)).toBeVisible()

  await page.getByLabel('Total do pedido (R$)').fill('75.000')
  await expect(page.getByText('Nenhuma faixa cobre R$ 75.000,00')).toBeVisible()

  await page.getByRole('button', { name: 'Nova faixa' }).click()
  await page.getByLabel('Sem limite superior').check()
  await page.getByRole('button', { name: 'Beatriz Moura' }).click()
  await page.getByRole('button', { name: 'Ricardo Teles' }).click()
  await page.getByRole('button', { name: 'Subir Ricardo Teles' }).click()
  await page.getByRole('button', { name: 'Criar faixa' }).click()

  await expect(page.locator('.tier').getByText('Acima de R$ 50.000,00')).toBeVisible()
  await expect(page.getByText(/não há regra: pedidos nesse valor são/)).toBeHidden()
  // a ordem definida (Ricardo antes de Beatriz) é a que vale
  const sim = page.locator('.sim-result')
  await expect(sim).toContainText('Ricardo')
  await expect(sim.locator('.chain-step').first()).toContainText('Ricardo')
})
