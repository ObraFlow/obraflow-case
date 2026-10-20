import type { PrismaClient } from "@/generated/prisma/client";
import { foundationIds } from "@/modules/registry/seed-foundation";
import { ApiError } from "@/lib/http";
import { calculateOrder } from "./calculation";
import { createOrderSchema } from "./schemas";

export const demoOrderIds = [1, 2, 3, 4].map(
  (value) => `1000000${value}-0000-4000-8000-${String(value).padStart(12, "0")}`,
);

/** Fixtures atômicas; nunca modifica um cenário já existente. */
export async function seedDemoOrders(database: PrismaClient) {
  const scenarios = [
    {
      key: "10000001-0000-4000-8000-000000000001",
      projectId: foundationIds.projects.centro,
      notes: "Reposição de materiais para a concretagem da próxima semana.",
      state: "PENDING",
      items: [
        {
          description: "Cimento CP II — saco 50 kg",
          quantity: "80.000",
          unit: "un",
          unitPrice: "38.90",
        },
        { description: "Areia média lavada", quantity: "12.500", unit: "m³", unitPrice: "145.00" },
      ],
    },
    {
      key: "10000002-0000-4000-8000-000000000002",
      projectId: foundationIds.projects.centro,
      notes: "Armação da laje. Primeira etapa já aprovada por Amanda; aguarda João.",
      state: "SECOND_STEP",
      items: [
        { description: "Vergalhão CA-50", quantity: "500.000", unit: "kg", unitPrice: "22.50" },
        { description: "Frete e descarga", quantity: "1.000", unit: "un", unitPrice: "1250.00" },
      ],
    },
    {
      key: "10000003-0000-4000-8000-000000000003",
      projectId: foundationIds.projects.norte,
      notes: "Equipamentos de proteção para a equipe de campo.",
      state: "APPROVED",
      items: [
        { description: "Kit EPI completo", quantity: "10.000", unit: "un", unitPrice: "230.00" },
      ],
    },
    {
      key: "10000004-0000-4000-8000-000000000004",
      projectId: foundationIds.projects.centro,
      notes: "Solicitação reavaliada após conferência do estoque.",
      state: "REJECTED",
      items: [
        {
          description: "Porcelanato acetinado",
          quantity: "350.000",
          unit: "m²",
          unitPrice: "70.00",
        },
      ],
    },
  ];
  await database.$transaction(
    async (transaction) => {
      await transaction.$queryRaw`SELECT pg_advisory_xact_lock(1868723052)::text`;
      for (const scenario of scenarios) {
        if (await transaction.purchaseOrder.findUnique({ where: { id: scenario.key } })) continue;
        // Compatibilidade com a primeira execução local do seed, antes das fixtures atômicas.
        const previous = await transaction.orderIdempotency.findUnique({
          where: {
            requesterId_key: {
              requesterId: foundationIds.users.lucas,
              key: `10000000${scenario.key.slice(8)}`,
            },
          },
        });
        if (previous?.orderId) continue;
        const input = createOrderSchema.parse({
          projectId: scenario.projectId,
          supplierId: foundationIds.suppliers.alfa,
          orderDate: "2026-10-20",
          notes: scenario.notes,
          items: scenario.items,
        });
        const calculated = calculateOrder(input.items);
        await transaction.$queryRaw`SELECT "id" FROM "Project" WHERE "id" = ${scenario.projectId}::uuid FOR UPDATE`;
        const project = await transaction.project.findUniqueOrThrow({
          where: { id: scenario.projectId },
          include: {
            bands: {
              orderBy: { position: "asc" },
              include: { approvers: { orderBy: { position: "asc" }, include: { user: true } } },
            },
          },
        });
        const band = project.bands.find(
          (value) => value.upperLimit === null || value.upperLimit.gte(calculated.total),
        );
        if (!band?.approvers.length)
          throw new ApiError(
            409,
            "NO_APPLICABLE_RULE",
            "Configuração atual não atende um cenário de demonstração ausente; regras existentes foram preservadas.",
          );
        const rejected = scenario.state === "REJECTED";
        const approved = scenario.state === "APPROVED";
        const decidedCount = approved
          ? band.approvers.length
          : rejected || (scenario.state === "SECOND_STEP" && band.approvers.length > 1)
            ? 1
            : 0;
        const completed = approved || rejected;
        await transaction.purchaseOrder.create({
          data: {
            id: scenario.key,
            projectId: input.projectId,
            supplierId: input.supplierId,
            requesterId: foundationIds.users.lucas,
            orderDate: new Date("2026-10-20T00:00:00.000Z"),
            notes: input.notes,
            total: calculated.total,
            status: rejected ? "REJECTED" : approved ? "APPROVED" : "PENDING",
            version: decidedCount + 1,
            currentStepPosition: completed ? null : decidedCount + 1,
            rulesVersion: project.rulesVersion,
            selectedUpperLimit: band.upperLimit,
            items: { create: calculated.items },
            steps: {
              create: band.approvers.map((approver, index) => ({
                userId: approver.userId,
                approverNameSnapshot: approver.user.name,
                position: index + 1,
                ...(index < decidedCount
                  ? {
                      decision: {
                        create: {
                          actorId: approver.userId,
                          outcome: rejected ? ("REJECT" as const) : ("APPROVE" as const),
                          reason: rejected
                            ? "Estoque disponível atende à etapa atual. Revisar a quantidade antes de uma nova solicitação."
                            : null,
                        },
                      },
                    }
                  : {}),
              })),
            },
          },
        });
      }
    },
    { timeout: 15000 },
  );
}
