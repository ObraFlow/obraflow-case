import { z } from 'zod';

export const approvalRuleSchema = z
  .object({
    minimum: z.coerce.number().min(0, 'O valor mínimo não pode ser negativo.'),
    maximum: z.coerce.number().min(0).optional(),
    approverIds: z
      .array(z.coerce.number().positive())
      .min(1, 'Selecione ao menos um aprovador.'),
  })
  .refine(
    (data) => data.maximum === undefined || data.maximum >= data.minimum,
    {
      message: 'O valor máximo não pode ser menor que o mínimo.',
      path: ['maximum'],
    },
  );
