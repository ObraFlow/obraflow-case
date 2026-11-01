import type { OrderStatus } from "./purchase-orders.js";

// Realtime contract between the API (Socket.IO server) and the web client. These keys are
// part of the wire format: change a value only together with both sides. The hints are
// best effort; REST stays the source of truth (see docs/architecture/realtime.md).

// Socket.IO event names the server emits.
export const REALTIME_EVENTS = {
  PO_NOTIFICATION: "po.notification",
} as const;

// Handshake rejection message (`connect_error.message`) for a missing, invalid, expired
// or deactivated-user token.
export const REALTIME_ERRORS = {
  UNAUTHENTICATED: "UNAUTHENTICATED",
} as const;

// Values of `type` inside a `po.notification` payload.
export const PO_NOTIFICATION_TYPES = {
  ACTION_REQUIRED: "po.action_required",
  FINALIZED: "po.finalized",
} as const;
export type PoNotificationType = (typeof PO_NOTIFICATION_TYPES)[keyof typeof PO_NOTIFICATION_TYPES];

// Payload of `po.notification`. Ids and counters only: no amounts, names or notes.
export type PoNotification =
  | {
      type: typeof PO_NOTIFICATION_TYPES.ACTION_REQUIRED;
      eventId: string;
      orderId: string;
      revision: number;
      stepIndex: number;
    }
  | {
      type: typeof PO_NOTIFICATION_TYPES.FINALIZED;
      eventId: string;
      orderId: string;
      revision: number;
      status: Exclude<OrderStatus, "PENDING">;
    };

// poNotificationEventId: stable id of one hint, `<orderId>:<revision>:<kind>`. A client can
// drop a hint it already handled; it does not guarantee exactly-once delivery.
export const poNotificationEventId = (orderId: string, revision: number, type: PoNotificationType): string =>
  `${orderId}:${revision}:${type === PO_NOTIFICATION_TYPES.ACTION_REQUIRED ? "action_required" : "finalized"}`;
