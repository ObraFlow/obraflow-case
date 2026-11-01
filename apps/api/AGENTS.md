# API guide (`apps/api`)

Fastify 5, TypeScript, TypeORM and PostgreSQL. The source map and a longer account of each convention are in [README.md](README.md); the endpoints are in [docs/api.md](../../docs/api.md) and the transaction and locking rules in [persistence](../../docs/architecture/persistence.md). The root [AGENTS.md](../../AGENTS.md) holds the commands and the domain invariants.

## Where code goes

- `modules/<name>/routes.ts` is HTTP only: guards, input validation, status codes. `service.ts` holds the business rules and owns the transaction. `repository.ts` queries and writes through the `EntityManager` the service passes in and never opens its own transaction. `entities.ts` only maps tables; the schema belongs to the migrations. Raw SQL reads get their own file.
- Request schemas and response shapes shared with the web app live in `apps/shared`. After changing them run `npm run build -w @dokimos/shared`.

## Rules

- **Errors.** Throw `errors.*()` from `lib/errors.ts`. Never write an error code or message inline, and never return a different envelope.
- **Authorization.** Protect routes with `adminOnly` or `authenticated` from `auth/guards.ts`. ADMIN reads everything but is not automatically a project member and may decide only a step assigned to it as a member. Concealing `404` before any business-state detail.
- **Locks.** Take every row lock through `db/locks.ts`, in the order its header lists for that operation. Do not lock in a repository.
- **Money.** Amounts are decimal strings end to end and lines are rounded half-up one by one (`purchase-orders/money.ts`). Nothing becomes a float.
- **Snapshots.** An order stores its CoA version and approval steps when it is created and is never changed by a later CoA publication. Do not add edit or cancel paths.
- **Migrations.** Hand-written, with a larger number than the last one, and `synchronize` stays off. `test/persistence.test.ts` compares every entity with the migrated database, so change the entity and the migration together.
- **Seed.** `db/seed` only adds what is missing; it must never reset credentials, custom names, ladders or progressed orders.
- **Realtime.** Notification hints are derived after commit and are advisory; REST and PostgreSQL stay authoritative (ADR-011). Login throttling is the proxy's job (ADR-003), not the API's.

## Tests

- `npm test -- api` runs `test/*.test.ts` with `tsx --test` against a disposable database. Shared setup is in `test/helpers.ts`. Never weaken `test/database-guard.ts`.
- Cover a change to a rule with an integration test on real PostgreSQL. Concurrency tests hold real rows with deterministic barriers; do not replace them with mocks.
