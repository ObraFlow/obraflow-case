import { plural } from "@/lib/format";
import { Bell, ChevronRight } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/Drawer";
import { NotificationList } from "./NotificationList";
import { useNotifications } from "./NotificationProvider";
import styles from "./Notifications.module.css";

export function NotificationMenuButton({ onClick }: { onClick: () => void }) {
  const { count } = useNotifications();
  return (
    <button type="button" className={styles.menuButton} aria-haspopup="dialog" onClick={onClick}>
      <Bell size={16} aria-hidden="true" />
      <span>Notificações</span>
      <span className={styles.menuCount} data-empty={!count}>
        {count}
        <span className="sr-only"> {plural(count, "notificação", "notificações")}</span>
      </span>
      <ChevronRight size={16} aria-hidden="true" />
    </button>
  );
}

// NotificationDialog: the notification center, a right-side drawer owned by the shell.
export function NotificationDialog() {
  const { panelOpen, setPanelOpen, count, returnFocus } = useNotifications();
  return (
    <Drawer open={panelOpen} onOpenChange={setPanelOpen}>
      <DrawerContent className={styles.center} finalFocus={returnFocus} closeLabel="Fechar notificações">
        <header className={styles.centerHeader}>
          <p className="eyebrow">CENTRAL</p>
          <DrawerTitle>Notificações</DrawerTitle>
          <DrawerDescription>
            {count ? `${count} ${plural(count, "aviso", "avisos")} dos seus pedidos` : "Você está em dia."}
          </DrawerDescription>
        </header>
        <NotificationList onOpen={() => setPanelOpen(false)} />
      </DrawerContent>
    </Drawer>
  );
}
