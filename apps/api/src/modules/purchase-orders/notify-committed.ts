import type { FastifyInstance } from "fastify";
import { PO_NOTIFICATION_TYPES, type PoNotification, type PurchaseOrderDetail } from "@dokimos/shared";
import { dataSource } from "../../db/data-source.js";
import { notifyOrder } from "./notifier.js";
import { canReceiveNotification } from "./repository.js";

// recipientCanReceive: final authorization check, run after commit, for one notification.
// Action notices need project membership; finalized notices also accepts an active ADMIN.
const recipientCanReceive = (userId: string, orderId: string, event: PoNotification) =>
  canReceiveNotification(dataSource.manager, userId, orderId, event.type === PO_NOTIFICATION_TYPES.FINALIZED);

// notifyCommittedOrder: best-effort realtime hint sent after the order's transaction
// commits; a delivery failure is logged and never fails the request.
export async function notifyCommittedOrder(app: FastifyInstance, order: PurchaseOrderDetail): Promise<void> {
  // A later decision can commit before this route resumes after its own commit,
  // releasing pending-assignment blockers. Recheck action recipients too.
  try {
    await notifyOrder(order, app.realtime, recipientCanReceive);
  } catch {
    // No DTOs, tokens, recipient IDs or underlying errors in delivery diagnostics.
    app.log.warn("PO notification delivery failed after commit");
  }
}
