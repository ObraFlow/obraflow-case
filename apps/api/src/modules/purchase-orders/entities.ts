import { EntitySchema } from "typeorm";
import type { OrderStatus } from "@dokimos/shared";

export interface PurchaseOrder {
  id: string;
  projectId: string;
  supplierId: string;
  createdById: string;
  orderDate: string;
  notes: string | null;
  total: string;
  status: OrderStatus;
  coaVersion: number;
  createdAt: Date;
}
export interface PurchaseOrderItem {
  id: string;
  orderId: string;
  itemIndex: number;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  lineTotal: string;
}
export interface PurchaseOrderStep {
  id: string;
  orderId: string;
  stepIndex: number;
  approverId: string;
}
export interface ApprovalDecision {
  id: string;
  stepId: string;
  actorId: string;
  decision: "APPROVED" | "REJECTED";
  reason: string | null;
  decidedAt: Date;
}

export const PurchaseOrderEntity = new EntitySchema<PurchaseOrder>({
  name: "PurchaseOrder",
  tableName: "purchase_orders",
  columns: {
    id: {
      type: "uuid",
      primary: true,
      primaryKeyConstraintName: "purchase_orders_pkey",
      generated: "uuid",
      default: () => "gen_random_uuid()",
    },
    projectId: { name: "project_id", type: "uuid" },
    supplierId: { name: "supplier_id", type: "uuid" },
    createdById: { name: "created_by_id", type: "uuid" },
    orderDate: { name: "order_date", type: "date" },
    notes: { type: "text", nullable: true },
    total: { type: "numeric", precision: 18, scale: 2 },
    status: { type: "varchar", length: 8 },
    coaVersion: { name: "coa_version", type: "int" },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true, default: () => "now()" },
  },
  // DESC index ordering remains migration-owned; TypeORM cannot synchronize it.
  indices: [
    { name: "po_project_created_idx", columns: ["projectId", "createdAt", "id"], synchronize: false },
    { name: "po_status_created_idx", columns: ["status", "createdAt", "id"], synchronize: false },
  ],
  checks: [
    { name: "purchase_orders_total_check", expression: "total >= 0" },
    { name: "purchase_orders_status_check", expression: "status IN ('PENDING','APPROVED','REJECTED')" },
    { name: "purchase_orders_coa_version_check", expression: "coa_version >= 1" },
  ],
  foreignKeys: [
    {
      name: "purchase_orders_project_id_fkey",
      target: "Project",
      columnNames: ["projectId"],
      referencedColumnNames: ["id"],
    },
    {
      name: "purchase_orders_supplier_id_fkey",
      target: "Supplier",
      columnNames: ["supplierId"],
      referencedColumnNames: ["id"],
    },
    {
      name: "purchase_orders_created_by_id_fkey",
      target: "User",
      columnNames: ["createdById"],
      referencedColumnNames: ["id"],
    },
    // The CoA version an order was created under must exist, so its snapshot can always be traced.
    {
      name: "po_coa_revision_fk",
      target: "CoaRevision",
      columnNames: ["projectId", "coaVersion"],
      referencedColumnNames: ["projectId", "version"],
    },
  ],
});

