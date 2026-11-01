import { BellOff, ChevronRight, CircleCheck, Gavel, Info, Trash2, TriangleAlert, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useOpenOrder } from "@/features/purchase-orders/useOpenOrder";
import { timestamp } from "@/lib/format";
import { notificationContent, notificationKind, type NotificationKind } from "./notificationEvents";
import type { SavedNotification } from "./notificationStore";
import { dayGroup, relativeTime } from "./notificationTime";
import { useNotifications } from "./NotificationProvider";
import styles from "./Notifications.module.css";

type Filter = "all" | Exclude<NotificationKind, "info">;
const icons = { success: CircleCheck, warning: TriangleAlert, info: Info };
const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "decision", label: "Decisões" },
  { id: "result", label: "Resultados" },
];

export function NotificationList({ onOpen }: { onOpen: () => void }) {
  const { items, count, dismiss, storageAvailable } = useNotifications();
  const openOrder = useOpenOrder();
  const [filter, setFilter] = useState<Filter>("all");
  const counts = useMemo(
    () => ({
      all: items.length,
      decision: items.filter((item) => notificationKind(item.event) === "decision").length,
      result: items.filter((item) => notificationKind(item.event) === "result").length,
    }),
    [items],
  );
  const groups = useMemo(() => {
    const map = new Map<string, SavedNotification[]>();
    for (const item of items) {
      if (filter !== "all" && notificationKind(item.event) !== filter) continue;
      const group = dayGroup(item.receivedAt);
      map.set(group, [...(map.get(group) ?? []), item]);
    }
    return [...map.entries()];
  }, [items, filter]);

  return (
    <section className={styles.section} aria-label="Central de notificações">
      {!storageAvailable && (
        <p className={styles.storageNotice}>
          Não foi possível salvar neste navegador. Os avisos ficarão disponíveis apenas nesta sessão.
        </p>
      )}
      {count > 0 && (
        <div className={styles.filters} role="group" aria-label="Filtrar notificações">
          {filters.map(({ id, label }) => (
            <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>
              {label}
              <span>{counts[id]}</span>
            </button>
          ))}
        </div>
      )}
      <div className={styles.scroll}>
        {!count && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>
              <BellOff size={26} aria-hidden="true" />
            </span>
            <p>Nenhuma notificação por aqui.</p>
            <span>Quando um pedido precisar da sua decisão ou for concluído, o aviso aparece aqui.</span>
          </div>
        )}
        {count > 0 && !groups.length && (
          <div className={styles.empty}>
            <p>Nada nesta categoria.</p>
            <span>Escolha “Todas” para ver os demais avisos.</span>
          </div>
        )}
        {groups.map(([group, entries]) => (
          <div key={group} className={styles.group}>
            <h3>{group}</h3>
            <ul className={styles.list} aria-label={`Notificações: ${group}`}>
              {entries.map((item) => {
                const content = notificationContent(item.event);
                const Icon = notificationKind(item.event) === "decision" ? Gavel : icons[content.variant];
                return (
                  <li key={item.id} className={styles.row} data-variant={content.variant}>
                    <button
                      type="button"
                      className={styles.item}
                      onClick={() => {
                        dismiss(item.id);
                        if (item.event) {
                          onOpen();
                          openOrder(item.event.orderId);
                        }
                      }}
                    >
                      <span className={styles.tile} aria-hidden="true">
                        <Icon size={17} />
                      </span>
                      <span className={styles.content}>
                        <span className={styles.title}>{content.title}</span>
                        <span className={styles.meta}>
                          <span>{content.description}</span>
                          <span aria-hidden="true">·</span>
                          <time dateTime={item.receivedAt} title={timestamp(item.receivedAt)}>
                            {relativeTime(item.receivedAt) ?? timestamp(item.receivedAt)}
                          </time>
                        </span>
                      </span>
                      {item.event && <ChevronRight className={styles.go} size={16} aria-hidden="true" />}
                    </button>
                    <button
                      type="button"
                      className={styles.remove}
                      aria-label={`Dispensar: ${content.title}`}
                      onClick={() => dismiss(item.id)}
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      {count > 0 && (
        <footer className={styles.footer}>
          <span>Abrir um pedido remove o aviso.</span>
          <button type="button" onClick={() => dismiss()}>
            <Trash2 size={15} aria-hidden="true" />
            Limpar notificações
          </button>
        </footer>
      )}
    </section>
  );
}
