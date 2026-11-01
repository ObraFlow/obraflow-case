import type { Actor } from "../../auth/actor.js";
import type { PurchaseOrderDetail } from "@dokimos/shared";
import type { EntityManager } from "typeorm";
import { errors } from "../../lib/errors.js";

type PurchaseOrderDetailRow = Omit<PurchaseOrderDetail, "createdAt" | "currentApproval"> & { createdAt: Date };

// findOrderDetail: an order with its items and approval history, or 404 when it does not
// exist or the actor may not see it (the two are indistinguishable on purpose).
// One SQL statement, so the header, items and steps come from a single snapshot.
export async function findOrderDetail(manager: EntityManager, id: string, actor: Actor): Promise<PurchaseOrderDetail> {
  const rows: PurchaseOrderDetailRow[] = await manager.query(
    `
    SELECT po.id, po.project_id AS "projectId", po.created_by_id AS "createdById",
      creator.display_name AS "creatorName", po.order_date::text AS "orderDate", po.notes,
      -- NUMERIC is cast to text everywhere, including inside JSON, where pg would otherwise return a float.
      po.status, po.total::text, po.coa_version AS "coaVersion", po.created_at AS "createdAt",
      jsonb_build_object('id', p.id, 'name', p.name) AS project,
      jsonb_build_object('id', supplier.id, 'name', supplier.name, 'isActive', supplier.is_active) AS supplier,
      (SELECT jsonb_agg(jsonb_build_object(
        'itemIndex', item.item_index, 'description', item.description, 'quantity', item.quantity::text,
        'unit', item.unit, 'unitPrice', item.unit_price::text, 'lineTotal', item.line_total::text
      ) ORDER BY item.item_index) FROM purchase_order_items item WHERE item.order_id=po.id) AS items,
      -- The approval steps frozen at creation, each with its decision (null while undecided).
      (SELECT jsonb_agg(jsonb_build_object(
        'stepIndex', step.step_index, 'approverId', step.approver_id, 'approverName', approver.display_name,
        'decision', CASE WHEN d.id IS NULL THEN NULL ELSE jsonb_build_object(
          'type', d.decision, 'actorId', d.actor_id, 'decidedAt', d.decided_at, 'reason', d.reason) END
      ) ORDER BY step.step_index)
       FROM purchase_order_steps step JOIN users approver ON approver.id=step.approver_id
       LEFT JOIN approval_decisions d ON d.step_id=step.id WHERE step.order_id=po.id) AS steps
    FROM purchase_orders po JOIN projects p ON p.id=po.project_id
    JOIN suppliers supplier ON supplier.id=po.supplier_id JOIN users creator ON creator.id=po.created_by_id
    -- ADMIN ($3) sees every order; everyone else only orders of their own projects.
    WHERE po.id=$1 AND ($3::boolean OR EXISTS (
      SELECT 1 FROM project_members pm WHERE pm.project_id=po.project_id AND pm.user_id=$2))`,
    [id, actor.id, actor.role === "ADMIN"],
  );

  const order = rows[0];
  if (!order) throw errors.notFound("order");

  // The current approver is the first undecided step, and only while the order is pending.
  const current = order.status === "PENDING" ? order.steps.find((step) => step.decision === null) : undefined;
  return {
    ...order,
    createdAt: order.createdAt.toISOString(),
    currentApproval: current
      ? { stepIndex: current.stepIndex, approverId: current.approverId, approverName: current.approverName }
      : null,
  };
}
