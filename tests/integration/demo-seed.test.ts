import { afterAll, beforeAll, expect, it } from "vitest";
import { createDatabaseClient } from "@/lib/database-client";
import { foundationIds, seedFoundation } from "@/modules/registry/seed-foundation";
import { demoOrderIds, seedDemoOrders } from "@/modules/orders/seed-demo";
import { decideOrder } from "@/modules/orders/service";

if (
  process.env.TEST_DATABASE_GUARDED !== "true" ||
  process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL
)
  throw new Error("Use o runner protegido de integração.");
const database = createDatabaseClient(process.env.TEST_DATABASE_URL!);

async function removeFixtures() {
  await database.decision.deleteMany({ where: { step: { orderId: { in: demoOrderIds } } } });
  await database.orderStep.deleteMany({ where: { orderId: { in: demoOrderIds } } });
  await database.orderItem.deleteMany({ where: { orderId: { in: demoOrderIds } } });
  await database.purchaseOrder.deleteMany({ where: { id: { in: demoOrderIds } } });
}
beforeAll(async () => {
  await seedFoundation(database);
  await removeFixtures();
});
afterAll(async () => {
  await removeFixtures();
  await database.$disconnect();
});

it("reverte cenários inteiros se falhar depois de preparar pedidos anteriores e permite retomar", async () => {
  const bands = await database.approvalBand.findMany({
    where: { projectId: foundationIds.projects.norte },
    include: { approvers: true },
  });
  await database.approvalBand.deleteMany({ where: { projectId: foundationIds.projects.norte } });
  try {
    await expect(seedDemoOrders(database)).rejects.toMatchObject({ code: "NO_APPLICABLE_RULE" });
    expect(await database.purchaseOrder.count({ where: { id: { in: demoOrderIds } } })).toBe(0);
  } finally {
    for (const band of bands)
      await database.approvalBand.create({
        data: {
          id: band.id,
          projectId: band.projectId,
          position: band.position,
          upperLimit: band.upperLimit,
          approvers: {
            create: band.approvers.map((value) => ({
              userId: value.userId,
              position: value.position,
            })),
          },
        },
      });
  }
  await seedDemoOrders(database);
  const scenarios = await database.purchaseOrder.findMany({
    where: { id: { in: demoOrderIds } },
    orderBy: { id: "asc" },
  });
  expect(scenarios.map((value) => value.status)).toEqual([
    "PENDING",
    "PENDING",
    "APPROVED",
    "REJECTED",
  ]);
  expect(scenarios[1].currentStepPosition).toBe(2);
});

it("não duplica nem desfaz decisões do avaliador", async () => {
  await decideOrder(database, demoOrderIds[0], foundationIds.users.amanda, {
    expectedVersion: 1,
    outcome: "APPROVE",
  });
  await seedDemoOrders(database);
  await seedDemoOrders(database);
  expect(await database.purchaseOrder.count({ where: { id: { in: demoOrderIds } } })).toBe(4);
  expect(
    (await database.purchaseOrder.findUniqueOrThrow({ where: { id: demoOrderIds[0] } })).status,
  ).toBe("APPROVED");
  expect(await database.decision.count({ where: { step: { orderId: demoOrderIds[0] } } })).toBe(1);
});
