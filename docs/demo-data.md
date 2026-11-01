# Demonstration data

The seed (`npm run db:seed -w @dokimos/api`, run by `npm run setup`) creates a small, realistic dataset so every state of the workflow can be reviewed without typing anything. The Docker stack (`npm run review`) seeds an empty database the same way on its first start. Names, credentials and scenarios come from `apps/shared/src/demo.ts` and `apps/api/src/db/seed/`.

## Identities

All passwords are public demonstration values, not secrets. Roles and memberships are enforced by the backend, not by the persona buttons.

| Username | Name | Role | Password | Projects |
| --- | --- | --- | --- | --- |
| `admin` | Administrador | ADMIN | `demo-admin-2026` | Both (broad reads; no implicit membership or approval authority) |
| `joao` | João | USER | `demo-user-2026` | Atlântico, Vista Norte |
| `amanda` | Amanda | USER | `demo-user-2026` | Atlântico, Vista Norte |
| `carlos` | Carlos | USER | `demo-user-2026` | Vista Norte |
| `beatriz` | Beatriz | USER | `demo-user-2026` | Atlântico |
| `ricardo` | Ricardo | USER | `demo-user-2026` | Vista Norte |

The login screen offers these as persona buttons and the account menu can switch between them (normal password sign-in underneath). `SEED_ADMIN_PASSWORD` and `SEED_USER_PASSWORD` override the passwords; the persona buttons then stop working and manual login must be used.

## Projects and ladders

Each project has its own cumulative ladder: a higher amount adds approvers after the earlier ones, who always decide first (ADR-006).

| Project | Requester | Up to | Approvers in order |
| --- | --- | --- | --- |
| Centro Comercial Atlântico | Beatriz | R$ 10.000,00 | João |
| | | above | João → Amanda |
| Residencial Vista Norte | Carlos | R$ 50.000,00 | Amanda |
| | | R$ 150.000,00 | Amanda → João |
| | | above | Amanda → João → Ricardo |

Limits are inclusive: an order of exactly R$ 10.000,00 at Atlântico needs only João.

## Suppliers

Concretos Horizonte, Aço & Estruturas Brasil and Elétrica São Jorge.

## Orders

Each project has six orders, created by its requester, so the lists show every state:

| Scenario | State | What it demonstrates |
| --- | --- | --- |
| `pending-first` | Pending, nobody has decided | The first approver's action is available |
| `pending-next` | Pending, one step before the last | Earlier approvals recorded; the last approver is next |
| `approved` | Approved | Complete chain; decision actions disabled with an explanation |
| `rejected` | Rejected by the last approver | Earlier approvals and the rejection reason on record; the order is terminal |
| `at-limit` | Pending, nobody has decided; total exactly on the first limit | Inclusive threshold: only the first ladder level is required |
| `fractional` | Pending, nobody has decided; fractional quantities | Per-line `HALF_UP` rounding to cents before summing (ADR-008) |

Quantities scale with each project so its orders reach its own ladder levels; unit prices stay realistic. Order notes end with an internal marker that identifies the scenario by project; the interface hides it without changing the stored note.

## Reseeding

Seeding only adds what is missing. It never resets credentials, custom names, activation state, configured ladders or orders that have progressed, and it reports workflows it skipped because prerequisites changed. Exact legacy default names (for example "Obra Centro") are upgraded in place. In production mode the seed refuses to run unless `ALLOW_DEMO_SEED=true`, and the container deployments use `--if-empty` so a redeploy never recreates rows an administrator removed.

To start over locally, remove the database volume (`docker compose down -v` for `compose.yaml`, or `docker compose -f compose.review.yaml down -v` for the review stack) and run the setup or review command again.
