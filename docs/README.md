# Technical documentation

The root [README](../README.md) is the reviewer entry point. The original requirements are in [challenge/README.md](../challenge/README.md). Accepted ADRs define business and architecture decisions; current contracts and persistence rules are documented below.

## Implementation references

- [Architecture overview](architecture/overview.md): application scope, boundaries and accepted UX decisions.
- [Code organization](architecture/code-organization.md): ownership and implementation guidance.
- [Frontend workflows](architecture/frontend.md): routes, explicit save/recovery behavior, account and notification UI.
- [API contract](api.md): implemented requests, responses and errors.
- [Persistence boundaries](architecture/persistence.md): entities, transactions and locking.
- [Realtime backend](architecture/realtime.md): authenticated best-effort Socket.IO hints; PostgreSQL and REST remain authoritative. Browser notifications and proxy integration are implemented; no durable server inbox is provided.
- [Deployment](deployment.md): Docker images, the `dist/` bundle, configuration and the login limit. The hosted demo's settings are in [`stackport/`](../stackport/README.md).
- [Demonstration data](demo-data.md): identities, projects, ladders, suppliers and order scenarios the seed creates.
- [Visual conventions](brand/README.md): runtime assets, semantic tokens and component ownership.
- [Submission acceptance](submission-checklist.md): current checks and reviewer workflow.

## Glossary

The code and these documents are in English; the interface is in Portuguese. One concept has one word in each.

| Concept | Code and docs | Interface (pt-BR) |
| --- | --- | --- |
| A project's approval rules: a versioned, cumulative set of levels. One version is published at a time. | CoA (chain of approval), ladder | **Alçada** ("Alçada de aprovação"); the action is **publicar** |
| One entry of the alçada: an approver and an upper limit. Each level adds its approver to the earlier ones. | band, level | **Nível** (the value range is a **faixa**, used only in explanations) |
| The ordered approvers one order needs, chosen from its total and snapshotted when it is created. | approval chain, steps | **Cadeia (de aprovação)**; each position is an **etapa** |
| A stored version of the alçada, listed in its history and in the audit. | revision, `coaVersion` | **Versão** ("Versões da alçada") |
| Someone who signs in. A project member is a user attached to a project. | user, member | **Usuário**, **membro**. Never "pessoa". |
| A construction project: its members, its alçada and its orders. | project | **Obra** |

The interface speaks to the reader in the second person ("sua decisão", "seu rascunho", "você precisa"). It never uses the first person ("minha decisão") and the system never speaks as "nós" ("recarregamos"); it states what happened ("foi recarregado").

Two rules follow. The alçada is the rule and the cadeia is what an order needs; the two words are never interchangeable. An alçada is published, not saved; "salvar" is for edits such as renames.

## Decision register

| Number  | Topic                                                    | Status             | Document                                                          |
| ------- | -------------------------------------------------------- | ------------------ | ----------------------------------------------------------------- |
| ADR-001 | PostgreSQL + TypeORM                                     | **Accepted** | [Read](decisions/ADR-001-postgresql-typeorm.md)                    |
| ADR-002 | Frontend stack & design-system foundations               | **Accepted** | [Read](decisions/ADR-002-frontend-architecture.md)                 |
| ADR-003 | Credential-backed authentication & backend authorization | **Accepted** | [Read](decisions/ADR-003-authentication-authorization.md)          |
| ADR-004 | Admin-controlled user provisioning & deactivation        | **Accepted** | [Read](decisions/ADR-004-admin-user-provisioning.md)               |
| ADR-005 | Project membership & resource authorization              | **Accepted** | [Read](decisions/ADR-005-project-membership-authorization.md)      |
| ADR-006 | Cumulative approval escalation                           | **Accepted** | [Read](decisions/ADR-006-cumulative-approval-escalation.md)        |
| ADR-007 | Purchase-order lifecycle & immutable decisions           | **Accepted** | [Read](decisions/ADR-007-purchase-order-approval-lifecycle.md)     |
| ADR-008 | Decimal monetary precision & rounding                    | **Accepted** | [Read](decisions/ADR-008-monetary-precision-calculation.md)        |
| ADR-009 | HTTP API contract                                        | **Accepted** | [Read](decisions/ADR-009-http-api-contract.md)                     |
| ADR-010 | Detail-first purchase-order decisions                    | **Accepted** | [Read](decisions/ADR-010-detail-first-purchase-order-decisions.md) |
| ADR-011 | Best-effort realtime PO notifications                    | **Accepted** | [Read](decisions/ADR-011-best-effort-realtime-po-notifications.md) |
| ADR-012 | Test strategy                                            | **Accepted** | [Read](decisions/ADR-012-test-strategy.md)                         |

## Documentation ownership

Keep accepted rationale in ADRs, implemented behavior in the architecture/API references, and setup/reviewer instructions in the root README. Record substantive business trade-offs explicitly; avoid duplicating widget histories or test-run logs across documents.

The original challenge requires screenshots of the screens in the final root README. The full gallery lives in `docs/assets/screenshots/<theme>/<viewport>/<area>/` (light and dark, desktop and mobile, 226 captures; `manifest.md` lists them) and the README links to a few of them. It is generated by `node scripts/screenshots.mjs` against a running `npm run review` stack: a manual tool, deliberately not an npm script and never part of the tests (ADR-012). It opens dialogs and fakes failures by intercepting requests in the browser, but confirms no write, so the demo data is left as it was. Playwright traces on failure are diagnostics only.

The README explains the cumulative-CoA interpretation (ADR-006), exact decimal arithmetic and threshold boundaries (ADR-008), and the authentication limitations (ADR-003). Application audit records preserve workflow history but do not promise database-level tamper-proof storage.
