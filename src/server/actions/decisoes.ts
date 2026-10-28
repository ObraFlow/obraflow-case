"use server";

import { revalidatePath } from "next/cache";
import type { Decisao } from "@/domain/alcada/tipos";
import { decisaoSchema } from "@/lib/schemas/decisao";
import { actionComUsuario } from "@/server/actions/client";
import { registrarDecisao } from "@/server/services/decisoes";

/** Aprova ou rejeita o pedido como o usuário do cookie. Devolve o pedido atualizado. */
export const registrarDecisaoAction = actionComUsuario
  .inputSchema(decisaoSchema)
  .action(async ({ parsedInput, ctx }) => {
    const decisao: Decisao =
      parsedInput.tipo === "APROVAR"
        ? { tipo: "APROVAR" }
        : { tipo: "REJEITAR", motivo: parsedInput.motivo };

    const pedido = await registrarDecisao(parsedInput.pedidoId, decisao, ctx.usuarioId);
    revalidatePath("/aprovacoes");
    revalidatePath(`/aprovacoes/${pedido.id}`);
    return pedido;
  });
