# ADR-009 — HTTP API Contract

**Status:** Accepted (2026-10-20) — Phase 1 HTTP contract. Database lock ordering and minor schema bounds are implementation details.  
**Scope:** ObraFlow challenge  
**Related:** [ADR-003](ADR-003-authentication-authorization.md), [ADR-005](ADR-005-project-membership-authorization.md), [ADR-006](ADR-006-cumulative-approval-escalation.md), [ADR-007](ADR-007-purchase-order-approval-lifecycle.md), [ADR-008](ADR-008-monetary-precision-calculation.md)

## Accepted subset: purchase-order success responses

**Decision accepted 2026-10-20:** Use compact, paginated summaries for PO lists and full representations for creation, details, and approval decisions.

| Operation | Success response |
| --- | --- |
| `GET /purchase-orders` | Paginated purchase-order **summaries**; not full item and decision history per row |
| `GET /purchase-orders/:id` | Full purchase-order detail including header, items, supplier, effective approval steps and decision history |
| `POST /purchase-orders` | `201 Created` and **full created order** calculated and snapshotted by the server |
| `POST /purchase-orders/:id/decisions` | `200 OK` and **full updated order** after the accepted approval/rejection, avoiding a mandatory follow-up GET |

This does not introduce a writable status/current-step API, and responses must reflect current authorization and the state committed by the backend.

### Accepted additive list-chain summary (2026-10-22)

The approval-workflow clarity request adds `approvalSteps` to each existing compact list row. Each entry contains `stepIndex` (zero-based), `approverId`, `approverName` and `state`: `APPROVED`, `REJECTED`, `CURRENT`, `UPCOMING` or `SKIPPED`. Entries are ordered by the persisted PO assignment snapshot, with decisions determining completed states; only pending orders have a current step. Undecided steps after rejection are `SKIPPED`, without fabricating decision records. Names resolve the assigned user identity, including inactive users; active CoA edits never reconstruct or replace the chain.

This is an additive response extension, preserving existing fields, filters, authorization and pagination. List rows still omit items and full decision timestamps/reasons. Status, counts, current approver and chain are read from the same consistent database snapshot. No new endpoint, persisted workflow cursor or writable state is introduced.

### Detail representation: accepted structural requirements

- Include order ID, project and supplier identity, order date, creator, optional notes, persisted PO status, calculated total, and applied `coaVersion`.
- Include all submitted items and their authoritative, exact-decimal quantity/unit-price/rounded-line-total values.
- Include `supplier` with `isActive`, so already pending POs can display a warning when the supplier has since been deactivated; this does **not** invalidate or alter the PO.
- Include `steps` in the snapshotted order, each with its assigned approver and either an associated recorded decision (type, actor, server time, and rejection reason if rejected) or `decision: null`. This is an API read model that combines **separate immutable assignment and decision records** (ADR-007); it is not a requirement to persist a mutable combined row.
- Include `currentApproval` as a backend-derived object identifying current step and assigned approver while `PENDING`, otherwise `null`. **Do not persist `currentStepIndex`.**
- Do not use JavaScript float numbers for authoritative quantity, unit prices, line totals, PO total, or CoA limits; serialize them as decimal strings per ADR-008.
- Do not expose user credentials, private identity metadata, or unauthorized resource data.

Illustrative *partial* detail body showing approval projection (not an exhaustive contract for every key):

```json
{
  "id": "po-123",
  "projectId": "project-1",
  "supplier": { "id": "supplier-1", "name": "Fornecedor ABC", "isActive": true },
  "status": "PENDING",
  "total": "12500.00",
  "coaVersion": 3,
  "currentApproval": { "stepIndex": 1, "approverId": "amanda-id" },
  "steps": [
    {
      "stepIndex": 0,
      "approverId": "joao-id",
      "decision": { "type": "APPROVED", "actorId": "joao-id", "decidedAt": "2026-10-20T14:32:00Z" }
    },
    { "stepIndex": 1, "approverId": "amanda-id", "decision": null }
  ]
}
```

The full result also includes order date, creator, notes and items. Exact ancillary JSON keys, pagination metadata, nested user display objects and timestamp formatting should be specified during DTO implementation; do not construe illustrative IDs as actual UUID schema.

### Reasons and trade-offs

- Paginated summaries keep approval lists responsive without loading N line items and full histories for every row.
- Full detail responses make the order screen self-contained and preserve the necessary review context.
- Returning the full updated order on a decision avoids an obligatory second request and ensures the frontend receives the backend's authoritative post-transaction view.
- Combining steps with decisions in the response reduces frontend joins without compromising the immutable persistence design.
- The current actionable step is computed by the backend from recorded facts rather than maintained as redundant mutable data.

## Accepted subset: PO listing pagination (2026-10-20)

