# ADR-001 — Database Selection: PostgreSQL

- **Status:** Accepted
- **Decision:** PostgreSQL is the only supported database; TypeORM is used for persistence.
- **Decision date:** 2026-10-20
- **Scope:** Backend persistence, migrations, integration testing, and local deployment.

## Context

ObraFlow manages purchase orders with multiple items and sequential approval chains. An order's total determines the applicable approval rule. Approval and rejection decisions must respect the current step, preserve an auditable history, and remain consistent under concurrent requests.

The application is intentionally lightweight, and either PostgreSQL or SQLite can meet the challenge's functional and technical requirements. Docker Compose is already part of the project, so running a database server locally does not introduce a separate manual installation requirement.

## Decision

Use **PostgreSQL exclusively** as the relational database, accessed through **TypeORM**.

The persistence policy is:

- TypeORM is the primary persistence abstraction. All application tables have explicit entity mappings. Application services own transactional business workflows, using capability-owned repositories and explicit PostgreSQL lock semantics. Carefully scoped direct SQL is retained for complex read-only projections when materially clearer than TypeORM query construction.
- Define schema changes through **explicit, version-controlled migrations**.
- Keep TypeORM **`synchronize: false`** in all environments, including development and tests.
- Own transactional boundaries in **application services**, not in HTTP controllers.
- Use PostgreSQL in integration tests, with an isolated database provided by Docker Compose.
- Use PostgreSQL-specific database features when they offer a clear benefit, with the reason documented.
- Keep ordinary CRUD, relationship checks and transactional writes in TypeORM repositories or QueryBuilder; pass the workflow's `EntityManager` explicitly. Retained SQL projections document their snapshot and transport boundaries.
- **Do not build or maintain a SQLite fallback**, parallel migrations, or database-portability abstractions.

## Rationale

PostgreSQL has the transaction support, relational constraints, concurrency capabilities, and row-level locking primitives that align well with sequential approvals and audit requirements. It also offers a straightforward path toward handling more concurrent requests and additional application instances if such needs arise.

**The choice is not based on SQLite being technically insufficient.** SQLite would also satisfy this challenge, and its simpler deployment and lower resource and operational costs are genuine advantages. PostgreSQL was selected in part because of **developer familiarity and preference**, and in part because its concurrency model and operational ecosystem better match the project's desired **future readiness**.

The existence of Docker Compose makes the additional PostgreSQL service a reasonable trade-off for this particular project.

## Alternative considered: SQLite

SQLite would have provided:

- No separate database server process to administer.
- Lower baseline resource use and a smaller deployment footprint.
- Simpler setup for environments where Docker is not available.
- ACID transactions and sufficient integrity guarantees for this challenge when used correctly.

Compared with PostgreSQL, choosing SQLite would involve trade-offs:

- **Write concurrency:** SQLite generally supports one writer at a time, which can increase contention as concurrent approval traffic grows.
- **Locking model:** It does not offer PostgreSQL-style row-level locking. Some approval concurrency strategies would need to be implemented differently.
- **Deployment evolution:** Sharing a SQLite database among independently deployed application instances is less straightforward.
- **Operational flexibility:** Future changes to workload or deployment topology could require additional database-specific design work.

These are potential trade-offs, not evidence that SQLite cannot support correct approvals or a small production application. Its lighter operational footprint may make it a better fit in other contexts.

## Consequences

### Benefits

- One database dialect and one migration path to develop, test, document, and support.
- Integration tests exercise the intended production database behavior.
- Clear access to PostgreSQL transactions, constraints, and concurrency primitives.
- No speculative portability layer to maintain.

### Costs and commitments

- PostgreSQL requires a separate running service, persistent storage, and operational care.
- The application is intentionally coupled to PostgreSQL where that coupling improves correctness or simplicity.
- Any future move to SQLite or another engine would be a separate, explicitly scoped migration effort.
- Transactional correctness and safe concurrent decisions still require careful application logic and tests; selecting PostgreSQL alone does not guarantee them.

## Review criteria

This decision remains appropriate as long as PostgreSQL's operational cost is acceptable and the application benefits from a consistent relational database model. Revisit only if deployment constraints or measured operational needs materially change.

## Related documents

- [Architecture overview](../architecture/overview.md)
- [Code organization and engineering principles](../architecture/code-organization.md)
- [ADR-006 — Cumulative approval escalation](ADR-006-cumulative-approval-escalation.md)
