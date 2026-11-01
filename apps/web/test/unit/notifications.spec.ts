import { test, expect } from "@playwright/test";
import { PO_NOTIFICATION_TYPES, poNotificationEventId } from "@dokimos/shared";
import {
  notificationContent,
  notificationKind,
  parseNotification,
} from "../../src/features/notifications/notificationEvents";
import {
  decodeNotifications,
  mergeNotifications,
  type SavedNotification,
} from "../../src/features/notifications/notificationStore";
import { dayGroup, relativeTime } from "../../src/features/notifications/notificationTime";

const orderId = "3609233f-39bc-49ed-8185-1d97839185c2";
const action = (revision = 1, stepIndex = 0) => ({
  type: PO_NOTIFICATION_TYPES.ACTION_REQUIRED,
  orderId,
  revision,
  stepIndex,
  eventId: poNotificationEventId(orderId, revision, PO_NOTIFICATION_TYPES.ACTION_REQUIRED),
});
const finalized = (status: "APPROVED" | "REJECTED", revision = 2) => ({
  type: PO_NOTIFICATION_TYPES.FINALIZED,
  orderId,
  revision,
  status,
  eventId: poNotificationEventId(orderId, revision, PO_NOTIFICATION_TYPES.FINALIZED),
});
const saved = (event: ReturnType<typeof action>, receivedAt = "2026-10-31T12:00:00.000Z"): SavedNotification => ({
  id: event.eventId,
  receivedAt,
  event,
});
const stored = (version: number, items: unknown[], dismissedIds?: string[]) =>
  JSON.stringify({ version, items, ...(dismissedIds ? { dismissedIds } : {}) });
const note = (id: string, minute: number): SavedNotification => ({
  id,
  receivedAt: new Date(Date.UTC(2026, 9, 1, 0, minute)).toISOString(),
  event: null,
});

test.describe("parseNotification", () => {
  test("accepts a well-formed hint whose id matches its content", () => {
    expect(parseNotification(action())).toEqual(action());
    expect(parseNotification(finalized("REJECTED"))).toEqual(finalized("REJECTED"));
  });

  test("rejects a hint whose id does not match its order, revision and type", () => {
    expect(parseNotification({ ...action(), eventId: "forged" })).toBeNull();
    expect(parseNotification({ ...action(), revision: 2 })).toBeNull();
  });

  test("rejects malformed payloads", () => {
    const bad = poNotificationEventId("123", 1, PO_NOTIFICATION_TYPES.ACTION_REQUIRED);
    expect(parseNotification({ ...action(), orderId: "123", eventId: bad })).toBeNull();
    expect(parseNotification({ ...finalized("APPROVED"), status: "PENDING" })).toBeNull();
    expect(parseNotification({ ...action(), revision: -1 })).toBeNull();
    expect(parseNotification({ ...action(), stepIndex: 1.5 })).toBeNull();
    expect(parseNotification({ ...action(), type: "po.unknown" })).toBeNull();
    for (const value of [null, undefined, "text", 42, []]) expect(parseNotification(value)).toBeNull();
  });
});

test.describe("decodeNotifications", () => {
  test("unreadable or unsupported storage is ignored", () => {
    expect(decodeNotifications(null)).toBeNull();
    expect(decodeNotifications("not json")).toBeNull();
    expect(decodeNotifications(stored(3, []))).toBeNull();
  });

  test("restores valid entries and the welcome notice", () => {
    const welcome = { id: "welcome", receivedAt: "2026-10-31T12:00:00.000Z", event: null };
    const result = decodeNotifications(stored(2, [saved(action()), welcome], []));
    expect(result?.items.map((item) => item.id)).toEqual([action().eventId, "welcome"]);
  });

  test("drops an entry whose id differs from its event, and refuses a store with nothing valid", () => {
    const forged = { ...saved(action()), id: "other" };
    expect(decodeNotifications(stored(2, [forged]))).toBeNull();
    const kept = decodeNotifications(stored(2, [forged, saved(action(2))]));
    expect(kept?.items.map((item) => item.id)).toEqual([action(2).eventId]);
  });

  test("dismissed ids exist only in the current format", () => {
    const entry = saved(action());
    expect(decodeNotifications(stored(2, [entry], [entry.id]))).toEqual({ items: [], dismissedIds: [entry.id] });
    expect(decodeNotifications(stored(1, [entry], [entry.id]))?.items).toHaveLength(1);
  });
});

test.describe("mergeNotifications", () => {
  test("keeps one entry per id, newest first", () => {
    const merged = mergeNotifications(
      { items: [note("a", 1), note("b", 3)], dismissedIds: [] },
      { items: [note("a", 1), note("c", 2)], dismissedIds: [] },
    );
    expect(merged.items.map((item) => item.id)).toEqual(["b", "c", "a"]);
  });

  test("a dismissal in any state removes the entry everywhere", () => {
    const merged = mergeNotifications(
      { items: [note("a", 1), note("b", 2)], dismissedIds: [] },
      { items: [], dismissedIds: ["a"] },
    );
    expect(merged.items.map((item) => item.id)).toEqual(["b"]);
    expect(merged.dismissedIds).toContain("a");
  });

  test("the inbox keeps 100 entries and remembers the evicted ones as dismissed", () => {
    const items = Array.from({ length: 105 }, (_, index) => note(`n${index}`, index));
    const merged = mergeNotifications({ items, dismissedIds: [] });
    expect(merged.items).toHaveLength(100);
    expect(merged.items[0].id).toBe("n104");
    expect(merged.dismissedIds).toEqual(["n4", "n3", "n2", "n1", "n0"]);
  });
});

test("dayGroup buckets by local calendar day", () => {
  const now = new Date(2026, 9, 31, 20);
  const at = (day: number, hour = 12) => new Date(2026, 9, day, hour).toISOString();
  expect(dayGroup(at(31, 0), now)).toBe("Hoje");
  expect(dayGroup(at(30, 23), now)).toBe("Ontem");
  expect(dayGroup(at(29), now)).toBe("Anteriores");
  expect(dayGroup(at(1), now)).toBe("Anteriores");
});

test("relativeTime is short for the recent past and gives up after a week", () => {
  const now = Date.UTC(2026, 9, 31, 12);
  const ago = (ms: number) => new Date(now - ms).toISOString();
  expect(relativeTime(ago(10_000), now)).toBe("agora");
  expect(relativeTime(ago(5 * 60_000), now)).toMatch(/5 minutos/);
  expect(relativeTime(ago(2 * 3_600_000), now)).toMatch(/2 horas/);
  expect(relativeTime(ago(3 * 86_400_000), now)).toMatch(/3 dias/);
  expect(relativeTime(ago(8 * 86_400_000), now)).toBeNull();
});

test.describe("notification content", () => {
  test("describes each hint by its order reference and outcome", () => {
    expect(notificationContent(action())).toEqual({
      title: "Pedido aguardando sua decisão.",
      description: "Pedido #3609233f",
      variant: "info",
    });
    expect(notificationContent(finalized("APPROVED"))).toMatchObject({
      title: "Seu pedido foi aprovado.",
      variant: "success",
    });
    expect(notificationContent(finalized("REJECTED"))).toMatchObject({
      title: "Seu pedido foi rejeitado.",
      variant: "warning",
    });
    expect(notificationContent(null).variant).toBe("info");
  });

  test("kind separates a pending decision from a result and from the welcome notice", () => {
    expect(notificationKind(action())).toBe("decision");
    expect(notificationKind(finalized("APPROVED"))).toBe("result");
    expect(notificationKind(null)).toBe("info");
  });
});
