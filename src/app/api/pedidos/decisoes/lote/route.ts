import { lerCorpo, ok, tratarErros } from "@/app/api/_http";
import { aprovarEmLoteApiSchema } from "@/lib/schemas/decisao";
import { aprovarEmLote } from "@/server/services/decisoes";

/**
 * POST /api/pedidos/decisoes/lote
 * Corpo: { usuarioId, pedidoIds: [1, 7] }. Aprova um por um; responde 200 com
 * { aprovados, falhas } mesmo quando algum pedido não pôde ser aprovado (a falha de cada
 * um vem com código e mensagem). Rejeição não tem lote: o motivo é por pedido.
 */
export function POST(request: Request) {
  return tratarErros(async () => {
    const corpo = await lerCorpo(request, aprovarEmLoteApiSchema);
    return ok(await aprovarEmLote(corpo.pedidoIds, corpo.usuarioId));
  });
}
