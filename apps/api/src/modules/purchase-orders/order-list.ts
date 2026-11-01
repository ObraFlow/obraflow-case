import type { Actor } from "../../auth/actor.js";
import type { OrderDistribution, OrderList, OrderStatus, OrderSummary } from "@dokimos/shared";
import type { EntityManager } from "typeorm";

export interface OrderFilters {
  page: number;
  pageSize: number;
  status?: OrderStatus;
  projectId?: string;
  actionableByMe?: boolean;
}

type OrderSummaryRow = Omit<OrderSummary, "createdAt"> & { createdAt: Date };

// Orders joined to their project, supplier and the step awaiting a decision. Shared by the
// page, its count and the distribution so all three read the same rows.
const orderJoins = `FROM purchase_orders po
    JOIN projects p ON p.id=po.project_id JOIN suppliers supplier ON supplier.id=po.supplier_id
    -- The step awaiting a decision: the first without one, only while the order is pending.
    LEFT JOIN LATERAL (
      SELECT step.step_index, step.approver_id, u.display_name
      FROM purchase_order_steps step JOIN users u ON u.id=step.approver_id
      LEFT JOIN approval_decisions d ON d.step_id=step.id
      WHERE step.order_id=po.id AND d.id IS NULL AND po.status='PENDING'
      ORDER BY step.step_index LIMIT 1
    ) current_step ON true`;

// Visibility and project scope. $1 is the actor, $2 whether they see every project (ADMIN);
// `project` is the placeholder holding the optional project filter. Non-ADMIN users only see
// orders of projects they belong to.
const visibleOrders = (
  project: string,
) => `WHERE ($2::boolean OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id=po.project_id AND pm.user_id=$1))
      AND (${project}::uuid IS NULL OR po.project_id=${project})`;

// listOrderSummaries: one page of order summaries plus the total count, newest first, and the
// distribution of every order the actor can see in the requested project.
// The caller runs it in a REPEATABLE READ transaction so the count, the page, the distribution
// and the nested step states all come from the same snapshot.
export async function listOrderSummaries(
  manager: EntityManager,
  actor: Actor,
  filters: OrderFilters,
): Promise<OrderList> {
  // $1 actor, $2 sees every project (ADMIN), $3 status, $4 project, $5 only orders awaiting the actor.
  // A null filter means "no filter"; the page size and offset follow as $6 and $7.
  const parameters: unknown[] = [
    actor.id,
    actor.role === "ADMIN",
    filters.status ?? null,
    filters.projectId ?? null,
    filters.actionableByMe ?? false,
  ];

  // Shared by the count and the page query so both apply identical visibility and filters.
  const from = `${orderJoins}
    ${visibleOrders("$4")}
      AND ($3::text IS NULL OR po.status=$3)
      AND (NOT $5::boolean OR current_step.approver_id=$1)`;

  // Unlike the page, the distribution ignores the status and actionableByMe filters: it feeds
  // the view tabs, which must keep showing every view's size whichever one is selected.
  // It is not paginated either: every count covers all visible orders, not the returned page.
  const [{ distribution }]: Array<{ distribution: OrderDistribution }> = await manager.query(
    `
    SELECT jsonb_build_object(
      'total', count(*),
      'byStatus', jsonb_build_object(
        'PENDING', count(*) FILTER (WHERE po.status='PENDING'),
        'APPROVED', count(*) FILTER (WHERE po.status='APPROVED'),
        'REJECTED', count(*) FILTER (WHERE po.status='REJECTED')),
      'actionableByMe', count(*) FILTER (WHERE current_step.approver_id=$1)
    ) AS distribution ${orderJoins} ${visibleOrders("$3")}`,
    [actor.id, actor.role === "ADMIN", filters.projectId ?? null],
  );

  const counts: Array<{ total: number }> = await manager.query(`SELECT count(*)::int AS total ${from}`, parameters);
  const rows: OrderSummaryRow[] = await manager.query(
    `
      SELECT po.id, po.project_id AS "projectId", po.order_date::text AS "orderDate", po.created_at AS "createdAt",
        -- NUMERIC and DATE are cast to text so money stays an exact decimal string.
        po.status, po.total::text, po.coa_version AS "coaVersion",
        jsonb_build_object('id',p.id,'name',p.name) AS project,
        jsonb_build_object('id',supplier.id,'name',supplier.name,'isActive',supplier.is_active) AS supplier,
        (SELECT count(*)::int FROM purchase_order_items item WHERE item.order_id=po.id) AS "itemCount",
        (SELECT count(*)::int FROM purchase_order_steps step WHERE step.order_id=po.id) AS "stepCount",
        (SELECT count(*)::int FROM approval_decisions d JOIN purchase_order_steps step ON step.id=d.step_id
         WHERE step.order_id=po.id) AS "decidedStepCount",
        CASE WHEN current_step.step_index IS NULL THEN NULL ELSE jsonb_build_object(
          'stepIndex',current_step.step_index,'approverId',current_step.approver_id,'approverName',current_step.display_name
        ) END AS "currentApproval",
        -- Every step with its state. Steps after a rejection never get a decision: SKIPPED.
        (SELECT jsonb_agg(jsonb_build_object(
          'stepIndex',step.step_index,'approverId',step.approver_id,'approverName',approver.display_name,
          'state',CASE WHEN decision.id IS NOT NULL THEN decision.decision::text
            WHEN po.status='REJECTED' THEN 'SKIPPED'
            WHEN step.step_index=current_step.step_index THEN 'CURRENT'
            ELSE 'UPCOMING' END
        ) ORDER BY step.step_index)
         FROM purchase_order_steps step JOIN users approver ON approver.id=step.approver_id
         LEFT JOIN approval_decisions decision ON decision.step_id=step.id
         WHERE step.order_id=po.id) AS "approvalSteps"
      ${from} ORDER BY po.created_at DESC, po.id DESC LIMIT $6 OFFSET $7`,
    [...parameters, filters.pageSize, (filters.page - 1) * filters.pageSize],
  );

  return {
    data: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    pagination: { page: filters.page, pageSize: filters.pageSize, total: counts[0].total },
    distribution,
  };
}
