# Architecture overview

**Status:** Current implementation guide; accepted rationale and superseded decisions remain in the ADRs.

**Updated:** 2026-10-31

Dokimos implements the ObraFlow purchase-order and sequential-approval challenge. Business authority belongs to the API and PostgreSQL. The browser provides validation, workflow context and explicit recovery without determining persisted financial or approval state.

## Workspaces and boundaries

| Workspace | Responsibility |
| --- | --- |
| `apps/api` (`@dokimos/api`) | Fastify 5/TypeScript modular monolith; authentication, authorization, services, TypeORM persistence and Socket.IO hints |
| `apps/web` (`@dokimos/web`) | React/Vite SPA; React Router Declarative routes, feature-owned reads/drafts and accessible workflows |
| `apps/shared` (`@dokimos/shared`) | Compiled pure Zod request/transport schemas and DTO types, without browser, server or database dependencies |

Routes validate and delegate to services. Services own preconditions and complete transactions; domain modules own entities and repositories. PostgreSQL schema changes use hand-written TypeORM migrations with `synchronize: false`. See [code organization](code-organization.md) and [persistence boundaries](persistence.md).

## Identity and business authority

Seeded or ADMIN-provisioned users authenticate with username/password (Argon2id) and short-lived JWTs. The local-challenge browser stores the JWT in `sessionStorage` and sends an explicit Bearer header; this has acknowledged XSS exposure and lacks production session revocation/recovery. Restored sessions are checked through `/auth/me`. The API resolves current activity and role from the database.

Ordinary PO access requires project membership. ADMIN has broad reads and administration authority, but must be an explicit member to create a PO and cannot approve another user's step. Only the current active assigned project member may decide. Rejection requires a reason and ends the workflow; final approval completes it. No PO draft, cancellation, decision editing or approval bypass exists. See [ADR-003](../decisions/ADR-003-authentication-authorization.md), [ADR-005](../decisions/ADR-005-project-membership-authorization.md) and [ADR-007](../decisions/ADR-007-purchase-order-approval-lifecycle.md).

## CoA, money and persistence

Each project's cumulative CoA introduces one approver per level, retaining all preceding approvers at higher amounts. Finite limits are inclusive and the final band is unlimited. Independent chains per range are intentionally unsupported. Publication submits the entire ladder with `expectedCoaVersion`; genuine changes increment the version and append a complete immutable revision. The editor keeps local drafts until explicit publication and preserves them across conflicts or uncertain outcomes. See [ADR-006](../decisions/ADR-006-cumulative-approval-escalation.md).

Quantities and BRL amounts use exact decimal strings. `decimal.js` rounds each quantity × price line HALF_UP to cents, then sums the rounded lines. The API calculates/persists totals and snapshots the applicable CoA revision and required steps during creation. Later configuration changes never rewrite existing orders. See [ADR-008](../decisions/ADR-008-monetary-precision-calculation.md).

PO creation atomically commits header, items, total and assignments. Project locks serialize creation with CoA publication and project lifecycle/membership changes; user/supplier locks protect eligibility against deactivation. A PO row lock and expected-step check serialize decisions. Consistent read projections provide coherent detail, list/count/distribution, membership, CoA and audit results. Foreign keys and check/uniqueness constraints reinforce service rules. Exact lock order and isolation are documented in [persistence boundaries](persistence.md).

## Application surfaces

| Route | Implemented workflow |
| --- | --- |
| `/login` | Credentials or demo personas through normal password authentication |
| `/purchase-orders` | URL-filtered paginated list, saved approval chains, view counts from response `distribution`, explicit refresh |
| `/purchase-orders/new` | Dedicated creation page with local items, exact preview and final confirmation dialog |
| `/purchase-orders/:id` | Items, immutable history and detail-first approve/reject actions; terminal actions disabled with an explanation |
| `/admin/projects`, `/admin/projects/:id` | Create, active-only rename, archive/reactivate, guarded membership management and explicit version-checked CoA publication |
| `/admin/users`, `/admin/suppliers` | Create and confirmed logical deactivation; active suppliers also support rename |
| `/admin/audit` | Read-only paginated history explorer with filters, source links and detail drawer |

Decisions require opening detail rather than mutating from the list; [ADR-010](../decisions/ADR-010-detail-first-purchase-order-decisions.md) records the trade-off against the challenge's list-action requirement. PO creation is non-idempotent: uncertain results require explicit consultation/reconciliation, never automatic retry. A per-user submission marker survives navigation/reload, while unsaved fields remain ephemeral.

New projects have no members or configured ladder. Project-list `membership` summaries provide counts and caller membership in one read. Membership removal is blocked by published-CoA assignments and undecided steps on pending POs. Pending POs block archiving; archived projects retain consultation/history but reject new orders, renames and membership/CoA writes. Reactivation retains the same ID/history. User deactivation has CoA/pending-step blockers; supplier deactivation leaves existing orders intact. No application hard deletion rewrites history.

The ADMIN audit endpoint composes retained PO/decision records, CoA revisions, user lifecycle, project lifecycle/membership events and supplier lifecycle/rename records. It is application-level history, without database-level tamper-proof guarantees or a generic event store. See the [API contract](../api.md).

## Frontend composition and presentation

Features own screens, API calls, scoped reads and drafts. React Router owns paths/URL filters; `lib/api.ts` owns transport/error handling; auth owns session foundations. There is no global response cache or periodic polling. Shared Zod validation supplies early feedback; backend checks remain authoritative. Newer confirmed writes/reconciliation invalidate older reads, and uncertain writes remain distinct from definite API failures.

Desktop uses a collapsible sidebar with account controls and no persistent global header. Mobile has a minimal menu/brand/avatar bar, a navigation-only drawer and a separate account popover opened from the header avatar. Page titles, filters and primary actions belong to pages. Shared shadcn Base UI primitives, Tailwind v4, CSS Modules and semantic tokens support light/dark/system themes, focus management and reduced motion. See [frontend workflows](frontend.md) and the [UI guide](../../apps/web/src/components/ui/README.md).

## Notifications and execution

Authenticated WebSocket-only Socket.IO delivers best-effort hints after committed PO creation/decisions. The frontend shows toasts and a browser-local per-user inbox; it reads REST detail before acting. There is no durable server inbox, replay, acknowledgement or delivery guarantee. Missing/stale hints never establish workflow state or trigger writes. PostgreSQL and REST remain authoritative. See [ADR-011](../decisions/ADR-011-best-effort-realtime-po-notifications.md) and [realtime backend](realtime.md).

Local development uses API 4000, Vite 5173 and Compose PostgreSQL on host port 6000 by default. `npm run review` (or `docker compose -f compose.review.yaml up --build`, which needs only Docker) builds the API and web images, starts a separate PostgreSQL with its own volume, migrates and seeds it, and serves everything behind nginx at `http://localhost:8080`; it does not share data with development. Deployment/proxy boundaries, including WebSocket forwarding and the single-API-instance limitation, are documented in the [deployment guide](../deployment.md); the hosted demo's specifics are in [`stackport/`](../../stackport/README.md).

CI installs locked dependencies, checks formatting/lint, builds, type-checks API/browser tests and runs the quick test tier (PostgreSQL-backed API tests, the front-end unit tests and the UI-only acceptance journey) against a disposable database. The larger browser regression suite is run locally with `npm test -- all`. Workflow configuration describes checks, not a verified result for every candidate. Use the [submission checklist](../submission-checklist.md) for commands and reviewer verification.
