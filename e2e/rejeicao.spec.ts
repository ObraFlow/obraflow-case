import { expect, test } from '@playwright/test'
import { actAs, decisionBar } from './helpers'

test('rejeitar exige motivo; o pedido é corrigido e reenviado ligado ao original', async ({ page }) => {
  await page.goto('/aprovacoes/3')
  await actAs(page, 'João Menezes')

  await decisionBar(page).getByRole('button', { name: 'Rejeitar' }).click()
  const dialog = page.getByRole('dialog', { name: 'Rejeitar pedido' })
  await dialog.getByRole('button', { name: 'Rejeitar pedido' }).click()
  await expect(dialog.getByText('O motivo é obrigatório')).toBeVisible()

  await dialog.getByLabel('Motivo').fill('Volume de concreto acima do traço aprovado.')
  await dialog.getByRole('button', { name: 'Rejeitar pedido' }).click()
  await expect(decisionBar(page)).toContainText('Fluxo encerrado')
  await expect(page.locator('.rejection')).toContainText('Volume de concreto acima do traço aprovado.')

  // quem corrige é o comprador: João está na cadeia e não pode cadastrar
  await actAs(page, 'Pedro Santana')
  await page.getByRole('link', { name: 'Corrigir e reenviar' }).click()
  await expect(page.getByRole('heading', { name: 'Corrigir e reenviar' })).toBeVisible()
  await expect(page.getByLabel('Descrição').first()).toHaveValue(/Concreto usinado/)

  await page.getByLabel('Quantidade').first().fill('180')
  await page.getByRole('button', { name: 'Reenviar pedido corrigido' }).click()
  await expect(page.getByText('Correção do PC-00003 enviada para aprovação')).toBeVisible()

  await page.getByRole('link', { name: 'Abrir pedido' }).click()
  await expect(page.getByRole('link', { name: /Correção do pedido PC-00003/ })).toBeVisible()
})
