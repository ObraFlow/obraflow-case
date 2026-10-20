import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabaseClient } from "@/lib/database-client";
import { createOrder, decideOrder, getOrder, listOrders } from "@/modules/orders/service";
import { createOrderSchema, orderQuerySchema } from "@/modules/orders/schemas";

if (process.env.TEST_DATABASE_GUARDED !== "true" || process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL) {
  throw new Error("Execute integrações por npm run test:integration para proteger o banco.");
}
const database = createDatabaseClient(process.env.TEST_DATABASE_URL!);
const ids = { project: randomUUID(), empty: randomUUID(), supplier: randomUUID(), requester: randomUUID(), first: randomUUID(), second: randomUUID() };
const payload = (price = "10000.00", projectId = ids.project) => createOrderSchema.parse({ projectId, supplierId: ids.supplier, orderDate: "2026-10-20", items: [{ description: "Cimento", quantity: "1", unit: "un", unitPrice: price }] });
const create = (price?: string) => createOrder(database, ids.requester, randomUUID(), payload(price));

beforeAll(async () => {
  await database.user.createMany({ data: [ids.requester, ids.first, ids.second].map((id, index) => ({ id, name: `Workflow ${index}` })) });
  await database.supplier.create({ data: { id: ids.supplier, name: "Fornecedor workflow" } });
  await database.project.createMany({ data: [{ id: ids.project, name: "Workflow", rulesVersion: 1 }, { id: ids.empty, name: "Sem configuração" }] });
  await database.approvalBand.create({ data: { projectId: ids.project, position: 1, upperLimit: "10000.00", approvers: { create: [{ userId: ids.first, position: 1 }] } } });
  await database.approvalBand.create({ data: { projectId: ids.project, position: 2, upperLimit: null, approvers: { create: [{ userId: ids.first, position: 1 }, { userId: ids.second, position: 2 }] } } });
});

afterAll(async () => {
  const orders = await database.purchaseOrder.findMany({ where: { projectId: { in: [ids.project, ids.empty] } }, select: { id: true } });
  const orderIds = orders.map((entry) => entry.id);
  await database.decision.deleteMany({ where: { step: { orderId: { in: orderIds } } } });
  await database.orderIdempotency.deleteMany({ where: { requesterId: ids.requester } });
  await database.orderStep.deleteMany({ where: { orderId: { in: orderIds } } });
  await database.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await database.purchaseOrder.deleteMany({ where: { id: { in: orderIds } } });
  await database.approvalBand.deleteMany({ where: { projectId: ids.project } });
  await database.project.deleteMany({ where: { id: { in: [ids.project, ids.empty] } } });
  await database.supplier.delete({ where: { id: ids.supplier } });
  await database.user.deleteMany({ where: { id: { in: [ids.requester, ids.first, ids.second] } } });
  await database.$disconnect();
});

