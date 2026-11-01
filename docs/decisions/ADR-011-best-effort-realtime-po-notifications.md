# ADR-011 — Best-effort Realtime Purchase Order Notifications

**Status:** Accepted (2026-10-29)

**Project:** ObraFlow challenge

**Scope:** Backend live-only PO notification proof of concept; frontend consumption and proxy wiring remain separate

**Related:** [ADR-003](ADR-003-authentication-authorization.md), [ADR-007](ADR-007-purchase-order-approval-lifecycle.md), [ADR-009](ADR-009-http-api-contract.md)

## Context

PO creation, intermediate approvals and final decisions occur across authenticated
users. The original challenge does not require realtime delivery. We elect a small
realtime demonstration extension with live hints to connected users, without
persistent notification infrastructure or a new source of workflow truth.

## Decision

1. **Derive business events after commit.** Successful HTTP creation and decisions
   derive notifications from the authoritative returned PO detail, after the
   transaction completes. Rolled-back, unauthorized, stale/conflicted and failed
   writes produce no notification. Delivery failures must not change committed
   HTTP results or cause financial writes to be retried.
2. **Keep the boundary narrow.** A pure PO notifier selects the event and recipient
   through a small replaceable transport interface. Initially, one WebSocket-only
   Socket.IO server attaches to Fastify's existing HTTP server. JWT-authenticated
   identity establishes server-controlled individual user rooms; client-selected
   users or rooms never establish authorization. There is no generic event bus.
3. **Keep PostgreSQL and REST authoritative.** Socket events are non-authoritative
   hints, not decision commands or durable offsets. Before permitting a decision,
   a consuming client must verify the actionable state through HTTP; existing
   backend authorization, order checks and conflict semantics remain binding.
4. **Check current recipient eligibility before delivery.** Socket identity alone
   does not establish continued PO visibility. Missing or uncertain authorization
   suppresses delivery. Socket authentication and event-triggered recipient checks
   may read PostgreSQL; periodic or idle database polling is excluded.
5. **Support one API instance for this proof of concept.** Preserve expiry,
   post-commit deactivation disconnects and graceful shutdown. Browser
   consumption/toasts and WebSocket proxy configuration are separate work; this
   decision freezes the backend feature boundary.

## Triggers and recipients

The single outbound event name is `po.notification`:

| Committed transition | Recipient | Payload type |
| --- | --- | --- |
| Creation | First current approver | `po.action_required` |
| Intermediate approval | Next current approver | `po.action_required` |
| Final approval or rejection at any step | Creator, if currently active and permitted to view the PO | `po.finalized` |

Action recipients must remain active project members. Terminal creator visibility
requires an active user and either current ADMIN role or current project
membership. No project broadcasts or intermediate creator notifications are added.
`revision` counts recorded decisions; deterministic event IDs may support future
client deduplication, but are not durable notification offsets. The minimal
payload contract remains unchanged; see [backend details](../architecture/realtime.md).

## Accepted limitations

- Delivery is connected-client and best effort. Offline/disconnected users miss
  events; process failure between commit and emission can lose them. There is no
  durable queue, replay, recovery, acknowledgement or guaranteed exactly-once
  delivery.
- A later transition may commit before an earlier hint is emitted. Hints may be
  stale or out of order. Retain recipient eligibility checks, but do not add a PO
  revision/status read solely to suppress obsolete action hints. HTTP verification
  before a decision remains the client's responsibility.
- There is no multi-instance fan-out, persistent inbox, read/unread/dismiss state
  or multi-device synchronization. Multiple sockets may receive the same live
  hint without sharing any notification state.

## Non-goals and alternatives

Polling/reconciliation, change-snapshot or ETag/version endpoints, additional
mutable PO cursors, database migrations, event sourcing, persistent inboxes,
outboxes, brokers, Redis, universal event frameworks and frontend toast
integration are outside this backend scope.

- **Periodic API polling is deferred:** it adds recurring reads and delayed
  delivery and is not part of the accepted live-only proof of concept.
- **Durable notification/inbox infrastructure is deferred:** persistence,
  recipient acknowledgement and synchronization exceed the challenge scope.
- **A full production event architecture is deferred:** durability and scaling
  requirements that would justify it are absent from this proof of concept.

## Evolution

If requirements grow to demand durability or acknowledged recipient delivery,
introduce a durable outbox, messaging/broker and recipient acknowledgement/inbox
behind the existing notification boundary. Do not implement them now. The current
single-instance, live-only limitations are accepted outcomes, not missing features
to add before frontend integration. Implementation and the outstanding Stackport
proxy prerequisite are documented in [realtime backend](../architecture/realtime.md).
