import { z } from 'zod'

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
