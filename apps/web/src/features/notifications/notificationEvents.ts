import { orderRef } from "@/lib/format";
import { PO_NOTIFICATION_TYPES, poNotificationEventId, type PoNotification } from "@dokimos/shared";
import { z } from "zod";

const common = { eventId: z.string().max(200), orderId: z.uuid(), revision: z.number().int().nonnegative().safe() };
export const eventSchema = z.discriminatedUnion("type", [
  z.object({
    ...common,
    type: z.literal(PO_NOTIFICATION_TYPES.ACTION_REQUIRED),
    stepIndex: z.number().int().nonnegative().safe(),
  }),
  z.object({ ...common, type: z.literal(PO_NOTIFICATION_TYPES.FINALIZED), status: z.enum(["APPROVED", "REJECTED"]) }),
]);

/** A server event, accepted only when its id is the one the shared contract derives from its content. */
export function parseNotification(value: unknown): PoNotification | null {
  const parsed = eventSchema.safeParse(value);
  if (!parsed.success) return null;
  const event = parsed.data;
  return event.eventId === poNotificationEventId(event.orderId, event.revision, event.type) ? event : null;
}

export type NotificationKind = "decision" | "result" | "info";
export const notificationKind = (event: PoNotification | null): NotificationKind =>
  !event ? "info" : event.type === PO_NOTIFICATION_TYPES.ACTION_REQUIRED ? "decision" : "result";

/** The text and tone shown for an event; no event is the welcome notice. */
export function notificationContent(event: PoNotification | null) {
  if (!event)
    return {
      title: "Esta é sua notificação.",
      description: "Os avisos dos seus pedidos aparecerão aqui.",
      variant: "info" as const,
    };
  const description = `Pedido #${orderRef(event.orderId)}`;
  if (event.type === PO_NOTIFICATION_TYPES.ACTION_REQUIRED)
    return { title: "Pedido aguardando sua decisão.", description, variant: "info" as const };
  return event.status === "APPROVED"
    ? { title: "Seu pedido foi aprovado.", description, variant: "success" as const }
    : { title: "Seu pedido foi rejeitado.", description, variant: "warning" as const };
}
