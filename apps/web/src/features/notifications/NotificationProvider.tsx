import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useLocation } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { getToken, isCurrentToken } from "@/lib/session";
import { parseNotification } from "./notificationEvents";
import {
  decodeNotifications,
  loadNotifications,
  mergeNotifications,
  notificationStorageKey,
  saveNotifications,
  type SavedNotification,
  type NotificationState,
} from "./notificationStore";

type Notifications = {
  items: SavedNotification[];
  count: number;
  storageAvailable: boolean;
  receive: (value: unknown) => SavedNotification | null;
  dismiss: (id?: string) => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  openPanel: (returnTo: HTMLElement | null) => void;
  returnFocus: RefObject<HTMLElement | null>;
};
const NotificationContext = createContext<Notifications | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user!.id;
  const token = getToken();
  const [state, setState] = useState(() => loadNotifications(userId));
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const openPanel = useCallback((returnTo: HTMLElement | null) => {
    returnFocus.current = returnTo;
    setPanelOpen(true);
  }, []);
  // The latest state, readable from callbacks and storage events without re-creating them on every change.
  const current = useRef(state);
  const active = useRef(true);
  const isCurrent = useCallback(() => active.current && isCurrentToken(token), [token]);
  const publish = useCallback(
    (next: NotificationState) => {
      current.current = next;
      setState(next);
      setStorageAvailable(saveNotifications(userId, next));
    },
    [userId],
  );
  useEffect(() => {
    active.current = true;
    setStorageAvailable(saveNotifications(userId, current.current));
    // Another tab of this user changed the inbox: fold its changes in rather than replacing ours.
    const sync = (event: StorageEvent) => {
      if (event.key !== notificationStorageKey(userId) || !isCurrent()) return;
      const incoming = decodeNotifications(event.newValue);
      if (!incoming) return;
      const next = mergeNotifications(current.current, incoming);
      current.current = next;
      setState(next);
    };
    window.addEventListener("storage", sync);
    return () => {
      active.current = false;
      window.removeEventListener("storage", sync);
    };
  }, [userId, isCurrent]);
  const receive = useCallback(
    (value: unknown) => {
      if (!isCurrent()) return null;
      const event = parseNotification(value);
      if (!event) return null;
      // Merge with what is stored first: another tab may have added or dismissed entries since our last write.
      const latest = mergeNotifications(loadNotifications(userId), current.current);
      if (latest.items.some((item) => item.id === event.eventId) || latest.dismissedIds.includes(event.eventId)) {
        publish(latest);
        return null;
      }
      const item: SavedNotification = { id: event.eventId, event, receivedAt: new Date().toISOString() };
      publish(mergeNotifications({ items: [item], dismissedIds: [] }, latest));
      return item;
    },
    [isCurrent, publish, userId],
  );
  const dismiss = useCallback(
    (id?: string) => {
      if (!isCurrent()) return;
      const latest = mergeNotifications(loadNotifications(userId), current.current);
      const removed = id === undefined ? latest.items.map((item) => item.id) : [id];
      publish(mergeNotifications(latest, { items: [], dismissedIds: removed }));
    },
    [isCurrent, publish, userId],
  );
  // Opening an order by any route (list, link or typed address) settles its notifications:
  // the person is looking at the order itself, so a pending hint about it is no longer news.
  const { pathname } = useLocation();
  useEffect(() => {
    const match = /^\/purchase-orders\/([^/]+)$/.exec(pathname);
    if (!match || match[1] === "new" || !isCurrent()) return;
    let orderId: string;
    try {
      orderId = decodeURIComponent(match[1]);
    } catch {
      return;
    }
    const latest = mergeNotifications(loadNotifications(userId), current.current);
    const removed = latest.items.filter((item) => item.event?.orderId === orderId).map((item) => item.id);
    if (removed.length) publish(mergeNotifications(latest, { items: [], dismissedIds: removed }));
  }, [pathname, userId, isCurrent, publish]);
  return (
    <NotificationContext.Provider
      value={{
        items: state.items,
        count: state.items.length,
        storageAvailable,
        receive,
        dismiss,
        panelOpen,
        setPanelOpen,
        openPanel,
        returnFocus,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error("Missing authenticated NotificationProvider");
  return value;
}
