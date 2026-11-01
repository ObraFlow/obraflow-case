# ADR-007 — Purchase Order Lifecycle and Immutable Approval Decisions

**Status:** Accepted — workflow domain decisions (2026-10-20)
**Project:** ObraFlow challenge
**Related:** [ADR-003](ADR-003-authentication-authorization.md), [ADR-005](ADR-005-project-membership-authorization.md), [ADR-006](ADR-006-cumulative-approval-escalation.md)

## Context

The challenge requires purchase orders with a stored initial approval chain, sequential decisions, a rejection reason, a current approver reflected from backend-persisted data, and an auditable decision history. We want an audit-oriented model without a generic workflow engine, an event-sourcing platform, or duplicated progression state.

## Decisions

1. **Simple PO lifecycle.** A successfully created order begins as `PENDING`. When every assigned step has an approval decision, the order is `APPROVED`. A rejection at any current step makes the order `REJECTED` immediately. `APPROVED` and `REJECTED` are terminal; no reopen, cancellation, withdrawal, or draft state in Phase 1. An unsaved client form is not a PO.
2. **Immutable approval assignment snapshot.** At PO creation, the backend resolves the project CoA under ADR-006's transactional consistency guarantees and persists the complete ordered assignment sequence. The PO also stores the applied CoA version. Neither later CoA edits nor role/membership changes rewrite these assignments.
3. **Separate, append-only decisions.** Each approval or rejection is a new immutable record identifying its PO step, actor, decision (`APPROVED` or `REJECTED`), server-recorded timestamp, and required nonblank rejection reason for a rejection. No decision record exists for a step until a decision actually occurs. Decisions cannot be edited, deleted, revoked, or replaced by another decision through the application.
4. **Exactly one decision per step.** A database uniqueness constraint on `approval_decisions.step_id`, a foreign key to the snapshotted step, prevents duplicate decisions. The deciding actor must be the assigned approver, resolved from trusted authentication rather than client input.
5. **Derived current approver, no cursor.** While the order is `PENDING`, the current step is the lowest-index snapshotted step with no decision. The backend computes this from persisted assignments and immutable decisions. Do not store a separate `currentStepIndex` column. On a terminal order there is no actionable current approver, even if later steps lack decisions after a rejection. This is our documented interpretation of the challenge phrase "nível atual da alçada, calculado e persistido pelo back-end": the underlying progression facts are backend-persisted, and the displayed index is derived from those facts.
6. **Only the current assignee can decide.** The backend authorizes the authenticated, active, project-member user against the current assignment within the same transaction as the decision. Admin status does not override assignment or sequence. An order creator may approve their own order **only if explicitly assigned** as the current approver.
7. **Rejection is final.** A rejection requires a nonblank reason, immediately terminates the sequence, and preserves every preceding decision. No later approvals can be recorded. Neither a rejecting actor nor an administrator can reverse the result in Phase 1.
8. **Transactional concurrency.** Lock the PO row while checking state/current assignment and inserting a decision. Concurrent or repeated attempts cannot skip a step, append duplicate decisions, or change a terminal order. Insert the decision and update the persisted PO status **within the same transaction** when the decision completes or rejects the order; the assignment/decision records remain the authoritative source for workflow progression.
9. **Persist PO status as a transactional projection.** Store `purchase_orders.status` as `PENDING | APPROVED | REJECTED`: initialize it to `PENDING`, keep it there for intermediate approvals, set it to `APPROVED` on the final approval, and set it to `REJECTED` immediately upon any rejection. This is intentionally a derived summary materialized for list filtering, pagination, and indexing, **not** an independent source of authority. While immutable steps and decisions can reconstruct the status, the extra column and transactional update are modest overhead relative to their practical read-query benefits. Verify consistency by tests, do not create a mutable `currentStepIndex`, and never expose a route to set status directly.
10. **No separate decision event stream.** Approval steps and append-only decisions are sufficient for the challenge's audit history. Do not also persist per-step mutable decision fields or create a generic workflow/event framework.

## Consistent purchase-order detail projections (ADR-009 accepted 2026-10-20)

