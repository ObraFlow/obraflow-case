// Contrato de entrada para criar um pedido. O mesmo schema valida o form (react-hook-form),
// a server action (next-safe-action) e o POST /api/pedidos.

import { z } from "zod";
import { MAX_CENTS } from "@/domain/pedido/calcularTotais";
import { centavosDeTexto } from "@/lib/money";
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

/**
 * O que o FORMULÁRIO de pedido segura: ids como texto (valor do <select>), preço em reais
 * como texto ("34,90") e quantidade como texto. Valida com mensagens por campo; no submit
 * `paraCriarPedidoInput` converte para `CriarPedidoInput` (centavos), o contrato da action
 * e da API, que valida de novo no server.
 */
const REGEX_QUANTIDADE = /^\d{1,9}([.,]\d{1,3})?$/;

export const itemPedidoFormSchema = z.object({
  descricao: z
    .string()
    .trim()
    .min(1, "Informe a descrição do item.")
    .max(200, "Descrição deve ter no máximo 200 caracteres."),
  quantidade: z
    .string()
    .trim()
    .min(1, "Informe a quantidade.")
    .refine((texto) => !texto.startsWith("-"), "Quantidade deve ser maior que zero.")
    .regex(REGEX_QUANTIDADE, "Quantidade inválida. Ex.: 2,5.")
    .refine((texto) => Number(texto.replace(",", ".")) > 0, "Quantidade deve ser maior que zero."),
  unidade: z
    .string()
    .trim()
    .min(1, "Informe a unidade (un, kg, m³...).")
    .max(20, "Unidade deve ter no máximo 20 caracteres."),
  precoUnitario: z
    .string()
    .trim()
    .min(1, "Informe o preço unitário.")
    .refine((texto) => centavosDeTexto(texto) !== null, "Preço unitário inválido. Ex.: 34,90.")
    .refine((texto) => (centavosDeTexto(texto) ?? -1) >= 0, "Preço unitário não pode ser negativo.")
    .refine(
      (texto) => (centavosDeTexto(texto) ?? 0) <= MAX_CENTS,
      "Preço acima do limite suportado (R$ 21.474.836,47).",
    ),
});

export const pedidoFormSchema = z.object({
  obraId: z.string().regex(/^[1-9]\d*$/, "Selecione a obra."),
  fornecedorId: z.string().regex(/^[1-9]\d*$/, "Selecione o fornecedor."),
  dataPedido: z.string().min(1, "Informe a data do pedido."),
  observacoes: z.string().trim().max(1000, "Observações devem ter no máximo 1000 caracteres."),
  itens: z.array(itemPedidoFormSchema).min(1, "Adicione pelo menos um item ao pedido."),
});

export type ItemPedidoFormInput = z.infer<typeof itemPedidoFormSchema>;
export type PedidoFormInput = z.infer<typeof pedidoFormSchema>;

/** Converte o formulário validado para o contrato da action/API. */
export function paraCriarPedidoInput(form: PedidoFormInput): CriarPedidoInput {
  return {
    obraId: Number(form.obraId),
    fornecedorId: Number(form.fornecedorId),
    dataPedido: form.dataPedido,
    observacoes: form.observacoes.trim() === "" ? undefined : form.observacoes.trim(),
    itens: form.itens.map((item) => ({
      descricao: item.descricao.trim(),
      quantidade: item.quantidade.trim(),
      unidade: item.unidade.trim(),
      precoUnitarioCents: centavosDeTexto(item.precoUnitario) ?? 0,
    })),
  };
}
