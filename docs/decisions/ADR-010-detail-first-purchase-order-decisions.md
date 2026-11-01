# ADR-010 — Detail-first Purchase Order Decisions

**Status:** Accepted — product interaction decision (2026-10-27)  
**Project:** ObraFlow challenge  
**Scope:** Purchase-order list and detail interaction; frontend only  
**Related:** [ADR-002](ADR-002-frontend-architecture.md), [ADR-003](ADR-003-authentication-authorization.md), [ADR-007](ADR-007-purchase-order-approval-lifecycle.md), [ADR-009](ADR-009-http-api-contract.md)

## Challenge language and tension

The challenge's **2. Aprovação** section says the order list "deve apresentar pelo menos" several columns, including:

> Ações | Aprovar ou rejeitar quando houver uma decisão disponível.

It separately requires that users can open order details to inspect items and decision history. It also says:

> Quando toda a cadeia for concluída, as ações de decisão devem estar desabilitadas com uma explicação.

The first passage **literally favors approval/rejection actions originating in the list**. Our implementation does not place those actions in the list. This is an explicit, accepted divergence from that presentation requirement, not an oversight or a claim of strict compliance.

## Decision

1. **Keep approvals and rejections detail-first.** List rows on desktop and order cards on mobile navigate to the purchase-order detail. The list presents status, project/supplier, date, item count, value, and the approval-chain progression. The detail is the only location from which an approval or rejection can be initiated.
2. **Do not introduce list-level Aprovar/Rejeitar buttons.** Do not create a second approval dialog or mini-detail interaction in the list.
3. **Do not add a redundant Revisar / Revisar e decidir button.** The order row/card already provides the navigation affordance. Retain a discoverable native link and accessible keyboard navigation; keep the desktop row pointer affordance as progressive enhancement.
4. **Require a review opportunity before a financial decision.** The order detail shows the purchase's items, totals, parties, current authority and decision history. Approval requires explicit confirmation. Rejection requires a reason. Backend authorization, ordering and snapshot semantics are unchanged.
5. **Make terminal states explicit in the detail.** For approved or rejected orders, retain disabled Aprovar and Rejeitar controls alongside a visible explanation rather than hiding the controls. This is the explicit presentation required by the challenge. This point does **not** authorize adding list actions.

## Rationale

- An approval is an accountable, non-reversible financial decision. The list deliberately optimizes for triage and navigation; the detail optimizes for an informed decision.
- A list summary cannot reliably convey the full set of line items, quantities, unit prices, supplier context, notes and prior decisions that a reviewer may need before acting.
- Two parallel decision entry points increase the number of confirmation, validation, permission, stale-state, network-failure and mobile-layout interactions to implement and keep consistent.
- Adding a Revisar button next to an already clickable row/card duplicates navigation without improving the underlying information architecture.
- This is consistent with the product's existing detail-first workflow and the backend rule that only the current assigned approver may decide. It is not an argument that list actions are always wrong for other products.

## Accepted trade-off and evaluation risk

The challenge states list approval/rejection actions among the minimum expected list features. A strict evaluator may fairly score this as a **presentation requirement not implemented literally**, even though the same decisions are fully available and enforced on the detail page.

We accept that risk in favor of one coherent, inspect-before-deciding workflow. We must not claim the implementation meets the list-action line verbatim. If the requirement is clarified as mandatory inline actions, that would warrant revisiting this decision; the current accepted scope is not to build them.

Terminal action visibility is a separate issue: the challenge explicitly requests disabled decision controls when a chain is complete, and we have chosen to implement that within the detail view despite a local UX preference for hiding unavailable actions.

## Implementation boundaries and acceptance

- Keep the order list a non-mutating surface. No list-triggered decision endpoint calls, quick approvals, action column, extra confirmation dialog, or button duplicating the existing row/card link.
- Retain visible status and approval progress on both desktop and mobile; do not obscure whether a purchase currently awaits the signed-in user.
- Preserve ordinary keyboard access, link navigation, modified-click/open-in-new-tab behavior, and the original accessible order link. No backend, contract, database or CoA changes.
- On the detail page, decisions remain guarded by current assignment and order state; pending, conflict, and failure behaviors remain intact. Both actions are visibly disabled for APPROVED and REJECTED orders, with the appropriate explanatory text.
- Browser regression should verify list navigation and absence of inline decision mutation, current/non-current pending permissions, terminal disabled controls and the correct explanation. Do not mistake hidden-action assertions from older tests for the desired terminal presentation.

## Documentation timing

This ADR records the **accepted product decision before product freeze**. The final public README explanation is deferred until the agreed documentation phase; it should transparently mention this trade-off rather than frame it as a forgotten implementation gap.
