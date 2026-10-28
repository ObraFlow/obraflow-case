// Contratos de entrada da tela de regras de alçada.

import { z } from "zod";
import { centavosSchema, idSchema } from "./comum";

export const salvarFaixaSchema = z
  .object({
    /** Ausente = criar; presente = editar a faixa existente. */
    id: idSchema.optional(),
    obraId: idSchema,
    minCents: centavosSchema,
    /** null = sem teto ("acima de"). */
    maxCents: centavosSchema.nullable(),
    /** Aprovadores na ordem em que decidem (posição 0 decide primeiro). */
    aprovadores: z
      .array(z.object({ usuarioId: idSchema }))
      .min(1, "Adicione pelo menos um aprovador à faixa."),
  })
  .refine((faixa) => faixa.maxCents === null || faixa.maxCents >= faixa.minCents, {
    path: ["maxCents"],
    message: "O valor máximo deve ser maior ou igual ao mínimo.",
  })
  .refine(
    (faixa) => new Set(faixa.aprovadores.map((a) => a.usuarioId)).size === faixa.aprovadores.length,
    { path: ["aprovadores"], message: "O mesmo aprovador não pode aparecer duas vezes na faixa." },
  );

export type SalvarFaixaInput = z.infer<typeof salvarFaixaSchema>;

export const removerFaixaSchema = z.object({ id: idSchema });

/** GET /api/regras/aplicavel?obraId=1&valorCents=123456 (preview na tela de novo pedido). */
export const faixaAplicavelQuerySchema = z.object({
  obraId: idSchema,
  valorCents: z.coerce
    .number({ error: "Informe o valor em centavos." })
    .int("Valor deve estar em centavos inteiros.")
    .nonnegative("Valor não pode ser negativo."),
});

export type FaixaAplicavelQuery = z.infer<typeof faixaAplicavelQuerySchema>;
