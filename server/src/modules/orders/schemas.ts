import { z } from 'zod'
import { cents, isoDate } from '../../lib/schemas.js'
import { parseQuantity } from '../../lib/quantity.js'

export const UNITS = ['un', 'kg', 'm', 'm²', 'm³', 'h', 'L', 'sc', 'cx', 'vb'] as const

const item = z.object({
  description: z.string({ required_error: 'Informe a descrição.' }).trim().min(1, 'Informe a descrição.').max(300),
  quantity: z
    .string({
      required_error: 'Informe a quantidade.',
      invalid_type_error: 'Envie a quantidade como texto decimal, ex.: "2.5".',
    })
    .transform((v, ctx) => {
      const milli = parseQuantity(v.trim())
      if (!milli) {
        ctx.addIssue({ code: 'custom', message: 'A quantidade deve ser um número positivo com até 3 casas decimais.' })
        return z.NEVER
      }
      return milli
    }),
  unit: z.enum(UNITS, { errorMap: () => ({ message: `Unidade inválida. Use: ${UNITS.join(', ')}.` }) }),
  unitPriceCents: cents,
})

export const createOrderBody = z.object({
  siteId: z.number({ required_error: 'Selecione a obra.' }).int().positive(),
  supplierId: z.number({ required_error: 'Selecione o fornecedor.' }).int().positive(),
  orderDate: isoDate,
  notes: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
  // id do pedido rejeitado que este corrige
  resubmissionOfId: z.number().int().positive().nullish(),
  items: z
    .array(item, { required_error: 'Adicione ao menos um item.' })
    .min(1, 'Adicione ao menos um item.')
    .max(200, 'No máximo 200 itens por pedido.'),
})
export type CreateOrderInput = z.infer<typeof createOrderBody>

export const rejectBody = z.object({
  reason: z
    .string({ required_error: 'Informe o motivo da rejeição.' })
    .trim()
    .min(5, 'Descreva o motivo com pelo menos 5 caracteres.')
    .max(1000),
})

export const listQuery = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  siteId: z.coerce.number().int().positive().optional(),
  // "me": só pedidos em que quem está no header X-User-Id é o aprovador da vez
  awaiting: z.literal('me').optional(),
})
