// Contrato de entrada para criar um pedido. O mesmo schema valida o form (react-hook-form),
// a server action (next-safe-action) e o POST /api/pedidos.

import { z } from "zod";
import { centavosSchema, dataSchema, idSchema, quantidadeSchema } from "./comum";

export const itemPedidoSchema = z.object({
  descricao: z
    .string({ error: "Informe a descrição." })
    .trim()
    .min(1, "Informe a descrição do item.")
    .max(200, "Descrição deve ter no máximo 200 caracteres."),
  quantidade: quantidadeSchema,
  unidade: z
    .string({ error: "Informe a unidade." })
    .trim()
    .min(1, "Informe a unidade (un, kg, m³...).")
    .max(20, "Unidade deve ter no máximo 20 caracteres."),
  precoUnitarioCents: centavosSchema,
});

export const criarPedidoSchema = z.object({
  obraId: idSchema,
  fornecedorId: idSchema,
  /** Data no formato ISO "AAAA-MM-DD" (valor nativo do <input type="date">). */
  dataPedido: dataSchema,
  observacoes: z
    .string()
    .trim()
    .max(1000, "Observações devem ter no máximo 1000 caracteres.")
    .optional(),
  itens: z.array(itemPedidoSchema).min(1, "Adicione pelo menos um item ao pedido."),
});

export type ItemPedidoInput = z.infer<typeof itemPedidoSchema>;
export type CriarPedidoInput = z.infer<typeof criarPedidoSchema>;

/** Filtros da lista de pedidos (GET /api/pedidos e tela de aprovações). */
export const filtroPedidosSchema = z.object({
  status: z.enum(["PENDENTE", "APROVADO", "REJEITADO"]).optional(),
  obraId: idSchema.optional(),
  /** Só pedidos em que este usuário é o aprovador do step atual. */
  pendentesPara: idSchema.optional(),
});

export type FiltroPedidos = z.infer<typeof filtroPedidosSchema>;
