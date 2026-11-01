"use server";

import { revalidatePath } from "next/cache";
import { criarPedidoSchema } from "@/lib/schemas/pedido";
import { actionComUsuario } from "@/server/actions/client";
import { criarPedido } from "@/server/services/pedidos";

/**
 * Cria o pedido em nome do usuário do cookie. Devolve o id, o total e quem decide primeiro,
 * para a tela montar o toast e navegar ao detalhe. Erros de domínio (SemFaixaAplicavel,
 * SegregacaoDeFuncoes, OrigemNaoRejeitada...) chegam ao form como `serverError` em pt-BR.
 */
export const criarPedidoAction = actionComUsuario
  .inputSchema(criarPedidoSchema)
  .action(async ({ parsedInput, ctx }) => {
    const pedido = await criarPedido(parsedInput, ctx.usuarioId);
    revalidatePath("/aprovacoes");
    if (pedido.refeitoDe) revalidatePath(`/aprovacoes/${pedido.refeitoDe.id}`);
    return {
      pedidoId: pedido.id,
      totalCents: pedido.totalCents,
      aprovadorAtualNome: pedido.aprovadorAtualNome,
      refeitoDeId: pedido.refeitoDe?.id ?? null,
    };
  });
