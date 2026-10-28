"use server";

import { revalidatePath } from "next/cache";
import { criarPedidoSchema } from "@/lib/schemas/pedido";
import { actionComUsuario } from "@/server/actions/client";
import { criarPedido } from "@/server/services/pedidos";

/**
 * Cria o pedido em nome do usuário do cookie. Devolve o id para a tela decidir o que
 * fazer (toast + navegação para o detalhe). Erros de domínio (ex.: SemFaixaAplicavel)
 * chegam ao form como `serverError` com a mensagem em pt-BR.
 */
export const criarPedidoAction = actionComUsuario
  .inputSchema(criarPedidoSchema)
  .action(async ({ parsedInput, ctx }) => {
    const pedido = await criarPedido(parsedInput, ctx.usuarioId);
    revalidatePath("/aprovacoes");
    return { pedidoId: pedido.id, totalCents: pedido.totalCents };
  });
