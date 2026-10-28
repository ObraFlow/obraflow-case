import { lerCorpo, lerId, ok, tratarErros } from "@/app/api/_http";
import { salvarFaixaSchema } from "@/lib/schemas/regra";
import { obterRegra, removerFaixa, salvarFaixa } from "@/server/services/regras";

type Contexto = { params: Promise<{ id: string }> };

/** GET /api/regras/{id} */
export function GET(_request: Request, contexto: Contexto) {
  return tratarErros(async () => {
    const { id } = await contexto.params;
    return ok(await obterRegra(lerId(id)));
  });
}

/** PUT /api/regras/{id} — edita limites e aprovadores da faixa. */
export function PUT(request: Request, contexto: Contexto) {
  return tratarErros(async () => {
    const { id } = await contexto.params;
    const input = await lerCorpo(request, salvarFaixaSchema);
    return ok(await salvarFaixa({ ...input, id: lerId(id) }));
  });
}

/** DELETE /api/regras/{id} */
export function DELETE(_request: Request, contexto: Contexto) {
  return tratarErros(async () => {
    const { id } = await contexto.params;
    await removerFaixa(lerId(id));
    return new Response(null, { status: 204 });
  });
}
