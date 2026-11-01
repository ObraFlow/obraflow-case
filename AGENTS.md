# Agent guide — Dokimos (ObraFlow challenge)

A full-stack implementation of the ObraFlow purchase-order approval challenge, submitted on `feat/obraflow-implementation` by 2026-11-01. Work in small, verifiable slices, keep the invariants below and add no optional scope. This file says how to work and where to look; decisions live in the ADRs, never here.

## Where things live

- [Challenge](challenge/README.md): the original requirements.
- [docs/README.md](docs/README.md): documentation index, **glossary** and the ADR register. Accepted ADRs are binding; if one is wrong or out of date, say so and correct it instead of working around it.
- [Architecture](docs/architecture/overview.md): overview, [frontend](docs/architecture/frontend.md), [persistence](docs/architecture/persistence.md) and [code organization](docs/architecture/code-organization.md).
- [API](docs/api.md), [demo data](docs/demo-data.md), [deployment](docs/deployment.md), [submission checks](docs/submission-checklist.md).
- Rules for a part of the code: [apps/api/AGENTS.md](apps/api/AGENTS.md) (with its [source map](apps/api/README.md)) and [apps/web/AGENTS.md](apps/web/AGENTS.md); the [UI guide](apps/web/src/components/ui/README.md) covers components and visual semantics.

## Repository layout

An npm workspace monorepo (`dokimos-workspace`).

```text
apps/api       Fastify + TypeORM API: modules per capability, plus db/ (migrations, locks, seed)
apps/web       React + Vite frontend (features grouped by screen) and its Playwright tests
apps/shared    Zod contracts and DTO types, compiled to dist; rebuild after editing
docs/          index and glossary, ADRs, architecture, API reference, demo data
scripts/       test.mjs (isolated-database test runner), review.mjs (Docker stack), bundle.mjs (dist/), screenshots.mjs (gallery, run by hand)
challenge/     the original requirements; read only
compose*.yaml  development database, local Docker stack, hosted demo
docker/        Dockerfile, nginx.conf and bundle templates shared by every deployment
stackport/     what is specific to the hosted demo: settings, root .env template
```

## Commands

```sh
npm ci
npm run setup       # creates apps/api/.env if absent, starts PostgreSQL, migrates and seeds; repeatable
npm run dev         # PostgreSQL up; API 4000 + web 5173 with hot reload; no migration or seed
npm run check       # eslint, then prettier --check
npm run fix         # eslint --fix, then prettier --write
npm run build
npm run typecheck   # API and web test sources
npx playwright install chromium  # once, for browser tests
npm test            # quick tier: api, unit and e2e in a disposable database (~90 s)
npm test -- all     # also the browser regression suite (local; CI runs the quick tier)
npm test -- web file.spec.ts     # one suite (api, unit, e2e, web); extra arguments go to it
npm run bundle      # build, then assemble dist/ (API, frontend, nginx template, .env.example) for a host without Docker
npm run review      # the whole app in Docker at localhost:8080, with its own database
npm run review -- down
npm run review:dev  # setup, then dev: the app from source with hot reload at localhost:5173
```

## Invariants

- The CoA (alçada) is one complete, cumulative ladder per project, not separate chains per range. Only active project members can be approvers. Publish the whole ladder at once with its expected version; never autosave. After a `409` or an uncertain result keep the draft and reconcile explicitly. Existing orders keep their snapshot and are never changed.
- Money is exact decimal strings with per-line HALF_UP rounding; thresholds are inclusive. Never use floating point as financial authority.
- Only the current, active, assigned project-member approver can decide, in order. ADMIN cannot skip a step and is not a project member by default. Rejection needs a reason and is final. There are no drafts, cancellation or decision edits.
- Membership removal and user deactivation are blocked by published-ladder assignments and undecided pending steps, transactionally. Supplier deactivation leaves existing orders untouched. History is preserved; nothing is reactivated or force-deleted.
- Errors are `{ error: { code, message, details: [] } }` with correct `400/401/403/404/409`. The backend is authoritative for authorization, totals and DTOs.
- Order creation has no server-side deduplication. Never retry an uncertain write blindly; require an explicit read first.
- The JWT lives in `sessionStorage` for this local demo only. No self-signup, no new ADMIN through the API, no secrets or private notes in Git.

## Working rules

- Inspect the current files first. While working run only the tests you touched; run `npm test -- all` once before submitting. Markdown-only changes need a link and diff check, not a test run.
- Schema changes are hand-written migrations (`synchronize: false`). The API owns the database scripts: `npm run db:<up|down|migrate|seed> -w @dokimos/api`.
- Tests use real PostgreSQL in a disposable database. Never weaken `apps/api/test/database-guard.ts`, `OBRAFLOW_TEST_DATABASE` or the `obraflow_test_*` guard. Test servers use 4100/5174; development uses 4000/5173. PostgreSQL is on host port 6000 locally and 5432 in CI (`POSTGRES_PORT` overrides it).
- `compose.yaml` is the development database, `compose.review.yaml` the local Docker stack (also `docker compose -f compose.review.yaml up --build`), `compose.stackport.yaml` only the hosted demo.
- Other sessions may edit the same checkout: check `git status` first, and do not commit, push or switch branches unless asked.
- Keep package names (`@dokimos/*`), the Compose project `dokimos-review`, database and volume names, storage keys and seed markers as they are.
- Report what you could not verify. CI runs only the quick tier, so a green CI is not proof of the browser suite.
