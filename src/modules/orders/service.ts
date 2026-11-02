import { createHash } from "node:crypto";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { ApiError } from "@/lib/http";
import { calculateOrder } from "./calculation";
import {
  createOrderSchema,
  decisionSchema,
  type CreateOrderInput,
  type DecisionInput,
  type OrderQuery,
} from "./schemas";

const include = {
  project: true,
  supplier: true,
  requester: true,
  items: { orderBy: { position: "asc" as const } },
  steps: { orderBy: { position: "asc" as const }, include: { decision: true } },
} satisfies Prisma.PurchaseOrderInclude;

type OrderRecord = Prisma.PurchaseOrderGetPayload<{ include: typeof include }>;

function summary(order: OrderRecord, actorId: string) {
  const steps = order.steps.map((step) => ({
    id: step.id,
    position: step.position,
    approver: { id: step.userId, name: step.approverNameSnapshot },
    status: step.decision
      ? step.decision.outcome === "APPROVE"
        ? "APPROVED"
        : "REJECTED"
      : order.status === "REJECTED"
        ? "SKIPPED"
        : order.currentStepPosition === step.position
          ? "CURRENT"
          : "UPCOMING",
  }));
  const canDecide =
    order.status === "PENDING" &&
    order.steps.some(
      (step) => step.position === order.currentStepPosition && step.userId === actorId,
    );
  const named = (record: { id: string; name: string }) => ({ id: record.id, name: record.name });
  return {
    id: order.id,
    project: named(order.project),
    supplier: named(order.supplier),
    requester: named(order.requester),
    orderDate: order.orderDate.toISOString().slice(0, 10),
    createdAt: order.createdAt.toISOString(),
    itemCount: order.items.length,
    total: order.total.toFixed(2),
    status: order.status,
    version: order.version,
    approval: {
      completedCount: order.steps.filter((step) => step.decision).length,
      stepCount: steps.length,
      currentStepPosition: order.currentStepPosition,
      steps,
    },
    permissions: {
      canDecide,
      blockedReason: canDecide
        ? null
        : order.status === "PENDING"
          ? "NOT_CURRENT_APPROVER"
          : "ORDER_CLOSED",
    },
  };
}

function detail(order: OrderRecord, actorId: string) {
  return {
    ...summary(order, actorId),
    notes: order.notes,
    ruleSnapshot: {
      version: order.rulesVersion,
      upperLimit: order.selectedUpperLimit?.toFixed(2) ?? null,
    },
    items: order.items.map((item) => ({
      position: item.position,
      description: item.description,
      quantity: item.quantity.toFixed(3),
      unit: item.unit,
      unitPrice: item.unitPrice.toFixed(2),
      lineTotal: item.lineTotal.toFixed(2),
    })),
    history: order.steps.flatMap((step) =>
      step.decision
        ? [
            {
              id: step.decision.id,
              stepId: step.id,
              stepPosition: step.position,
              actor: { id: step.decision.actorId, name: step.approverNameSnapshot },
              outcome: step.decision.outcome,
              reason: step.decision.reason,
              decidedAt: step.decision.decidedAt.toISOString(),
            },
          ]
        : [],
    ),
  };
}

async function findOrder(tx: Prisma.TransactionClient, id: string) {
  const order = await tx.purchaseOrder.findUnique({ where: { id }, include });
  if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Pedido não encontrado.");
  return order;
}

export async function getOrder(database: PrismaClient, id: string, actorId: string) {
  return database.$transaction(
    async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      return { data: detail(await findOrder(tx, id), actorId) };
    },
    { isolationLevel: "RepeatableRead" },
  );
}

export async function createOrder(
  database: PrismaClient,
  actorId: string,
  key: string,
  input: CreateOrderInput,
) {
  const normalized = createOrderSchema.parse(input);
  const requestHash = createHash("sha256")
    .update(JSON.stringify({ contractVersion: "v1", ...normalized }))
    .digest("hex");
  return database.$transaction(
    async (tx) => {
      const claimed =
        await tx.$executeRaw`INSERT INTO "OrderIdempotency" ("requesterId", "key", "requestHash", "contractVersion", "createdAt") VALUES (${actorId}::uuid, ${key}::uuid, ${requestHash}, 'v1', NOW()) ON CONFLICT ("requesterId", "key") DO NOTHING`;
      if (claimed === 0) {
        const previous = await tx.orderIdempotency.findUniqueOrThrow({
          where: { requesterId_key: { requesterId: actorId, key } },
        });
        if (previous.requestHash !== requestHash)
          throw new ApiError(
            409,
            "IDEMPOTENCY_KEY_REUSED",
            "Esta chave já foi utilizada para outro conteúdo.",
          );
        if (!previous.orderId || !previous.originalResponse)
          throw new Error("Incomplete idempotency record");
        return { body: previous.originalResponse, orderId: previous.orderId, replayed: true };
      }
      const projects = await tx.$queryRaw<
        { id: string }[]
      >`SELECT "id" FROM "Project" WHERE "id" = ${normalized.projectId}::uuid FOR UPDATE`;
      if (projects.length === 0)
        throw new ApiError(404, "PROJECT_NOT_FOUND", "Obra não encontrada.");
      const project = await tx.project.findUniqueOrThrow({
        where: { id: normalized.projectId },
        include: {
          bands: {
            orderBy: { position: "asc" },
            include: { approvers: { orderBy: { position: "asc" }, include: { user: true } } },
          },
        },
      });
      if (
        !(await tx.supplier.findUnique({
          where: { id: normalized.supplierId },
          select: { id: true },
        }))
      )
        throw new ApiError(404, "SUPPLIER_NOT_FOUND", "Fornecedor não encontrado.");
      const calculated = calculateOrder(normalized.items);
      const band = project.bands.find(
        (entry) => entry.upperLimit === null || entry.upperLimit.gte(calculated.total),
      );
      if (!band || !band.approvers.length)
        throw new ApiError(
          409,
          "NO_APPLICABLE_RULE",
          "A obra não possui uma regra de aprovação para este valor.",
        );
      const order = await tx.purchaseOrder.create({
        data: {
          projectId: normalized.projectId,
          supplierId: normalized.supplierId,
          requesterId: actorId,
          orderDate: new Date(`${normalized.orderDate}T00:00:00.000Z`),
          notes: normalized.notes,
          total: calculated.total,
          status: "PENDING",
          currentStepPosition: 1,
          rulesVersion: project.rulesVersion,
          selectedUpperLimit: band.upperLimit,
          items: { create: calculated.items },
          steps: {
            create: band.approvers.map((approver, index) => ({
              userId: approver.userId,
              approverNameSnapshot: approver.user.name,
              position: index + 1,
            })),
          },
        },
        include,
      });
      const body = { data: detail(order, actorId) };
      await tx.orderIdempotency.update({
        where: { requesterId_key: { requesterId: actorId, key } },
        data: { orderId: order.id, originalResponse: body },
      });
      return { body, orderId: order.id, replayed: false };
    },
    { isolationLevel: "ReadCommitted", timeout: 10000 },
  );
}

