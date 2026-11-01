# ADR-006 — Cumulative Approval Escalation

**Status:** Accepted — business interpretation and domain model
**Date:** 2026-10-20
**Project:** ObraFlow challenge
**Delivery requirement:** Include the explicit interpretation in the final submission README.

## Context and ambiguity in the challenge

The ObraFlow challenge describes a project with a purchase amount up to R$ 10,000 associated with João, and an amount above R$ 10,000 associated with Amanda. It then states that a R$ 12,500 purchase must first be approved by João and then by Amanda. The rules editor also asks the candidate to add, remove, and reorder approvers *in each value band*.

The example **supports a cumulative escalation interpretation**, but the editor wording could also describe separately configurable ordered approver lists per value range. The specification does not unambiguously require cumulative inheritance, so our choice is an **explicit product/domain interpretation**, not an assertion that the challenge mandates it.

> **Terminology (2026-11-01).** "Chain of Approval (CoA)" here is the project's rule set, which the interface calls the **alçada**. The Portuguese note below calls it a "cadeia de aprovação" and then uses "cadeia" for the sequence resolved for one order. Both senses exist in this record; from now on the rule is the **alçada**, the ordered approvers one order needs are its **cadeia**, and the [glossary](../README.md#glossary) is the reference.

## Decision

Implement one **cumulative Chain of Approval (CoA) per project**, represented by an ordered ladder of escalation bands. Each stored band contributes exactly one approver and contains:

- `projectId`
- `upperLimit` — a decimal monetary value or `NULL` for the final, unlimited band
- `approverId` — the user introduced at that escalation level

Do **not** introduce a separate CoA database table, an independently configurable approver list per band, or a general-purpose rules engine solely to model this requirement. The CoA is reconstructed and validated using all bands for a project.

For total `T`, sort project bands by increasing finite `upperLimit`, placing `NULL` last. Find the first band whose upper limit is `NULL` or `T <= upperLimit`; the required approval chain is **every approver from the first band through that matching band, in ascending band order**.

Example:

| Stored upper limit | Approver introduced | Effective chain through this level |
|---|---|---|
| R$ 10,000.00 | João | João |
| R$ 50,000.00 | Amanda | João → Amanda |
| Unlimited (`NULL`) | Carlos | João → Amanda → Carlos |

Thus R$ 8,000 requires João; R$ 12,500 requires João then Amanda; R$ 80,000 requires João then Amanda then Carlos.

## Configuration invariants

1. An active CoA contains **at least one** band.
2. The first effective lower boundary is **R$ 0**, derived rather than stored; nonnegative purchase totals are covered.
3. All finite upper limits are nonnegative and strictly increasing in sorted order; the final band has `upperLimit = NULL` (unlimited). No `-1`/`0` sentinel for unlimited.
4. **Exactly one** unlimited band exists for every configured project. A project with no configured bands is *unconfigured*, not an active policy.
5. Each band has one non-null approver; no empty/no-approval band and no implicit auto-approval.
6. Within one project, each approver occurs at most once in the ladder and each finite upper limit occurs at most once; users can participate in multiple projects.
7. Each approver must be an active member of that project when the configuration is saved; business checks also apply at decision time.
8. Band changes are validated against the **complete resulting ladder** and persisted **atomically**. Updates must use optimistic concurrency (`expectedCoaVersion`) and serialize with purchase-order creation using a transaction that locks the owning project row.
9. A purchase order without a configured, valid CoA **cannot be created/submitted**. This is a denied submission, *not* an approver's `REJECTED` decision.
10. At purchase-order creation, the resolved ordered approval chain is **snapshotted**. Subsequent CoA edits affect future orders only; decisions on existing orders use their snapshots.
11. Only the current assigned approver may approve or reject; approval order cannot be bypassed by an administrator. Rejection requires a reason and terminates that order's approval flow.

Relational enforcement should include foreign keys, `UNIQUE(project_id, approver_id)`, a uniqueness guarantee for non-null `(project_id, upper_limit)`, and a project-scoped **partial unique index** for the one `NULL` upper limit. The complete-ladder invariants also require application-level validation in the same serialization/transaction strategy as updates and purchase creation.

## CoA source of truth and immutable revision history

