import { z } from "zod";
import { eventSchema, parseNotification } from "./notificationEvents";

const entrySchema = z.object({
  id: z.string().max(200),
  receivedAt: z.iso.datetime(),
  event: eventSchema.nullable(),
});
export type SavedNotification = z.infer<typeof entrySchema>;
export type NotificationState = { items: SavedNotification[]; dismissedIds: string[] };
export const notificationStorageKey = (userId: string) => `obraflow.notifications.${userId}`;
const limit = 100;
const welcome = (): NotificationState => ({
  items: [{ id: "welcome", receivedAt: new Date().toISOString(), event: null }],
  dismissedIds: [],
});

/** Whether a stored entry is one this app could have written: a genuine event, or the welcome notice. */
function isGenuine(item: SavedNotification) {
  if (item.event) return !!parseNotification(item.event) && item.id === item.event.eventId;
  return item.id === "welcome";
}

export function decodeNotifications(raw: string | null): NotificationState | null {
  try {
    const data = z
      .object({
        version: z.union([z.literal(1), z.literal(2)]),
        items: z.array(z.unknown()).max(1000),
        dismissedIds: z.array(z.string().max(200)).max(1000).optional(),
      })
      .parse(JSON.parse(raw ?? "null"));
    const items = data.items.flatMap((value) => {
      const parsed = entrySchema.safeParse(value);
      return parsed.success && isGenuine(parsed.data) ? [parsed.data] : [];
    });
    if (data.items.length && !items.length) return null;
    return mergeNotifications({ items, dismissedIds: data.version === 2 ? (data.dismissedIds ?? []) : [] });
  } catch {
    return null;
  }
}

/** Union of several states: dismissed ids win, duplicates collapse, newest first, capped at `limit`. */
export function mergeNotifications(...states: NotificationState[]): NotificationState {
  const dismissedIds = [...new Set(states.flatMap((state) => state.dismissedIds))];
  const dismissed = new Set(dismissedIds);
  const entries = new Map<string, SavedNotification>();
  for (const item of states.flatMap((state) => state.items)) {
    if (!dismissed.has(item.id) && !entries.has(item.id)) entries.set(item.id, item);
  }
  const sorted = [...entries.values()].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  return {
    items: sorted.slice(0, limit),
    dismissedIds: [...dismissedIds, ...sorted.slice(limit).map((item) => item.id)].slice(-1000),
  };
}

export function loadNotifications(userId: string): NotificationState {
  try {
    return decodeNotifications(localStorage.getItem(notificationStorageKey(userId))) ?? welcome();
  } catch {
    return welcome();
  }
}

export function saveNotifications(userId: string, state: NotificationState): boolean {
  try {
    localStorage.setItem(notificationStorageKey(userId), JSON.stringify({ version: 2, ...state }));
    return true;
  } catch {
    return false;
  }
}
