# Backend PO hints over Socket.IO

One Socket.IO server belongs to each `buildApp()`, attached to the existing Fastify
HTTP server on the API port at `/socket.io/`. Only WebSocket transport is enabled;
future clients must specify `transports: ["websocket"]` and
`auth: { token: "<raw existing JWT>" }`. Tokens never belong in URLs. Browser
Origins must match the request Host; there is no permissive CORS policy.
Deployment should preserve the public Host when proxying upgrades.

`realtime/socket-auth.ts` uses the existing `app.jwt` verifier with HS256 pinned.
Subject (`sub`) and expiry (`exp`) are required; the subject must be a UUID and
expiry a finite positive integer in the future. This single application uses a
dedicated signing key; issuer/audience claims are neither issued nor enforced,
as accepted in ADR-003. REST authentication uses the same required claims.
An existing active user is required at handshake. Only the server associates a
socket with `user:<authenticated UUID>` (besides Socket.IO's internal socket-ID
room). Client user/room claims are ignored. There are no incoming application
handlers for subscription, room changes or domain writes, and no connection-state
recovery. Multiple authenticated sockets for one user receive the same hint.

Each socket has an expiry timer, cleared on disconnect. Long lifetimes are
scheduled in bounded timer segments; delivery also disconnects expired sockets
before room emission. An activity recheck after room association closes the
handshake/deactivation race. Successful HTTP user deactivation disconnects the
user's sockets after the transaction returns; failure leaves them connected.
Reconnects always authenticate again. Fastify `preClose` stops new connections,
closes Socket.IO and disconnects sockets, clearing their timers.

## Contract and recipients

The stable keys live in `apps/shared/src/realtime.ts` so the API and the web client
import the same values: `REALTIME_EVENTS.PO_NOTIFICATION`, `PO_NOTIFICATION_TYPES`
(`ACTION_REQUIRED`, `FINALIZED`), `REALTIME_ERRORS.UNAUTHENTICATED` (handshake
`connect_error.message`), the `PoNotification` payload type and `poNotificationEventId`.
Never repeat the string literals; change a value only together with both sides.

Only `po.notification` is emitted. Its payload has exactly these fields:

| `type` | Fields | Recipient |
| --- | --- | --- |
| `po.action_required` | `type`, `eventId`, `orderId`, `revision`, `stepIndex` | Returned `currentApproval.approverId` for a pending PO |
| `po.finalized` | `type`, `eventId`, `orderId`, `revision`, `status` (`APPROVED` or `REJECTED`) | Eligible `createdById` of a terminal PO |

`revision` counts non-null immutable decisions in the returned PO detail, starting
at zero on creation. `eventId` is `${orderId}:${revision}:action_required` or
`${orderId}:${revision}:finalized`. Creation targets step zero; intermediate
approval targets the new current step. Final approval or any rejection targets
only the creator. Actor and recipient may coincide. No amounts, names, notes,
reasons, timestamps, tokens or full DTOs are included. IDs support future client
deduplication; they do not guarantee exactly-once delivery.

`modules/purchase-orders/notifier.ts` owns the pure typed routing decision and
depends on a narrow `sendToUser` interface. `notify-committed.ts` performs the
event-driven authorization check and catches failures. The Socket.IO adapter
only delivers to server-owned rooms; it does not query PO data.

The HTTP routes invoke notification only after awaited `createOrder` or
`decideOrder` returns from its committed transaction. Transaction-composition
helpers used by seed/tests never publish. Failed validation, authorization,
conflicts, rolled-back transactions and reads produce no notifications. Existing
REST response codes and bodies are unchanged.

Before terminal delivery, one parameterized authorization read requires an active
creator and either current ADMIN role or current project membership, equivalent
to authenticated GET detail visibility. Missing eligibility or uncertainty
suppresses delivery. Action recipients also receive a current active-member
check: although pending-assignment blockers protect their eligibility during the
transition, a subsequent decision may commit before an earlier HTTP route resumes,
release those blockers, and allow removal. The regression suite reproduces a
delayed hint after such removal. This is an event-driven authorization exception
to avoiding extra reads. There are **zero periodic database reads**, no polling
and no PO queries from idle connections.

## Verification and deployment limits

Run `npm test -- api` for the isolated PostgreSQL suite, including
`apps/api/test/realtime.test.ts`. It starts a real API listener with
`app.listen({ host: "127.0.0.1", port: 0 })` and real Socket.IO test clients.
Ordered WebSocket fences collect events without arbitrary absence sleeps;
explicit timeouts and cleanup cover failures, expiry and shutdown. The root
runner creates/migrates/seeds and removes a disposable database. The configured
development database is never used for test writes. `npm test`
also runs the browser regressions and the UI acceptance scenario.

Delivery is deliberately best effort. Delivery/authorization errors are caught
with fixed diagnostics and never convert a committed financial write into an
HTTP failure. There is no retry, inbox, persistence, replay, outbox, broker,
cross-instance fan-out or delivery acknowledgement. Offline clients miss events;
process crashes between commit and emission lose events. Concurrent transitions
can produce hints arriving in a different revision order; future clients must
reconcile through authoritative HTTP reads.

## Web client

`apps/web/src/lib/realtime.ts` connects with `socket.io-client` (WebSocket only, same
origin, raw JWT in handshake `auth`) and stops retrying on `UNAUTHENTICATED`.
`app/RealtimeNotifications.tsx`, mounted once in the authenticated shell, ignores repeated
`eventId`s and shows a toast with an "Abrir pedido" action. Hints do not refresh data;
the order list and detail still load through REST.

**Proxying.** `docker/nginx.conf` forwards `/socket.io/` to the API with WebSocket upgrade
headers and the original `Host` (including any port), which the API's Origin check needs.
The Vite dev server proxies `/socket.io` with `ws: true`. Verified through the review
nginx: a valid token connects and an invalid one is rejected with `UNAUTHENTICATED`.
The outer Stackport nginx must also pass `Upgrade`/`Connection` and `Host` for the
domain; that part is configured in Stackport, not in this repository.
