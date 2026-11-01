// Contratos de entrada da tela de regras de alçada.

import { z } from "zod";
import { MAX_CENTS } from "@/domain/pedido/calcularTotais";
import { centavosDeTexto } from "@/lib/money";
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

/**
 * O que o FORMULÁRIO da faixa segura: valores em reais como texto ("10.000,00") e o
 * aprovador como string (valor do <select>). Valida com mensagens por campo; a conversão
 * para `SalvarFaixaInput` (centavos, números) é feita por `paraSalvarFaixaInput` no submit.
 * A action continua recebendo `salvarFaixaSchema`, o mesmo contrato da API.
 */
export const faixaFormSchema = z
  .object({
    id: z.number().int().positive().optional(),
    obraId: z.number().int().positive(),
    minimo: z.string().trim(),
    maximo: z.string().trim(),
    semTeto: z.boolean(),
    aprovadores: z
      .array(z.object({ usuarioId: z.string() }))
      .min(1, "Adicione pelo menos um aprovador à faixa."),
  })
  .superRefine((form, ctx) => {
    const minCents = centavosDeTexto(form.minimo);
    if (form.minimo === "") {
      ctx.addIssue({ code: "custom", path: ["minimo"], message: "Informe o valor mínimo." });
    } else if (minCents === null || minCents < 0) {
      ctx.addIssue({ code: "custom", path: ["minimo"], message: "Valor mínimo inválido." });
    } else if (minCents > MAX_CENTS) {
      ctx.addIssue({
        code: "custom",
        path: ["minimo"],
        message: "Valor acima do limite suportado (R$ 21.474.836,47).",
      });
    }

    if (!form.semTeto) {
      const maxCents = centavosDeTexto(form.maximo);
      if (form.maximo === "") {
        ctx.addIssue({
          code: "custom",
          path: ["maximo"],
          message: "Informe o valor máximo ou marque “Sem teto”.",
        });
      } else if (maxCents === null || maxCents < 0) {
        ctx.addIssue({ code: "custom", path: ["maximo"], message: "Valor máximo inválido." });
      } else if (maxCents > MAX_CENTS) {
        ctx.addIssue({
          code: "custom",
          path: ["maximo"],
          message: "Valor acima do limite suportado (R$ 21.474.836,47).",
        });
      } else if (minCents !== null && maxCents < minCents) {
        ctx.addIssue({
          code: "custom",
          path: ["maximo"],
          message: "O valor máximo deve ser maior ou igual ao mínimo.",
        });
      }
    }

    const vistos = new Set<string>();
    form.aprovadores.forEach((aprovador, indice) => {
      if (!/^[1-9]\d*$/.test(aprovador.usuarioId)) {
        ctx.addIssue({
          code: "custom",
          path: ["aprovadores", indice, "usuarioId"],
          message: "Selecione o aprovador.",
        });
        return;
      }
      if (vistos.has(aprovador.usuarioId)) {
        ctx.addIssue({
          code: "custom",
          path: ["aprovadores", indice, "usuarioId"],
          message: "Este aprovador já está na faixa.",
        });
      }
      vistos.add(aprovador.usuarioId);
    });
  });

export type FaixaFormInput = z.infer<typeof faixaFormSchema>;

/** Converte o formulário validado para o contrato da action/API (centavos, ids numéricos). */
export function paraSalvarFaixaInput(form: FaixaFormInput): SalvarFaixaInput {
  return {
    id: form.id,
    obraId: form.obraId,
    minCents: centavosDeTexto(form.minimo) ?? 0,
    maxCents: form.semTeto ? null : (centavosDeTexto(form.maximo) ?? 0),
    aprovadores: form.aprovadores.map((aprovador) => ({ usuarioId: Number(aprovador.usuarioId) })),
  };
}

/** GET /api/regras/aplicavel?obraId=1&valorCents=123456 (preview na tela de novo pedido). */
export const faixaAplicavelQuerySchema = z.object({
  obraId: idSchema,
  valorCents: z.coerce
    .number({ error: "Informe o valor em centavos." })
    .int("Valor deve estar em centavos inteiros.")
    .nonnegative("Valor não pode ser negativo."),
});

export type FaixaAplicavelQuery = z.infer<typeof faixaAplicavelQuerySchema>;
