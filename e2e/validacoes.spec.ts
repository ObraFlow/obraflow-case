import { expect, test } from '@playwright/test'
import { actAs, fillItem, startOrder, summary } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/aprovacoes')
  await actAs(page, 'Pedro Santana')
})

test('item inválido mostra erro no campo e segura o envio', async ({ page }) => {
  await startOrder(page, /OB-101/, /Madeireira/)
  await fillItem(page, 0, { description: 'Tábua de pinus', quantity: '-2', unitPrice: 'abc' })
  await page.getByLabel('Observações internas').focus()

  await expect(page.getByText('Use um número maior que zero')).toBeVisible()
  await expect(page.getByText('Valor inválido. Use o formato 1.234,56.')).toBeVisible()
  await expect(page.getByLabel('Quantidade').first()).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByRole('button', { name: 'Cadastrar pedido' })).toBeDisabled()
  await expect(page.getByText(/Para enviar falta completar 1 item/)).toBeVisible()
})

test('pedido sem itens avisa e não envia', async ({ page }) => {
  await startOrder(page, /OB-101/, /Madeireira/)
  await page.getByRole('button', { name: 'Remover item 1' }).click()
  await expect(page.getByText('O pedido está sem itens.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cadastrar pedido' })).toBeDisabled()
})

test('obra sem regra de alçada bloqueia o envio com caminho para resolver', async ({ page }) => {
  await startOrder(page, /OB-103/, /Madeireira/)
  await fillItem(page, 0, { description: 'Lona preta', quantity: '10', unitPrice: '30' })
  await expect(summary(page).getByText('A obra OB-103 ainda não tem regras de alçada.')).toBeVisible()
  await expect(summary(page).getByRole('link', { name: 'Configurar regras' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cadastrar pedido' })).toBeDisabled()
})

test('aprovador não cadastra pedido que cairia na própria alçada', async ({ page }) => {
  await actAs(page, 'Amanda Ribeiro')
  await startOrder(page, /OB-101/, /Aço Forte/)
  await fillItem(page, 0, { description: 'Vergalhão', quantity: '1000', unitPrice: '25' })
  await expect(summary(page).getByText(/você está nesta alçada/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cadastrar pedido' })).toBeDisabled()

  await summary(page).getByRole('button', { name: 'Cadastrar como Pedro Santana' }).click()
  await expect(page.getByRole('button', { name: 'Cadastrar pedido' })).toBeEnabled()
})
