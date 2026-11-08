import { expect, test } from '@playwright/test'

test('painel mostra gasto aprovado, orçamento por obra e leva às aprovações', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Painel de compras' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Gasto aprovado', exact: true })).toContainText('do orçamento')
  await expect(page.getByRole('list', { name: 'Gasto aprovado por mês' }).getByRole('button')).toHaveCount(6)

  // OB-102 já passou de 85% do orçamento somando aprovado e em aprovação
  const obras = page.getByRole('region', { name: 'Obras', exact: true })
  await expect(obras.getByRole('listitem').filter({ hasText: 'OB-102' })).toContainText('Perto do limite')

  // filtrar por obra apaga as outras na tabela
  await page.locator('#dash-site').selectOption({ index: 2 })
  await expect(page).toHaveURL(/obra=2/)

  await page.getByRole('link', { name: /Parados/ }).click()
  await expect(page).toHaveURL(/filtro=parados/)
})
