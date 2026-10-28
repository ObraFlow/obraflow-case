import { lerId, ok, tratarErros } from "@/app/api/_http";
import { obterPedido } from "@/server/services/pedidos";

type Contexto = { params: Promise<{ id: string }> };

/** GET /api/pedidos/{id} */
export function GET(_request: Request, contexto: Contexto) {
  return tratarErros(async () => {
    const { id } = await contexto.params;
    return ok(await obterPedido(lerId(id)));
  });
}
