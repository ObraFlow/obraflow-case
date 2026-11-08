import { z } from 'zod'

export const idParam = z.object({ id: z.coerce.number().int().positive() })

export const MAX_CENTS = 100_000_000_000_000 // R$ 1 trilhão; bem abaixo de 2^53

export const cents = z
  .number({ required_error: 'Informe o valor.', invalid_type_error: 'Informe um valor em centavos.' })
  .int('O valor deve estar em centavos (inteiro).')
  .nonnegative('O valor não pode ser negativo.')
  .max(MAX_CENTS, 'Valor acima do limite permitido.')

export const isoDate = z
  .string({ required_error: 'Informe a data.' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD.')
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`)
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v)
  }, 'Data inválida.')