export const PurchaseOrderItemEntity = new EntitySchema<PurchaseOrderItem>({
  name: "PurchaseOrderItem",
  tableName: "purchase_order_items",
  columns: {
    id: {
      type: "uuid",
      primary: true,
      primaryKeyConstraintName: "purchase_order_items_pkey",
      generated: "uuid",
      default: () => "gen_random_uuid()",
    },
    orderId: { name: "order_id", type: "uuid" },
    itemIndex: { name: "item_index", type: "int" },
    description: { type: "text" },
    quantity: { type: "numeric", precision: 12, scale: 3 },
    unit: { type: "varchar", length: 32 },
    unitPrice: { name: "unit_price", type: "numeric", precision: 14, scale: 2 },
    lineTotal: { name: "line_total", type: "numeric", precision: 18, scale: 2 },
  },
  // Items keep the quantities, prices and line totals computed at creation; they are never recomputed.
  uniques: [{ name: "purchase_order_items_order_id_item_index_key", columns: ["orderId", "itemIndex"] }],
  checks: [
    { name: "purchase_order_items_item_index_check", expression: "item_index >= 0" },
    { name: "purchase_order_items_description_check", expression: "length(btrim(description)) > 0" },
    { name: "purchase_order_items_quantity_check", expression: "quantity > 0" },
    { name: "purchase_order_items_unit_check", expression: "length(btrim(unit)) > 0" },
    { name: "purchase_order_items_unit_price_check", expression: "unit_price >= 0" },
    { name: "purchase_order_items_line_total_check", expression: "line_total >= 0" },
  ],
  foreignKeys: [
    {
      name: "purchase_order_items_order_id_fkey",
      target: "PurchaseOrder",
      columnNames: ["orderId"],
      referencedColumnNames: ["id"],
    },
  ],
});

export const PurchaseOrderStepEntity = new EntitySchema<PurchaseOrderStep>({
  name: "PurchaseOrderStep",
  tableName: "purchase_order_steps",
  columns: {
    id: {
      type: "uuid",
      primary: true,
      primaryKeyConstraintName: "purchase_order_steps_pkey",
      generated: "uuid",
      default: () => "gen_random_uuid()",
    },
    orderId: { name: "order_id", type: "uuid" },
    stepIndex: { name: "step_index", type: "int" },
    approverId: { name: "approver_id", type: "uuid" },
  },
  uniques: [{ name: "purchase_order_steps_order_id_step_index_key", columns: ["orderId", "stepIndex"] }],
  indices: [{ name: "po_steps_approver_idx", columns: ["approverId"] }],
  checks: [{ name: "purchase_order_steps_step_index_check", expression: "step_index >= 0" }],
  foreignKeys: [
    {
      name: "purchase_order_steps_order_id_fkey",
      target: "PurchaseOrder",
      columnNames: ["orderId"],
      referencedColumnNames: ["id"],
    },
    {
      name: "purchase_order_steps_approver_id_fkey",
      target: "User",
      columnNames: ["approverId"],
      referencedColumnNames: ["id"],
    },
  ],
});

export const ApprovalDecisionEntity = new EntitySchema<ApprovalDecision>({
  name: "ApprovalDecision",
  tableName: "approval_decisions",
  columns: {
    id: {
      type: "uuid",
      primary: true,
      primaryKeyConstraintName: "approval_decisions_pkey",
      generated: "uuid",
      default: () => "gen_random_uuid()",
    },
    stepId: { name: "step_id", type: "uuid" },
    actorId: { name: "actor_id", type: "uuid" },
    decision: { type: "varchar", length: 8 },
    reason: { type: "text", nullable: true },
    decidedAt: { name: "decided_at", type: "timestamptz", createDate: true, default: () => "now()" },
  },
  // A step is decided at most once, and a rejection must carry a reason (an approval must not).
  uniques: [{ name: "approval_decisions_step_id_key", columns: ["stepId"] }],
  checks: [
    { name: "approval_decisions_decision_check", expression: "decision IN ('APPROVED','REJECTED')" },
    {
      name: "rejection_reason_required",
      expression:
        "(decision = 'REJECTED' AND reason IS NOT NULL AND length(btrim(reason)) > 0) OR (decision = 'APPROVED' AND reason IS NULL)",
    },
  ],
  foreignKeys: [
    {
      name: "approval_decisions_step_id_fkey",
      target: "PurchaseOrderStep",
      columnNames: ["stepId"],
      referencedColumnNames: ["id"],
    },
    {
      name: "approval_decisions_actor_id_fkey",
      target: "User",
      columnNames: ["actorId"],
      referencedColumnNames: ["id"],
    },
  ],
});
