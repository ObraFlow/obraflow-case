// Contrato de entrada para aprovar ou rejeitar um pedido.
// Rejeição exige motivo (decisão de produto 4): o Zod barra antes do submit e o domínio barra de novo.

import { z } from "zod";
import { idSchema } from "./comum";

export const decisaoSchema = z.discriminatedUnion("tipo", [
  z.object({
    pedidoId: idSchema,
    tipo: z.literal("APROVAR"),
  }),
  z.object({
    pedidoId: idSchema,
    tipo: z.literal("REJEITAR"),
    motivo: z
      .string({ error: "Informe o motivo da rejeição." })
      .trim()
      .min(1, "Informe o motivo da rejeição.")
      .max(500, "Motivo deve ter no máximo 500 caracteres."),
  }),
]);

export type DecisaoInput = z.infer<typeof decisaoSchema>;

/**
 * Corpo do POST /api/pedidos/{id}/decisoes. A API não tem o cookie "Agindo como":
 * o chamador externo informa quem está decidindo. O id do pedido vem da URL.
 */
export const decisaoApiSchema = z.discriminatedUnion("tipo", [
  z.object({ usuarioId: idSchema, tipo: z.literal("APROVAR") }),
  z.object({
    usuarioId: idSchema,
    tipo: z.literal("REJEITAR"),
    motivo: z
      .string({ error: "Informe o motivo da rejeição." })
      .trim()
      .min(1, "Informe o motivo da rejeição.")
      .max(500, "Motivo deve ter no máximo 500 caracteres."),
  }),
]);

export type DecisaoApiInput = z.infer<typeof decisaoApiSchema>;