The full PO detail response (and the full order returned after creation/decision) must reflect one internally consistent committed workflow state: persisted PO status, immutable steps and decisions, and backend-derived `currentApproval` must agree. Do not stitch together the PO status from one database snapshot with later decisions from another. Use a coherent query or a consistent-snapshot transaction; a sequence of unrelated `READ COMMITTED` queries does not guarantee a common snapshot.

This is a response/read consistency invariant, **not** permission to persist a separate current-step cursor or mutate decision history. The particular ORM implementation and transaction isolation strategy remain implementation choices, to be verified against PostgreSQL.

## Duplicate submission trade-off (accepted 2026-10-20)

The API does **not** implement idempotency keys or automated duplicate detection for PO creation in Phase 1. Two independently accepted identical submission requests produce two separate purchase orders, each with its own ID, recorded CoA version, approval assignments and decision history. Approvers review each order and can reject an unintended duplicate with a reason or approve both when legitimate.

This is a conscious operational limitation: approvals do **not** guarantee duplicate prevention, and an approver could approve both by mistake. Frontend submit-button disabling may reduce repeated clicks but provides no exactly-once creation guarantee. A production purchasing system could later add an explicit duplicate policy and idempotent request handling after product requirements are established.

## Minimal persistence shape

- `purchase_orders`: references project, supplier, creator, applied `coa_version`; stores order date, notes, validated backend total, and **persisted `status`** for indexed list filtering. The status is maintained only by controlled workflow transitions.
- `purchase_order_items`: one or more immutable submitted line items, including the authoritative calculated totals.
- `purchase_order_steps`: `order_id`, `step_index`, `approver_id`; immutable assigned chain, unique step order, no nullable decision columns.
- `approval_decisions`: `step_id`, `actor_id`, `decision`, `reason`, `decided_at`; append-only with a single decision per step.

`decided_at` is generated by the backend/database, not trusted from the client. Assignment and decision rows are never physically removed through normal application operations. User historical references are retained. Exact key names, indexes, and API payload details are implementation-level decisions.

## Examples

- João -> Amanda, no decisions yet: `PENDING`, João actionable.
- João approved: `PENDING`, Amanda actionable, João's immutable decision preserved.
- Amanda approved: `APPROVED`, nobody actionable.
- Amanda rejected with a reason: `REJECTED`, nobody actionable; João's earlier approval remains in history.
- João retries approval after it was accepted: no second record; return a conflict/error, never revoke or replace the first decision.
- Editing the active CoA after PO creation: no effect on this PO's snapshotted steps.
- An approver referenced by undecided steps cannot be deactivated (ADR-006); historical completed decisions do not block deactivation.

## Required verification

- Create POs with a full ordered assignment snapshot and a pinned CoA revision; reject creation without a valid CoA.
- Restrict approvals/rejections to the correct active project member, in step order; allow assigned creator self-approval.
- Reject empty rejection reasons and ensure failure makes no data changes.
- Approving intermediate steps keeps the PO pending; last approval terminates as approved; any current-step rejection terminates as rejected.
- Block further decisions and revocation on terminal orders.
- Repeated, simultaneous, and stale requests never produce duplicate or out-of-order decisions.
- Ensure a rejected PO with later undecided steps has **no** current approver/action.
- Preserve existing assignments and decisions across CoA updates, while recording their original applied version.
- Confirm append-only decisions cannot be changed or removed through application endpoints.
- Check persisted PO status agrees with the immutable decision history on creation, intermediate/final approval, rejection, stale retries, and concurrent decision races; status can never be edited independently.
- Read a PO concurrently with an approval/rejection and confirm the full detail response never mixes status and decisions from different committed states.
- Verify pending/approved/rejected filtering can use persisted status without materializing the entire decision history.
- Verify two identical valid PO submissions are accepted as separate orders with independent approval histories.

## Open decisions explicitly out of scope here

- Monetary precision, rounding, and approval-boundary arithmetic are accepted in [ADR-008](ADR-008-monetary-precision-calculation.md); this ADR focuses on workflow and immutable decisions.
- HTTP endpoint names, error payload structure, and implementation-specific database lock ordering.
- Production compensating actions, audited reassignment/cancellation, and emergency account handling are not implemented in this challenge.