**Decision (accepted 2026-10-20):** A project's currently stored approval bands are the authoritative configuration **for new purchase orders only**. At PO creation, resolve the current complete ladder and persist the ordered approval steps as that PO's immutable assignment snapshot. Approval or rejection of an existing PO uses its snapshotted steps, never a freshly evaluated current ladder.

CoA edits remain allowed while purchase orders are pending. They affect future orders only. Do **not** block a configuration edit merely because in-flight orders reference earlier revisions, and do **not** rewrite their assigned approval sequences.

Keep the normalized active bands simple, and add the minimum historical metadata and append-only record needed to audit the rules that produced an order:

- `projects.coa_version`: monotonically increasing version of the project's active CoA (initially `0` when unconfigured).
- `coa_revisions`: immutable historical rows keyed by `(project_id, version)` containing a **complete ordered copy** of the validated ladder (e.g. JSONB with `upperLimit` and `approverId`), `changed_by_id`, and `changed_at`. Initial successful configuration creates version `1`. Each **genuine configuration change** creates exactly one next revision; an identical normalized ladder submitted with a matching expected version is a successful **no-op**, keeping the same version with no new historical row (ADR-009). Never overwrite or delete earlier revisions through application operations.
- `purchase_orders.coa_version`: the exact version applied at creation, enabling reconstruction of the thresholds and actors that generated the order. The PO's own approval steps are still the executable source of truth for who may decide next.

**These representations have deliberately different responsibilities:** current bands configure *future* orders; historical revisions explain *past configuration*; snapshotted PO steps govern *this order's decisions*. A version counter without preserved revisions is insufficient for a configuration audit.

### Transactional guarantees

1. For a CoA edit, lock the project row and check the client's expected version against `projects.coa_version` **before** content comparison. A stale version fails with `409` even if the ladder is identical. Validate and normalize the entire proposed ladder. If semantically equal to the current active ladder, return the unchanged version and ladder with `200` and **no write or revision**. Otherwise replace active bands, increment the version and insert the matching immutable revision **within one database transaction**.
2. For PO creation, lock the **same project row**, compute and persist the server-authoritative order total, load the current valid ladder and version, resolve the ordered approvers, and persist the order, its items, the applied version, and its approval-step snapshot **within one transaction**.
3. A new PO must never observe active bands from one CoA revision with a version number from another. Approval decisions on an existing PO never consult current bands to rewrite assignments.
4. Historical revision records are append-only at the application level; foreign keys and uniqueness constraints should preserve `(project_id, version)` identity and prevent ordinary application operations from deleting referenced revision history. Audit integrity against privileged database administrators is outside this demo's threat model.

### Approver deactivation and active-CoA integrity (accepted 2026-10-20)

A user **cannot be deactivated** while either of these conditions holds across **any** project:

1. The user appears in a project's **currently active CoA**.
2. The user has **any undecided approval step on a PENDING purchase order**, including a future step that has not yet become actionable.

An administrator must first publish an explicit replacement CoA that no longer references the user, creating a **new immutable CoA revision**. This change affects future orders only and **never edits historical revisions or existing PO approval-step assignments**. The administrator must also ensure that the user has no remaining undecided steps on pending POs (by ordinary approval/rejection of those orders). **A PO from an older revision may remain PENDING after deactivation if all of this user's steps on it are already decided.** Historical CoA revisions, decided steps, and terminal orders do not by themselves block deactivation.

Do **not** automatically delete the user's active CoA band on deactivation. It may remove a required escalation stage or the sole unlimited band, silently changing financial authority or invalidating the ladder. An explicit, fully validated CoA replacement is required.

Deactivation must recheck both blockers **transactionally** and synchronize with concurrent PO creation, CoA publication, and approval decisions; a check followed by an unlocked status change is insufficient. The concrete lock ordering and transaction implementation are deferred until the data-access design. A failed deactivation must leave the user's status, CoA, and PO steps untouched.

**Scope/trade-off:** ADR-004 now includes an admin-only logical-deactivation endpoint in Phase 1; it must enforce these invariants transactionally and produce an immutable user-lifecycle audit record. A small admin-only user-management UI is now included for existing create/deactivate operations (ADR-004, 2026-10-21); no reactivation, forced deactivation, or emergency override is included. For emergency departures or compromised accounts, a production service needs an independently designed emergency lock/reassignment/cancellation process with an audit trail. The demo's ordinary deactivation rule intentionally does not provide that escape hatch.