**Decision:** Use simple **page-based pagination**, not cursor pagination, for the purchase-order listing. The backend filters by current user visibility before counting and slicing results. This is proportionate to the challenge dataset and easy to implement and consume.

- Request parameters: `page` (1-based; example/default `1`), `pageSize` (example/default `20`), and optional `status`, `projectId`, `actionableByMe` filters.
- `actionableByMe=true` is resolved against the authenticated user and the **currently actionable snapshotted approval step**; it is not a client-supplied approver ID. A PO whose current approver is somebody else is not actionable by the caller, even if the caller approved an earlier step. Completed or rejected orders are never actionable.
- Default order is **newest first**, with a stable **order ID tie-breaker** to make sorting deterministic when timestamps are identical. Pagination and authorization/filtering run at the database query level, rather than fetching all POs and filtering in the browser.
- Success response has a `data` array of compact PO summaries and a `pagination` object containing numeric `page`, `pageSize` and `total`. Empty results use `data: []` and `total: 0`; never `null`.
- Page/size parsing validates positive whole-number values, returning the accepted `400` error envelope for invalid inputs. An overlarge requested page may simply return an empty `data` array; it does not imply a nonexistent resource.
- The `total` count reflects **authorized, filtered records**, never hidden project orders.
- Simple offset-based pagination can show shifted items if new orders are inserted between separate page requests. That is an acknowledged, acceptable limitation for this challenge; no snapshot isolation across user browsing requests is promised.

