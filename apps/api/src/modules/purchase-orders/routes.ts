import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createPurchaseOrderSchema, decisionSchema, orderStatusSchema } from "@dokimos/shared";
import { authenticated, currentActor } from "../../auth/guards.js";
import { parseBody, uuidParam, type IdParams } from "../../lib/validation.js";
import { notifyCommittedOrder } from "./notify-committed.js";
import { createOrder, decideOrder, getOrder, listOrders } from "./service.js";

const positiveInteger = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .pipe(z.number().int().max(2147483647));

const filtersSchema = z
  .object({
    page: positiveInteger.default(1),
    pageSize: positiveInteger.pipe(z.number().max(100)).default(20),
    status: orderStatusSchema.optional(),
    projectId: z.uuid().optional(),
    actionableByMe: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
  })
  .strict();

export async function purchaseOrderRoutes(app: FastifyInstance): Promise<void> {
  // GET /purchase-orders: paginated list limited to the caller's projects.
  app.get("/purchase-orders", authenticated, async (request) => {
    return listOrders(currentActor(request), parseBody(filtersSchema, request.query));
  });

  // POST /purchase-orders: creates an order and snapshots its approval steps.
  app.post("/purchase-orders", authenticated, async (request, reply) => {
    const order = await createOrder(currentActor(request), parseBody(createPurchaseOrderSchema, request.body));
    await notifyCommittedOrder(app, order);
    return reply.code(201).send(order);
  });

  app.get<IdParams>("/purchase-orders/:id", authenticated, async (request) => {
    return getOrder(uuidParam(request.params.id), currentActor(request));
  });

  // POST /purchase-orders/:id/decisions: the current approver approves or rejects.
  app.post<IdParams>("/purchase-orders/:id/decisions", authenticated, async (request) => {
    const order = await decideOrder(
      currentActor(request),
      uuidParam(request.params.id),
      parseBody(decisionSchema, request.body),
    );
    await notifyCommittedOrder(app, order);
    return order;
  });
}
