# ADR-003 — Credential-Backed Authentication and Backend Authorization

**Status:** Accepted (core architecture); implementation presentation/details still open
**Decision date:** 2026-10-20
**Scope:** ObraFlow technical challenge

## Context

The challenge requires sequential purchase-order approvals associated with specific users. Frontend-only identity and permission checks cannot secure the API. The implementation should demonstrate credible authentication and enforceable authorization without becoming a general identity-management product. Reviewers must be able to exercise different seeded demo users locally, without external credentials or services.

## Decisions

1. **Credential-backed login.** Seed demo user accounts with known demonstration credentials. The accepted Phase 1 login identifier is a **unique username**, not an email address; users retain separate immutable UUID identities for JWT subjects and domain references (ADR-009). The seed hashes supplied plaintext passwords with **Argon2id**, using library-managed unique salts and appropriate cost parameters. Store password hashes, never plaintext passwords, in the database. Seeding must be repeatable without silently resetting changed credentials.
2. **JWT access tokens.** The backend issues signed, expiring JWTs after verifying credentials. The required claims are the user ID (`sub`) and expiry (`exp`); the signer also supplies the issued-at timestamp (`iat`). Tokens do not carry mutable roles or permissions. This single application uses a dedicated signing key and deliberately omits issuer/audience claims (`iss`, `aud`), which are not enforced. The signing secret/key comes from deployment configuration and is never committed as a production secret.
3. **Request authentication.** Every protected API request validates the token's signature and relevant claims, then retrieves the current user record from PostgreSQL and rejects nonexistent or inactive users.
4. **Authoritative backend authorization.** The backend resolves the authenticated user's current roles/permissions and enforces permissions on both read and write operations. It does not trust client-supplied user IDs, roles, or permissions. Frontend role-based visibility is only a UX convenience, not an authorization boundary.
5. **Contextual workflow authorization.** Approval and rejection operations check that the authenticated user is the *current assigned approver* for the pending step. An `ADMIN` role never implicitly authorizes bypassing approval order. Authorization and state-transition checks that depend on mutable workflow data are performed within the same transactional operation as the change.
6. **Explicit public endpoints.** Only endpoints expressly classified as public (e.g., login and health checks) are anonymous. Protected reads must not leak unauthorized data. For individual resources outside a user's visibility, use `404` to conceal their existence, as accepted for the API contract.
7. **Failure semantics.** Authentication failures return `401 Unauthorized`: missing/invalid/expired JWT, inactive/nonexistent JWT subject, and invalid login credentials. Once an identity is authenticated, lack of permission for an otherwise visible operation returns `403 Forbidden`. A request for an individual resource outside the caller's visibility (including an unknown ID) returns `404 Not Found` without confirming that the record exists. A request from an otherwise authorized user that conflicts with current domain/workflow state returns `409 Conflict` (e.g., stale approval step, CoA revision conflict, or blocked deactivation). Authenticate first, before resource discovery: an unauthenticated attempt to access a hidden/unknown protected resource must still return `401`. Rejected requests must leave persistent state/history unchanged. Malformed JSON and request-schema/domain-input validation failures return `400 Bad Request` (including missing required fields, invalid decimal formats/precision, invalid CoA ladder submissions, and missing rejection reasons). The API does **not** distinguish these with `422 Unprocessable Entity`. Reserve `409` for requests whose otherwise valid content conflicts with **existing state or concurrency** (such as a stale approval step, old CoA version, inactive supplier selection, or prohibited deactivation). The common error-envelope shape was subsequently accepted as part of the ADR-009 discussion; see below.
8. **Narrow identity scope.** Implement login and a current-user endpoint, and admin-only user creation plus logical deactivation under ADR-004; do not implement self-registration/sign-up, password change or reset, account reactivation, physical user deletion, or **end-user self-service account management** in Phase 1. A limited **ADMIN-only `/admin/users` page** for existing create/list/deactivate operations was included during page-scope review on 2026-10-21 (ADR-004). External OIDC and mail integrations are deferred.
9. **No session registry, refresh, or revocation in Phase 1.** A local sign-out clears client authentication state and user-specific caches, but does not invalidate an already-issued JWT. The token can remain valid until expiry if obtained elsewhere. This limitation must be prominently documented. Disabling a user blocks subsequent requests via the database-backed active-user check.
10. **Direct API security tests.** Test authentication and authorization against the API independent of frontend controls, including missing/invalid tokens, forbidden read/write operations, a user trying to approve someone else's step, admin bypass attempts, and rejection without state change.

