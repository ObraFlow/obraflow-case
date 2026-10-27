import Decimal from 'decimal.js'
import { z } from 'zod'
import { MAX_MONEY, normalizeDecimal, orderTotal } from '@/lib/money'
import type { CreateOrderInput } from '@/types/api'

export const MAX_REASON = 500

/** Rejection reason: required (blank does not count) and validated before submit. */
export const rejectSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Informe o motivo da rejeição.')
    .max(MAX_REASON, `Use no máximo ${MAX_REASON} caracteres.`),
})

export type RejectForm = z.infer<typeof rejectSchema>

// ---------------------------------------------------------------------------
// Purchase order form. Rules mirror the API DTOs, with messages for people.
// ---------------------------------------------------------------------------

interface DecimalRules {
  required: string
  negative: string
  /** Message when zero is not allowed; omit to accept zero. */
  zero?: string
  maxDecimals: number
  maxIntegerDigits: number
}

/** A decimal typed as text ("12,5"). Reports only the first problem found. */
function decimalField(rules: DecimalRules) {
  return z.string().superRefine((raw, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message })
    const text = raw.trim()
    if (text === '') return fail(rules.required)
    if (text.startsWith('-')) return fail(rules.negative)

    const value = normalizeDecimal(text)
    if (value === null) return fail('Use apenas números, com vírgula para decimais (ex.: 12,5).')

    const [integer, decimals = ''] = value.split('.')
    if (decimals.length > rules.maxDecimals) {
      return fail(`Use no máximo ${rules.maxDecimals} casas decimais.`)
    }
    if (integer.replace(/^0+(?=\d)/, '').length > rules.maxIntegerDigits) {
      return fail('Valor muito alto.')
    }
    if (rules.zero && new Decimal(value).isZero()) return fail(rules.zero)
  })
}

export const orderItemSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, 'Descreva o material ou serviço.')
    .max(200, 'Use no máximo 200 caracteres.'),
  quantity: decimalField({
    required: 'Informe a quantidade.',
    negative: 'A quantidade deve ser maior que zero.',
    zero: 'A quantidade deve ser maior que zero.',
    maxDecimals: 3,
    maxIntegerDigits: 11,
  }),
  unit: z.string().trim().min(1, 'Informe a unidade.').max(10, 'Use no máximo 10 caracteres.'),
  unitPrice: decimalField({
    required: 'Informe o preço unitário.',
    negative: 'O preço não pode ser negativo.',
    maxDecimals: 2,
    maxIntegerDigits: 12,
  }),
})

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}

export const orderFormSchema = z
  .object({
    siteId: z.string().min(1, 'Selecione a obra.'),
    supplierId: z.string().min(1, 'Selecione o fornecedor.'),
    orderDate: z
      .string()
      .min(1, 'Informe a data do pedido.')
      .refine(isValidDate, 'Informe uma data válida.'),
    notes: z.string().trim().max(1000, 'Use no máximo 1000 caracteres.'),
    items: z
      .array(orderItemSchema)
      .min(1, 'Adicione pelo menos um item ao pedido.')
      .max(100, 'Um pedido pode ter no máximo 100 itens.'),
  })
  .superRefine((form, ctx) => {
    if (orderTotal(form.items).greaterThan(MAX_MONEY)) {
      ctx.addIssue({
        code: 'custom',
        path: ['items'],
        message: 'O total do pedido excede o valor máximo permitido.',
      })
    }
  })

/** What the inputs hold (raw text). */
export type OrderFormInput = z.input<typeof orderFormSchema>
/** After validation (trimmed). */
export type OrderFormOutput = z.output<typeof orderFormSchema>

export const emptyItem: OrderFormInput['items'][number] = {
  description: '',
  quantity: '',
  unit: '',
  unitPrice: '',
}

/** Converts validated form values to the API payload ("12,5" -> "12.5"). */
export function toCreateOrderInput(values: OrderFormOutput): CreateOrderInput {
  return {
    siteId: values.siteId,
    supplierId: values.supplierId,
    orderDate: values.orderDate,
    notes: values.notes || undefined,
    items: values.items.map((item) => ({
      description: item.description,
      quantity: normalizeDecimal(item.quantity)!,
      unit: item.unit,
      unitPrice: normalizeDecimal(item.unitPrice)!,
    })),
  }
}
