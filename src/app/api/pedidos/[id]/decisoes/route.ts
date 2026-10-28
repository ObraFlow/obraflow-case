import { lerCorpo, lerId, ok, tratarErros } from "@/app/api/_http";
import type { Decisao } from "@/domain/alcada/tipos";
import { decisaoApiSchema } from "@/lib/schemas/decisao";
import { registrarDecisao } from "@/server/services/decisoes";

type Contexto = { params: Promise<{ id: string }> };

/**
 * POST /api/pedidos/{id}/decisoes
 * Corpo: { usuarioId, tipo: "APROVAR" } ou { usuarioId, tipo: "REJEITAR", motivo }.
 * Não é a vez do usuário, ou o step já foi decidido → 409. Cadeia concluída → 409.
 */
export function POST(request: Request, contexto: Contexto) {
  return tratarErros(async () => {
    const { id } = await contexto.params;
    const corpo = await lerCorpo(request, decisaoApiSchema);
    const decisao: Decisao =
      corpo.tipo === "APROVAR" ? { tipo: "APROVAR" } : { tipo: "REJEITAR", motivo: corpo.motivo };
    return ok(await registrarDecisao(lerId(id), decisao, corpo.usuarioId));
  });
}