## JWT implementation scope and dependency choice (2026-10-20)

**JWT was a chosen implementation mechanism, not a requirement of the supplied challenge.** The challenge leaves the backend API and transport design open; for this demo we chose credential-backed login and signed access JWTs so that approvals have a validated actor and the backend can enforce resource and workflow authorization.

- Keep the previously accepted **`sessionStorage` + explicit Bearer** browser convention. This is practical for a local first-party demo, but its JavaScript-readable token remains vulnerable to XSS; do not describe it as a production-best-practice token-storage choice.
- For Fastify use **`@fastify/jwt`**, which delegates signing/verification to a maintained JWT library and integrates with Fastify's request lifecycle. Do **not** add `jose` as a direct dependency merely to duplicate simple JWT issuance/verification. This is a scoped dependency choice, not a claim that `jose` is an authentication framework or unsuitable for JWT cryptography.
- Do **not** create custom JWT signing, signature verification, token-parsing crypto, or an unnecessary authentication abstraction. Pin verification to HS256, verify the signature, and require subject and expiry; never trust claims or use `decode` alone as verification.
- Authentication is **more than** issuing/checking a JWT: Argon2id password verification, validated user UUID in `sub`, current database `role` and `isActive` checks, project membership, and current-approver authorization remain mandatory for each protected operation.
- Exclude production identity-lifecycle features such as refresh-token rotation, token/session revocation, MFA, verified enrollment, and password-recovery/onboarding flows from Phase 1. Apply proportionate hygiene nonetheless: no committed signing secrets, use deployment configuration, rate-limit login attempts, avoid logging tokens/passwords, and use HTTPS for any non-local deployment.
- **Documentation disclosure:** this is a functional **challenge-scoped authentication and authorization implementation**, **not a production-complete identity system**. The lack of refresh/revocation, public demo credentials, single seeded admin, and exposure of JWTs to same-origin JavaScript/XSS must be explicit in the final README. Do not imply that JWTs automatically provide session management, identity proofing, or production-grade account recovery.
- Production could use securely configured `HttpOnly` cookies with appropriate CSRF defenses, a managed identity provider, or server-managed sessions if requirements warrant them. None is being built preemptively for this challenge.

## Accepted HTTP error envelope (ADR-009 subset, 2026-10-20)

