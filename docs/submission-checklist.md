# Submission acceptance

Run these checks against the candidate you intend to submit. This checklist describes the current procedure; it does not certify a particular commit or remote CI run.

## Automated checks

With Node.js >= 22.12, Docker Compose v2 and PostgreSQL available:

```sh
npm ci
npm run db:up -w @dokimos/api
npx playwright install chromium
npm run check
npm run build
npm run typecheck
npm test -- all
```

| Command | What it checks |
| --- | --- |
| `npm run check` | ESLint (TypeScript and React Hooks rules), then Prettier for TypeScript, TSX, MJS and CSS |
| `npm run build` | Builds the shared package, the API and the web app; the web build also type-checks its sources |
| `npm run typecheck` | Type-checks the API and web test sources |
| `npm run bundle` | Builds, then assembles `dist/` for a host without Docker ([deployment](deployment.md#bundle-without-docker)) |
| `npm test` | The quick tier: API tests, front-end unit tests and the end-to-end journey |
| `npm test -- all` | The quick tier plus the browser regression suite, with its accessibility scans |

On a minimal Linux host, install browser dependencies with `npx playwright install --with-deps chromium`.

`npm test` runs the quick tier (API, front-end unit and UI-only acceptance suites) and `npm test -- all` adds the browser regression suite; both create, migrate and seed a disposable PostgreSQL database and remove it on success or failure. The configured development database is preserved. Ports 4100 and 5174 must be free. Focused runs use `npm test -- api`, `npm test -- unit`, `npm test -- web <file.spec.ts>` or `npm test -- e2e`. Browser failures retain traces/screenshots in ignored `apps/web/test-results` output. GitHub Actions runs `npm run check`, `build`, `typecheck` and `npm test` (the quick tier); run `npm test -- all` locally.

## Reviewer workflow

- Start the packaged application with `npm run review` (Docker only; it builds the images and starts its own migrated and seeded database); verify the documented demo credentials and ordinary-user/admin navigation. Stop it with `npm run review -- down`.
- Create users, a supplier and a project; add active members and explicitly publish a complete cumulative ladder. Check precise threshold entry, cancel/draft retention, and explicit reconciliation after stale versions or uncertain saves.
- Create an order across multiple approval levels. Check exact per-line HALF_UP totals, inclusive thresholds and immutable original approvers/version. Only the current assigned active member can decide; ADMIN cannot bypass the sequence. Rejection requires a reason and is terminal.
- Verify logical deactivation and archived-project restrictions, membership-removal blockers and preserved historical reads. Inspect source-linked audit detail and complete ladder revisions.
- Check login/logout/persona isolation, keyboard focus, narrow layouts, light/dark themes, field feedback and failed-read recovery. Notification hints remain advisory; REST/database state is authoritative.
- Confirm the README explains cumulative escalation, decimal arithmetic, demo credentials, browser JWT storage and the lack of refresh/revocation. Keep the original challenge and accepted ADRs available.
- Inspect the final diff for credentials, local files and generated test/design output. Record the actual candidate commit and CI result when submitting; earlier results do not verify later edits.

The root [README](../README.md) contains setup and manual workflow details; [API documentation](api.md) and [persistence boundaries](architecture/persistence.md) describe the implemented contracts and transaction rules.