Example success response:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 0
  }
}
```

**Accepted maximum:** `pageSize` must be between `1` and `100` (inclusive); the default is `20`. Invalid or excessive page sizes are rejected using the agreed `400` validation envelope, never silently allowed to request an unlimited number of records. Additional list filters remain outside the accepted surface unless explicitly decided later.

## Accepted subset: endpoint inventory and URL prefix (2026-10-20)

All endpoints below are under **`/api/v1`**. The list is the accepted Phase 1 API surface; it is not an invitation to generate CRUD handlers for every persistence table.

| Area | Method/path after `/api/v1` | Access / intent |
| --- | --- | --- |
| Authentication | `POST /auth/login` | Public credential login |
| Authentication | `GET /auth/me` | Authenticated current identity |
| Users | `GET /users` | Authenticated account listing |
| Users | `POST /users` | ADMIN provisions `USER` only |
| Users | `DELETE /users/:id` | ADMIN logically disables an ordinary user; never the seeded admin |
| Projects | `GET /projects` | Authenticated, visibility-filtered |
| Projects | `POST /projects` | ADMIN creates project |
| Membership | `GET /projects/:id/members` | Project member or ADMIN reads membership |
| Membership | `POST /projects/:id/members` | ADMIN adds project member |
| Suppliers | `GET /suppliers` | Authenticated; support active suppliers for selection and historical inactive identity |
| Suppliers | `POST /suppliers` | ADMIN creates supplier |
| Suppliers | `DELETE /suppliers/:id` | ADMIN logically deactivates supplier for future POs only |
| Active CoA | `GET /projects/:id/coa` | Project member or ADMIN reads current ladder |
| Active CoA | `PUT /projects/:id/coa` | ADMIN atomically replaces entire ladder with optimistic expected version |
| CoA revisions | `GET /projects/:id/coa/revisions` | ADMIN read-only historical ladder revisions |
| Purchase orders | `GET /purchase-orders` | Authenticated, project-visibility filtered, paginated |
| Purchase orders | `POST /purchase-orders` | Authenticated project member submits a new PO |
| Purchase orders | `GET /purchase-orders/:id` | Project member or ADMIN full detail |
| Decisions | `POST /purchase-orders/:id/decisions` | Current assigned, active project-member approver decides |

> **Current inventory.** The Phase 1 list below was the baseline and later dated sections extend it (audit explorer, member removal, project lifecycle, supplier rename, view counts). The implemented surface is 25 REST operations; the authoritative table is the [endpoint index in `api.md`](../api.md#endpoint-index).

**Deliberately excluded from Phase 1:** project deletion, project membership removal, role promotion or extra-admin creation, supplier editing/reactivation, PO editing/cancellation, approval-decision revocation, independent CoA band mutations, and mutable historical revision endpoints.

**Rationale:** The API follows business operations: replace active CoA atomically, query its immutable history, create a PO with backend authority, and append an approval decision. It does not expose implementation-only tables as CRUD resources. An ADMIN-only historical CoA read endpoint makes rule changes inspectable without a separate UI.

## Accepted extension: admin-only audit explorer (2026-10-22)

The **original Phase 1 inventory of 19 endpoints remains the baseline**. A later explicitly accepted extension adds **one read-only endpoint** under the same prefix:

| Area | Method/path after `/api/v1` | Access / intent |
| --- | --- | --- |
| Audit | `GET /audit/events` | ADMIN-only paginated chronological history assembled from existing stored records |

The matching frontend route is `/admin/audit` under **Administração**. Implement it **after** the required PO creation, project/membership/CoA, and user/supplier screens; it belongs **before** optional Phase 2 polling in the implementation order.

Read sources are `approval_decisions` with the associated immutable PO steps, `coa_revisions`, `user_lifecycle_events`, and PO creation metadata. A chronological event can link to the source order/project/user record when one is available. Support pagination and modest filtering (e.g. event type and project where relevant), without needing a dedicated event-log table. The exact names of optional filters and normalized event DTO remain implementation-level API elaboration. Always enforce current ADMIN authorization server-side; do not expose password hashes, JWTs, or other private credential content.

No mutation endpoints or generalized table CRUD are approved. In particular, do not call the entire database **tamper-proof** merely because some history is append-only in application behavior. Supplier deactivation stores original actor/time metadata but is not a separate complete lifecycle-event stream.

## Accepted subset: logical-deactivation responses (2026-10-20)

Both `DELETE /users/:id` and `DELETE /suppliers/:id` use the **same success convention**:

| Case | HTTP status | Effect |
| --- | --- | --- |
| Authorized first deactivation of an eligible active target | `204 No Content` | Atomically mark inactive and record the original deactivation actor/time; user deactivation also appends the required lifecycle audit event |
| Authorized repeated deactivation of an already inactive target | `204 No Content` | No state change, no new audit entry, no overwritten original metadata |
| Unknown target ID | `404 Not Found` | Nothing changes |
| Authenticated user without deactivation permission | `403 Forbidden` | Nothing changes |
| Active user still in current CoA or assigned to an undecided pending PO step | `409 Conflict` | Nothing changes; no audit entry |
| Unauthenticated request | `401 Unauthorized` | Nothing changes |

**Responses with `204` contain no JSON body**. Authenticate and authorize the operation before checking the target. The seeded administrator is not an eligible target for user deactivation under ADR-004; this exception is **not** bypassed by the repeated-call convention. An inactive existing target is idempotently accepted even when the caller's original request was not observed (e.g., due to a connection error).

This is **not** a general idempotency promise for `POST /purchase-orders`: distinct successful order submissions still create distinct POs under ADR-007. Repeated soft-deactivation requests do not result in new audit records. Supplier deactivation still only restricts **new** orders, not pending decisions.

## Accepted subset: purchase-order request DTOs (2026-10-20)

Both request bodies use strict schema validation: reject unknown keys rather than silently accepting fields that appear to carry trusted workflow authority. Error output follows ADR-003's `400` validation envelope with field paths and Portuguese messages.

### `POST /api/v1/purchase-orders`

```json
{
  "projectId": "project-1",
  "supplierId": "supplier-1",
  "orderDate": "2026-10-20",
  "notes": "Materiais para a etapa de fundação.",
  "items": [
    {
      "description": "Material de construção",
      "quantity": "5.000",
      "unit": "un",
      "unitPrice": "2500.00"
    }
  ]
}
```

- Required: `projectId`, `supplierId`, `orderDate`, and `items` containing at least one item with nonblank `description`, nonblank `unit`, positive decimal-string `quantity` and nonnegative decimal-string `unitPrice`.
- Optional: `notes` (free text); omission must not cause a validation error.
- `orderDate` is a real **calendar date** in `YYYY-MM-DD` format, separate from the trusted, server-generated creation timestamp `createdAt`. The request never supplies `createdAt`.
- `quantity` respects the accepted `NUMERIC(12,3)` precision and `unitPrice` the accepted `NUMERIC(14,2)` precision. Validate representation, precision and range **before** calculation or DB insertion; do not trust JS binary float or database rounding/coercion (ADR-008).
- `total`, `lineTotal`, `status`, `createdBy`, `coaVersion`, `approverIds`, approval steps/decisions, or other unrecognized fields are forbidden client inputs. The backend determines identity, PENDING state, round-per-line calculations, total, applicable CoA version, and complete approval-step snapshot.
- Before commit, verify caller is an active project member, supplier is active, project has a valid active CoA, and resolve the CoA from the backend-computed total in a **single consistent creation transaction** under ADR-005/006/007.
- Success: `201 Created` with the complete created PO as already accepted; no idempotency key or server deduplication in Phase 1.

### `POST /api/v1/purchase-orders/:id/decisions`

Approve:

```json
{ "expectedStepIndex": 0, "decision": "APPROVED" }
```

Reject:

```json
{
  "expectedStepIndex": 0,
  "decision": "REJECTED",
  "reason": "O preço precisa ser renegociado."
}
```

- `decision` is the exact discriminator `APPROVED` or `REJECTED`.
- `expectedStepIndex` is a required, **zero-based, nonnegative integer**. It is an optimistic guard against acting on a stale UI, **not** authorization to choose or skip a step.
- A request with `decision: "APPROVED"` must not include `reason`; a request with `decision: "REJECTED"` must include a nonblank `reason`. Validate this as a strict discriminated union, reporting missing/blank reasons using `400`.
- Clients never supply decision actor, decision time, PO status, or replacement approval assignment. The server derives the current undecided step, checks active project membership and the assigned approver, and atomically inserts an immutable decision with server-generated actor/time (ADR-007).
- For an authenticated caller who **can see the PO** but is not the current assigned approver, return `403`. When the assigned approver's expected step is stale, or the PO is already terminal, return `409` with no mutation. For an individual PO outside the caller's visibility, return concealing `404`; unauthenticated requests return `401`.
- Success: `200 OK` with the complete **updated** PO representation, including derived current approval and current supplier active state.

**Important distinction:** Missing/invalid fields yield `400`; concurrency or already-finalized state yields `409`. Authenticated users cannot use the expected step index to approve someone else's assigned step.

## Accepted subset: simple administrative input DTOs and login identifier (2026-10-20)

**Identity is an immutable user ID, not the username.** Phase 1 demo users sign in with a **unique username and password** instead of an email address. Users have an immutable UUID `id` for JWT `sub`, PO creator/decision actor IDs, CoA approver references, and membership FKs. `displayName` is presentation-only; the username is a credential lookup key, not a foreign key or authorization input. No email verification/invitations or mandatory email field.

| Endpoint | Accepted request JSON | Success |
| --- | --- | --- |
| `POST /api/v1/auth/login` | `{"username":"joao","password":"demo-password"}` | Token/authentication response; exact success DTO remains to be finalized |
| `POST /api/v1/users` | `{"username":"joao","displayName":"João","password":"initial-password"}` | `201 Created` with a safe user representation |
| `POST /api/v1/projects` | `{"name":"Obra 1"}` | `201 Created` with created project |
| `POST /api/v1/projects/:id/members` | `{"userId":"user-uuid"}` | Membership created; duplicate `(projectId,userId)` returns `409 Conflict` |
| `POST /api/v1/suppliers` | `{"name":"Fornecedor ABC"}` | `201 Created` with created supplier |

Input rules:
- `username`, `displayName`, `password`, and names are required where shown. Usernames are unique for all users; preserve a stable UUID user identity independent of the chosen human login handle. Concrete length and character-set bounds remain implementation-level. Lowercase canonicalization and case-insensitive uniqueness are already accepted in the read-contract section.
- On `POST /users`, the backend supplies `role: "USER"` by default. An explicitly supplied `role: "USER"` may be accepted, but `role: "ADMIN"` must be **rejected** (do not ignore, promote, or create another admin), per ADR-004. Creation and deactivation are administrator-only and auditable.
- User creation hashes the initial password with Argon2id; no API response may contain password or `passwordHash`. Authentication rejects invalid credentials with the previously accepted generic `401`.
- Adding a project member references an existing, active user; a project membership is unique by project and user. Adding an already present membership returns `409` without a duplicate row. The Phase 1 API does not remove membership.
- Only an admin can create projects and suppliers. Each newly created supplier is initially active and becomes unavailable to new POs only after explicit logical deactivation. No supplier edit or reactivation route is introduced.
- Request fields beyond the defined input contract are rejected instead of silently saved; validation failures use `400`. Resource visibility and permissions still follow ADR-003/005.

### Atomic CoA replacement

`PUT /api/v1/projects/:id/coa` accepts:

```json
{
  "expectedCoaVersion": 2,
  "bands": [
    { "upperLimit": "10000.00", "approverId": "joao-id" },
    { "upperLimit": null, "approverId": "amanda-id" }
  ]
}
```

- `expectedCoaVersion` is a required nonnegative integer; `0` means the project has not yet had a configured CoA. A stale value produces `409` and no changes.
- `bands` is the **entire replacement ladder**, not a patch. There must be at least one band, ordered as a strictly increasing finite `upperLimit` sequence followed by **one** final `null` (unbounded) band. The backend validates uniqueness, limits, active project membership/eligibility, continuous monetary coverage, and the cumulative approval prefix as specified in ADR-006.
- Finite limits are exact decimal strings (up to 2 fractional digits, `NUMERIC(18,2)`); the final `null` is the only allowed unlimited marker. The client may not supply persisted revision actor/time or force the stored version.
- Validate and replace the full ladder atomically under the project-row lock, verify the expected version, and append the complete immutable CoA revision before committing. Existing POs retain their original CoA versions and snapshotted approval steps.
- **Success:** `200 OK` with the new `coaVersion` and complete authoritative saved `bands` representation. This allows the configuration editor to reset local draft state from the saved result. No new revision is created for an identical, normalized ladder **when the supplied expected version matches**. In this no-op case return `200 OK` with the unchanged `coaVersion` and authoritative bands. Always check the expected version **before** comparing content; a stale version returns `409` even when its bands match the current ladder. A genuine change increments the version exactly once and persists one immutable complete revision.

All IDs shown in examples are placeholders. The accepted identity choice specifically requires user UUIDs; do not interpret sample strings as an alternate database key strategy.

## Accepted subset: simple read DTOs and remaining response conventions (2026-10-20)

**Response convention:** Simple collection reads return `{ "data": [...] }`. PO list responses additionally include their accepted `pagination` metadata. Singular reads such as `GET /auth/me` or `GET /projects/:id/coa` return one direct object, not a collection envelope. Avoid exposing stored password hashes or other credential secrets.

| Endpoint | Accepted success representation |
| --- | --- |
| `GET /api/v1/auth/me` | `{id, username, displayName, role}` for the currently authenticated active user |
| `GET /api/v1/users` | `{data: [{id, username, displayName, role, isActive}, ...]}`; include inactive users for historical references |
| `GET /api/v1/projects` | `{data: [{id, name, coaVersion}, ...]}`; include **only projects visible to the caller** |
| `GET /api/v1/projects/:id/members` | `{data: [{userId, displayName, isActive}, ...]}`, for authorized project members/admins |
| `GET /api/v1/suppliers` | `{data: [{id, name, isActive}, ...]}`; include inactive suppliers for historical references; new-PO UI excludes inactive options |
| `GET /api/v1/projects/:id/coa` | `{projectId, coaVersion, bands}` with a complete ordered ladder |
| `GET /api/v1/projects/:id/coa/revisions` | `{data: [{version, changedById, changedAt, bands}, ...]}`; immutable complete historical ladders, **newest version first**, ADMIN-only |
| `POST /api/v1/projects/:id/members` | `201 Created` with the newly created membership; existing membership yields `409`, no duplicate |
| `POST /api/v1/auth/login` | `{accessToken, tokenType: "Bearer", expiresIn, user: {id, username, displayName, role}}` after successful credential verification |

The `expiresIn` field is the issued access token's lifetime in **seconds**. The sample `1800` seconds from the discussion is **illustrative**, not a decision on the actual configurable JWT TTL, which remains open in ADR-003.

**Unconfigured CoA convention:** An existing authorized project with no configured approval ladder returns `200 OK`, **`coaVersion: 0`**, and **`bands: []`**. It is not a `404` and must not allow PO creation (ADR-006). `PUT` returns `200 OK` with the new authoritative `coaVersion` and saved complete `bands`.

**Username normalization and uniqueness:** `username` is the local demo login identifier, not the immutable user identity. Store canonical lowercase usernames and enforce **case-insensitive uniqueness**, including for seeded users and admin-created users. Normalize the username consistently for both creation and login. Display names keep their intended capitalization/accents. JWT `sub` and all domain references continue to use the immutable user UUID.

Other agreed conventions:
- `GET /users` and `GET /suppliers` expose active state rather than hiding historical identities. The client must filter or disable inactive options on selectors; backend eligibility checks remain authoritative.
- Simple lists return `data: []` when empty, not `null`.
- New users, projects, and suppliers return `201 Created` with their safe created resource as already agreed; user creation never echoes the supplied password.
- The accepted PO summary and detail representations remain separate: listings are compact, while full PO details include the immutable approval history and supplier activity state.

Illustrative authentication response:

```json
{
  "accessToken": "<signed JWT>",
  "tokenType": "Bearer",
  "expiresIn": 1800,
  "user": {
    "id": "user-uuid",
    "username": "joao",
    "displayName": "João",
    "role": "USER"
  }
}
```

Illustrative active-CoA read for an unconfigured project:

```json
{
  "projectId": "project-1",
  "coaVersion": 0,
  "bands": []
}
```

## Additive membership removal (2026-10-23)

`DELETE /api/v1/projects/:id/members/:userId` is ADMIN-only, extending the original 19 endpoints plus audit to 21 endpoints. This supersedes only the prior membership-removal exclusion. It takes no request body and returns empty `204` after removing the association, or when it is already absent for an existing project and user. Unknown project/user returns `404`; malformed UUIDs return `400`; authentication/role failures remain `401`/`403`.

Removal returns `409 MEMBER_ASSIGNED_TO_ACTIVE_COA` while the published project ladder references the member, or `409 MEMBER_HAS_PENDING_APPROVALS` for any undecided assignment on a pending project PO (current or future). Both use the standard error envelope. Active-CoA protection is checked first. An administrator must explicitly publish an eligible replacement ladder and resolve pending assignments before retrying; no automatic reassignment is supported. See ADR-005's 2026-10-23 extension for visibility and history guarantees. Membership removal is independent of CoA publication and creates no revision or lifecycle event.

The transaction serializes on the project then user, like publication/creation, and reads pending blockers without taking PO locks in reverse order. Repeated requests are safe, but clients refresh after uncertain outcomes instead of automatically replaying writes.

## Already accepted in other ADRs, not reopened here

- [ADR-003](ADR-003-authentication-authorization.md) pins `400` validation, `401` authentication, `403` authorization, concealing `404` for unseen individual resources, and `409` business-state/concurrency conflict semantics, plus one `error` envelope with stable `code`, Portuguese `message`, and always-present array-valued `details`.
- [ADR-004](ADR-004-admin-user-provisioning.md) pins a single seeded admin, provisioning only regular users, auditable logical user deactivation.
- [ADR-005](ADR-005-project-membership-authorization.md) pins project-scoped PO access, supplier reference/deactivation rules, and admin-only supplier management.
- [ADR-006](ADR-006-cumulative-approval-escalation.md) pins atomically replaced CoA and optimistic version checks.
- [ADR-007](ADR-007-purchase-order-approval-lifecycle.md) pins immutable approval decisions, a persisted status projection, and no server-side PO deduplication or idempotency in Phase 1.

## Accepted subset: stable business-state conflict codes (2026-10-20)

Use the following stable English values for `error.code` in the common ADR-003 error envelope. Portuguese `error.message` text communicates the action needed. These are application semantics, not separate custom HTTP statuses.

| `error.code` | HTTP | Context |
| --- | --- | --- |
| `COA_VERSION_CONFLICT` | `409` | `expectedCoaVersion` differs from the current version |
| `APPROVAL_STEP_CONFLICT` | `409` | Expected approval step is stale, including a retry after that step was decided while the PO remains pending |
| `ORDER_ALREADY_DECIDED` | `409` | A decision is attempted on an approved/rejected terminal PO |
| `SUPPLIER_INACTIVE` | `409` | Otherwise valid new PO selects an existing inactive supplier |
| `USER_HAS_PENDING_APPROVALS` | `409` | User deactivation blocked by at least one undecided step on a pending PO, including future steps |
| `USER_ASSIGNED_TO_ACTIVE_COA` | `409` | User deactivation blocked because the current active CoA names the user |
| `MEMBERSHIP_ALREADY_EXISTS` | `409` | Requested `(projectId, userId)` membership already exists |
| `USERNAME_ALREADY_EXISTS` | `409` | Canonical lowercase username is already registered |
| `PROJECT_COA_NOT_CONFIGURED` | `409` | PO creation attempts to use a project without a configured, usable approval ladder |

**Classification and check ordering:**
- Malformed JSON, invalid decimal formats/precision, missing rejection reason, invalid complete CoA ladder and other invalid *input content* return `400`.
- A caller who cannot see an individual PO receives concealing `404` before workflow-specific status disclosure. Only the authenticated, authorized resource context may reveal `409` business-state details.
- For a visible PO decision: check whether the order is terminal (`ORDER_ALREADY_DECIDED`) and whether the expected current step is stale (`APPROVAL_STEP_CONFLICT`) before checking whether the caller is the assigned approver at the **current** step (`403`). The expected step remains a concurrency guard, never an authorization grant.
- A user blocked by both active CoA membership and undecided POs may be given either documented conflict code; the frontend should provide a clear corrective explanation. Both blockers must be enforced transactionally and neither can be ignored.
- Unexpected server faults use generic `500` output, never expose SQL errors or implementation traces.

## Accepted subset: idempotent CoA no-op and consistent reads (2026-10-20)

- `PUT /projects/:id/coa` checks the client's expected version against the current locked project version **first**. A stale expected version always returns `409`, including when the requested ladder is textually or semantically the same.
- When versions match, validate and canonicalize the proposed full ladder. If it is semantically identical to the active ladder (same ordered approver UUIDs and exact-decimal thresholds), return `200` with the unchanged version and ladder; create **no** audit revision and perform no active-band rewrite.
- If the normalized ladder differs, atomically replace bands, increment `coaVersion` by one and append exactly one immutable full-ladder revision. No partial publish, mixed revision snapshot or silent mutation of existing PO assignments is allowed.
- A full purchase-order detail read must present a **single consistent database state** for persisted PO status, items, assignment steps and recorded decisions. Do not assemble a pre-decision status and post-decision history from unsynchronized queries. Use a single coherent database query or a transaction with an appropriate consistent read snapshot; plain multi-query `READ COMMITTED` reads alone do not provide a common snapshot. The authoritative `currentApproval` is derived from these consistent records, not persisted separately.
- Creation and update responses must likewise reflect the committed operation without producing an internally inconsistent workflow representation. The API contract specifies the invariant, not a TypeORM-specific ORM method, query strategy, or global isolation level.

## Implementation details deliberately left to coding, not new ADR acceptance gates

- Exact maximum string lengths/username character set, normalized input schema refinements, and incidental optional response properties.
- Concrete PostgreSQL lock acquisition order and TypeORM transaction implementation to honor ADR-004/005/006/007 races, including cross-project deactivation, supplier activity checks and PO decision transitions.
- Database indexes and read-query implementation for pagination and internally consistent full PO detail projections. Implement these against PostgreSQL and verify with concurrency integration tests; no need to reserve ADR-009 as pending.

**Result:** ADR-009 fixes the Phase 1 HTTP contract. Further implementation details should be reviewed as code unless they change an accepted domain or API guarantee.


## Project lifecycle extension (2026-10-30)

Three ADMIN-only additive endpoints under `/api/v1`:

| Endpoint | Body | Success |
| --- | --- | --- |
| `PATCH /projects/:id` | `{name}` (trimmed, 1–150 characters, strict creation schema) | `200` authoritative project |
| `POST /projects/:id/archive` | None | `200` authoritative archived project |
| `POST /projects/:id/reactivate` | None | `200` authoritative active project |

Project representations now include required `isActive: boolean` (existing rows default to true through migration). Lifecycle mutations retain `401`/ADMIN-only `403`, UUID validation `400`, and missing-project `404`. Repeated archive/reactivate is a successful no-op. Rename requires an active project (an archived one returns `409 PROJECT_ARCHIVED`) and preserves identity/relationships. No physical deletion.

`409 PROJECT_HAS_PENDING_ORDERS` explains that pending approvals/rejections must finish before archive. `409 PROJECT_ARCHIVED` rejects PO creation, CoA publication, and membership addition/removal while archived. Existing authorization/visibility checks remain in force, including concealed nonmember reads/creation. REST reads continue to include authorized archived projects and their history; filtering the admin list and creation choices is page-owned. The subsequent audit-coverage amendment below adds event types without adding endpoints.

## Administration audit coverage (2026-10-30)

The existing ADMIN-only `GET /audit/events` now also accepts/returns `PROJECT_CREATED`, `PROJECT_RENAMED`, `PROJECT_ARCHIVED`, `PROJECT_REACTIVATED`, `PROJECT_MEMBER_ADDED`, `PROJECT_MEMBER_REMOVED`, `SUPPLIER_CREATED`, and `SUPPLIER_DISABLED`. No write endpoint or additional public endpoint is introduced. Existing filtering, chronological/source-key ordering, pagination, consistent count/page snapshots, auth and business conflicts remain unchanged.

Project administration appends a narrowly scoped `project_lifecycle_events` record in the mutation's own transaction. Its safe details are `{projectName, previousName, isActive, member}`; `previousName` is null except on rename, and `member` is null except on membership events, where it includes `{userId, username, displayName}`. The resource is `PROJECT` with the stable project ID and the name recorded for that event. Actor comes from verified identity; explicit seed operations use `SYSTEM`. Repeated normalized rename, archive/reactivate, or removal of an absent membership adds no event. Duplicate addition, blocked/unauthorized commands and rolled-back writes add no event. Audit insertion failure rolls back the domain change.

Supplier events project retained `created_at/created_by` and `deactivated_at/deactivated_by`; names resolve from the retained supplier record. Their resource kind is `SUPPLIER`, project is null, and details are `{name, isActive}` representing creation or deactivation. Repeated deactivation retains its original metadata/event. When old supplier metadata lacks the actor, `{kind:"UNKNOWN", id:null, displayName:"Não registrado"}` conveys the absence; it is never relabeled as `SYSTEM`. Known actors remain `USER`.

Project/membership coverage begins with this migration and subsequent operations. No inferred legacy creator, historical rename or removed association is backfilled. Supplier metadata already persisted can appear immediately. Project-event names/member snapshots are retained across later rename/removal/readdition/deactivation. This specifically extends the earlier read-only projection/no-new-history scope using a domain-specific history table, not a generic event store or event-sourced workflow. Application append-only behavior is not a database tamper-proof guarantee.

## Supplier rename (2026-10-30)

One ADMIN-only additive endpoint under `/api/v1`:

| Endpoint | Body | Success |
| --- | --- | --- |
| `PATCH /suppliers/:id` | `{name}` (trimmed, 1–150 characters, strict creation schema) | `200` authoritative supplier `{id, name, isActive}` |

The rename changes `suppliers.name` and appends one row to the new `supplier_renames` table (migration `SupplierRenames2026103000002`: supplier, acting ADMIN, previous and new name, time). Purchase-order snapshots are unaffected, since they reference the supplier by ID. It requires an active supplier (an inactive one returns `409 SUPPLIER_INACTIVE`) and is a successful no-op when the name is unchanged. Authorization and error semantics match the other supplier writes (`401`, ADMIN-only `403`, `400` validation, `404`). Supplier names are not unique, so there is no name conflict.

**Audit.** `GET /audit/events` gains one event type, `SUPPLIER_RENAMED` (`details: {previousName, name}`). It is projected from `supplier_renames`, not from a general event store. Creation and deactivation events are still projected from the supplier row; their `details.name` shows the name the supplier had at that time (the previous name of its first later rename), while `resource.name` stays the current name. The web audit view must label the new type: its label and icon maps are typed over every event type.

## Clarification: reference lists are unfiltered by design (2026-10-30)

Pagination and filters exist only on `GET /purchase-orders` and `GET /audit/events`, the two collections that grow with usage. `GET /users`, `GET /suppliers` and `GET /projects` return every record the caller may see, with no query parameters, as the simple read DTO section above states for inactive users and suppliers. This is deliberate, not an omission: the data is small and administrator-created, and the client filters it. If that stops being true, the intended extension is `page`/`pageSize`, `q` and `isActive`, introduced together with a strict query schema like the PO list's.

## Additive order-view distribution (2026-10-31)

**Decision:** `GET /purchase-orders` responses gain a required `distribution` object next to `data` and `pagination`: `{ total, byStatus: { PENDING, APPROVED, REJECTED }, actionableByMe }`. No endpoint, query parameter or persisted state is added, and existing fields, filters, authorization and pagination are unchanged.

**Why:** the order screen labels its view tabs (Todos, Sua decisão, Pendentes, Aprovados, Rejeitados) with the size of each view. It previously issued five extra `pageSize=1` list reads on every load just to read `pagination.total`, in five separate snapshots, so tab numbers could disagree with each other and with the page.

**Semantics:**
- The counts cover every order the caller may see, narrowed only by the optional `projectId` and by the same visibility rule as the list. Non-ADMIN users never count orders of projects they do not belong to.
- They are not paginated and ignore `status`, `actionableByMe`, `page` and `pageSize`. Selecting one view must not change the size shown for the others. A page beyond the last still returns the distribution.
- `total` equals the sum of the three statuses. `actionableByMe` counts pending orders whose current snapshotted step is assigned to the caller, the same definition as the `actionableByMe=true` filter; ADMIN gains no approval authority from it.
- The distribution is computed in the list's existing `REPEATABLE READ` transaction, so it is consistent with the page, its `pagination.total` and the step states.

**Trade-offs:** every list call pays one extra aggregate over the visible orders. At challenge scale that is a single indexed scan; if it ever matters, an opt-in parameter is the intended change. A dedicated summary endpoint was considered and rejected: it would keep a second request and a second snapshot. Counting only the current page in the client was rejected as wrong. The web app derives the "Todos" count from `total`, validates the object with the rest of the response and treats a missing or malformed `distribution` as an invalid list response.

## Additive project membership figures (2026-10-31)

**Decision:** each project returned by `GET /projects` gains a required `membership` object: `{ count, activeCount, isMember }`. No endpoint or query parameter is added, and `POST /projects`, `PATCH /projects/:id` and the archive/reactivate responses keep the existing project representation. Existing fields, authorization and the unfiltered, unpaginated list behavior (see the 2026-10-30 clarification) are unchanged.

**Why:** the administration list rendered "N membros · M ativos" by issuing one `GET /projects/:id/members` per project card, so a list of N projects cost N+1 reads with a loading state and retry per card. The order screens run the same per-project reads to learn whether an ADMIN may create orders. The compact figures answer both without a member list.

**Semantics:** `count` includes inactive users, `activeCount` only members whose account is active, and `isMember` is the caller's own membership row. Non-admin users only see projects they belong to, so it is always `true` for them; ADMIN stays a non-member unless explicitly added (ADR-005). The list is read by one statement, so figures and project fields share a snapshot. The member list remains on `GET /projects/:id/members`, whose authorization is unchanged.

**Alternatives considered:** embedding the full member list in every project (a payload that grows with projects × members for every screen that only needs the project names); flat `memberCount`/`activeMemberCount`/`isMember` fields (equivalent, but ungrouped); a collection-level aggregate (membership is per project).

**Response conventions adopted:** per-item facts live on the item; aggregates over the whole result sit beside `data` and `pagination` and are named for their content, as `distribution` does for purchase orders. The web client consumes `membership` for the administration project cards and for order-creation eligibility (the orders list and New Order read `isMember` instead of issuing one member read per project), so no screen reads member lists to decide creation eligibility.
