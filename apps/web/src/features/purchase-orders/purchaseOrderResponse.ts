import { z } from "zod";
import {
  amountSchema,
  approvalStepStateSchema,
  decisionTypeSchema,
  MAX_PURCHASE_ORDER_ITEMS,
  orderStatusSchema,
  purchaseOrderItemSchema,
  type OrderList,
  type PurchaseOrderDetail,
} from "@dokimos/shared";

const index = z.number().int().nonnegative();
const approver = { stepIndex: index, approverId: z.uuid(), approverName: z.string() };
const decision = z.object({
  type: decisionTypeSchema,
  actorId: z.uuid(),
  decidedAt: z.iso.datetime({ offset: true }),
  reason: z.string().nullable(),
});

// Check the transport shape before a financial response enters page state.
// Decimal strings remain authoritative: this boundary never recalculates totals.
const orderResponse = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  project: z.object({ id: z.uuid(), name: z.string() }),
  supplier: z.object({ id: z.uuid(), name: z.string(), isActive: z.boolean() }),
  createdById: z.uuid(),
  creatorName: z.string(),
  orderDate: z.iso.date(),
  notes: z.string().nullable(),
  status: orderStatusSchema,
  total: amountSchema,
  coaVersion: z.number().int().positive(),
  createdAt: z.iso.datetime({ offset: true }),
  items: z
    .array(purchaseOrderItemSchema.extend({ itemIndex: index, lineTotal: amountSchema }))
    .min(1)
    .max(MAX_PURCHASE_ORDER_ITEMS),
  steps: z.array(z.object({ ...approver, decision: decision.nullable() })).min(1),
  currentApproval: z.object(approver).nullable(),
});

const orderListResponse: z.ZodType<OrderList> = z.object({
  data: z.array(
    orderResponse.omit({ createdById: true, creatorName: true, notes: true, items: true, steps: true }).extend({
      itemCount: index,
      stepCount: index,
      decidedStepCount: index,
      approvalSteps: z.array(z.object({ ...approver, state: approvalStepStateSchema })),
    }),
  ),
  pagination: z.object({ page: z.number().int().positive(), pageSize: z.number().int().positive(), total: index }),
  distribution: z.object({
    total: index,
    actionableByMe: index,
    byStatus: z.object({ PENDING: index, APPROVED: index, REJECTED: index }),
  }),
});

// Deliberately distinct from ApiError: a malformed 2xx response cannot prove that
// a write failed. Existing mutation recovery must keep its uncertain-outcome guard.
export class InvalidOrderResponse extends Error {
  constructor() {
    super("Não foi possível confirmar a resposta do pedido. Atualize a consulta antes de tentar novamente.");
    this.name = "InvalidOrderResponse";
  }
}

export function parseOrderResponse(value: unknown): PurchaseOrderDetail {
  const result = orderResponse.safeParse(value);
  if (!result.success || result.data.projectId !== result.data.project.id) throw new InvalidOrderResponse();
  return result.data;
}

// Creation recovery acknowledges a fresh list read. A 2xx with unusable data
// cannot release the persistent submission marker either.
export function parseOrderListResponse(value: unknown): OrderList {
  const result = orderListResponse.safeParse(value);
  if (!result.success) throw new InvalidOrderResponse();
  return result.data;
}
