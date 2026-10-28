import { lerCorpo, lerQuery, ok, tratarErros } from "@/app/api/_http";
import { idSchema } from "@/lib/schemas/comum";
import { criarPedidoSchema, filtroPedidosSchema } from "@/lib/schemas/pedido";
import { criarPedido, listarPedidos } from "@/server/services/pedidos";

/** GET /api/pedidos?status=PENDENTE&obraId=1&pendentesPara=2 */
export function GET(request: Request) {
  return tratarErros(async () => {
    const filtro = lerQuery(request, filtroPedidosSchema);
    return ok(await listarPedidos(filtro));
  });
}

/**
 * A API não tem o cookie "Agindo como": quem cria o pedido vem no corpo (`criadoPorId`).
 * Sem faixa para o valor → 422 SEM_FAIXA_APLICAVEL.
 */
const criarPedidoApiSchema = criarPedidoSchema.extend({ criadoPorId: idSchema });

/** POST /api/pedidos */
export function POST(request: Request) {
  return tratarErros(async () => {
    const { criadoPorId, ...input } = await lerCorpo(request, criarPedidoApiSchema);
    return ok(await criarPedido(input, criadoPorId), 201);
  });
}
