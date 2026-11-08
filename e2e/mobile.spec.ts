import { expect, test } from '@playwright/test'

test('no celular a lista empilha as colunas e o detalhe ocupa a tela', async ({ page }) => {
  await page.goto('/aprovacoes?filtro=todos')
  await expect(page.locator('.order-row').nth(1)).toBeVisible()
  // nada de rolagem horizontal
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)

  await page.getByRole('link', { name: 'PC-00002' }).click()
  const detail = page.getByRole('complementary', { name: 'Detalhes do pedido' })
  await expect(detail).toBeVisible()
  const box = await detail.boundingBox()
  expect(box?.width).toBeGreaterThanOrEqual(page.viewportSize()!.width - 1)

  await detail.getByRole('button', { name: 'Voltar à lista' }).click()
  await expect(detail).toBeHidden()
})
