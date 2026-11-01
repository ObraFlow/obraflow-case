import {
  PO_NOTIFICATION_TYPES,
  poNotificationEventId,
  type PoNotification,
  type PurchaseOrderDetail,
} from "@dokimos/shared";

export interface PoTransport {
  sendToUser(userId: string, event: PoNotification): void | Promise<void>;
}

// notificationFor: decides who is told what after an order changes. A pending order
// notifies its current approver; a finished one notifies its creator. Pure routing: no
// database or Socket.IO dependency.
export function notificationFor(order: PurchaseOrderDetail) {
  // Decisions made so far. It grows with every transition, so `eventId` is unique per
  // transition and the client can drop a hint it already handled.
  const revision = order.steps.filter((step) => step.decision !== null).length;
  const base = { orderId: order.id, revision };

  // Still pending: the current approver is asked to act.
  if (order.status === "PENDING" && order.currentApproval) {
    return {
      userId: order.currentApproval.approverId,
      event: {
        ...base,
        type: PO_NOTIFICATION_TYPES.ACTION_REQUIRED,
        eventId: poNotificationEventId(order.id, revision, PO_NOTIFICATION_TYPES.ACTION_REQUIRED),
        stepIndex: order.currentApproval.stepIndex,
      } satisfies PoNotification,
    };
  }

  // Approved or rejected: the creator is told the outcome.
  if (order.status !== "PENDING" && !order.currentApproval) {
    return {
      userId: order.createdById,
      event: {
        ...base,
        type: PO_NOTIFICATION_TYPES.FINALIZED,
        eventId: poNotificationEventId(order.id, revision, PO_NOTIFICATION_TYPES.FINALIZED),
        status: order.status,
      } satisfies PoNotification,
    };
  }

  return null;
}

// notifyOrder: sends the notification only if `canReceive` still allows it, because
// access can change between the commit and the send.
export async function notifyOrder(
  order: PurchaseOrderDetail,
  transport: PoTransport,
  canReceive: (userId: string, orderId: string, event: PoNotification) => Promise<boolean>,
): Promise<void> {
  const notification = notificationFor(order);
  if (!notification) return;

  if (!(await canReceive(notification.userId, order.id, notification.event))) return;
  await transport.sendToUser(notification.userId, notification.event);
}