describe("pedidos transacionais", () => {
  it("seleciona teto inclusivo e próxima faixa acima do limite", async () => {
    const low = await create();
    const high = await create("10000.01");
    expect((await getOrder(database, low.orderId, ids.first)).data.approval.stepCount).toBe(1);
    expect((await getOrder(database, high.orderId, ids.first)).data.approval.stepCount).toBe(2);
  });
  it("persiste soma dos itens arredondados e admite total zero", async () => {
    const input = payload("1.00");
    input.items = [{ ...input.items[0], quantity: "0.005" }, { ...input.items[0], quantity: "0.005" }];
    const rounded = await createOrder(database, ids.requester, randomUUID(), input);
    expect((await getOrder(database, rounded.orderId, ids.requester)).data.total).toBe("0.02");
    const zero = await create("0.00");
    expect((await getOrder(database, zero.orderId, ids.requester)).data.total).toBe("0.00");
  });
  it("faz rollback completo sem regra e permite reutilizar a chave após corrigir a referência", async () => {
    const key = randomUUID();
    const before = await database.purchaseOrder.count();
    await expect(createOrder(database, ids.requester, key, payload("1.00", ids.empty))).rejects.toMatchObject({ code: "NO_APPLICABLE_RULE" });
    expect(await database.purchaseOrder.count()).toBe(before);
    expect(await database.orderIdempotency.count({ where: { requesterId: ids.requester, key } })).toBe(0);
    expect((await createOrder(database, ids.requester, key, payload())).replayed).toBe(false);
  });
  it("resolve duas criações simultâneas com a mesma chave e recusa conteúdo diferente", async () => {
    const key = randomUUID();
    const results = await Promise.all([createOrder(database, ids.requester, key, payload()), createOrder(database, ids.requester, key, payload())]);
    expect(results[0].orderId).toBe(results[1].orderId);
    expect(results.map((entry) => entry.replayed).sort()).toEqual([false, true]);
    expect(results[0].body).toEqual(results[1].body);
    await expect(createOrder(database, ids.requester, key, payload("2.00"))).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });
  });
  it("reconhece o mesmo conteúdo com decimais e textos normalizados", async () => {
    const key = randomUUID();
    const first = await createOrder(database, ids.requester, key, payload("1.00"));
    const equivalent = payload("1.00");
    equivalent.items[0] = { ...equivalent.items[0], description: " Cimento ", quantity: "0001.0", unitPrice: "0001", unit: " un " };
    equivalent.notes = "  ";
    const replay = await createOrder(database, ids.requester, key, equivalent);
    expect(replay.replayed).toBe(true);
    expect(replay.body).toEqual(first.body);
  });
  it("reverte claim e itens quando fornecedor é inexistente", async () => {
    const key = randomUUID();
    await expect(createOrder(database, ids.requester, key, { ...payload(), supplierId: randomUUID() })).rejects.toMatchObject({ code: "SUPPLIER_NOT_FOUND" });
    expect(await database.orderIdempotency.count({ where: { requesterId: ids.requester, key } })).toBe(0);
  });
  it("mantém snapshot e replay original após remover regras e decidir pedido", async () => {
    const key = randomUUID();
    const original = await createOrder(database, ids.requester, key, payload("10000.01"));
    const oldBands = await database.approvalBand.findMany({ where: { projectId: ids.project }, include: { approvers: true } });
    try {
      await database.approvalBand.deleteMany({ where: { projectId: ids.project } });
      await database.project.update({ where: { id: ids.project }, data: { rulesVersion: { increment: 1 } } });
      const decision = await decideOrder(database, original.orderId, ids.first, { expectedVersion: 1, outcome: "APPROVE" });
      expect(decision.data.ruleSnapshot.version).toBe(1);
      expect(decision.data.approval.stepCount).toBe(2);
      expect((await createOrder(database, ids.requester, key, payload("10000.01"))).body).toEqual(original.body);
    } finally {
      for (const band of oldBands) await database.approvalBand.create({ data: { id: band.id, projectId: ids.project, position: band.position, upperLimit: band.upperLimit, approvers: { create: band.approvers.map((entry) => ({ userId: entry.userId, position: entry.position })) } } });
      await database.project.update({ where: { id: ids.project }, data: { rulesVersion: 1 } });
    }
  });
  it("impede decisão fora de ordem e completa apenas após a última aprovação", async () => {
    const order = await create("10000.01");
    await expect(decideOrder(database, order.orderId, ids.second, { expectedVersion: 1, outcome: "APPROVE" })).rejects.toMatchObject({ code: "NOT_CURRENT_APPROVER" });
    const first = await decideOrder(database, order.orderId, ids.first, { expectedVersion: 1, outcome: "APPROVE" });
    expect(first.data).toMatchObject({ status: "PENDING", version: 2, approval: { currentStepPosition: 2 } });
    const second = await decideOrder(database, order.orderId, ids.second, { expectedVersion: 2, outcome: "APPROVE" });
    expect(second.data).toMatchObject({ status: "APPROVED", version: 3, approval: { currentStepPosition: null, completedCount: 2 } });
    await expect(decideOrder(database, order.orderId, ids.second, { expectedVersion: 2, outcome: "APPROVE" })).rejects.toMatchObject({ code: "ORDER_VERSION_CONFLICT" });
    await expect(decideOrder(database, order.orderId, ids.second, { expectedVersion: 3, outcome: "APPROVE" })).rejects.toMatchObject({ code: "ORDER_CLOSED" });
  });
  it("rejeita, preserva motivo e marca etapas posteriores como puladas", async () => {
    const order = await create("10000.01");
    const result = await decideOrder(database, order.orderId, ids.first, { expectedVersion: 1, outcome: "REJECT", reason: " Excesso de material " });
    expect(result.data.status).toBe("REJECTED");
    expect(result.data.history[0].reason).toBe("Excesso de material");
    expect(result.data.approval.steps.map((entry) => entry.status)).toEqual(["REJECTED", "SKIPPED"]);
    expect(result.data.history).toHaveLength(1);
  });
  it("motivo vazio não altera pedido nem cria decisão", async () => {
    const order = await create();
    await expect(decideOrder(database, order.orderId, ids.first, { expectedVersion: 1, outcome: "REJECT", reason: " " })).rejects.toThrow();
    expect((await getOrder(database, order.orderId, ids.first)).data).toMatchObject({ version: 1, history: [] });
  });
  it("aprovação concorrente com rejeição grava uma única decisão", async () => {
    const order = await create("10000.01");
    const results = await Promise.allSettled([
      decideOrder(database, order.orderId, ids.first, { expectedVersion: 1, outcome: "APPROVE" }),
      decideOrder(database, order.orderId, ids.first, { expectedVersion: 1, outcome: "REJECT", reason: "Excesso" }),
    ]);
    expect(results.filter((entry) => entry.status === "fulfilled")).toHaveLength(1);
    const loser = results.find((entry) => entry.status === "rejected") as PromiseRejectedResult;
    expect(loser.reason).toMatchObject({ code: "ORDER_VERSION_CONFLICT" });
    expect((await getOrder(database, order.orderId, ids.first)).data.history).toHaveLength(1);
  });
  it("filtra por obra, situação, prefixo e minha etapa combinados e pagina sem perder contagem", async () => {
    const order = await create("10000.01");
    const query = orderQuerySchema.parse({ projectId: ids.project, status: "PENDING", mine: "true", search: order.orderId.slice(0, 12), pageSize: "1" });
    const result = await listOrders(database, ids.first, query);
    expect(result.data.map((entry) => entry.id)).toEqual([order.orderId]);
    expect(result.pagination).toMatchObject({ total: 1, totalPages: 1 });
    expect((await listOrders(database, ids.second, query)).data).toHaveLength(0);
    expect((await listOrders(database, ids.first, { ...query, page: 2 })).data).toHaveLength(0);
    await expect(listOrders(database, ids.first, { ...query, projectId: randomUUID() })).rejects.toMatchObject({ code: "PROJECT_NOT_FOUND" });
  });
});
