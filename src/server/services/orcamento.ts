// Orçamento de uma obra contra o que já foi comprado. Só leitura: o orçamento vem do seed
// (não há tela de cadastro) e a conta é do domínio (resumoOrcamento).

import { NaoEncontrado } from "@/domain/erros";
import { resumoOrcamento } from "@/domain/orcamento/resumoOrcamento";
import type { OrcamentoObraDto } from "@/lib/dto";
import { prisma } from "@/server/prisma";

/**
 * Orçamento da obra contra aprovado + pendente. Devolve null quando a obra não tem
 * orçamento definido (0): a tela não desenha percentual nem barra nesse caso.
 */
export async function resumoOrcamentoDaObra(obraId: number): Promise<OrcamentoObraDto | null> {
  const [obra, porStatus] = await Promise.all([
    prisma.obra.findUnique({ where: { id: obraId }, select: { orcamentoCents: true } }),
    prisma.pedido.groupBy({
      by: ["status"],
      where: { obraId, status: { in: ["APROVADO", "PENDENTE"] } },
      _sum: { totalCents: true },
    }),
  ]);
  if (!obra) throw new NaoEncontrado("Obra", "f");
  if (obra.orcamentoCents === 0) return null;

  const soma = (status: "APROVADO" | "PENDENTE") =>
    porStatus.find((grupo) => grupo.status === status)?._sum.totalCents ?? 0;

  return resumoOrcamento({
    orcamentoCents: obra.orcamentoCents,
    aprovadoCents: soma("APROVADO"),
    pendenteCents: soma("PENDENTE"),
  });
}
