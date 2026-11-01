# Dokimos API reference

This document describes the implemented API. Business rationale is recorded in the [decision register](README.md#decision-register); transaction and locking details are in [persistence boundaries](architecture/persistence.md). Request schemas and response types live in [`apps/shared/src`](../apps/shared/src).

## Connection and conventions

- REST base path: `/api/v1`. Local development: `http://localhost:4000/api/v1`. Docker review: `http://localhost:8080/api/v1` by default; see [setup](../README.md).
- Send documented bodies as JSON with `Content-Type: application/json`. Success responses contain the resource directly, `{ "data": [...] }` for reference collections, or a paginated envelope as specified below. `204` responses have no body.
- Resource identifiers are UUID strings. Example UUIDs are illustrative; use IDs returned by your reference APIs. `orderDate` is a calendar date in `YYYY-MM-DD` format; timestamp fields are ISO 8601 strings. Item and approval-step indices start at zero.
- Decimal quantities, prices, totals and finite CoA limits are **JSON strings**, with a dot decimal separator. Versions, indices, counts and pagination values are JSON numbers.
- Documented JSON body schemas reject unknown fields. Client-supplied actors, calculated totals, order status and approval assignments are not accepted.
- The request-body limit is 1 MiB (1,048,576 bytes). Transport failures can occur before authentication or schema validation.

## Authentication and access

Except for login and the health probe, every endpoint requires:

```http
Authorization: Bearer <accessToken>
```

Tokens use HS256. Verification requires `sub` and `exp`, validates the subject as a UUID, and rejects expired tokens. The signer also supplies `iat`. Issuer/audience claims are neither issued nor enforced: this application uses its own signing key. Each protected request reads the current account from PostgreSQL; nonexistent/inactive accounts receive `401`, and roles come from the database rather than token claims.

| Access term | Meaning |
| --- | --- |
| Authenticated | A current active account, role `USER` or `ADMIN` |
| ADMIN | A current active account with database role `ADMIN` |
| Project reader | ADMIN, or a current project member |
| Order creator | An active project member; ADMIN must also be explicitly added |
| Current approver | The active member assigned to the first undecided step of a pending order |

ADMIN can read all projects and orders but cannot bypass membership or approval order. Other users see only their current projects and those projects' orders. An unknown or hidden individual project/order returns the same `404`; collections omit inaccessible records. Archived projects remain readable to otherwise authorized callers.

Token lifetime defaults to 30 minutes and is configurable with `JWT_TTL`. There is no refresh, server logout or per-token revocation endpoint. Client logout discards its token; deactivation blocks later authenticated requests and disconnects the user's live sockets. Fastify itself does not throttle login. Through the shared nginx in review/deployment, only `POST /api/v1/auth/login` is limited per client IP: 30 requests/minute, allowing 21 immediate attempts and recovering one slot every two seconds. Excess requests return `429 RATE_LIMITED` with the common JSON error envelope and `Retry-After: 2`; both successful and unsuccessful attempts count. Direct API/Vite development access bypasses this nginx policy. See [trusted proxy configuration](deployment.md#login-rate-limit-and-client-ips).

### POST /auth/login

Public. Request:

```json
{
  "username": "admin",
  "password": "demo-admin-2026"
}
```

Returns `200`:

```json
{
  "accessToken": "<signed JWT>",
  "tokenType": "Bearer",
  "expiresIn": 1800,
  "user": {
    "id": "10000000-0000-4000-8000-000000000001",
    "username": "admin",
    "displayName": "Administrador",
    "role": "ADMIN"
  }
}
```

Username is trimmed, lowercased for lookup, and must contain 1–64 characters. Password must be a nonempty string and is not trimmed. Invalid credentials, unknown accounts and inactive accounts all return `401 INVALID_CREDENTIALS`. `expiresIn` is the actual token lifetime in seconds (`exp - iat`), not a fixed constant. Demo credentials are in the [README](../README.md).

### GET /auth/me

Authenticated. Returns `200` with the current identity:

```json
{
  "id": "10000000-0000-4000-8000-000000000001",
  "username": "admin",
  "displayName": "Administrador",
  "role": "ADMIN"
}
```

The identity shape is `{id, username, displayName, role}`; it does not include `isActive` or credentials.

## Endpoint index

Paths below are relative to `/api/v1`. Each method/path pair is a separate operation: 25 REST operations in total. The public health probe and Socket.IO transport are outside this prefix and are documented separately below.

| Method | Path | Access | Success |
| --- | --- | --- | --- |
| POST | `/auth/login` | Public | `200` login result |
| GET | `/auth/me` | Authenticated | `200` identity |
| GET | `/users` | Authenticated | `200` `{data: User[]}` |
| POST | `/users` | ADMIN | `201` User |
| DELETE | `/users/:id` | ADMIN | `204` |
| GET | `/projects` | Authenticated; visible projects | `200` `{data: ProjectListItem[]}` |
| POST | `/projects` | ADMIN | `201` Project |
| PATCH | `/projects/:id` | ADMIN | `200` Project |
| POST | `/projects/:id/archive` | ADMIN | `200` Project |
| POST | `/projects/:id/reactivate` | ADMIN | `200` Project |
| GET | `/projects/:id/members` | Project reader | `200` `{data: ProjectMember[]}` |
| POST | `/projects/:id/members` | ADMIN | `201` membership |
| DELETE | `/projects/:id/members/:userId` | ADMIN | `204` |
| GET | `/projects/:id/coa` | Project reader | `200` CoaConfiguration |
| PUT | `/projects/:id/coa` | ADMIN | `200` CoaConfiguration |
| GET | `/projects/:id/coa/revisions` | ADMIN | `200` `{data: CoaRevision[]}` |
| GET | `/suppliers` | Authenticated | `200` `{data: Supplier[]}` |
| POST | `/suppliers` | ADMIN | `201` Supplier |
| PATCH | `/suppliers/:id` | ADMIN | `200` Supplier |
| DELETE | `/suppliers/:id` | ADMIN | `204` |
| GET | `/purchase-orders` | Authenticated; visible orders | `200` OrderList |
| POST | `/purchase-orders` | Order creator | `201` PurchaseOrderDetail |
| GET | `/purchase-orders/:id` | Project reader | `200` PurchaseOrderDetail |
| POST | `/purchase-orders/:id/decisions` | Current approver | `200` PurchaseOrderDetail |
| GET | `/audit/events` | ADMIN | `200` AuditPage |

There is no individual GET endpoint for users, suppliers or projects; their reference collections provide those records. No API creates ADMIN accounts, reactivates users/suppliers, changes passwords, saves PO drafts, edits/cancels orders or rewrites decisions.

## Users

A `User` is `{id, username, displayName, role, isActive}`. Passwords and password hashes are never returned.

### GET /users

Returns all users, including inactive accounts, ordered by creation time then ID ascending. Available to all authenticated accounts.

### POST /users

```json
{
  "displayName": "Ana Silva",
  "username": "ana.silva",
  "password": "example-password-2026"
}
```

| Field | Validation |
| --- | --- |
| `displayName` | Trimmed, 1–120 characters |
| `username` | Trimmed, 2–64 characters; Unicode letters/numbers, dot, hyphen and underscore only; stored lowercase |
| `password` | 8–256 characters; not trimmed |
| `role` | Optional; only `"USER"` is accepted |

Creates an active `USER`. Duplicate normalized usernames return `409 USERNAME_ALREADY_EXISTS`. The account and its creation audit record commit together.

### DELETE /users/:id

Logically deactivates an ordinary user. An already inactive user returns `204` without another lifecycle event; an unknown ID returns `404`.

Deactivation is blocked by any assignment in a currently published project ladder (`409 USER_ASSIGNED_TO_ACTIVE_COA`) or any undecided assignment on a pending order (`409 USER_HAS_PENDING_APPROVALS`), including future steps. Published ladders of archived projects also count. Remove the user from those ladders and resolve pending approvals through the normal workflow first. ADMIN deactivation returns `403 ADMIN_CANNOT_BE_DISABLED`.

Historical memberships, orders, decisions and revisions remain intact. Successful deactivation closes the user's Socket.IO connections.

## Projects

A `Project` is:

```json
{
  "id": "20000000-0000-4000-8000-000000000001",
  "name": "Residencial Vista Norte",
  "coaVersion": 0,
  "isActive": true,
  "createdAt": "2026-10-31T12:00:00.000Z"
}
```

### GET /projects

Returns every visible project, active or archived, ordered by creation time then ID ascending. Each `ProjectListItem` adds:

```json
{
  "membership": { "count": 3, "activeCount": 2, "isMember": true }
}
```

`count` includes inactive members; `activeCount` counts active accounts; `isMember` describes the caller. ADMIN receives no implicit membership. Project mutation responses return the plain `Project`, without this aggregate.

### POST /projects

Body: `{ "name": "Residencial Vista Norte" }`.

Name is trimmed and must contain 1–150 characters; project names are not unique. Creates an active project with `coaVersion: 0`, no members and no published ladder. The creator is not added automatically.

### PATCH /projects/:id

Body: `{ "name": "Residencial Vista Norte - Bloco A" }`.

Uses creation's name validation. Only an active project can be renamed; otherwise `409 PROJECT_ARCHIVED`. Renaming to the current normalized name is a no-op. A changed name retains the project ID and records the old/new name in audit history.

### POST /projects/:id/archive

Send no body. Archives an active project unless it has a pending PO (`409 PROJECT_HAS_PENDING_ORDERS`). An already archived project returns its current representation without another event.

Archived projects retain membership, published CoA, revisions, orders and audit reads. They reject new POs, renaming, membership additions/removals and CoA publication with `409 PROJECT_ARCHIVED`.

### POST /projects/:id/reactivate

Send no body. Reactivates the project without changing its members or published CoA. An already active project is a no-op. Returns the current project in either case.

## Project membership

### GET /projects/:id/members

Returns `{data: [{userId, displayName, isActive}]}`, including inactive members, ordered by display name then user ID ascending. Requires project visibility and is also available for archived projects. Visibility and returned membership rows share one database snapshot.

### POST /projects/:id/members

```json
{ "userId": "10000000-0000-4000-8000-000000000002" }
```

Requires an active project and an existing active user. Unknown/inactive users return `400 INVALID_MEMBER`; duplicate membership for an active user returns `409 MEMBERSHIP_ALREADY_EXISTS`. User eligibility is checked before the duplicate insert, so an inactive existing member still returns `400 INVALID_MEMBER`.

Returns `201`:

```json
{
  "projectId": "20000000-0000-4000-8000-000000000001",
  "userId": "10000000-0000-4000-8000-000000000002",
  "createdAt": "2026-10-31T12:05:00.000Z"
}
```

### DELETE /projects/:id/members/:userId

Requires an active project and existing project/user IDs. An already absent membership returns `204`; unknown project/user IDs return `404`.

Removal is blocked by that member's current published-CoA assignment in the project (`409 MEMBER_ASSIGNED_TO_ACTIVE_COA`) or undecided assignments on its pending orders (`409 MEMBER_HAS_PENDING_APPROVALS`). Future undecided steps count; skipped steps on rejected orders do not.

Removal revokes ordinary-user project/order visibility. ADMIN retains global reads but loses membership-dependent creation/decision authority. It does not deactivate the account or remove memberships of other projects. Orders, decisions and CoA revisions are preserved. Effective additions/removals record project lifecycle events; removing an already absent membership adds no event. An eligible user can be added again through the POST endpoint.

## Suppliers

A `Supplier` is `{id, name, isActive}`.

### GET /suppliers

Returns all suppliers, including inactive records, ordered by creation time then ID ascending. Available to all authenticated accounts.

### POST /suppliers

Body: `{ "name": "Concretos Horizonte" }`.

Name is trimmed and must contain 1–150 characters; supplier names are not unique. Returns `201` with the new active supplier.

### PATCH /suppliers/:id

Body: `{ "name": "Concretos Horizonte Ltda." }`.

Uses creation's name validation. Only active suppliers can be renamed; otherwise `409 SUPPLIER_INACTIVE`. A matching normalized name is a no-op. Changed names retain the supplier ID and append a rename audit record with old/new names.

### DELETE /suppliers/:id

Logically deactivates the supplier. An already inactive supplier returns `204` without overwriting the original deactivation actor/time; an unknown ID returns `404`. Pending orders do not block deactivation, and existing orders remain valid and decidable. New orders cannot select an inactive supplier. There is no supplier reactivation endpoint.

## Cumulative chain of approval (CoA)

A CoA is one ordered, cumulative ladder. An order requires every approver from the first band through the first band whose upper limit covers its total. Finite limits are inclusive; the final band is unlimited. A total of `10000.00` in the example below needs only the first approver; `10000.01` needs both, in order.

### GET /projects/:id/coa

Requires project visibility, including for archived projects. Returns a `CoaConfiguration`: `{projectId, coaVersion, bands}`. Each band is `{upperLimit, approverId}` in ladder order, with a two-decimal string or `null` as `upperLimit`. Visibility, version and bands share one database snapshot. A new project returns `coaVersion: 0` and `bands: []`; it cannot accept orders yet.

### PUT /projects/:id/coa

Publishes the complete ladder in one version-checked write:

```json
{
  "expectedCoaVersion": 0,
  "bands": [
    { "upperLimit": "10000.00", "approverId": "10000000-0000-4000-8000-000000000002" },
    { "upperLimit": null, "approverId": "10000000-0000-4000-8000-000000000003" }
  ]
}
```

- `expectedCoaVersion` is an integer from 0 to 2,147,483,646 and must match the current version.
- At least one band is required. Approvers must be unique active project members.
- Finite limits are nonnegative decimal strings with at most 16 integer and 2 fractional digits, and must strictly increase.
- Only the last limit is `null`, and the last limit must be `null`. A single unlimited approver is valid.
- The project must be active. An archived project returns `409 PROJECT_ARCHIVED`, including for identical-content or stale-version submissions. For an active project, a stale version returns `409 COA_VERSION_CONFLICT`; invalid approvers return `400 VALIDATION_ERROR` with `bands.<index>.approverId` issues.

Returns `200` with `{projectId, coaVersion, bands}`. Changed ladders increment the version and append the full revision atomically. Finite limits normalize to two decimal places. A matching-version, normalized identical ladder returns the existing version without another revision. Version conflict precedes detailed band validation once the request envelope is valid.

A failed publication changes nothing. After a conflict, fetch the current configuration, reconcile the local draft and explicitly submit with its current version. Publication never changes existing orders' snapshotted versions or approvers.

### GET /projects/:id/coa/revisions

ADMIN-only, including for archived projects. Returns `{data: CoaRevision[]}`, newest version first. A revision contains `{version, changedById, changedAt, bands}`; bands have the same `{upperLimit, approverId}` shape as the configuration. There is no revision for unpublished version 0 and no history mutation endpoint.

## Purchase orders

### POST /purchase-orders

```json
{
  "projectId": "20000000-0000-4000-8000-000000000001",
  "supplierId": "30000000-0000-4000-8000-000000000001",
  "orderDate": "2026-10-31",
  "notes": "Materiais para fundação",
  "items": [
    { "description": "Concreto usinado C30", "quantity": "5.000", "unit": "m³", "unitPrice": "2500.00" }
  ]
}
```

| Field | Validation |
| --- | --- |
| `projectId`, `supplierId` | Required UUIDs |
| `orderDate` | Required valid calendar date, `YYYY-MM-DD` |
| `notes` | Optional string, at most 10,000 characters; not trimmed; `null` is not accepted as input |
| `items` | 1–200 items |
| `items[].description` | Trimmed, 1–2,000 characters |
| `items[].quantity` | Positive decimal string, at most 9 integer and 3 fractional digits |
| `items[].unit` | Trimmed, 1–32 characters |
| `items[].unitPrice` | Nonnegative decimal string, at most 12 integer and 2 fractional digits |

Decimals accept digits with an optional fractional part: no signs, commas, exponent notation or surrounding whitespace. Fewer fractional digits are allowed. Zero prices/totals are valid; quantity must be greater than zero.

`orderDate` is the document's calendar date, separate from the server-generated `createdAt`. A backdated order uses the CoA published when it is actually created in the system; the date does not select a historical revision.

Creation requires an active project, explicit caller membership, a valid published ladder whose selected approvers remain active members, and an active supplier. ADMIN without membership receives `403`; an ordinary nonmember receives `404`. Missing/unusable CoA returns `409 PROJECT_COA_NOT_CONFIGURED`; an unknown supplier returns `400 VALIDATION_ERROR` on `supplierId`; an inactive supplier returns `409 SUPPLIER_INACTIVE`.

The server multiplies quantity by unit price, rounds each line independently to cents using **HALF_UP**, then sums those rounded lines. Each line and the total must be at most `9999999999999999.99`; overflow returns `400 VALIDATION_ERROR`. Stored quantities use three decimal places; prices, line totals and totals use two. For example, `0.005` times `1.00` rounds to `0.01`; two such lines total `0.02`.

Creation atomically stores the header, items, total, CoA version and ordered approver assignments. Returns `201` with full detail below. Orders start `PENDING`, including when the creator is also the first approver; no approval is automatic. This POST has no idempotency-key contract: do not automatically retry a request whose outcome is unknown.

### PurchaseOrderDetail

Creation, detail reads and successful decisions return the same shape:

```json
{
  "id": "40000000-0000-4000-8000-000000000001",
  "projectId": "20000000-0000-4000-8000-000000000001",
  "project": { "id": "20000000-0000-4000-8000-000000000001", "name": "Residencial Vista Norte" },
  "supplier": { "id": "30000000-0000-4000-8000-000000000001", "name": "Concretos Horizonte", "isActive": true },
  "createdById": "10000000-0000-4000-8000-000000000002",
  "creatorName": "João",
  "orderDate": "2026-10-31",
  "notes": "Materiais para fundação",
  "status": "PENDING",
  "total": "12500.00",
  "coaVersion": 1,
  "createdAt": "2026-10-31T12:10:00.000Z",
  "items": [
    { "itemIndex": 0, "description": "Concreto usinado C30", "quantity": "5.000", "unit": "m³", "unitPrice": "2500.00", "lineTotal": "12500.00" }
  ],
  "steps": [
    { "stepIndex": 0, "approverId": "10000000-0000-4000-8000-000000000002", "approverName": "João", "decision": null },
    { "stepIndex": 1, "approverId": "10000000-0000-4000-8000-000000000003", "approverName": "Amanda", "decision": null }
  ],
  "currentApproval": { "stepIndex": 0, "approverId": "10000000-0000-4000-8000-000000000002", "approverName": "João" }
}
```

Omitted notes return as `null`; an explicitly supplied empty string remains a string. Items/steps are ordered by index. A recorded decision replaces that step's `decision: null` with:

```json
{
  "type": "REJECTED",
  "actorId": "10000000-0000-4000-8000-000000000002",
  "decidedAt": "2026-10-31T12:15:00.000Z",
  "reason": "Preço precisa ser renegociado."
}
```

For approval, `type` is `APPROVED` and `reason` is `null`. `currentApproval` is the first undecided step only while pending; it is `null` for terminal orders. Skipped steps retain `decision: null`, without fabricated decisions.

Amounts, items, CoA version and assigned approver IDs are immutable. Names and supplier activity resolve from retained reference records; renaming can change displayed labels without changing the original financial facts or assignments.

### GET /purchase-orders/:id

Returns `200` with `PurchaseOrderDetail`, subject to current project visibility. Inactive supplier status is included and does not invalidate existing approvals.

### GET /purchase-orders

| Query parameter | Values / default |
| --- | --- |
| `page` | Positive integer, default `1`, maximum 2,147,483,647 |
| `pageSize` | Integer 1–100, default `20` |
| `status` | Optional `PENDING`, `APPROVED` or `REJECTED` |
| `projectId` | Optional UUID; restricts to visible orders in that project |
| `actionableByMe` | Optional literal `true` or `false`; only `true` restricts to the caller's current pending approvals |

Example: `/purchase-orders?projectId=<uuid>&status=PENDING&actionableByMe=true&page=1&pageSize=20`.

Returns:

```json
{
  "data": [],
  "pagination": { "page": 1, "pageSize": 20, "total": 0 },
  "distribution": {
    "total": 0,
    "byStatus": { "PENDING": 0, "APPROVED": 0, "REJECTED": 0 },
    "actionableByMe": 0
  }
}
```

Each row is an `OrderSummary`:

| Fields | Representation |
| --- | --- |
| `id`, `projectId`, `project`, `supplier`, `orderDate`, `createdAt`, `coaVersion`, `total`, `status`, `currentApproval` | Same types and meaning as detail |
| `itemCount`, `stepCount`, `decidedStepCount` | Number of items, assigned steps and recorded decisions |
| `approvalSteps` | Ordered `{stepIndex, approverId, approverName, state}` entries |

Step `state` is `APPROVED`, `REJECTED`, `CURRENT`, `UPCOMING` or `SKIPPED`. Rejection marks later undecided steps `SKIPPED`; terminal orders have no `CURRENT` step. Summary rows omit items, notes, creator fields and full decision timestamps/reasons.

Visibility and filters apply before pagination/counting. Rows sort by `createdAt DESC, id DESC`. `pagination.total` counts the filtered result; `distribution` counts every visible order within the requested project scope, ignoring status, actionability and pagination filters. Page, count, distribution and step projections share one database snapshot. Separate requests may shift as orders are created or decided.

### POST /purchase-orders/:id/decisions

Approve:

```json
{ "expectedStepIndex": 0, "decision": "APPROVED" }
```

Reject:

```json
{ "expectedStepIndex": 0, "decision": "REJECTED", "reason": "Preço precisa ser renegociado." }
```

`expectedStepIndex` is a nonnegative integer identifying the step the caller observed. It is a concurrency guard, not permission to choose a different approver. Only the current assigned active project member can decide; ADMIN has no override. Rejection requires a trimmed, nonblank reason of at most 5,000 characters. Approval must omit `reason`.

Returns `200` with full updated detail. Intermediate approval leaves the order `PENDING`; final approval sets `APPROVED`. Rejection immediately sets `REJECTED` and ends the flow. Decisions are immutable and rejection cannot be resumed.

A terminal order returns `409 ORDER_ALREADY_DECIDED`; a stale step returns `409 APPROVAL_STEP_CONFLICT`; a visible current step assigned to somebody else returns `403 FORBIDDEN`. For a valid request body, resource visibility is checked first, then terminal state, then the expected step, and finally current assignment/membership. Consequently, a caller who can read the order can receive a terminal/stale conflict before the assignee check; hidden orders still return `404`.

Reload and review detail after a conflict. Competing decisions cannot both advance the same step. Failed requests add no decision; reconcile uncertain responses through a read before another write.

## Read-only audit explorer (ADMIN)

### GET /audit/events

| Query parameter | Values / default |
| --- | --- |
| `eventType` | Optional event type from the table below |
| `projectId` | Optional UUID; excludes global user/supplier events |
| `from` | Optional inclusive event timestamp |
| `to` | Optional exclusive event timestamp |
| `page`, `pageSize` | Same validation/defaults as the PO list |

`from`/`to` require ISO 8601 timestamps with `Z` or an explicit UTC offset, at most millisecond precision, and UTC years 0001–9999. Offsets through ±15:59 are accepted. Either bound may be omitted; with both, `from` must precede `to`. Invalid/equal/reversed bounds return `400 VALIDATION_ERROR`. Encode a positive offset's `+` as `%2B` in query strings.

Example: `/audit/events?eventType=STEP_REJECTED&projectId=<uuid>&from=2026-10-31T03:00:00.000Z&to=2026-11-01T03:00:00.000Z&page=1&pageSize=20`.

Returns `AuditPage`: `{data: AuditEvent[], pagination: {page, pageSize, total}}`. Each event contains:

| Field | Shape |
| --- | --- |
| `id` | Opaque, source-qualified string; not a resource UUID |
| `type` | Event type below |
| `occurredAt` | Source timestamp |
| `actor` | `{kind, id, displayName}`; kind is `USER`, `SYSTEM` or `UNKNOWN`; ID is a UUID or `null` |
| `project` | `{id, name}` or `null` for global events |
| `resource` | `{kind, id, name}`; kind is `PURCHASE_ORDER`, `PROJECT`, `USER` or `SUPPLIER` |
| `details` | Type-specific object below |

| Event type | `details` fields |
| --- | --- |
| `PROJECT_CREATED`, `PROJECT_RENAMED`, `PROJECT_ARCHIVED`, `PROJECT_REACTIVATED`, `PROJECT_MEMBER_ADDED`, `PROJECT_MEMBER_REMOVED` | `projectName`, nullable `previousName`, `isActive`, nullable `member: {userId, username, displayName}` |
| `SUPPLIER_CREATED`, `SUPPLIER_DISABLED` | `name`, `isActive` |
| `SUPPLIER_RENAMED` | `previousName`, `name` |
| `ORDER_CREATED` | Decimal-string `total`, original `coaVersion`, `orderDate`, `itemCount`, `supplier: {id, name}`, ordered `steps: [{stepIndex, approverId, approverName}]` |
| `STEP_APPROVED`, `STEP_REJECTED` | `stepIndex`, `approverId`, `approverName`, nullable `reason`, original `coaVersion` |
| `COA_REVISED` | `version`, complete ordered `bands: [{upperLimit, approverId, approverName}]` |
| `USER_CREATED`, `USER_DISABLED` | `username`, `displayName`, `role` |

Project lifecycle details snapshot name/activity and the affected member; `previousName` is populated for rename and `member` for membership changes. CoA/order history retain original versions, decimal limits and assignments. Display labels can resolve current retained identities; project context may show the current project name. Supplier rename events preserve old/new names. System events have `actor.kind: "SYSTEM"` and a null actor ID; legacy unattributed records use `UNKNOWN`, without invented attribution.

For supplier creation/deactivation, `details.name` is the name recorded for that point in the rename history, while `resource.name` is the current supplier name. `ORDER_CREATED.details.supplier.name` also resolves the current retained supplier name; it is not a historical name snapshot. Project/membership lifecycle coverage begins with its migration and subsequent recorded operations; missing legacy creation, rename or removed-membership events are not reconstructed.

Filters apply before count/pagination. Results sort by source timestamp descending, then source-qualified ID descending. Page and total share one repeatable-read snapshot; later requests can see new events. Timestamp filtering uses stored instants, including database sub-millisecond precision; `to` is strictly exclusive.

The endpoint composes lifecycle history, PO creation/decisions, complete CoA revisions and supplier metadata/rename history. It is read-only application history, not a writable event store or database tamper-proof guarantee. There is no audit detail/mutation endpoint; the list payload includes available event details.

## Collection and query behavior

Only `/purchase-orders` and `/audit/events` accept server-side filters/pagination. They reject unknown or repeated query parameters with `400 VALIDATION_ERROR`. Positive-integer parameters use digits without signs, decimal points or leading zeros. A page beyond the last result returns `data: []` with the correct total.

`/users`, `/suppliers` and `/projects` are unpaginated reference collections: they return all records the caller may see, including inactive/archived records, and ignore query strings. Filtering these lists is a client responsibility. Other documented GET collections have no query filters.

## Errors

REST failures use this envelope, with Portuguese application messages and an always-present `details` array. Some schema-validation detail messages use Zod's default wording and may be in English:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Verifique os campos informados.",
    "details": [
      { "field": "items.0.quantity", "code": "INVALID_FIELD", "message": "Informe um valor maior que zero." }
    ]
  }
}
```

Use `error.code` and field paths programmatically; do not parse message text. `details` is `[]` without field issues. Field issue codes are `INVALID_FIELD`, `INVALID_UUID`, `INVALID_APPROVER`, `INVALID_SUPPLIER` and `AMOUNT_OVERFLOW`. An unrecognized body field can be reported at the root path `""`.

| HTTP | `error.code` | Meaning |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Schema/path/query validation, ineligible CoA approver, unknown supplier or calculated amount overflow; inspect `details` |
| 400 | `INVALID_REQUEST` | Malformed request, including invalid JSON |
| 400 | `INVALID_MEMBER` | Membership addition targets a missing/inactive user |
| 401 | `INVALID_CREDENTIALS` | Login credentials are unusable |
| 401 | `UNAUTHENTICATED` | Missing/invalid/expired token or missing/inactive authenticated account |
| 403 | `FORBIDDEN` | Caller lacks required role, creation membership or current-step authority |
| 403 | `ADMIN_CANNOT_BE_DISABLED` | Attempt to deactivate ADMIN |
| 404 | `NOT_FOUND` | Unknown route/resource or hidden individual project/order |
| 409 | `COA_VERSION_CONFLICT` | Published version differs from the expectation |
| 409 | `PROJECT_COA_NOT_CONFIGURED` | No usable published CoA for order creation |
| 409 | `PROJECT_ARCHIVED` | Operation requires an active project |
| 409 | `PROJECT_HAS_PENDING_ORDERS` | Pending orders block archival |
| 409 | `MEMBERSHIP_ALREADY_EXISTS` | User is already a project member |
| 409 | `MEMBER_ASSIGNED_TO_ACTIVE_COA` | Published project ladder blocks removal |
| 409 | `MEMBER_HAS_PENDING_APPROVALS` | Pending project assignments block removal |
| 409 | `USER_ASSIGNED_TO_ACTIVE_COA` | Published ladder blocks user deactivation |
| 409 | `USER_HAS_PENDING_APPROVALS` | Pending assignments block user deactivation |
| 409 | `USERNAME_ALREADY_EXISTS` | Normalized username is already taken |
| 409 | `SUPPLIER_INACTIVE` | Inactive supplier cannot be selected for a new PO or renamed |
| 409 | `APPROVAL_STEP_CONFLICT` | Observed step is no longer current |
| 409 | `ORDER_ALREADY_DECIDED` | Order is already approved/rejected |
| 413 | `PAYLOAD_TOO_LARGE` | Request exceeds the body limit |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Content type is unsupported |
| 429 | `RATE_LIMITED` | Shared nginx rejected an excess login POST; wait `Retry-After` seconds before a deliberate retry |
| 500 | `INTERNAL_ERROR` | Unexpected failure; internals are not exposed |

Protected route guards authenticate/check roles before handler-level schema/resource validation. Transport parsing/size errors may occur earlier. Failed transactional operations roll back their writes. A network failure or lost response does not establish whether a mutation committed: read current state and reconcile rather than blindly replaying a POST.

## Health probe

`GET /healthz` is public and **outside** `/api/v1`. It queries the database connection and returns `200`:

```json
{ "status": "ok", "database": "connected" }
```

A failed database query uses `500 INTERNAL_ERROR`.

## Socket.IO notifications

Socket.IO shares the API HTTP server at `/socket.io/`, outside `/api/v1`. Only WebSocket transport is enabled; this is Socket.IO, not a raw WebSocket JSON protocol.

```ts
import { io } from "socket.io-client";

