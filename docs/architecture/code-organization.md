# Code Organization and Engineering Principles

**Status:** Working implementation guidance. The accepted domain and security invariants are in the ADRs; folder layouts here are not frozen decisions.

## Design priority

Keep implementation traceable and reviewable. The service that implements a business operation should visibly own its preconditions, transaction boundary, and resulting state changes. Do not introduce factories, repositories, generic rule engines, or service interfaces merely to fill out a diagram.

## Current backend guidance

1. Group domain behavior under `modules/`: `purchase-orders`, `projects` (including memberships), `coa`, `users`, `suppliers` and `audit`. Authentication belongs in the top-level `auth/`.
2. Make transport boundaries clear: Fastify route handlers validate and delegate; services enforce domain behavior; TypeORM persists data.
3. Pass a verified actor (user ID/current role resolved from the database) into services; never make approval decisions based on client-supplied actor IDs.
4. Keep transaction-scoped database access inside a consistent `EntityManager`/transaction context. Do not spread one logical write across separately committed operations.
5. Prefer small pure helpers for reconstructing, validating, and resolving the cumulative approval ladder. No independent approver-list-per-range object model is needed under [ADR-006](../decisions/ADR-006-cumulative-approval-escalation.md).
6. Snapshot the required approval sequence into the order when it is created; existing snapshots are not recalculated after policy edits.
7. Favor named validations and specific domain errors. Reuse common API validation primitives, but do not hide important constraints in generic utility layers.
8. Keep files cohesive as features grow: substantial orchestration is a signal to separate responsibilities, not to introduce an interface for every function.

## Current source ownership

```text
apps/
  api/src/
    auth/                 JWT, current actor, guards and login routes
    db/                   data source, migrations, locks and seed
    lib/                  HTTP errors and validation
    modules/              capability routes, services, entities and repositories
      audit/
      coa/
      projects/
        memberships/
      purchase-orders/    creation, immutable approval steps and decisions
      suppliers/
      users/
    realtime/             authenticated best-effort Socket.IO transport
    app.ts, main.ts       assembly and startup/shutdown
  web/src/
    app/                  authenticated shell, account and application boundaries
    auth/                 session, login and persona foundations
    components/           shared presentation, with no feature imports
      directory/          reusable DirectoryCard and its CSS Module
      ui/                 design-system primitives
    features/
      users/              Users.tsx and user API operations
      suppliers/          Suppliers.tsx, rename dialog and supplier API operations
      purchase-orders/    order workflows by screen: list/, new/ (with useCoaPreview), detail/; shared pieces at the root
      coa/                editor/ (live configuration), view/ (read-only ladder, history, simulator); calculation at the root
      projects/           list/ and detail/ (lifecycle, members, CoA editor host)
      audit/
      notifications/
    lib/                  HTTP transport and cross-cutting browser utilities
    App.tsx               route composition
  shared/                 @dokimos/shared: pure schemas and transport contracts
```

## Frontend guidance

Features own their screens, workflow state/hooks, domain helpers, resource-specific response validation and API operations. Keep associated CSS Modules beside their components. A feature with several screens is grouped by screen (for example `list/`, `new/`, `detail/`), never by file type; whatever more than one screen uses, and the feature `api.ts`, stay at the feature root. Small features stay flat. Users and suppliers have independent workflow owners in `features/users/Users.tsx` and `features/suppliers/Suppliers.tsx`; each calls its existing feature-local `api.ts`. They share presentation through `components/directory/` (`DirectoryCard`, `CreationStatus`), not a generic CRUD controller or shared mutation hook.

Purchase orders own `useCoaPreview`: reading the project's published ladder and members is part of the order-creation workflow. CoA configuration/calculation utilities remain under `features/coa/`. Cross-feature workflows may call existing feature APIs/utilities; shared presentation and transport must not import business features. Keep imports acyclic and import contracts directly from `@dokimos/shared`, without resource aggregators or compatibility facades.

`App.tsx` and `app/` compose routes and features. `lib/api.ts` owns HTTP transport, error normalization and session handling; each resource's `api.ts` calls it directly, and auth operations stay in `auth/api.ts`. See [frontend ownership](frontend.md#feature-ownership-and-dependencies).

## Quality gates

- Verify unauthorized reads, cross-project writes, and attempts to approve someone else's step directly against the API.
- Test state-transition and history invariants, approval amount boundaries, invalid rule configurations, and concurrent decisions.
- Use the intended PostgreSQL behavior in integration testing rather than assuming an in-memory substitute proves row-locking semantics.
- Preserve the distinction between *submission denied because no valid CoA exists* and *order rejected by an authorized approver*.
- Maintain an explicit list of unresolved decisions rather than inferring a chosen UI, monetary representation, or locking strategy from scaffolding.

## Cross-cutting UX acceptance checklist (accepted 2026-10-21)

The page-design review deliberately selected **behavioral guarantees**, not specific visual components. Verify these by exercising both success and failure paths; no new state-management or form library is implied.

- [x] Every collection/list exposes loading, populated, empty and recoverable-error states. Pending work is visible in the affected section rather than a blank page.
- [x] Empty POs/filtered results are differentiated from missing project prerequisites or unavailable eligible reference data; any suggested action is actually possible for the current user.
- [x] Zod client errors and backend `400` details appear beside their corresponding fields, including nested PO item paths, without clearing entered values or permitting invalid submission.
- [x] Safe read failures allow a deliberate retry. Unsaved form input survives network/`500` errors; no automatic retry of non-idempotent PO creation when a submission's outcome is uncertain, and no double-submit while in flight.
- [x] For `409` approval-step conflicts, reload the authoritative PO and explain the changed state; do not assume an approval succeeded.
- [x] For `409 COA_VERSION_CONFLICT`, fetch the latest saved ladder **while preserving the local unsaved draft**. The user must intentionally reconcile and explicitly select **Salvar alçada** before any subsequent publication; there is no autosave or silent overwrite.
- [x] A protected-request `401` clears invalid session state and redirects to login; incorrect credentials submitted on the login form instead receive an appropriate login error. `403` and `404` convey permission/not-found without revealing hidden resources.
- [x] Pending/completed approval actions explain their availability, rejection requires a nonblank reason, and workflow states remain readable without relying on color alone.
- [x] Error/success state handling remains local to the affected feature when possible; no generic notification framework, spinner/skeleton mandate or extra ADR is introduced just to satisfy this checklist.

## References

- [Architecture overview](overview.md)
- [ADR-001 — PostgreSQL and TypeORM](../decisions/ADR-001-postgresql-typeorm.md)
- [ADR-003 — Authentication and backend authorization](../decisions/ADR-003-authentication-authorization.md)
- [ADR-005 — Project membership](../decisions/ADR-005-project-membership-authorization.md)
- [ADR-006 — Cumulative approval escalation](../decisions/ADR-006-cumulative-approval-escalation.md)

Use [submission acceptance](../submission-checklist.md) to run the current desktop/mobile Chromium checks and real PostgreSQL concurrency tests.
