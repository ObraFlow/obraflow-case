import { lerQuery, ok, tratarErros } from "@/app/api/_http";
import { faixaAplicavelQuerySchema } from "@/lib/schemas/regra";
import { obterFaixaAplicavel } from "@/server/services/regras";

/**
 * GET /api/regras/aplicavel?obraId=1&valorCents=1250000
 * Preview da tela de novo pedido: em qual faixa (e cadeia) este valor cairia.
 * `faixa: null` quando nenhuma cobre o valor; quem bloqueia com 422 é a criação do pedido.
 */
export function GET(request: Request) {
  return tratarErros(async () => {
    const { obraId, valorCents } = lerQuery(request, faixaAplicavelQuerySchema);
    return ok(await obterFaixaAplicavel(obraId, valorCents));
  });
}
