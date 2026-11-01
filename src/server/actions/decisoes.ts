"use server";

import { revalidatePath } from "next/cache";
import { aprovarEmLoteSchema, decisaoSchema } from "@/lib/schemas/decisao";
import { actionComUsuario } from "@/server/actions/client";
import { aprovarEmLote, registrarDecisao } from "@/server/services/decisoes";

/**
 * Aprova ou rejeita o pedido como o usuário do cookie. Devolve o pedido atualizado.
 * O input validado já tem a forma de `Decisao` (`tipo` e, na rejeição, `motivo`).
 */
export const registrarDecisaoAction = actionComUsuario
  .inputSchema(decisaoSchema)
  .action(async ({ parsedInput, ctx }) => {
    const pedido = await registrarDecisao(parsedInput.pedidoId, parsedInput, ctx.usuarioId);
    revalidatePath("/aprovacoes");
    revalidatePath(`/aprovacoes/${pedido.id}`);
    return pedido;
  });

/**
 * Aprova vários pedidos marcados na lista. Nunca falha por causa de um pedido: cada um
 * passa ou entra em `falhas` com a mensagem do domínio. Só erro de infraestrutura e
 * cookie ausente passam por `handleServerError`.
 */
export const aprovarEmLoteAction = actionComUsuario
  .inputSchema(aprovarEmLoteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const resultado = await aprovarEmLote(parsedInput.pedidoIds, ctx.usuarioId);
    revalidatePath("/aprovacoes");
    for (const pedidoId of resultado.aprovados) revalidatePath(`/aprovacoes/${pedidoId}`);
    return resultado;
  });
