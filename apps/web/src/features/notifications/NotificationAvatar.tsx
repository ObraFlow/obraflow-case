import { plural } from "@/lib/format";
import { UserAvatar } from "@/components/UserAvatar";
import { useNotifications } from "./NotificationProvider";
import styles from "./Notifications.module.css";

// badge={false}: used where the notification count is already shown next to the avatar
// (the open account menu lists it right below).
export function NotificationAvatar({ badge = true, ...props }: Parameters<typeof UserAvatar>[0] & { badge?: boolean }) {
  const { count } = useNotifications();
  return (
    <span className={styles.avatar}>
      <UserAvatar {...props} />
      {badge && count > 0 && (
        <span
          className={styles.badge}
          role="img"
          aria-label={`${count} ${plural(count, "notificação", "notificações")}`}
        >
          <span aria-hidden="true">{count > 9 ? "9+" : count}</span>
        </span>
      )}
    </span>
  );
}