All HTTP API errors use a consistent object containing a stable machine-readable code, a human-readable Portuguese message, and an **always-present** `details` array, even when empty:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Existem campos inválidos no pedido.",
    "details": [
      {
        "field": "items.0.quantity",
        "code": "INVALID_QUANTITY",
        "message": "A quantidade deve ser maior que zero."
      }
    ]
  }
}
```

- `error.code`: a stable English machine-readable identifier; frontend behavior must not depend on parsing translated prose.
- `error.message`: safe, human-readable Portuguese explanation.
- `error.details`: **required array**, `[]` whenever there are no field-level validation issues. When populated, each item includes a field path (e.g. `items.0.quantity`), a stable English validation code, and a Portuguese message suitable for associating the error with an input.
- Validation errors use `400` and include relevant field details. Workflow and state conflicts use `409` and normally have empty details. Auth failures, permission denials, and resource-concealing `404` responses follow the accepted rules above.
- A central HTTP error handler should map validation/application errors into this envelope rather than leaking raw Zod errors, PostgreSQL constraint details, implementation traces, or other users' protected data. Do not return internal exception details for `500`.
- Keep this small: reusable typed application errors, a Zod validation formatter, and one transport error handler, not a general error framework or localization service.

The **error envelope and field-level error convention are accepted**, but ADR-009's complete endpoint and success-response contracts remain **pending**.

## Accepted Phase 1 browser token handling and threat boundary (2026-10-20)

- After username/password login, the frontend stores **only the signed short-lived access JWT** in `sessionStorage` for the current browser tab's page session. It restores that token across reloads, while recognizing that browser session restore behavior can vary. Do not persist the JWT in `localStorage`, URLs, logs, or arbitrary query-cache values; never store plaintext passwords in web storage.
- Authenticated API requests explicitly set `Authorization: Bearer <accessToken>`. The application does **not** authenticate its state-changing API routes from ambient browser cookies, and does not enable cookie-based credential fallback.
- On startup/reload, treat a stored token as untrusted until the backend validates it (e.g. `GET /api/v1/auth/me`). On `401` and explicit sign-out, remove the token and clear identity-scoped client state, including TanStack Query user-specific caches if used. There is no refresh-token mechanism or backend session revocation in this phase.
- **Accepted demo trade-off:** `sessionStorage` is JavaScript-readable and vulnerable to token disclosure/replay through XSS. It is a choice to keep the demonstration usable through page refreshes, **not a recommended production token-storage security posture**. In a production product, evaluate a secure `HttpOnly` cookie architecture with proper CSRF defenses or a Backend-for-Frontend design. Public/disposable demo credentials and lack of token revocation also limit claims about identity assurance.
- **CSRF distinction:** cross-site request forgery primarily targets browsers that **automatically attach authentication credentials**, notably cookie-authenticated requests. With authorization exclusively in an explicit Bearer header and no ambient auth cookie, a standalone synchronizer CSRF-token implementation is not needed for this Phase 1 API pattern. CSRF tokens would **not** mitigate an XSS script reading `sessionStorage`. Revisit CSRF if cookie-based sessions, an authenticated cookie fallback, or equivalent ambient credentials are introduced.
- XSS risk is still relevant even with a short token lifetime. Keep React's escaping for untrusted text, avoid untrusted `dangerouslySetInnerHTML`/HTML injection, constrain third-party scripts and use appropriate CSP when feasible; these are implementation security hygiene, not promises that JS-accessible token theft is impossible. Server-side membership, approval-order, role and user-active checks remain authoritative.

The **sessionStorage + Bearer** decision is accepted as a scoped Phase 1 concession. JWT expiry duration, frontend login-screen interaction, and additional production-hardening measures remain separate implementation/design discussions.

## Explicitly deferred or open

- **Frontend presentation:** minimal login page versus shell profile/account selector; either must authenticate with credentials and must not have an unauthenticated token-minting bypass. Published demo credentials do not provide meaningful identity assurance in a public sandbox.
- **Access-token storage/transport:** decided below for the Phase 1 demo: `sessionStorage` + explicit `Authorization: Bearer` requests. The broader frontend stack/design remains pending ADR-002.
- **JWT TTL:** short-lived, configurable; 30 minutes has been recommended as an initial default, subject to final implementation selection.
- **HTTP logout route:** not required without backend revocation; client-side sign-out is mandatory.

## Decisions finalized in subsequent ADRs

- [ADR-004](ADR-004-admin-user-provisioning.md) establishes administrator-only account provisioning without public sign-up.
- [ADR-005](ADR-005-project-membership-authorization.md) establishes `ADMIN`/`USER` roles, project-scoped order visibility, and contextual approval permissions.

## Consequences

**Benefits:** Establishes a real credential-verification pipeline, trustworthy actor identity for business operations, immediate effect of DB-backed role/active-state changes on subsequent requests, and testable protection of business invariants.

**Costs/limitations:** Protected requests require database lookups; stateless access tokens cannot be individually revoked; browser `sessionStorage` exposes the access JWT to same-origin JavaScript and XSS; publicly documented demo credentials permit any viewer to act as demo users; no end-user self-service account lifecycle or external provider integration; the admin-only user screen is limited to the existing create/list/deactivate APIs.

## Amendment — login throttling removed, uniform login cost (2026-10-30)

The API no longer rate-limits `POST /auth/login`: it has no knowledge of the deployment proxy, and a per-IP limit behind a reverse proxy would throttle every user together. Brute-force protection is a deployment concern (proxy or gateway) and is not provided by this service. Separately, login now verifies the supplied password against a fixed Argon2id hash when the username is unknown or inactive, so those failures cost the same as a wrong password rather than only returning the same response body.

## Amendment — required JWT claims (2026-10-31)

REST and Socket.IO authentication require `sub` and `exp`. The application neither issues nor enforces `iss` or `aud`, and deployment configuration has no issuer/audience settings. This accepted simplification assumes one application with its own signing key. Signature verification, HS256 pinning, expiry enforcement, UUID subject validation, and current database identity/authorization checks remain mandatory. Revisit issuer/audience validation or separate signing keys if independent token consumers or shared signing keys are introduced.

## Amendment — shared nginx login throttling (2026-10-31)

`docker/nginx.conf` now enforces a per-client-IP limit only for login POSTs in both local review and Stackport: 10 requests/minute, capacity for 10 immediate attempts, and JSON `429 RATE_LIMITED` with `Retry-After: 6` on excess requests. Fastify remains unthrottled, preserving the earlier API/proxy boundary. Behind ingress, client-IP resolution trusts only the configured `NGINX_TRUSTED_PROXY`; direct local review uses a loopback default and ignores externally supplied forwarded headers. The deployment must configure its actual trusted proxy to avoid sharing one bucket across forwarded clients. No account lockout, remote ingress modification or distributed limit is introduced. See [deployment configuration](../deployment.md#login-rate-limit-and-client-ips).

## Amendment — login limit loosened (2026-11-01)

The shared nginx limit is now **30 requests/minute per client IP, with 21 immediate attempts and a slot recovered every two seconds**, and `Retry-After: 2`. Everything else in the previous amendment stands, including that all attempts count. The earlier figure (10/minute) could throttle a reviewer who switches demo accounts, each switch being a real login, or several reviewers sharing one address. The limit still caps one address at 0.5 attempts per second. Counting only failed attempts was considered and rejected: nginx decides before the API responds, so that needs nginx Plus, a scripting module or an API-side counter, which would reverse the boundary set on 2026-10-30.

## Verification criteria

- [ ] Seeded login succeeds only with matching credentials and Argon2id hashes.
- [ ] Protected API endpoints reject missing/invalid/expired tokens.
- [ ] Invalid login credentials, inactive accounts, and missing/invalid/expired JWTs return `401` without revealing protected-resource existence.
- [ ] An authenticated nonmember requesting an individual PO receives the same `404` as an unknown PO ID, while valid identity without permission for a visible operation receives `403`.
- [ ] An authorized but stale workflow command returns `409` with no extra approval decision or state change.
- [ ] Malformed JSON and invalid input (including decimal precision and required fields) return `400` with no write; these cases do not return `422`.
- [ ] A valid request blocked by existing business state returns `409`, not `400`.
- [ ] All API error responses include `error.code`, `error.message`, and an array-valued `error.details` (including `[]` when empty).
- [ ] Zod field failures map to stable English codes and field paths with Portuguese messages; raw validation or database exceptions are never exposed.
- [ ] User disabled after token issuance is blocked on subsequent requests.
- [ ] Role changes affect subsequent authorization without issuing a new token.
- [ ] Unauthorized reads do not disclose protected records.
- [ ] A valid JWT does not allow approval of someone else's step or skipping the current step.
- [ ] Admin rights do not imply workflow approval bypass.
- [ ] No unauthorized attempt partially updates workflow data or history.
- [ ] Frontend local sign-out clears auth state and user-scoped caches without claiming server revocation.
- [ ] Reload restores the same-tab stored JWT only after server validation; expired/invalid tokens clear storage and client identity-scoped caches.
- [ ] Protected API routes accept explicitly transmitted Bearer authorization and do not silently authenticate using ambient cookies; no CSRF-token control is misrepresented as an XSS defense.
- [ ] Security documentation explicitly acknowledges JavaScript-accessible JWT storage as a demo-scoped XSS exposure and explains the absence of refresh/revocation.
- [ ] README/security notes describe demo credentials and JWT/logout limitations.

**Source of decision:** Architecture discussion, 2026-10-20; committed in the private repository.