## Scope and consequences

- **Supported:** Adding/removing an escalation stage; modifying its threshold; changing the approver at a stage; reordering the ladder (including changing which approver owns which threshold). The effective ordered sequence for a higher amount always includes the full prefix.
- **Not supported by this domain interpretation:** Independently removing an earlier approver only for a higher purchase range, or independently reordering a higher range's approvers while leaving lower-range precedence unchanged.
- The interface must make the *effective chain for each threshold* visible so administrators understand the cumulative effects of their edits.
- Because the challenge says to "reorder approvers in each band," this reduced flexibility is an **acknowledged specification-interpretation risk**, not a claim of literal equivalence. The final README must disclose it rather than obscure it.
- A future requirement for independent per-range chains would require revisiting the data model; do not prebuild that flexibility without evidence.

## Mandatory final README disclosure

Include an explicit subsection in the final README under **Business assumptions / Approval rules** (Portuguese is suitable for the challenge), using wording substantially like:

> **Interpretação adotada — alçada cumulativa por obra:** modelamos uma única cadeia de aprovação por obra, composta por níveis de escalonamento ordenados por limite de valor. Cada nível adiciona um aprovador à cadeia anterior: até R$ 10.000, João; acima desse valor, João → Amanda. Essa interpretação foi escolhida porque o exemplo do desafio exige a aprovação de João antes da de Amanda para um pedido de R$ 12.500, embora a configuração apresentada associe Amanda à faixa superior.
>
> **Consequência:** a edição ou reordenação de um nível pode afetar a sequência efetiva das faixas superiores; não oferecemos cadeias independentes por faixa. Reconhecemos que a expressão "reordenar aprovadores em cada faixa" também admite outra interpretação. Optamos pela alçada cumulativa e documentamos essa restrição explicitamente.
>
> Cada obra configurada deve ter cobertura contínua desde R$ 0 até um último nível sem limite superior e pelo menos um aprovador por nível. Uma obra sem alçada configurada não permite a criação do pedido. A cadeia resolvida é registrada no pedido no momento da criação, para que alterações posteriores não modifiquem pedidos existentes.

## Verification expectations

- Boundary tests exactly at thresholds and one cent above them.
- Coverage of zero-value and very large purchase totals, including unlimited final stage.
- Validation against duplicate approvers, duplicate finite thresholds, missing/duplicate unlimited stage, and empty configuration.
- Atomic update and concurrent update/create consistency tests.
- Confirm prefix approval behavior and decision ordering, including rejection at any stage.
- Confirm edits do not alter existing order snapshots.
- Confirm every **genuine configuration change** appends one complete immutable CoA revision with actor, time, and monotonic project version; identical content with the correct expected version is a `200` no-op without an added revision, while stale versions conflict even if content matches.
- Confirm POs retain both their applied `coaVersion` and ordered approval steps, including when rules change during pending approvals.
- Race-test concurrent CoA updates and PO creation; stale expected-version writes fail atomically.
- Deactivation is blocked if the user appears in any active CoA or has any undecided step on a pending PO; historical revisions and completed decisions alone do not block it.
- Verify deactivation cannot race with new PO assignment or CoA publication and does not auto-remove CoA bands.
- The final README contains the **explicit interpretation and limitation** above.

## Open implementation details (not part of this decision)

- Decimal representation, item rounding, transport, and boundary precision are accepted in [ADR-008](ADR-008-monetary-precision-calculation.md); only concrete service/ORM integration remains.
- Concrete TypeORM lock/API error mapping and migration details for the accepted versioning and project-row serialization strategy.
- API payload for replacing an entire project's ladder.
- Frontend interaction design and affordances for reordering thresholds and approvers.

## Related decisions

- [ADR-001 — Database selection](ADR-001-postgresql-typeorm.md)
- [ADR-005 — Project membership and authorization](ADR-005-project-membership-authorization.md)
- [ADR-008 — Monetary precision and approval thresholds](ADR-008-monetary-precision-calculation.md)
