import { centsToInput, formatQuantity, lineTotal, parseMoney, parseQuantity, todayISO } from '../lib/format'
import type { NewOrderPayload, OrderDetail } from '../api/types'

// Validação do formulário de pedido, separada da tela para dar para testar.
// O backend valida tudo de novo; aqui é para o usuário ver o erro na hora.

export interface ItemRow {
  key: string
  description: string
  quantity: string
  unit: string
  unitPrice: string
}

export interface OrderForm {
  siteId: string
  supplierId: string
  orderDate: string
  notes: string
  items: ItemRow[]
}

let seq = 0
export const blankItem = (): ItemRow => ({ key: `i${++seq}`, description: '', quantity: '', unit: 'un', unitPrice: '' })

// "Corrigir e reenviar": parte do pedido rejeitado, com data de hoje
export function formFromOrder(order: OrderDetail): OrderForm {
  return {
    siteId: String(order.site.id),
    supplierId: String(order.supplier.id),
    orderDate: todayISO(),
    notes: order.notes ?? '',
    items: order.items.map((it) => ({
      ...blankItem(),
      description: it.description,
      quantity: formatQuantity(it.quantity).replace(/\./g, ''),
      unit: it.unit,
      unitPrice: centsToInput(it.unitPriceCents),
    })),
  }
}

export const fieldKey = (itemKey: string, field: keyof ItemRow) => `${itemKey}.${field}`

export function validateOrder(form: OrderForm) {
  const errors: Record<string, string> = {}
  if (!form.siteId) errors.siteId = 'Selecione a obra.'
  if (!form.supplierId) errors.supplierId = 'Selecione o fornecedor.'
  if (!form.orderDate) errors.orderDate = 'Informe a data do pedido.'
  else if (Number.isNaN(Date.parse(form.orderDate))) errors.orderDate = 'Data inválida.'
  if (form.items.length === 0) errors.items = 'O pedido precisa de pelo menos um item.'

  const lines = form.items.map((it) => {
    const quantity = parseQuantity(it.quantity)
    const price = parseMoney(it.unitPrice)

    if (!it.description.trim()) errors[fieldKey(it.key, 'description')] = 'Descreva o material ou serviço.'
    if (!it.quantity.trim()) errors[fieldKey(it.key, 'quantity')] = 'Informe a quantidade.'
    else if (quantity === null) errors[fieldKey(it.key, 'quantity')] = 'Use um número maior que zero, com até 3 casas (ex.: 2,5).'
    if (!it.unit) errors[fieldKey(it.key, 'unit')] = 'Escolha a unidade.'
    if (!it.unitPrice.trim()) errors[fieldKey(it.key, 'unitPrice')] = 'Informe o preço unitário.'
    else if (price === null) errors[fieldKey(it.key, 'unitPrice')] = 'Valor inválido. Use o formato 1.234,56.'

    const totalCents = quantity !== null && price !== null ? lineTotal(quantity, price) : null
    return { quantity, price, totalCents }
  })

  const totalCents = lines.reduce((sum, l) => sum + (l.totalCents ?? 0), 0)
  const valid = Object.keys(errors).length === 0

  const payload: NewOrderPayload | null = valid
    ? {
        siteId: Number(form.siteId),
        supplierId: Number(form.supplierId),
        orderDate: form.orderDate,
        notes: form.notes.trim() || null,
        items: form.items.map((it, i) => ({
          description: it.description.trim(),
          quantity: lines[i].quantity!,
          unit: it.unit,
          unitPriceCents: lines[i].price!,
        })),
      }
    : null

  return { errors, lines, totalCents, valid, payload }
}

// "items.2.quantity" (erro do backend) -> chave do campo na tela
export function serverPathToKey(path: string, items: ItemRow[]): string {
  const m = /^items\.(\d+)\.(\w+)$/.exec(path)
  if (!m) return path
  const item = items[Number(m[1])]
  const field = m[2] === 'unitPriceCents' ? 'unitPrice' : m[2]
  return item ? fieldKey(item.key, field as keyof ItemRow) : 'items'
}
