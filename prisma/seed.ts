import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma";
import { Pool } from "pg";
import { buildChain, nextState, type Step } from "../src/server/domain/approval-chain";
import { resolveRule } from "../src/shared/approval";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

type SeedOrder = {
  name: string;
  siteId: number;
  supplierId: number;
  totalCents: number;
  decisions: Array<{ userId: number; decision: "APPROVED" | "REJECTED"; reason?: string }>;
};

async function main() {
  await prisma.$transaction(async (tx) => {
    await tx.orderApproval.deleteMany();
    await tx.orderItem.deleteMany();
    await tx.purchaseOrder.deleteMany();
    await tx.approvalRuleApprover.deleteMany();
    await tx.approvalRule.deleteMany();
    await tx.supplier.deleteMany();
    await tx.site.deleteMany();
    await tx.user.deleteMany();

    const users = await Promise.all([
      tx.user.create({ data: { name: "Ana Souza", email: "ana@obraflow.local" } }),
      tx.user.create({ data: { name: "Bruno Lima", email: "bruno@obraflow.local" } }),
      tx.user.create({ data: { name: "Carla Mendes", email: "carla@obraflow.local" } }),
    ]);
    const [mainSite, secondSite] = await Promise.all([
      tx.site.create({ data: { name: "Residencial Horizonte" } }),
      tx.site.create({ data: { name: "Comercial Pátio Central" } }),
    ]);
    const suppliers = await Promise.all([
      tx.supplier.create({ data: { name: "Construmais Materiais", taxId: "00.000.000/0001-01" } }),
      tx.supplier.create({ data: { name: "Elétrica Norte", taxId: "00.000.000/0001-02" } }),
      tx.supplier.create({ data: { name: "Acabamentos Sul", taxId: "00.000.000/0001-03" } }),
    ]);

    const ruleDefinitions = [
      { siteId: mainSite.id, upTo: 100_000, approvers: [users[0].id] },
      { siteId: mainSite.id, upTo: 500_000, approvers: [users[0].id, users[1].id] },
      { siteId: mainSite.id, upTo: null, approvers: [users[0].id, users[1].id, users[2].id] },
      { siteId: secondSite.id, upTo: 250_000, approvers: [users[1].id] },
      { siteId: secondSite.id, upTo: null, approvers: [users[1].id, users[2].id] },
    ];
    for (const definition of ruleDefinitions) {
      await tx.approvalRule.create({
        data: {
          siteId: definition.siteId,
          upTo: definition.upTo,
          approvers: { create: definition.approvers.map((userId, index) => ({ userId, position: index + 1 })) },
        },
      });
    }

    const orders: SeedOrder[] = [
      {
        name: "Pedido pendente na 1ª etapa",
        siteId: mainSite.id,
        supplierId: suppliers[0].id,
        totalCents: 50_000,
        decisions: [],
      },
      {
        name: "Pedido pendente na 2ª etapa",
        siteId: mainSite.id,
        supplierId: suppliers[1].id,
        totalCents: 200_000,
        decisions: [{ userId: users[0].id, decision: "APPROVED" }],
      },
      {
        name: "Pedido aprovado até o fim",
        siteId: mainSite.id,
        supplierId: suppliers[2].id,
        totalCents: 600_000,
        decisions: [
          { userId: users[0].id, decision: "APPROVED" },
          { userId: users[1].id, decision: "APPROVED" },
          { userId: users[2].id, decision: "APPROVED" },
        ],
      },
      {
        name: "Pedido rejeitado na 1ª etapa",
        siteId: secondSite.id,
        supplierId: suppliers[0].id,
        totalCents: 150_000,
        decisions: [{ userId: users[1].id, decision: "REJECTED", reason: "Orçamento acima do previsto." }],
      },
      {
        name: "Pedido rejeitado na 2ª etapa",
        siteId: secondSite.id,
        supplierId: suppliers[1].id,
        totalCents: 300_000,
        decisions: [
          { userId: users[1].id, decision: "APPROVED" },
          { userId: users[2].id, decision: "REJECTED", reason: "Necessita revisão técnica." },
        ],
      },
    ];

    for (const definition of orders) {
      const rules = await tx.approvalRule.findMany({
        where: { siteId: definition.siteId },
        include: { approvers: { orderBy: { position: "asc" } } },
      });
      const rule = resolveRule(rules, definition.totalCents);
      if (!rule) throw new Error(`Nenhuma regra encontrada para ${definition.name}.`);
      const chain = buildChain(rule.approvers.map((approver) => approver.userId));
      let steps: Step[] = chain;
      for (const item of definition.decisions) {
        const transition = nextState(steps, item.userId, item.decision);
        steps = steps.map((step) => {
          if (step.stepOrder === transition.current.stepOrder) return { ...step, status: item.decision };
          if (transition.skip.includes(step.stepOrder)) return { ...step, status: "SKIPPED" };
          if (transition.activate === step.stepOrder) return { ...step, status: "PENDING" };
          return step;
        });
      }

      await tx.purchaseOrder.create({
        data: {
          siteId: definition.siteId,
          supplierId: definition.supplierId,
          ruleId: rule.id,
          orderDate: new Date("2026-01-15T00:00:00Z"),
          notes: definition.name,
          totalCents: definition.totalCents,
          status: definition.decisions.length
            ? steps.some((step) => step.status === "REJECTED")
              ? "REJECTED"
              : steps.every((step) => step.status === "APPROVED")
                ? "APPROVED"
                : "PENDING"
            : "PENDING",
          currentStep: steps.find((step) => step.status === "PENDING")?.stepOrder ?? null,
          items: {
            create: {
              position: 1,
              description: definition.name,
              quantity: 1,
              unit: "un",
              unitPriceCents: definition.totalCents,
              totalCents: definition.totalCents,
            },
          },
          steps: { create: steps },
        },
      });
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
