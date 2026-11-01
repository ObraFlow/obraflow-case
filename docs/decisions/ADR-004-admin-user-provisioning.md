# ADR-004 — Admin-Controlled User Provisioning and Deactivation

**Status:** Accepted (2026-10-20)

## Context

ObraFlow requires backend creation and listing of users but explicitly does not require a user-creation screen. The application represents an internal purchasing/approvals workflow. Public self-registration would require separate admission controls to prevent unauthorized access to organization data.

## Decision

- Accounts are created by an authenticated administrator, not by public self-registration.
- `POST /users` is restricted to `ADMIN` and supports provisioning **ordinary `USER` accounts only**, with an administrator-assigned initial password; the accepted request fields are `username`, `displayName`, `password`, plus optional `role: "USER"` (ADR-009). The backend hashes passwords using Argon2id, never storing/logging them in plaintext. A caller-supplied `ADMIN` role must be rejected, not accepted or silently trusted. When no role is supplied, the backend assigns `USER`. There is no role-promotion/update API.
- `GET /users` is available to authenticated users for selecting approvers and other supported workflows. Returned records never expose password hashes or other credentials.
- `POST /auth/login` authenticates seeded and provisioned accounts using **username + password** (no email login requirement for the demo). Usernames are stored in canonical lowercase and matched with **case-insensitive uniqueness** consistently for account creation, seeding, and login. Users have immutable UUID `id` values used for JWT `sub` and domain foreign keys; username is a login lookup key and `displayName` is for display, not a user identity/authorization authority. `GET /auth/me` resolves the authenticated user's current identity/role.
- Seed **exactly one initial `ADMIN` account**, plus ordinary users and ordered approvers. Application-controlled account provisioning cannot create another administrator, and the application exposes no role reassignment or promotion operation. Seeding must be repeatable without silently resetting changed credentials or multiplying the administrator account. Seed passwords must be hashed during seeding; demo credentials are local/disposable.
- `DELETE /users/:id` is restricted to `ADMIN` and **logically deactivates ordinary `USER` accounts only** (`isActive = false`), rather than physically deleting the user. **The seeded `ADMIN` account cannot be deactivated through the API, including by itself.** User identity and foreign-key references in CoA revision history, POs, assignment steps, and decisions remain intact. Disabling a user prevents authentication and subsequent authorized actions even if a previously issued JWT has not yet expired.
- **HTTP deactivation success:** `DELETE /users/:id` returns `204 No Content` both for an eligible user's first deactivation and for repeated requests when an existing ordinary user is already inactive. Repeated requests are no-ops: do not overwrite the original timestamp/actor or append another user-lifecycle event. The `204` response has no body. Unknown user ID returns `404`, missing authentication `401`, and insufficient privilege `403`. An active user blocked by CoA/undecided pending assignments returns `409` with no write. The seeded administrator remains ineligible for deactivation under all circumstances.
- Deactivation is **blocked with a conflict** if the user occurs in any currently active CoA or has any undecided step on a `PENDING` purchase order. An admin must explicitly publish replacement CoA configurations and allow outstanding PO decisions to resolve first, per ADR-006. A failed deactivation makes no status or audit change.
- **Creation and deactivation must both produce immutable application-level audit records**, with the target user, action (`CREATED` or `DISABLED`), authenticated administrator (or an explicit `SYSTEM` actor for seed data), and server-generated timestamp. Use a small append-only user-lifecycle record rather than physically removing records or building a generalized event-sourcing subsystem. Emit records in the same transaction as the user state change; do not record duplicate lifecycle events if a repeated request makes no change.
- No public sign-up, self-registration, invitation/email-verification flow, password change/reset, account reactivation, or ordinary-user account self-service in Phase 1. **An admin-only `/admin/users` screen is in scope** for listing accounts, creating ordinary `USER` accounts and logically deactivating eligible ordinary users via the already accepted API. This is not an account recovery or role-administration product.
- User ID comes from validated JWT `sub`, while current role/active state come from the database; creating an account never bypasses backend authorization.

## Accepted UI-scope amendment (2026-10-21)

The challenge explicitly makes a user-registration screen **optional**, but we intentionally include a small **ADMIN-only user-management page** so reviewers can create a real login identity and test deactivation **through the application rather than manually requesting an admin token and invoking HTTP endpoints**. This is a usability and demonstration decision, not a newly discovered challenge requirement.

