import { prisma } from "@/lib/prisma";
import type { OrderInput } from "@/lib/schemas";
import { buildChain, nextState, resolveRule, type Decision } from "@/server/domain/approval-chain";
import { DomainError } from "@/server/domain/errors";
import { formatBRL, lineTotalCents } from "@/server/domain/money";

export function listOrders() {
  return prisma.purchaseOrder.findMany({
    orderBy: { id: "desc" },
    include: {
      site: { select: { name: true } },
      supplier: { select: { name: true } },
      items: { orderBy: { position: "asc" } },
      steps: { orderBy: { stepOrder: "asc" }, include: { approver: { select: { id: true, name: true } } } },
    },
  });
}

/** Cria o pedido, calcula o total no servidor e grava o snapshot da cadeia de aprovação. */
export async function createOrder(input: OrderInput, actorId: number | null) {
  const items = input.items.map((i, idx) => ({
    position: idx + 1,
    description: i.description,
    quantity: i.quantity,
    unit: i.unit,
    unitPriceCents: i.unitPriceCents,
    totalCents: lineTotalCents(i.quantity, i.unitPriceCents),
  }));
  const totalCents = items.reduce((s, i) => s + i.totalCents, 0);

  return prisma.$transaction(async (tx) => {
    if (!(await tx.site.findUnique({ where: { id: input.siteId } }))) throw new DomainError(404, "Obra não encontrada.");
    if (!(await tx.supplier.findUnique({ where: { id: input.supplierId } }))) throw new DomainError(404, "Fornecedor não encontrado.");

    const rules = await tx.approvalRule.findMany({
      where: { siteId: input.siteId },
      include: { approvers: { orderBy: { position: "asc" } } },
    });
    const rule = resolveRule(rules, totalCents);
    if (!rule) {
      throw new DomainError(422, `Nenhuma regra de alçada cobre ${formatBRL(totalCents)} nesta obra. Configure uma faixa em Regras de alçada.`);
    }
    const chain = buildChain(rule.approvers.map((a) => a.userId));
    if (chain.length === 0) throw new DomainError(422, "A faixa aplicável não tem aprovadores configurados.");

    return tx.purchaseOrder.create({
      data: {
        siteId: input.siteId,
        supplierId: input.supplierId,
        ruleId: rule.id,
        orderDate: new Date(`${input.orderDate}T00:00:00Z`),
        notes: input.notes ?? null,
        totalCents,
        status: "PENDING",
        currentStep: 1,
        items: { create: items },
        steps: { create: chain },
        events: { create: { type: "CREATED", actorId } },
      },
    });
  });
}

/** Registra uma aprovação ou rejeição respeitando a ordem da alçada. */
export async function decideOrder(orderId: number, userId: number, decision: Decision, reason?: string) {
  if (decision === "REJECTED" && !reason?.trim()) throw new DomainError(400, "Informe o motivo da rejeição.");

  return prisma.$transaction(async (tx) => {
    const order = await tx.purchaseOrder.findUnique({
      where: { id: orderId },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    });
    if (!order) throw new DomainError(404, "Pedido não encontrado.");
    if (order.status !== "PENDING") {
      throw new DomainError(409, order.status === "APPROVED" ? "A cadeia de aprovação deste pedido já foi concluída." : "Este pedido já foi rejeitado.");
    }

    const next = nextState(order.steps, userId, decision);

    // Guarda de concorrência: só atualiza se o passo ainda estiver PENDING.
    // Duas requisições simultâneas: a segunda enxerga count = 0 e recebe 409.
    const updated = await tx.orderApproval.updateMany({
      where: { id: next.current.id, status: "PENDING" },
      data: { status: decision, decidedAt: new Date(), reason: decision === "REJECTED" ? reason!.trim() : null },
    });
    if (updated.count === 0) throw new DomainError(409, "Este pedido já foi decidido por outra requisição. Atualize a página.");

    if (next.skip.length) {
      await tx.orderApproval.updateMany({ where: { orderId, stepOrder: { in: next.skip } }, data: { status: "SKIPPED" } });
    }
    if (next.activate) {
      await tx.orderApproval.updateMany({ where: { orderId, stepOrder: next.activate }, data: { status: "PENDING" } });
    }
    await tx.purchaseOrder.update({ where: { id: orderId }, data: { status: next.orderStatus, currentStep: next.currentStep } });
    await tx.orderEvent.create({
      data: { orderId, type: decision, actorId: userId, reason: decision === "REJECTED" ? reason!.trim() : null },
    });

    return { id: orderId, status: next.orderStatus };
  });
}
