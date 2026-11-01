import { z } from "zod";
import { lerQuery, ok, tratarErros } from "@/app/api/_http";
import { idSchema } from "@/lib/schemas/comum";
import { obterAcompanhamento } from "@/server/services/acompanhamento";

const querySchema = z.object({ obraId: idSchema.optional() });

/**
 * GET /api/acompanhamento?obraId=1
 * Orçamento por obra (sempre todas), fila por aprovador, tempo até decidir, compras
 * aprovadas por mês, fornecedores com mais compras e últimas movimentações. Com `obraId`,
 * tudo menos o bloco por obra é recortado para ela. O mesmo DTO que a tela desenha.
 */
export function GET(request: Request) {
  return tratarErros(async () => {
    const { obraId } = lerQuery(request, querySchema);
    return ok(await obterAcompanhamento({ obraId }));
  });
}
