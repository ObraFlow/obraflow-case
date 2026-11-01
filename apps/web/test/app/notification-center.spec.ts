import { test, expect, type Page } from "@playwright/test";
import { PO_NOTIFICATION_TYPES, poNotificationEventId } from "@dokimos/shared";
import {
  createFixture,
  loadDatabase,
  startServer,
  stopApi,
  type Database,
  type Fixture,
  type Server,
} from "../support/api";

const API = "http://127.0.0.1:4100/api/v1";
let server: Server;
let database: Database;
let f: Fixture;
let tokens: string[];
let adminToken: string;
const key = (id: string) => `obraflow.notifications.${id}`;
const auth = (index: number) => ({ authorization: `Bearer ${tokens[index]}` });

test.beforeAll(async () => {
  server = await startServer();
  database = await loadDatabase();
});
test.beforeEach(async ({ request }) => {
  f = await createFixture();
  tokens = f.users.map((user) => server.jwt.sign({ sub: user.id }));
  adminToken = server.jwt.sign({ sub: f.admin.id });
  const result = await request.put(`${API}/projects/${f.project.id}/coa`, {
    headers: { authorization: `Bearer ${adminToken}` },
    data: {
      expectedCoaVersion: 0,
      bands: [
        { upperLimit: "10000.00", approverId: f.users[0].id },
        { upperLimit: null, approverId: f.users[1].id },
      ],
    },
  });
  expect(result.status()).toBe(200);
});
test.afterEach(async () => {
  await f?.cleanup();
});
test.afterAll(async () => {
  await stopApi(server, database);
});

const createOrder = async (request: import("@playwright/test").APIRequestContext, unitPrice = "5000.00") => {
  const response = await request.post(`${API}/purchase-orders`, {
    headers: auth(0),
    data: {
      projectId: f.project.id,
      supplierId: f.supplier.id,
      orderDate: "2026-10-31",
      items: [{ description: "Materiais para a obra", quantity: "1", unit: "lote", unitPrice }],
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).id as string;
};
const entry = (
  orderId: string,
  revision: number,
  type: (typeof PO_NOTIFICATION_TYPES)[keyof typeof PO_NOTIFICATION_TYPES],
) => {
  const eventId = poNotificationEventId(orderId, revision, type);
  const event =
    type === PO_NOTIFICATION_TYPES.ACTION_REQUIRED
      ? { type, eventId, orderId, revision, stepIndex: 0 }
      : { type, eventId, orderId, revision, status: "APPROVED" as const };
  return { id: eventId, receivedAt: new Date().toISOString(), event };
};
const savedIds = (page: Page) =>
  page.evaluate(
    (storageKey) =>
      JSON.parse(localStorage.getItem(storageKey) ?? "null")?.items.map((item: { id: string }) => item.id) ?? [],
    key(f.users[0].id),
  );

async function enter(page: Page, url = "/purchase-orders") {
  await page.route("https://i.pravatar.cc/**", (route) => route.abort());
  await page.addInitScript((value) => {
    if (!sessionStorage.getItem("obraflow.accessToken")) sessionStorage.setItem("obraflow.accessToken", value);
  }, tokens[0]);
  await page.goto(url);
}

test("opening an order's page by any route dismisses that order's notifications only", async ({ page, request }) => {
  const [opened, other] = [await createOrder(request), await createOrder(request)];
  const items = [
    entry(opened, 0, PO_NOTIFICATION_TYPES.ACTION_REQUIRED),
    entry(opened, 2, PO_NOTIFICATION_TYPES.FINALIZED),
    entry(other, 0, PO_NOTIFICATION_TYPES.ACTION_REQUIRED),
  ];
  await page.addInitScript(
    ({ storageKey, items }) => {
      if (!localStorage.getItem(storageKey))
        localStorage.setItem(storageKey, JSON.stringify({ version: 2, items, dismissedIds: [] }));
    },
    { storageKey: key(f.users[0].id), items },
  );
  await enter(page);
  await expect(page.getByRole("heading", { name: "Pedidos de compra", exact: true })).toBeVisible();
  await expect.poll(() => savedIds(page)).toHaveLength(3);
  // Opened from the list, not from a notification.
  await page.getByRole("link", { name: `Abrir pedido ${opened.slice(0, 8)}`, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/purchase-orders/${opened}$`));
  await expect.poll(() => savedIds(page)).toEqual([items[2].id]);
  await expect(page.getByRole("img", { name: "1 notificação", exact: true }).first()).toBeVisible();
});

test("a notification for the order already on screen refreshes it when opened", async ({ page, request }) => {
  let connected = false;
  page.on("websocket", (socket) => {
    if (socket.url().includes("/socket.io/"))
      socket.on("framereceived", (frame) => {
        if (String(frame.payload).startsWith("40")) connected = true;
      });
  });
  const id = await createOrder(request);
  await enter(page, `/purchase-orders/${id}`);
  await expect(page.getByRole("heading", { name: `Pedido #${id.slice(0, 8)}`, exact: true })).toBeVisible();
  await expect(page.getByText("Pendente", { exact: true }).first()).toBeVisible();
  await expect.poll(() => connected).toBe(true);
  // The sole approver decides elsewhere; the creator's open page is now stale.
  const decision = await request.post(`${API}/purchase-orders/${id}/decisions`, {
    headers: auth(0),
    data: { decision: "APPROVED", expectedStepIndex: 0 },
  });
  expect(decision.status()).toBe(200);
  const toast = page.locator("[data-sonner-toast]").filter({ hasText: "Seu pedido foi aprovado." });
  await expect(toast).toBeVisible();
  await expect(page.getByText("Pendente", { exact: true }).first()).toBeVisible();
  const entriesBefore = await page.evaluate(() => window.history.length);
  await toast.getByRole("button", { name: "Abrir pedido", exact: true }).click();
  await expect(page.getByText("Aprovado", { exact: true }).first()).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/purchase-orders/${id}$`));
  expect(await page.evaluate(() => window.history.length)).toBe(entriesBefore);
  await expect(page.locator("[data-sonner-toast]")).toHaveCount(0);
  // Only the welcome entry remains: everything about this order was dismissed.
  await expect
    .poll(async () => (await savedIds(page)).filter((saved: string) => saved.startsWith(`${id}:`)))
    .toEqual([]);
});
