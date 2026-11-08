import { expect, type Page } from '@playwright/test'

export async function actAs(page: Page, name: string) {
  const select = page.locator('#actor')
  await expect(select).toBeEnabled()
  await select.selectOption({ label: name })
}

export async function fillItem(
  page: Page,
  index: number,
  item: { description: string; quantity: string; unitPrice: string; unit?: string },
) {
  await page.getByLabel('Descrição').nth(index).fill(item.description)
  await page.getByLabel('Quantidade').nth(index).fill(item.quantity)
  if (item.unit) await page.getByLabel('Unidade', { exact: true }).nth(index).selectOption(item.unit)
  await page.getByLabel('Preço unitário (R$)').nth(index).fill(item.unitPrice)
}

export async function startOrder(page: Page, site: RegExp, supplier: RegExp) {
  await page.goto('/pedidos/novo')
  await page.getByLabel('Obra').selectOption({ label: await optionLabel(page, '#siteId', site) })
  await page.getByLabel('Fornecedor').selectOption({ label: await optionLabel(page, '#supplierId', supplier) })
}

async function optionLabel(page: Page, select: string, match: RegExp) {
  // espera a lista vir da API antes de procurar
  await expect(page.locator(`${select} option`).nth(1)).toBeAttached()
  const labels = await page.locator(`${select} option`).allTextContents()
  const label = labels.find((l) => match.test(l))
  if (!label) throw new Error(`opção ${match} não encontrada em ${select}`)
  return label
}

export const summary = (page: Page) => page.getByRole('complementary', { name: 'Resumo' })
export const decisionBar = (page: Page) => page.locator('.decision-bar')
