import { ok, tratarErros } from "@/app/api/_http";
import { obterAcompanhamento } from "@/server/services/acompanhamento";

/**
 * GET /api/acompanhamento
 * Onde os pedidos estão e com quem: totais por obra e situação, fila por aprovador
 * (quanto está parado com cada pessoa e desde quando) e tempo médio até decidir.
 * O mesmo DTO que a tela /acompanhamento desenha.
 */
export function GET() {
  return tratarErros(async () => ok(await obterAcompanhamento()));
}
