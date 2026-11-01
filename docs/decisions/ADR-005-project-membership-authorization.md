# ADR-005 — Project Membership and Resource Authorization

**Status:** Accepted (2026-10-20)
**Scope:** ObraFlow challenge

> **Terminology (2026-11-01).** The explicit save action described below as **Salvar alçada** is implemented as **Publicar alçada**: a ladder is published, not saved. The behavior is unchanged. See the [glossary](../README.md#glossary).

## Context

Projects are the business boundary for purchase orders and their approval rules. The challenge does not specify multi-organization tenancy or per-project memberships, but access rules must be explicit: authentication alone cannot grant access to another project's orders. Admins provision accounts (ADR-004); project creation and membership assignment should be similarly controlled. The backend, not the frontend, must enforce authorization (ADR-003).

## Project lifecycle extension (2026-10-30)

This supersedes the earlier exclusion of project renaming. ADMIN may rename projects with the creation name rules, archive, and reactivate; no hard deletion is introduced. Archive is blocked by any `PENDING` PO. An archived project preserves its ID, members, complete CoA revisions, orders, snapshots, decisions and existing audit records. Reads retain their authorization rules. New POs, CoA publication (including no-op writes), and membership addition/removal fail while archived. Refinement (2026-10-30): only active projects can be renamed; archived projects return `409 PROJECT_ARCHIVED`, including unchanged-name writes. Reactivate before correcting a name. Reactivation restores eligibility without changing configuration or history. Repeated archive/reactivate commands are no-ops returning the current project.

All project lifecycle writes serialize on the existing project lock, shared with PO creation/publication and now membership addition/removal. The pending-order blocker is read under that lock without taking PO locks; concurrent decisions may conservatively require another archive attempt. No approval, money or generic lifecycle framework changes; the subsequent administration-audit amendment in ADR-009 adds project/membership history without changing these locks or business rules.

The detail workspace uses existing dialog patterns and disables lifecycle actions while members are managed or a CoA draft is being edited. Archived workspaces retain read-only members/CoA history; the PO creation selector excludes archived projects. The administration list defaults to active projects and offers archived/all URL filters. Lost write responses require an explicit authoritative read, preserving the rename draft without automatic replay.

## Membership-management extension (2026-10-23)

The member-dialog redesign now includes real removal. This narrowly supersedes the earlier add-only scope/exclusion below; the existing membership and approval invariants remain binding.

- Only ADMIN may remove a project membership, through the additive endpoint in ADR-009. Removing a membership does not deactivate the account or remove it from other projects.
- Block removal while the project's published CoA references the user (`409 MEMBER_ASSIGNED_TO_ACTIVE_COA`), or while any undecided step on a pending PO in this project references the user (`409 MEMBER_HAS_PENDING_APPROVALS`), including future steps. Publishing a replacement CoA alone does not release existing snapshotted assignments. Undecided steps skipped by a terminal rejection do not block removal.
- Enforce both checks transactionally against competing publication, creation and decisions. Preserve all existing orders, decisions, creators, users and complete CoA revisions. No historical reassignment, schema change or new event store is introduced.
- Removal revokes ordinary-user access to this project's orders. ADMIN retains global reads but needs explicit membership to create orders. A person can be added again through the existing active-user membership endpoint.
- The overview uses a compact avatar stack and first two names plus remaining count. The searchable management dialog distinguishes current active/inactive members from active nonmembers, confirms removal, explains server conflicts and refreshes authoritative references before another write. It never resets or publishes an unsaved CoA draft.

## Decisions

1. **Admin is a role, not a separate entity.** Users have a global `ADMIN` or `USER` role; no generalized configurable RBAC or per-project generic `read/write` flags are introduced in Phase 1.
2. **Explicit project membership.** Store user-to-project membership in a `project_members` association with foreign keys and a unique `(project_id, user_id)` constraint. Project membership represents which project's business operations a user may access; approval authority is separate.
3. **Project provisioning.** Only an authenticated `ADMIN` can create projects and assign members through backend APIs. **A minimal ADMIN-only UI for project listing/creation and membership inspection/assignment is included** under the page-scope amendment accepted 2026-10-21. The challenge does not mandate this UI, but it allows newly created users/projects to be put into a working approval flow without manual API calls. Seeded projects and memberships still make the initial demo usable.
4. **Purchase-order reads.** Active ordinary users may list/read POs only from projects of which they are members. Active admins may read POs organization-wide for oversight. The backend filters database queries and verifies individual-resource access; it does not send unauthorized data to the frontend for filtering. Anonymous requests return `401`. For an authenticated nonmember, a PO detail request outside their visibility returns `404`, indistinguishable from an unknown PO ID. List requests return only authorized results.
5. **Purchase-order creation.** Active users may create POs only for projects they are members of, including admins. A global admin role does not by itself make a user a purchasing participant in all projects.
6. **Rule configuration.** Only an authenticated `ADMIN` can create/edit/remove per-project approval rules. Reading rule configuration may be available to authenticated users subject to a project-visibility policy; exact API response shapes are deferred.
7. **Approval authority is contextual.** An approval/rejection requires an active user, active membership of the PO's project, and assignment to the *current pending approval step* as determined within the same database transaction as the decision. `ADMIN` alone cannot skip, force, or substitute for approvers. Decisions outside the sequence are rejected without changing PO state or history.
8. **Rule assignees.** New approval rules may assign only active users who are members of that project. The approval chain for an existing PO is snapshotted at creation; later rule edits must not silently mutate the order's historical or pending steps.
9. **Pending-approver membership protection.** Removing a project member who has any pending approval step in that project is **forbidden**. If membership removal is implemented, enforcement must be server-side and race-safe (perform authorization/constraint checks transactionally). No membership removal endpoint or removal UI is required in Phase 1; this is a domain invariant for any future operation.
10. **Account deactivation.** An account cannot be deactivated while its user is assigned in any active CoA or has any undecided approval step on a pending PO in any project. CoA changes must be explicit, versioned, and audited; historical CoA revisions and already-decided steps do not block deactivation. ADR-004 includes a Phase 1 admin-only logical-deactivation API and lifecycle audit records; see ADR-006 for the transactional restrictions.
11. **Historical fidelity.** Previously recorded approval decisions and their actors remain immutable if membership changes later. No silent reassignment or substitution is supported in Phase 1.
12. **Backend-only security checks.** Verify project restrictions and approval transitions by calling the API directly rather than depending on navigation visibility, button disabling, or frontend-supplied actor IDs.
13. **Supplier provisioning and availability.** Suppliers are first-class shared reference records with a foreign key on the PO header, not supplier data repeated per PO item. Only `ADMIN` may create or deactivate suppliers. Authenticated active users may list/select active suppliers for new POs. A compact **ADMIN-only supplier-management UI is in scope** (accepted page-scope amendment, 2026-10-21); supplier editing, reactivation, and physical deletion remain out of scope.

## Accepted project-administration UI-scope amendment (2026-10-21)

This amendment adds a **small ADMIN-only project administration workflow** without changing the business/API decisions in this ADR or the accepted endpoint surface in ADR-009.

- `/admin/projects`: list projects using `GET /api/v1/projects`, display project name and whether its CoA is configured (using `coaVersion`), and allow creation by `POST /api/v1/projects` with only the accepted `name` field. Navigate to the newly created project's configuration page.
- `/admin/projects/:id`: display project context and the current members from `GET /api/v1/projects/:id/members`. Allow the administrator to **add an existing active user** using `GET /api/v1/users` and `POST /api/v1/projects/:id/members`; exclude already-added or inactive users from the add-member picker, but let the server enforce eligibility.
- Place the project's accepted **cumulative CoA configuration** in that detail workspace via `GET /api/v1/projects/:id/coa` and `PUT /api/v1/projects/:id/coa`. The editable approval ladder may only select **active project members**. On a new project, `coaVersion: 0` and `bands: []` mean that the CoA is unconfigured; the UI must explain that purchase orders cannot yet be submitted against this project.
- **Explicit CoA publication boundary:** the project details page keeps **Membros** and **Alçada de aprovação** accessible as two sections of the same workspace (their presentation, including whether tabs are appropriate, is intentionally flexible). Editing thresholds, adding/removing/repositioning escalation steps or changing approvers modifies a **local draft only**. A clearly labeled **Salvar alçada** action submits the **entire validated ladder once** with `expectedCoaVersion`, then reconciles the draft with the authoritative response. **No autosave, save-on-drag, or per-tick/per-field persistence.** Membership addition uses its existing independent API operation and is not part of the CoA save transaction.
- **UI/UX latitude:** a visual amount bar with movable/addable threshold ticks is the leading interaction concept, but not a mandated widget implementation. Whatever control is chosen must preserve exact decimal thresholds, eligibility constraints, ordered cumulative escalation, keyboard-accessible/precise editing and a clear view of the resulting approval chain. Document the invariant and save behavior, **not every small UX component**.
- **Workflow:** create an ordinary user (optional, via the existing `/admin/users` screen), create a project (or select one), assign eligible users as members, configure and save its initial CoA, then create a purchase order through the standard authenticated PO flow as a project member. An ADMIN is **not automatically a project member** and does not bypass approval assignment.
- Handle duplicate membership (`409 MEMBERSHIP_ALREADY_EXISTS`) and stale CoA saves (`409 COA_VERSION_CONFLICT`) with clear feedback and authoritative refetch. Do not silently overwrite rule edits or add duplicated memberships.
- **Explicitly excluded:** membership removal, project deletion, generalized membership roles, project editing/renaming, automatic approver assignment, user account role promotion, or new API endpoints. Project-member administration remains *add-only* because that is the accepted Phase 1 contract.
- Route visibility is an admin UX convenience; all create/configuration/membership writes must retain backend `ADMIN` checks. A regular user's access to their own visible projects, approved CoA reads, and PO operations is unchanged.
- The **cumulative escalation semantics** and the absence of independently reordered approver chains within each value range are settled in ADR-006 and must be disclosed as previously agreed, not renegotiated through the UI.

Exact composition (tabs versus adjacent sections, bar/ticks mechanics, supporting inputs, dialogs, responsive layout) and visual states remain implementation/design choices. The **shared Membros/Alçada workspace and explicit publish-on-Salvar behavior** are accepted; a particular widget is **not**.

## Accepted supplier-administration UI-scope amendment (2026-10-21)

The challenge explicitly makes a supplier-registration **screen optional** while requiring backend supplier creation/listing. We include a compact **ADMIN-only `/admin/suppliers` page** so supplier availability can be administered and demonstrated without manual Bearer-token/API calls. This updates UI scope only; it does not change the accepted lifecycle semantics or add endpoints to ADR-009.

- **List active and inactive suppliers** with `GET /api/v1/suppliers`, showing name and active status; inactive records remain visible because previous purchase orders must retain their supplier identity.
- **Create supplier** with `POST /api/v1/suppliers` and the accepted `name` field. On success, refresh the visible list; the active supplier becomes eligible in new-order selection.
- **Deactivate supplier** with `DELETE /api/v1/suppliers/:id`, using an explicit confirmation that the action blocks **future PO creation only** and **does not cancel, reject, or alter any existing order or approval**. A successful `204` is bodyless; handle first and repeated deactivation without inventing a response body. No physical deletion.
- Inactive suppliers cannot be chosen for new orders; the backend remains authoritative under concurrent create/deactivate requests. Existing PO detail views continue to show them, with the previously accepted inactive-supplier warning.
- **Exclude** supplier editing, reactivation, physical deletion, additional supplier metadata/workflows, and any new endpoints. No ordinary-user access to supplier administration: show the route only to `ADMIN`, guard it in the SPA, and keep backend permission enforcement.

List layout, form presentation and confirmation-dialog copy remain part of the subsequent page-layout review.

## Supplier lifecycle semantics (accepted 2026-10-20)

- **Meaning of deactivation:** The supplier becomes unavailable for **future PO creation**. This does **not** assert that every existing contract or purchase is invalid. The simple model supports `isActive`, not an emergency legal/compliance hold.
- **First-class reference:** Persist a `suppliers` record (minimally an ID and name) and reference it from `purchase_orders.supplier_id`. Do not repeat the supplier on individual PO items. Never physically delete a supplier referenced by an order.
- **Admin-only lifecycle:** `POST /suppliers` creates an active supplier; `DELETE /suppliers/:id` deactivates it logically (no physical removal or cascade). Initial and repeated authorized deactivation of an existing supplier return bodyless `204 No Content`; repeated calls are no-ops that must retain the original actor/time. Missing supplier IDs return `404`, insufficient permissions `403`, and failed authentication `401`. `GET /suppliers` is available to authenticated users, exposes active state and may support an active-only filter. Disabled suppliers must be excluded from the new-PO selector but remain available to render historical orders.
- **Minimal audit metadata:** Store `createdAt`, `createdBy`, `deactivatedAt` and `deactivatedBy` with the supplier, using trusted administrator identity and server time. In this Phase 1 create-once/deactivate-once lifecycle, this is sufficient to explain the state transition without a general event-log infrastructure. A second deactivation is a no-op and does not rewrite the first deactivation actor/time.
- **Existing orders continue unchanged:** POs already `PENDING`, `APPROVED` or `REJECTED` keep their supplier reference and state. Deactivating a supplier must not create an approval/rejection decision, cancel or modify a PO, or overwrite its historical approval records. Assigned approvers may still approve/reject a pending PO with that supplier and should see an explicit "supplier inactive" warning during review.
- **New-order enforcement and races:** Creation with an inactive supplier must fail with no persisted order/items/approval chain. The backend must check supplier activity in the PO creation transaction and synchronize this check with supplier deactivation; an unlocked read followed by insertion is insufficient. Detailed lock ordering is deferred to persistence design.
- **Trade-off:** A pending PO may still be approved after the supplier is deactivated. A supplier genuinely prohibited on legal/compliance grounds might require suspension of pending work and controlled intervention into already approved orders; that is a **separate, explicitly unimplemented policy**, not an implicit consequence of ordinary supplier deactivation.

## Minimal authorization matrix

| Operation | Authenticated `USER` | Authenticated `ADMIN` |
|---|---|---|
| List/read POs | Member projects only | Organization-wide |
| Create a PO | Member projects only | Member projects only |
| Approve or reject | Active member **and** assigned current approver | Same; no bypass |
| List suppliers | Allowed | Allowed |
| Create supplier | Denied | Allowed |
| Deactivate supplier | Denied | Allowed |
| Create project | Denied | Allowed |
| Assign project members | Denied | Allowed |
| Configure approval rules | Denied | Allowed |
| Read other projects' POs | Denied | Allowed |
| Anonymous PO reads | Denied | Denied |

## Consequences and trade-offs

- Adds one explicit association table and a small number of domain-specific access checks rather than a general permissions engine.
- Admins have organization-wide **read**, not workflow-decision, authority. They must themselves be project members to create orders and personally assigned current approvers to decide.
- Removing an approver with pending decisions is blocked rather than silently invalidating an in-flight approval chain. A future audited reassignment or cancellation workflow could relax this restriction safely; it is out of scope now.
- Project-scoped access adds join/filter requirements to both list and detail endpoints and requires multi-user/multi-project authorization tests.

## Required verification

- [ ] Anonymous `GET /purchase-orders` and `GET /purchase-orders/:id` return 401 and disclose nothing.
- [ ] Authenticated nonmember `GET /purchase-orders/:id` returns `404`, just like an unknown ID, while a member who attempts an operation for which they lack permission receives `403`.
- [ ] Otherwise authorized stale approval commands return `409`; rejected operations never alter decisions or status.
- [ ] An authenticated user cannot list, read, or create POs in unassigned projects.
- [ ] An authenticated admin can read across projects but cannot create a PO without project membership.
- [ ] Ordinary users cannot create projects, assign members, or edit approval rules.
- [ ] An ADMIN can create a project and add existing active users through the `/admin/projects` UI, then configure a valid CoA without manual API requests; a newly created project correctly displays `coaVersion: 0` / empty bands until configured.
- [ ] The add-member UI excludes inactive/already-added users, handles duplicate membership `409`, and never assumes that an ADMIN is automatically a project member.
- [ ] Editing or moving CoA thresholds/approvers changes only the local draft until **Salvar alçada**; one explicit save sends the whole ladder and expected version; stale `409` does not silently publish or discard authoritative history.
- [ ] Authenticated users can list suppliers; anonymous requests cannot. Only admins may create suppliers; rejected creation requests leave the database unchanged.
- [ ] An ADMIN can list, create and logically deactivate suppliers through `/admin/suppliers` without manual token calls; inactive suppliers remain listed, and the confirmation correctly states that existing orders are unaffected.
- [ ] Ordinary users cannot access supplier-administration UI or its protected create/deactivate endpoints, even by typing the URL.
- [ ] Only admin can logically deactivate a supplier; deactivation records actor/time and never deletes a supplier or its referenced orders. A repeated call does not overwrite original deactivation metadata.
- [ ] Both first and repeated authorized supplier deactivations return bodyless `204`; repeated deactivation writes no additional record or timestamp.
- [ ] Inactive suppliers cannot be used for new POs, including under concurrent creation/deactivation, but remain visible on historical POs.
- [ ] Deactivation does not change any existing PO status, approval assignment, or immutable decision. Pending orders display an inactive-supplier warning and allow the assigned approver to decide normally.
- [ ] Admin approval attempts are rejected unless the admin is the assigned current approver and a project member.
- [ ] Out-of-order, duplicate, and cross-project approval attempts leave PO status, step state, and audit history unchanged.
- [ ] Approval-rule configuration rejects inactive or nonmember approvers.
- [ ] If membership removal is implemented, it cannot remove members with pending project approval steps; test its transactional behavior.
- [ ] If deactivation is implemented, block it while any active CoA or undecided step on a pending PO refers to the user; enforce this race-safely across projects.
- [ ] If membership removal is implemented, also block removal while the project's active CoA references the member, until a validated replacement version is published.

## Active-CoA membership consequence

A member referenced by an **active CoA** cannot simply be removed from that project's membership: active CoA assignees must remain eligible project members. An administrator must first explicitly publish a replacement CoA revision removing that assignment. Independently, ADR-005 already forbids removing project membership while the user has undecided approval assignments on pending POs for that project. Historical revisions and already-decided steps alone do not block removal. No membership-removal endpoint is required in Phase 1.

## Related decisions

- [ADR-003](ADR-003-authentication-authorization.md): credential-backed authentication and backend authorization.
- [ADR-004](ADR-004-admin-user-provisioning.md): admin account provisioning and seeded users.
- [ADR-006](ADR-006-cumulative-approval-escalation.md): active CoA validity, immutable revisions, and deactivation prerequisites.

**Source:** Architecture discussion, 2026-10-20. Supplier lifecycle follow-up accepted and committed.
