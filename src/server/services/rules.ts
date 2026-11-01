import { prisma } from "@/lib/prisma";
import { DomainError } from "@/server/domain/errors";
import type { RulesInput } from "@/lib/schemas";

export async function listRules(siteId: number) {
  const rules = await prisma.approvalRule.findMany({
    where: { siteId },
    orderBy: { upTo: { sort: "asc", nulls: "last" } },
    include: { approvers: { orderBy: { position: "asc" } } },
  });
  return rules.map((r) => ({ upTo: r.upTo, approvers: r.approvers.map((a) => a.userId) }));
}

/**
 * Substitui todas as faixas da obra de uma vez (transação).
 * Pedidos já criados não são afetados: a cadeia deles é um snapshot em OrderApproval.
 */
export async function replaceRules(siteId: number, input: RulesInput) {
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site) throw new DomainError(404, "Obra não encontrada.");

  const ids = [...new Set(input.flatMap((r) => r.approvers))];
  const found = await prisma.user.count({ where: { id: { in: ids } } });
  if (found !== ids.length) throw new DomainError(422, "Há aprovadores que não existem no sistema.");

  await prisma.$transaction(async (tx) => {
    await tx.approvalRule.deleteMany({ where: { siteId } });
    for (const r of input) {
      await tx.approvalRule.create({
        data: {
          siteId,
          upTo: r.upTo,
          approvers: { create: r.approvers.map((userId, i) => ({ userId, position: i + 1 })) },
        },
      });
    }
  });
  return listRules(siteId);
}
