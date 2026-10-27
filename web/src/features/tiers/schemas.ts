import Decimal from 'decimal.js'
import { z } from 'zod'
import { normalizeDecimal } from '@/lib/money'
import type { ApprovalTier } from '@/types/api'

/**
 * Tier form. `others` are the site's other tiers, so duplicates are caught
 * before the request (the API still enforces it with a unique index).
 */
export function makeTierSchema(others: Pick<ApprovalTier, 'maxAmount'>[]) {
  return z
    .object({
      noLimit: z.boolean(),
      maxAmount: z.string(),
      approvers: z
        .array(z.object({ userId: z.string() }))
        .min(1, 'Adicione pelo menos um aprovador.'),
    })
    .superRefine(({ noLimit, maxAmount }, ctx) => {
      const fail = (path: string, message: string) =>
        ctx.addIssue({ code: 'custom', path: [path], message })

      if (noLimit) {
        if (others.some((tier) => tier.maxAmount === null)) {
          fail('noLimit', 'Esta obra já tem uma faixa sem limite superior.')
        }
        return
      }
      const text = maxAmount.trim()
      if (text === '') return fail('maxAmount', 'Informe o limite da faixa.')
      if (text.startsWith('-')) return fail('maxAmount', 'O limite deve ser maior que zero.')
      const value = normalizeDecimal(text)
      if (value === null) {
        return fail('maxAmount', 'Use apenas números, com vírgula para centavos (ex.: 10000,00).')
      }
      const [integer, decimals = ''] = value.split('.')
      if (decimals.length > 2) return fail('maxAmount', 'Use no máximo 2 casas decimais.')
      if (integer.replace(/^0+(?=\d)/, '').length > 12)
        return fail('maxAmount', 'Valor muito alto.')
      if (new Decimal(value).isZero()) return fail('maxAmount', 'O limite deve ser maior que zero.')
      if (others.some((tier) => tier.maxAmount !== null && new Decimal(tier.maxAmount).eq(value))) {
        fail('maxAmount', 'Já existe uma faixa com este limite nesta obra.')
      }
    })
}

export type TierForm = z.infer<ReturnType<typeof makeTierSchema>>
