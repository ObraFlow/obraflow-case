import type { AuditEvent, AuditPage, AuditQuery } from "@dokimos/shared";
import type { EntityManager } from "typeorm";

// Read projection over domain records and narrowly scoped lifecycle histories.
// Only original creation fields and immutable steps/decisions/revisions are projected;
// current PO status or current CoA bands must not rewrite the meaning of old events.
//
// The audit trail is derived from tables that already exist, not stored separately. Each
// UNION branch below turns one source into events with the same ten columns, in this
// order: event_id, event_type, occurred_at, actor_id, actor_kind, project_id,
// resource_id, resource_kind, resource_name, details. event_id is prefixed by source so
// ids never collide and sort stably when timestamps tie.
const events = `WITH events AS (
  -- Order created: the original header, supplier and approval steps.
  SELECT 'order:' || po.id::text AS event_id, 'ORDER_CREATED' AS event_type,
    po.created_at AS occurred_at, po.created_by_id AS actor_id, 'USER' AS actor_kind,
    po.project_id, po.id AS resource_id, 'PURCHASE_ORDER' AS resource_kind,
    '#' || left(po.id::text,8) AS resource_name,
    jsonb_build_object('total',po.total::text,'coaVersion',po.coa_version,
      'orderDate',po.order_date::text,'itemCount',(SELECT count(*)::int FROM purchase_order_items i WHERE i.order_id=po.id),
      'supplier',jsonb_build_object('id',s.id,'name',s.name),
      'steps',(SELECT jsonb_agg(jsonb_build_object('stepIndex',step.step_index,
        'approverId',step.approver_id,'approverName',u.display_name) ORDER BY step.step_index)
        FROM purchase_order_steps step JOIN users u ON u.id=step.approver_id WHERE step.order_id=po.id)) AS details
  FROM purchase_orders po JOIN suppliers s ON s.id=po.supplier_id
  UNION ALL
  -- One event per approval decision (approved or rejected), with the CoA version the order was created under.
  SELECT 'decision:' || d.id::text,
    CASE WHEN d.decision='APPROVED' THEN 'STEP_APPROVED' ELSE 'STEP_REJECTED' END,
    d.decided_at,d.actor_id,'USER',po.project_id,po.id,'PURCHASE_ORDER','#' || left(po.id::text,8),
    jsonb_build_object('stepIndex',step.step_index,'approverId',step.approver_id,
      'approverName',u.display_name,'reason',d.reason,'coaVersion',po.coa_version)
  FROM approval_decisions d JOIN purchase_order_steps step ON step.id=d.step_id
    JOIN purchase_orders po ON po.id=step.order_id JOIN users u ON u.id=step.approver_id
  UNION ALL
  -- One event per published CoA version. The stored ladder is read back with approver names, in band order.
  SELECT 'coa:' || r.project_id::text || ':' || r.version::text,'COA_REVISED',
    r.changed_at,r.changed_by_id,'USER',r.project_id,r.project_id,'PROJECT',NULL::text,
    jsonb_build_object('version',r.version,'bands',(
      SELECT jsonb_agg(b.band || jsonb_build_object('approverName',u.display_name) ORDER BY b.position)
      FROM jsonb_array_elements(r.bands) WITH ORDINALITY b(band,position)
      JOIN users u ON u.id=(b.band->>'approverId')::uuid))
  FROM coa_revisions r
  UNION ALL
  -- User created or disabled (USER_CREATED / USER_DISABLED). Not tied to a project.
  SELECT 'user:' || e.id::text,'USER_' || e.action,e.created_at,e.actor_user_id,e.actor_kind,
    NULL::uuid,e.target_user_id,'USER',u.display_name,
    jsonb_build_object('username',u.username,'displayName',u.display_name,'role',u.role)
  FROM user_lifecycle_events e JOIN users u ON u.id=e.target_user_id
  UNION ALL
  -- Project created, renamed, archived, reactivated, member added or removed. The details
  -- were snapshotted when the event was written, so a later rename does not alter them.
  SELECT 'project:' || e.id::text,e.action,e.created_at,e.actor_user_id,e.actor_kind,
    e.project_id,e.project_id,'PROJECT',e.details->>'projectName',e.details
  FROM project_lifecycle_events e
  UNION ALL
  -- Suppliers keep creation and deactivation on the row itself, and each rename in
  -- supplier_renames. A row with no recorded actor is reported as UNKNOWN. The resource name
  -- is the current name of the supplier (what the page links to); details.name is the name it
  -- had when the event happened: the previous name of its first later rename, if any.
  SELECT 'supplier:created:' || s.id::text,'SUPPLIER_CREATED',s.created_at,s.created_by,
    CASE WHEN s.created_by IS NULL THEN 'UNKNOWN' ELSE 'USER' END,
    NULL::uuid,s.id,'SUPPLIER',s.name,
    jsonb_build_object('name',coalesce((SELECT r.previous_name FROM supplier_renames r
      WHERE r.supplier_id=s.id AND r.created_at > s.created_at ORDER BY r.created_at,r.id LIMIT 1),s.name),'isActive',true)
  FROM suppliers s
  UNION ALL
  SELECT 'supplier:renamed:' || r.id::text,'SUPPLIER_RENAMED',r.created_at,r.actor_user_id,'USER',
    NULL::uuid,r.supplier_id,'SUPPLIER',s.name,
    jsonb_build_object('previousName',r.previous_name,'name',r.name)
  FROM supplier_renames r JOIN suppliers s ON s.id=r.supplier_id
  UNION ALL
  SELECT 'supplier:disabled:' || s.id::text,'SUPPLIER_DISABLED',s.deactivated_at,s.deactivated_by,
    CASE WHEN s.deactivated_by IS NULL THEN 'UNKNOWN' ELSE 'USER' END,
    NULL::uuid,s.id,'SUPPLIER',s.name,
    jsonb_build_object('name',coalesce((SELECT r.previous_name FROM supplier_renames r
      WHERE r.supplier_id=s.id AND r.created_at > s.deactivated_at ORDER BY r.created_at,r.id LIMIT 1),s.name),'isActive',false)
  FROM suppliers s WHERE s.deactivated_at IS NOT NULL
)`;
// Optional filters ($1 type, $2 project, $3 from inclusive, $4 to exclusive); null means unfiltered.
const where = `WHERE ($1::text IS NULL OR e.event_type=$1) AND ($2::uuid IS NULL OR e.project_id=$2)
  AND ($3::timestamptz IS NULL OR e.occurred_at >= $3)
  AND ($4::timestamptz IS NULL OR e.occurred_at < $4)`;

