import { expect, test } from '@playwright/test'
import { actAs, decisionBar, fillItem, startOrder, summary } from './helpers'

test('pedido de R$ 12.500 passa por João e depois Amanda, na ordem', async ({ page }) => {
  await page.goto('/aprovacoes')
  await actAs(page, 'Pedro Santana')

  await startOrder(page, /OB-101/, /Aço Forte/)
  await fillItem(page, 0, { description: 'Cimento CP-II 50 kg', quantity: '200', unit: 'sc', unitPrice: '25' })
  await page.getByRole('button', { name: 'Adicionar item' }).first().click()
  await fillItem(page, 1, { description: 'Bloco cerâmico 9 furos', quantity: '6', unitPrice: '1.250,00' })

  // o total e a cadeia aparecem antes de enviar
  await expect(summary(page).getByText('R$ 12.500,00')).toBeVisible()
  await expect(summary(page).getByRole('list', { name: 'Cadeia de aprovação' })).toContainText('João Menezes')
  await expect(summary(page).getByRole('list', { name: 'Cadeia de aprovação' })).toContainText('Amanda Ribeiro')

  await page.getByRole('button', { name: 'Cadastrar pedido' }).click()
  await expect(page.getByText('Pedido cadastrado e enviado para aprovação')).toBeVisible()
  await page.getByRole('link', { name: 'Abrir pedido' }).click()

  // Amanda ainda não pode decidir
  await actAs(page, 'Amanda Ribeiro')
  await expect(decisionBar(page)).toContainText('Aguardando João Menezes')
  await expect(decisionBar(page).getByRole('button', { name: 'Aprovar' })).toBeDisabled()

  await actAs(page, 'João Menezes')
  await decisionBar(page).getByRole('button', { name: 'Aprovar' }).click()
  await expect(page.getByText(/aprovado\. Segue para Amanda Ribeiro/)).toBeVisible()

  await actAs(page, 'Amanda Ribeiro')
  await decisionBar(page).getByRole('button', { name: 'Aprovar' }).click()
  await expect(decisionBar(page)).toContainText('Cadeia concluída')
  await expect(decisionBar(page).getByRole('button', { name: 'Aprovar' })).toBeDisabled()
  await expect(decisionBar(page).getByRole('button', { name: 'Rejeitar' })).toBeDisabled()
})

test('quem não está na cadeia vê o motivo e não consegue decidir', async ({ page }) => {
  await page.goto('/aprovacoes/2')
  await actAs(page, 'Ricardo Teles')
  await expect(decisionBar(page)).toContainText('Você não faz parte desta alçada')
  await expect(decisionBar(page).getByRole('button', { name: 'Aprovar' })).toBeDisabled()
  // e ganha o atalho para cobrar quem está segurando
  await expect(page.getByRole('link', { name: /Lembrar .* no WhatsApp/ })).toHaveAttribute('href', /wa\.me\/\d+\?text=/)
})

test('aprova em lote só o que está na etapa de quem atua', async ({ page }) => {
  await page.goto('/aprovacoes')
  await actAs(page, 'Beatriz Moura')
  await page.goto('/aprovacoes?filtro=todos')

  // só os pedidos na vez da Beatriz têm checkbox
  const boxes = page.getByRole('checkbox', { name: /^Selecionar PC-/ })
  await expect(boxes).toHaveCount(2)
  await page.getByRole('checkbox', { name: 'Selecionar todos que aguardam você' }).check()
  await expect(page.getByRole('region', { name: 'Seleção' })).toContainText('2 selecionados')

  await page.getByRole('button', { name: 'Aprovar selecionados' }).click()
  const dialog = page.getByRole('dialog', { name: 'Aprovar 2 pedidos?' })
  await expect(dialog).toContainText('PC-00006')
  await dialog.getByRole('button', { name: 'Aprovar', exact: true }).click()
  await expect(page.getByText('2 pedidos aprovados.')).toBeVisible()
  await expect(boxes).toHaveCount(0)
})
