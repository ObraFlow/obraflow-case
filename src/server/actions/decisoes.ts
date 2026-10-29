"use server";

import { revalidatePath } from "next/cache";
import { decisaoSchema } from "@/lib/schemas/decisao";
import { actionComUsuario } from "@/server/actions/client";
import { registrarDecisao } from "@/server/services/decisoes";

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
