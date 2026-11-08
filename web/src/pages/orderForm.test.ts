import { describe, expect, it } from 'vitest'
import type { OrderDetail } from '../api/types'
import { blankItem, fieldKey, formFromOrder, serverPathToKey, validateOrder, type OrderForm } from './orderForm'

const base = (): OrderForm => ({ siteId: '1', supplierId: '2', orderDate: '2026-10-23', notes: '', items: [] })

describe('validateOrder', () => {
  it('pedido sem itens não é válido', () => {
    const r = validateOrder(base())
    expect(r.valid).toBe(false)
    expect(r.errors.items).toBeDefined()
  })

  it('aponta erro no item certo', () => {
    const ok = { ...blankItem(), description: 'Areia', quantity: '2', unitPrice: '100' }
    const bad = { ...blankItem(), description: 'Brita', quantity: '-3', unitPrice: 'abc' }
    const r = validateOrder({ ...base(), items: [ok, bad] })
    expect(r.errors[fieldKey(bad.key, 'quantity')]).toMatch(/maior que zero/)
    expect(r.errors[fieldKey(bad.key, 'unitPrice')]).toMatch(/inválido/)
    expect(r.errors[fieldKey(ok.key, 'quantity')]).toBeUndefined()
    expect(r.totalCents).toBe(20000) // só a linha válida entra na prévia
  })

  it('monta o payload com centavos e quantidade no formato da API', () => {
    const item = { ...blankItem(), description: ' Cimento ', quantity: '2,5', unit: 'sc', unitPrice: '1.234,56' }
    const r = validateOrder({ ...base(), notes: '  ', items: [item] })
    expect(r.valid).toBe(true)
    expect(r.payload).toEqual({
      siteId: 1,
      supplierId: 2,
      orderDate: '2026-10-23',
      notes: null,
      items: [{ description: 'Cimento', quantity: '2.5', unit: 'sc', unitPriceCents: 123456 }],
    })
    expect(r.totalCents).toBe(308640)
  })

  it('campos gerais obrigatórios', () => {
    const r = validateOrder({ siteId: '', supplierId: '', orderDate: '', notes: '', items: [] })
    expect(Object.keys(r.errors)).toEqual(expect.arrayContaining(['siteId', 'supplierId', 'orderDate', 'items']))
  })
})

it('traduz caminho de erro do backend para o campo da tela', () => {
  const items = [blankItem(), blankItem()]
  expect(serverPathToKey('items.1.unitPriceCents', items)).toBe(fieldKey(items[1].key, 'unitPrice'))
  expect(serverPathToKey('siteId', items)).toBe('siteId')
})

it('corrigir e reenviar: preenche o formulário a partir do pedido rejeitado', () => {
  const form = formFromOrder({
    site: { id: 1 },
    supplier: { id: 5 },
    notes: null,
    items: [{ description: 'Andaime', quantity: '1750.5', unit: 'm²', unitPriceCents: 184000 }],
  } as unknown as OrderDetail)
  expect(form).toMatchObject({ siteId: '1', supplierId: '5', notes: '' })
  expect(form.items[0]).toMatchObject({ description: 'Andaime', quantity: '1750,5', unit: 'm²', unitPrice: '1.840,00' })
  // e o formulário resultante já é válido, com o mesmo total
  expect(validateOrder(form).payload?.items[0]).toMatchObject({ quantity: '1750.5', unitPriceCents: 184000 })
})
