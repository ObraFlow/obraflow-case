import { z } from "zod";
import { decimalString } from "./money.js";

export const MAX_PURCHASE_ORDER_ITEMS = 200;

export const purchaseOrderItemSchema = z
  .object({
    description: z.string().trim().min(1, "Informe a descrição.").max(2000),
    quantity: decimalString(9, 3, true),
    unit: z.string().trim().min(1, "Informe a unidade.").max(32),
    unitPrice: decimalString(12, 2),
  })
  .strict();

export const createPurchaseOrderSchema = z
  .object({
    projectId: z.uuid(),
    supplierId: z.uuid(),
    orderDate: z.iso.date("Informe uma data válida (AAAA-MM-DD)."),
    notes: z.string().max(10000).optional(),
    items: z
      .array(purchaseOrderItemSchema)
      .min(1, "Inclua ao menos um item.")
      .max(MAX_PURCHASE_ORDER_ITEMS, "Inclua no máximo 200 itens por pedido."),
  })
  .strict();

export const decisionSchema = z.discriminatedUnion("decision", [
  z.object({ expectedStepIndex: z.number().int().min(0), decision: z.literal("APPROVED") }).strict(),
  z
    .object({
      expectedStepIndex: z.number().int().min(0),
      decision: z.literal("REJECTED"),
      reason: z.string().trim().min(1, "Informe o motivo da rejeição.").max(5000),
    })
    .strict(),
]);

export type CreatePurchaseOrder = z.infer<typeof createPurchaseOrderSchema>;
export type PurchaseOrderItemInput = z.infer<typeof purchaseOrderItemSchema>;
export type DecisionInput = z.infer<typeof decisionSchema>;

export const orderStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export const decisionTypeSchema = z.enum(["APPROVED", "REJECTED"]);
// SKIPPED: a step that never got a decision because an earlier step rejected the order.
export const approvalStepStateSchema = z.enum(["APPROVED", "REJECTED", "CURRENT", "UPCOMING", "SKIPPED"]);

export interface ApprovalStep {
  stepIndex: number;
  approverId: string;
  approverName: string;
  decision: null | {
    type: z.infer<typeof decisionTypeSchema>;
    actorId: string;
    decidedAt: string;
    reason: string | null;
  };
}

export interface PurchaseOrderDetail {
  id: string;
  projectId: string;
  project: { id: string; name: string };
  supplier: { id: string; name: string; isActive: boolean };
  createdById: string;
  creatorName: string;
  orderDate: string;
  notes: string | null;
  status: OrderStatus;
  total: string;
  coaVersion: number;
  createdAt: string;
  items: Array<PurchaseOrderItemInput & { itemIndex: number; lineTotal: string }>;
  steps: ApprovalStep[];
  currentApproval: { stepIndex: number; approverId: string; approverName: string } | null;
}

export interface ApprovalStepSummary {
  stepIndex: number;
  approverId: string;
  approverName: string;
  state: z.infer<typeof approvalStepStateSchema>;
}

export interface OrderSummary {
  id: string;
  projectId: string;
  project: { id: string; name: string };
  supplier: { id: string; name: string; isActive: boolean };
  orderDate: string;
  createdAt: string;
  coaVersion: number;
  total: string;
  status: OrderStatus;
  itemCount: number;
  stepCount: number;
  decidedStepCount: number;
  currentApproval: PurchaseOrderDetail["currentApproval"];
  approvalSteps: ApprovalStepSummary[];
}

// Sizes of every view of the orders the caller can see, in the requested project. Not paginated and
// independent of the status/actionableByMe filters, so one response can label every view tab.
export interface OrderDistribution {
  total: number;
  byStatus: Record<OrderStatus, number>;
  actionableByMe: number;
}

export interface OrderList {
  data: OrderSummary[];
  pagination: { page: number; pageSize: number; total: number };
  distribution: OrderDistribution;
}