// The row as PostgreSQL returns it: the AuditEvent union with `occurredAt` still a Date.
// The conditional type distributes over the union so each event's `type` stays paired
// with its own `details` shape.
type AuditEventRow = AuditEvent extends infer Event
  ? Event extends AuditEvent
    ? Omit<Event, "occurredAt"> & { occurredAt: Date }
    : never
  : never;

// queryAuditEvents: one filtered page of the audit trail, newest first, with the total.
// Trusted: the caller must already have required ADMIN.
export async function queryAuditEvents(manager: EntityManager, filters: AuditQuery): Promise<AuditPage> {
  const parameters = [filters.eventType ?? null, filters.projectId ?? null, filters.from ?? null, filters.to ?? null];
  // Count and page share a PostgreSQL snapshot. Tied timestamps have a stable,
  // source-qualified key; separate page requests can still see newly committed events.
  const counts: { total: number }[] = await manager.query(
    `${events} SELECT count(*)::int AS total FROM events e ${where}`,
    parameters,
  );
  const rows: AuditEventRow[] = await manager.query(
    `${events}
      -- Display names are joined after the union. Events written by
      -- the seed (SYSTEM) or with no recorded actor (UNKNOWN) have no user to join.
      SELECT e.event_id AS id,e.event_type AS type,e.occurred_at AS "occurredAt",
        jsonb_build_object('kind',e.actor_kind,'id',e.actor_id,
          'displayName',CASE WHEN e.actor_kind='SYSTEM' THEN 'Sistema'
            WHEN e.actor_kind='UNKNOWN' THEN 'Não registrado' ELSE actor.display_name END) AS actor,
        CASE WHEN e.project_id IS NULL THEN NULL ELSE jsonb_build_object('id',p.id,'name',p.name) END AS project,
        -- CoA events have no resource name of their own and fall back to the project's.
        jsonb_build_object('kind',e.resource_kind,'id',e.resource_id,'name',coalesce(e.resource_name,p.name)) AS resource,
        e.details
      FROM events e LEFT JOIN users actor ON actor.id=e.actor_id LEFT JOIN projects p ON p.id=e.project_id
      ${where} ORDER BY e.occurred_at DESC,e.event_id DESC LIMIT $5 OFFSET $6`,
    [...parameters, filters.pageSize, (filters.page - 1) * filters.pageSize],
  );
  return {
    data: rows.map((row) => ({ ...row, occurredAt: row.occurredAt.toISOString() })),
    pagination: { page: filters.page, pageSize: filters.pageSize, total: counts[0].total },
  };
}
