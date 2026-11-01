# Dokimos API

Fastify 5 + TypeORM + PostgreSQL. Setup and commands are in the root README; the endpoint
list is in `docs/api.md`. This file is a map of the source for reviewers.

## Layout

```text
src/
  main.ts, app.ts     startup (refuses pending migrations) and Fastify assembly
  auth/               JWT setup, actor resolution, route guards, login
  lib/                error envelope, request validation, PostgreSQL error mapping
  db/                 data source, row locks, migrations, demo seed
  realtime/           Socket.IO hints for orders that need attention
  modules/<name>/     one folder per capability
```

Each module follows the same shape; not every module needs every file.

| File | Responsibility |
| --- | --- |
| `routes.ts` | HTTP only: guards, input validation, status codes. No business rules. |
| `service.ts` | Business rules. Owns the transaction and the lock order. |
| `repository.ts` | Queries and writes against an `EntityManager` passed in by the service. |
| `entities.ts` | TypeORM mappings. The schema itself belongs to the migrations. |

Reads that need raw SQL live in their own file (`order-list.ts`, `order-detail.ts`,
`audit/events-query.ts`) so the statement can be read as a whole.

## Conventions worth knowing

- **Errors.** Services throw `errors.*()` from `lib/errors.ts`; they never spell a code or a
  message inline. Every failure leaves as `{ error: { code, message, details } }`.
- **Authorization.** `adminOnly` and `authenticated` (in `auth/guards.ts`) protect routes.
  Services marked "trusted" assume the route already required ADMIN. ADMIN reads everything but
  is not automatically a project member and can decide only a step it is assigned to as a member.
- **Transactions and locks.** A service opens its own transaction. Every pessimistic row lock
  is taken through `db/locks.ts`, whose header lists the acquisition order per operation.
- **Money.** Amounts are decimal strings end to end; lines are rounded half-up one by one
  (`purchase-orders/money.ts`). Nothing is converted to a float.
- **Orders are snapshots.** An order stores its CoA version and its approval steps at
  creation; later CoA changes never alter it.
- **Shared contracts.** Request schemas and response shapes both sides use live in
  `apps/shared`.