const socket = io(apiOrigin, {
  path: "/socket.io/",
  transports: ["websocket"],
  auth: { token: accessToken },
});
socket.on("po.notification", event => {
  // Treat the hint as advisory; fetch authorized REST detail before acting.
});
```

Send the raw JWT without a `Bearer ` prefix, never in the URL. Handshake authentication requires HS256, `sub`, `exp` and an active account. Invalid tokens/accounts reject with `connect_error.message: "UNAUTHENTICATED"`; Socket.IO errors do not use the REST envelope. A supplied Origin must have the same host/port as request Host; clients without Origin still require authentication. Polling is rejected. Connections close on expiry or successful user deactivation; reconnecting authenticates again.

The only emitted application event is `po.notification`:

```json
{
  "type": "po.action_required",
  "eventId": "40000000-0000-4000-8000-000000000001:0:action_required",
  "orderId": "40000000-0000-4000-8000-000000000001",
  "revision": 0,
  "stepIndex": 0
}
```

```json
{
  "type": "po.finalized",
  "eventId": "40000000-0000-4000-8000-000000000001:2:finalized",
  "orderId": "40000000-0000-4000-8000-000000000001",
  "revision": 2,
  "status": "APPROVED"
}
```

`revision` counts recorded decisions, starting at zero. `eventId` is `<orderId>:<revision>:action_required` or `<orderId>:<revision>:finalized`. Terminal status is `APPROVED` or `REJECTED`.

Committed creation notifies the first assigned approver. Intermediate approval notifies only the approver of the newly actionable step, subject to a current active-member check; future approvers and the creator are not notified of that intermediate transition unless they are that assignee. Final approval/rejection notifies the creator if still active and authorized to read the order (ADMIN or current project member). All connected sockets for the selected user receive the hint. The server owns recipient rooms; client IDs, room names and subscription requests grant no access. No client application command performs financial writes.

Delivery is live, best effort and after commit. Failed writes/reads emit nothing; notification failure never reverses a successful mutation. Hints may be stale or arrive out of revision order when transitions overlap; always read current REST state before deciding. There is no server inbox, replay, delivery acknowledgement, outbox or cross-instance fan-out. Offline clients may miss events; IDs support deduplication but do not guarantee exactly-once delivery. Browser-local notifications are not an API persistence contract. See [realtime implementation and deployment boundaries](architecture/realtime.md).