The page uses existing accepted routes only: `GET /api/v1/users` (safe list including inactive users), `POST /api/v1/users` (only ordinary users; `username`, `displayName`, initial `password`) and `DELETE /api/v1/users/:id` (logical deactivation). Do not change or expand ADR-009's API contract for this page.

- Display name, username, role and active/inactive status are sufficient for a minimal table. Do not expose password hashes, persisted plaintext passwords or privileged role-changing controls.
- Present a creation form with an administrator-supplied initial password. Do not echo credentials in list/create API responses or persist draft passwords in browser storage. A seeded local demo account remains available for initial login.
- Offer deactivation only for eligible ordinary users, with confirmation; **never** expose a deactivation control for the seeded `ADMIN` account. Server-side eligibility remains authoritative regardless of UI affordances.
- When deactivation returns `409` because the user is in an active CoA or an undecided step of a pending PO, clearly explain the block, preserve the user's active state and let the administrator resolve it through the ordinary CoA/approval workflow. The UI must not silently remove assignments, skip approval steps or introduce a force-deactivate action.
- Hide the admin route from ordinary-user navigation, guard the route in the SPA, and **still enforce every permission on the API**. Do not create public signup or invite flows.
- This is **page-scope inclusion**, not a decision about the final screen layout, modals, table treatment or copy. Those are decided with the rest of the page-design work.

## Trade-offs and limitations

- An administrator necessarily knows the initial password under this simplified provisioning model. This is **not** production-grade credential onboarding; future adoption would require an invitation or forced password-change mechanism.
- The challenge does not mandate administrator-only creation/deactivation or a single administrator. We deliberately seed one immutable-in-role `ADMIN` and limit API-managed accounts to `USER`, avoiding administrator delegation, peer role management, and horizontal privilege escalation.
- The demo credentials are public/disposable; no claim of strong real-user identity assurance is made.
- Authentication UX (login page vs in-shell selection) remains a frontend decision. Every path must still use credential-backed login, not a token-minting impersonation shortcut.
- **Single point of failure:** a disabled, inaccessible, or lost-credential administrator account would leave no in-app recovery option. For the local challenge, this is an acknowledged limitation. Recovery would require an explicitly controlled out-of-band administrative procedure in a real deployment; no privileged reset/backdoor endpoint is included.

## Tests expected

1. Unauthenticated `POST /users` returns 401.
2. Authenticated non-admin `POST /users` returns 403 with no persisted changes.
3. Admin can create a user, and the created account can log in with the initial password.
4. Stored credentials are hashed and never returned in user-list/detail responses.
5. Duplicate usernames (including differently cased variants) and invalid initial credentials are handled predictably; store canonical lowercase handles, match login consistently, and use immutable user UUIDs for all stored references and JWT subjects.
6. Seeded accounts and admin-provisioned accounts follow identical authentication/authorization rules.
7. Unauthenticated `DELETE /users/:id` returns 401, and non-admin requests return 403; the user and audit history remain unchanged.
8. An allowed deactivation prevents login and protected API access while retaining historical approval and CoA references.
9. A deactivation blocked by active CoA assignment or any undecided step on a pending PO returns a conflict and writes no lifecycle event.
10. Create/disable audit entries contain correct target, actor, action, and server timestamp; repeated no-op requests produce no duplicate event.
    - Initial and repeated eligible deactivation requests both return bodyless `204`, and repeated requests preserve the original actor/time.
11. The seed creates exactly one administrator; `POST /users` can only create `USER` accounts, rejects requested `ADMIN` roles, and cannot promote an existing user.
12. Deactivation of the seeded administrator (including a self-request) fails without changing the account or creating a lifecycle event.
13. The `/admin/users` page is unavailable to ordinary users, uses only the accepted user-list/create/deactivate APIs, enables end-to-end account provisioning without manual token calls, and visibly handles a deactivation-blocking `409` without modifying user/approval state.

## Open decisions (not included in this ADR)

- Precise length and character-set validation for username, display name and password; **case-insensitive uniqueness and lowercase normalization** are settled in ADR-009.
- Future reactivation (not implemented in Phase 1); deactivating any `ADMIN` account through the application is expressly forbidden. Repeated deactivation response behavior was accepted in ADR-009.
- Real-world credential onboarding.

## Related decisions

- [ADR-003 — Authentication and authorization](ADR-003-authentication-authorization.md)
- [ADR-005 — Project membership and authorization](ADR-005-project-membership-authorization.md)
- [ADR-006 — Cumulative CoA and deactivation prerequisites](ADR-006-cumulative-approval-escalation.md)