export async function decideOrder(
  database: PrismaClient,
  id: string,
  actorId: string,
  input: DecisionInput,
) {
  const command = decisionSchema.parse(input);
  return database.$transaction(
    async (tx) => {
      const order = await findOrder(tx, id);
      if (order.version !== command.expectedVersion)
        throw new ApiError(
          409,
          "ORDER_VERSION_CONFLICT",
          "O pedido foi atualizado. Recarregue os detalhes antes de decidir.",
        );
      if (order.status !== "PENDING")
        throw new ApiError(409, "ORDER_CLOSED", "Este pedido já foi encerrado.");
      const step = order.steps.find((entry) => entry.position === order.currentStepPosition);
      if (!step || step.userId !== actorId)
        throw new ApiError(
          403,
          "NOT_CURRENT_APPROVER",
          "A decisão pertence ao aprovador da etapa atual.",
        );
      const finished = command.outcome === "REJECT" || step.position === order.steps.length;
      const updated = await tx.purchaseOrder.updateMany({
        where: { id, version: command.expectedVersion, status: "PENDING" },
        data: {
          version: { increment: 1 },
          status: command.outcome === "REJECT" ? "REJECTED" : finished ? "APPROVED" : "PENDING",
          currentStepPosition: finished ? null : step.position + 1,
        },
      });
      if (updated.count !== 1)
        throw new ApiError(
          409,
          "ORDER_VERSION_CONFLICT",
          "O pedido foi atualizado. Recarregue os detalhes antes de decidir.",
        );
      await tx.decision.create({
        data: {
          stepId: step.id,
          actorId,
          outcome: command.outcome,
          reason: command.outcome === "REJECT" ? command.reason : null,
        },
      });
      return { data: detail(await findOrder(tx, id), actorId) };
    },
    { isolationLevel: "ReadCommitted" },
  );
}

export async function listOrders(database: PrismaClient, actorId: string, query: OrderQuery) {
  return database.$transaction(
    async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      if (
        query.projectId &&
        !(await tx.project.findUnique({ where: { id: query.projectId }, select: { id: true } }))
      )
        throw new ApiError(404, "PROJECT_NOT_FOUND", "Obra não encontrada.");
      const conditions: Prisma.Sql[] = [];
      if (query.status) conditions.push(Prisma.sql`o."status" = ${query.status}::"OrderStatus"`);
      if (query.projectId) conditions.push(Prisma.sql`o."projectId" = ${query.projectId}::uuid`);
      if (query.search)
        conditions.push(Prisma.sql`CAST(o."id" AS TEXT) ILIKE ${`${query.search}%`}`);
      if (query.mine)
        conditions.push(
          Prisma.sql`o."status" = 'PENDING' AND EXISTS (SELECT 1 FROM "OrderStep" s WHERE s."orderId" = o."id" AND s."position" = o."currentStepPosition" AND s."userId" = ${actorId}::uuid)`,
        );
      const where = conditions.length
        ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
        : Prisma.empty;
      const ids = await tx.$queryRaw<{ id: string }[]>(
        Prisma.sql`SELECT o."id" FROM "PurchaseOrder" o ${where} ORDER BY o."createdAt" DESC, o."id" DESC LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}`,
      );
      const counts = await tx.$queryRaw<{ total: bigint }[]>(
        Prisma.sql`SELECT COUNT(*) AS total FROM "PurchaseOrder" o ${where}`,
      );
      const total = Number(counts[0].total);
      const orders = await tx.purchaseOrder.findMany({
        where: { id: { in: ids.map((entry) => entry.id) } },
        include,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      return {
        data: orders.map((order) => summary(order, actorId)),
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          total,
          totalPages: Math.ceil(total / query.pageSize),
        },
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
