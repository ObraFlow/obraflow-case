import { useEffect } from "react";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { useToast } from "@/components/ToastProvider";
import { getToken, isCurrentToken } from "@/lib/session";
import { connectRealtime } from "@/lib/realtime";
import { useNotifications } from "@/features/notifications/NotificationProvider";
import { notificationContent } from "@/features/notifications/notificationEvents";
import { useOpenOrder } from "@/features/purchase-orders/useOpenOrder";

// RealtimeNotifications: mounted once in the authenticated shell. Shows a toast for each
// purchase-order hint, with a shortcut to the order. Renders nothing.
export function RealtimeNotifications() {
  const { user } = useAuth();
  const toast = useToast();
  const openOrderPage = useOpenOrder();
  const userId = user?.id;
  const { receive, dismiss } = useNotifications();

  useEffect(() => {
    const token = getToken();
    if (!userId || !token) return;

    let active = true;
    const disconnect = connectRealtime(token, (value) => {
      if (!active || !isCurrentToken(token)) return;
      const item = receive(value);
      if (!item?.event) return;
      const content = notificationContent(item.event);
      const orderId = item.event.orderId;
      const openOrder = () => {
        dismiss(item.id);
        openOrderPage(orderId);
      };
      toast[content.variant]({
        id: item.id,
        title: content.title,
        description: content.description,
        onClick: openOrder,
        action: {
          label: (
            <>
              Abrir pedido
              <ArrowUpRight size={14} aria-hidden="true" />
            </>
          ),
          onClick: openOrder,
        },
      });
    });
    return () => {
      active = false;
      disconnect();
    };
  }, [userId, toast, receive, dismiss, openOrderPage]);

  return null;
}
