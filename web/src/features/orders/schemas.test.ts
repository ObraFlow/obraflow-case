import { describe, expect, it } from 'vitest'
import { orderFormSchema, rejectSchema, toCreateOrderInput, type OrderFormInput } from './schemas'

const validItem = { description: 'Areia média', quantity: '12,5', unit: 'm³', unitPrice: '145,00' }

const validForm: OrderFormInput = {
  siteId: 'site',
  supplierId: 'supplier',
  orderDate: '2026-10-26',
  notes: '',
  items: [validItem],
}

/** Validation messages keyed by field path, e.g. "items.0.quantity". */
function errorsOf(form: OrderFormInput) {
  const result = orderFormSchema.safeParse(form)
  if (result.success) return {}
  return Object.fromEntries(
    result.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
  )
}

describe('orderFormSchema', () => {
  it('accepts a valid order', () => {
    expect(errorsOf(validForm)).toEqual({})
  })

  it('requires site, supplier, date and item description', () => {
    expect(
      errorsOf({
        ...validForm,
        siteId: '',
        supplierId: '',
        orderDate: '',
        items: [{ ...validItem, description: '   ' }],
      }),
    ).toEqual({
      siteId: 'Selecione a obra.',
      supplierId: 'Selecione o fornecedor.',
      orderDate: 'Informe a data do pedido.',
      'items.0.description': 'Descreva o material ou serviço.',
    })
  })

  it('reports invalid quantity and price on the item they belong to', () => {
    const errors = errorsOf({
      ...validForm,
      items: [validItem, { ...validItem, quantity: '-2', unitPrice: 'abc' }],
    })
    expect(errors).toEqual({
      'items.1.quantity': 'A quantidade deve ser maior que zero.',
      'items.1.unitPrice': 'Use apenas números, com vírgula para decimais (ex.: 12,5).',
    })
  })

  it('refuses zero quantity but accepts a zero price', () => {
    expect(errorsOf({ ...validForm, items: [{ ...validItem, quantity: '0' }] })).toEqual({
      'items.0.quantity': 'A quantidade deve ser maior que zero.',
    })
    expect(errorsOf({ ...validForm, items: [{ ...validItem, unitPrice: '0' }] })).toEqual({})
  })

  it('limits decimal places like the database columns', () => {
    expect(
      errorsOf({ ...validForm, items: [{ ...validItem, quantity: '1,2345', unitPrice: '1,999' }] }),
    ).toEqual({
      'items.0.quantity': 'Use no máximo 3 casas decimais.',
      'items.0.unitPrice': 'Use no máximo 2 casas decimais.',
    })
  })

  it('requires at least one item', () => {
    expect(errorsOf({ ...validForm, items: [] })).toEqual({
      items: 'Adicione pelo menos um item ao pedido.',
    })
  })

  it('rejects impossible dates', () => {
    expect(errorsOf({ ...validForm, orderDate: '2026-02-30' })).toEqual({
      orderDate: 'Informe uma data válida.',
    })
  })
})

describe('toCreateOrderInput', () => {
  it('converts typed decimals to the API format', () => {
    const values = orderFormSchema.parse({ ...validForm, notes: '  ' })
    expect(toCreateOrderInput(values)).toEqual({
      siteId: 'site',
      supplierId: 'supplier',
      orderDate: '2026-10-26',
      notes: undefined,
      items: [{ description: 'Areia média', quantity: '12.5', unit: 'm³', unitPrice: '145.00' }],
    })
  })
})

describe('rejectSchema', () => {
  it('requires a reason that is not only spaces', () => {
    expect(rejectSchema.safeParse({ reason: '   ' }).success).toBe(false)
    expect(rejectSchema.safeParse({ reason: 'Preço acima do contrato' }).success).toBe(true)
  })
})
