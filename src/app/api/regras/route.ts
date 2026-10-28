import { z } from "zod";
import { lerCorpo, lerQuery, ok, tratarErros } from "@/app/api/_http";
import { idSchema } from "@/lib/schemas/comum";
import { salvarFaixaSchema } from "@/lib/schemas/regra";
import { listarRegras, salvarFaixa } from "@/server/services/regras";

/** GET /api/regras?obraId=1 */
export function GET(request: Request) {
  return tratarErros(async () => {
    const { obraId } = lerQuery(request, z.object({ obraId: idSchema }));
    return ok(await listarRegras(obraId));
  });
}

/** POST /api/regras — cria uma faixa. Sobreposição → 409 FAIXA_SOBREPOSTA. */
export function POST(request: Request) {
  return tratarErros(async () => {
    const input = await lerCorpo(request, salvarFaixaSchema);
    return ok(await salvarFaixa({ ...input, id: undefined }), 201);
  });
}
