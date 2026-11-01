import { after, afterEach, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { io, type Socket } from "socket.io-client";
import type { FastifyInstance } from "fastify";
import { SelectQueryBuilder, type ObjectLiteral } from "typeorm";
import type { PoNotification, PurchaseOrderDetail } from "@dokimos/shared";
import { fixture, setup } from "./helpers.js";
import { dataSource } from "../src/db/data-source.js";
import { UserEntity } from "../src/modules/users/entities.js";
import { createOrderInTransaction, decideOrderInTransaction } from "../src/modules/purchase-orders/service.js";
import { notificationFor, notifyOrder } from "../src/modules/purchase-orders/notifier.js";
import { notifyCommittedOrder } from "../src/modules/purchase-orders/notify-committed.js";

let app: FastifyInstance, url: string;
let f: Awaited<ReturnType<typeof fixture>>;
const clients: Socket[] = [];
const received = new Map<Socket, PoNotification[]>();
before(async () => {
  app = await setup();
  url = await app.listen({ host: "127.0.0.1", port: 0 });
});
beforeEach(async () => {
  f = await fixture();
});
afterEach(async () => {
  for (const socket of clients.splice(0)) socket.disconnect();
  received.clear();
  await f.cleanup();
});
after(async () => {
  await app?.close();
  if (dataSource.isInitialized) await dataSource.destroy();
});
const token = (id: string) => app.jwt.sign({ sub: id });
const headers = (id: string) => ({ authorization: `Bearer ${token(id)}` });
function rawToken(payload: object) {
  const unsigned = [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
    Buffer.from(JSON.stringify(payload)).toString("base64url"),
  ].join(".");
  return `${unsigned}.${createHmac("sha256", process.env.JWT_SECRET!).update(unsigned).digest("base64url")}`;
}

function event(socket: Socket, name: string, timeout = 4000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(name, done);
      reject(new Error(`Timed out: ${name}`));
    }, timeout);
    function done(value: unknown) {
      clearTimeout(timer);
      resolve(value);
    }
    socket.once(name, done);
  });
}
function client(auth: object, extra = {}) {
  const socket = io(url, { transports: ["websocket"], auth, autoConnect: false, reconnection: false, ...extra });
  clients.push(socket);
  received.set(socket, []);
  socket.on("po.notification", (payload: PoNotification) => received.get(socket)?.push(payload));
  return socket;
}
async function connect(id: string) {
  const socket = client({ token: token(id), userId: f.users[1].id, room: `user:${f.users[1].id}` });
  const ready = event(socket, "connect");
  socket.connect();
  await ready;
  return socket;
}
// A server-to-client fence on the same ordered WebSocket stream proves all earlier
// emissions arrived. No sleeps or absence-only timing guesses.
async function drain(socket: Socket, id: string) {
  const marker: PoNotification = {
    type: "po.finalized",
    eventId: `fence:${randomUUID()}`,
    orderId: randomUUID(),
    revision: 0,
    status: "APPROVED",
  };
  const ready = event(socket, "po.notification");
  // Wait specifically for the fence even if a domain event is still in flight.
  const fenced = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("po.notification", listener);
      reject(new Error("Fence timeout"));
    }, 4000);
    function listener(payload: PoNotification) {
      if (payload.eventId === marker.eventId) {
        clearTimeout(timer);
        socket.off("po.notification", listener);
        resolve();
      }
    }
    socket.on("po.notification", listener);
  });
  app.realtime.sendToUser(id, marker);
  await Promise.all([ready, fenced]);
  const events = received
    .get(socket)!
    .splice(0)
    .filter((payload) => !payload.eventId.startsWith("fence:"));
  return events;
}
async function configure(single = false, version = 0, approver = f.users[0].id) {
  const response = await app.inject({
    method: "PUT",
    url: `/api/v1/projects/${f.project.id}/coa`,
    headers: headers(f.admin.id),
    payload: {
      expectedCoaVersion: version,
      bands: single
        ? [{ upperLimit: null, approverId: approver }]
        : [
            { upperLimit: "10.00", approverId: f.users[0].id },
            { upperLimit: null, approverId: f.users[1].id },
          ],
    },
  });
  assert.equal(response.statusCode, 200, response.body);
}
const body = () => ({
  projectId: f.project.id,
  supplierId: f.supplier.id,
  orderDate: "2026-10-29",
  items: [{ description: "Material", quantity: "1", unit: "un", unitPrice: "11.00" }],
});
async function create(creator = f.users[0].id) {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/purchase-orders",
    headers: headers(creator),
    payload: body(),
  });
  assert.equal(response.statusCode, 201, response.body);
  return response.json<PurchaseOrderDetail>();
}
const decide = (id: string, index: number, decision = "APPROVED", actor = f.users[index].id) =>
  app.inject({
    method: "POST",
    url: `/api/v1/purchase-orders/${id}/decisions`,
    headers: headers(actor),
    payload: {
      expectedStepIndex: index,
      decision,
      ...(decision === "REJECTED" ? { reason: "Private rejection reason" } : {}),
    },
  });
function action(order: PurchaseOrderDetail, revision: number, stepIndex: number): PoNotification {
  return {
    type: "po.action_required",
    eventId: `${order.id}:${revision}:action_required`,
    orderId: order.id,
    revision,
    stepIndex,
  };
}
function finalized(order: PurchaseOrderDetail, revision: number, status: "APPROVED" | "REJECTED"): PoNotification {
  return { type: "po.finalized", eventId: `${order.id}:${revision}:finalized`, orderId: order.id, revision, status };
}

test("socket handshake rejects invalid identities/claims and cross-origin or polling connections", async () => {
  await dataSource.getRepository(UserEntity).update(f.users[2].id, { isActive: false });
  const valid = token(f.users[0].id);
  const claims = app.jwt.decode<Record<string, unknown>>(valid)!;
  for (const claim of ["sub", "exp"]) {
    const missing = { ...claims };
    delete missing[claim];
    const socket = client({ token: rawToken(missing) });
    const error = event(socket, "connect_error");
    socket.connect();
    await error;
    assert.equal(socket.connected, false);
    socket.disconnect();
  }
  for (const auth of [
    {},
    { token: 42 },
    { token: "malformed" },
    { token: valid.slice(0, valid.lastIndexOf(".") + 1) + "invalid-signature" },
    { token: app.jwt.sign({ sub: f.users[0].id }, { algorithm: "HS384" }) },
    { token: app.jwt.sign({ sub: f.users[0].id, iat: 1 }, { expiresIn: 1 }) },
    { token: app.jwt.sign({ sub: "not-uuid" }) },
    { token: token(randomUUID()) },
    { token: token(f.users[2].id) },
    { token: app.jwt.sign({ sub: f.users[0].id }, { expiresIn: 0 }) },
  ]) {
    const socket = client(auth);
    const error = event(socket, "connect_error");
    socket.connect();
    await error;
    assert.equal(socket.connected, false);
    assert.deepEqual(received.get(socket), []);
    socket.disconnect();
  }
  for (const extra of [{ extraHeaders: { Origin: "https://untrusted.example" } }, { transports: ["polling"] }]) {
    const socket = client({ token: valid }, extra);
    const error = event(socket, "connect_error");
    socket.connect();
    await error;
    assert.equal(socket.connected, false);
    socket.disconnect();
  }
  assert.equal((await connect(f.users[0].id)).connected, true);
});

test("socket handshake accepts subject and expiry without enforcing issuer/audience", async () => {
  const minimal = { sub: f.users[0].id, exp: Math.floor(Date.now() / 1000) + 60 };
  for (const claims of [minimal, { ...minimal, iss: "optional-issuer", aud: "optional-audience" }]) {
    const socket = client({ token: rawToken(claims) });
    const ready = event(socket, "connect");
    socket.connect();
    await ready;
    assert.equal(socket.connected, true);
    socket.disconnect();
  }
});

test("two-step workflow sends exact minimal payloads to both current-user sockets and creator only at finalization", async () => {
  await configure();
  const a = await connect(f.users[0].id),
    a2 = await connect(f.users[0].id);
  const b = await connect(f.users[1].id),
    outsider = await connect(f.users[2].id);
  outsider.emit("join", `user:${f.users[0].id}`);
  outsider.emit("subscribe", { userId: f.users[0].id });
  const order = await create();
  // Fence a2 first: the same-user fence also reaches a, so drain both together below.
  assert.deepEqual(await drain(a, f.users[0].id), [action(order, 0, 0)]);
  assert.deepEqual(await drain(a2, f.users[0].id), [action(order, 0, 0)]);
  assert.deepEqual(await drain(b, f.users[1].id), []);
  assert.deepEqual(await drain(outsider, f.users[2].id), []);
  assert.equal((await decide(order.id, 0)).statusCode, 200);
  assert.deepEqual(await drain(b, f.users[1].id), [action(order, 1, 1)]);
  assert.deepEqual(await drain(a, f.users[0].id), []);
  const final = await decide(order.id, 1);
  assert.equal(final.statusCode, 200);
  assert.equal(final.json().currentApproval, null);
  assert.deepEqual(await drain(a, f.users[0].id), [finalized(order, 2, "APPROVED")]);
  assert.deepEqual(await drain(b, f.users[1].id), []);
  assert.deepEqual(await drain(outsider, f.users[2].id), []);
  const read = await app.inject({ url: `/api/v1/purchase-orders/${order.id}`, headers: headers(f.users[0].id) });
  assert.deepEqual(read.json(), final.json());
  assert.equal((await app.inject({ url: "/healthz" })).statusCode, 200);
  assert.deepEqual(await drain(a, f.users[0].id), []);
});

test("single approval and rejection at either step have deterministic terminal revisions", async () => {
  await configure();
  const a = await connect(f.users[0].id),
    b = await connect(f.users[1].id);
  for (const step of [0, 1]) {
    const order = await create();
    await drain(a, f.users[0].id);
    if (step === 1) {
      assert.equal((await decide(order.id, 0)).statusCode, 200);
      await drain(b, f.users[1].id);
    }
    assert.equal((await decide(order.id, step, "REJECTED")).statusCode, 200);
    assert.deepEqual(await drain(a, f.users[0].id), [finalized(order, step + 1, "REJECTED")]);
    assert.deepEqual(await drain(b, f.users[1].id), []);
  }
  await configure(true, 1);
  const order = await create();
  assert.deepEqual(await drain(a, f.users[0].id), [action(order, 0, 0)]);
  assert.equal((await decide(order.id, 0)).statusCode, 200);
  assert.deepEqual(await drain(a, f.users[0].id), [finalized(order, 1, "APPROVED")]);
});

test("failed HTTP writes, stale decisions, reads, rollback and transactional helpers emit nothing", async () => {
  await configure();
  const a = await connect(f.users[0].id),
    b = await connect(f.users[1].id);
  const order = await create();
  await drain(a, f.users[0].id);
  const denied = [
    await app.inject({ method: "POST", url: "/api/v1/purchase-orders", headers: headers(f.users[0].id), payload: {} }),
    await app.inject({ method: "POST", url: "/api/v1/purchase-orders", payload: body() }),
    await decide(order.id, 0, "APPROVED", f.users[1].id),
    await decide(order.id, 0, "APPROVED", f.users[2].id),
    await decide(order.id, 1),
  ];
  assert.deepEqual(
    denied.map((r) => r.statusCode),
    [400, 401, 403, 404, 409],
  );
  await assert.rejects(
    dataSource.transaction(async (manager) => {
      const created = await createOrderInTransaction(manager, f.users[0], body());
      await decideOrderInTransaction(manager, f.users[0], created.id, { expectedStepIndex: 0, decision: "APPROVED" });
      throw new Error("rollback");
    }),
    /rollback/,
  );
  const direct = await dataSource.transaction((manager) => createOrderInTransaction(manager, f.users[0], body()));
  await dataSource.transaction((manager) =>
    decideOrderInTransaction(manager, f.users[0], direct.id, { expectedStepIndex: 0, decision: "APPROVED" }),
  );
  assert.deepEqual(await drain(a, f.users[0].id), []);
  assert.deepEqual(await drain(b, f.users[1].id), []);
  assert.equal((await decide(order.id, 0)).statusCode, 200);
  await drain(b, f.users[1].id);
  assert.equal((await decide(order.id, 0)).statusCode, 409);
  assert.deepEqual(await drain(b, f.users[1].id), []);
  assert.equal((await decide(order.id, 1)).statusCode, 200);
  await drain(a, f.users[0].id);
  assert.equal((await decide(order.id, 1)).statusCode, 409);
  assert.deepEqual(await drain(a, f.users[0].id), []);
});

test("HTTP creation and decision database errors roll back without emitting, and failed deactivation keeps sockets", async (t) => {
  await configure();
  const a = await connect(f.users[0].id),
    b = await connect(f.users[1].id),
    c = await connect(f.users[2].id);
  const factory = dataSource.createQueryRunner.bind(dataSource);
  let match = /INSERT INTO "purchase_order_steps"/;
  const interception = t.mock.method(dataSource, "createQueryRunner", (...args: Parameters<typeof factory>) => {
    const runner = factory(...args),
      query = runner.query.bind(runner);
    t.mock.method(runner, "query", async (...params: Parameters<typeof query>) => {
      if (match.test(params[0])) return query("SELECT 1 / 0");
      return query(...params);
    });
    return runner;
  });
  try {
    const failed = await app.inject({
      method: "POST",
      url: "/api/v1/purchase-orders",
      headers: headers(f.users[0].id),
      payload: body(),
    });
    assert.equal(failed.statusCode, 500);
    assert.deepEqual(await dataSource.query("SELECT id FROM purchase_orders WHERE project_id=$1", [f.project.id]), []);
    match = /never-match/;
    const order = await create();
    await drain(a, f.users[0].id);
    match = /INSERT INTO "approval_decisions"/;
    assert.equal((await decide(order.id, 0)).statusCode, 500);
    const read = await app.inject({ url: `/api/v1/purchase-orders/${order.id}`, headers: headers(f.users[0].id) });
    assert.deepEqual(read.json(), order);
    match = /INSERT INTO "user_lifecycle_events"/;
    assert.equal(
      (await app.inject({ method: "DELETE", url: `/api/v1/users/${f.users[2].id}`, headers: headers(f.admin.id) }))
        .statusCode,
      500,
    );
    assert.equal((await dataSource.getRepository(UserEntity).findOneByOrFail({ id: f.users[2].id })).isActive, true);
    assert.equal(c.connected, true);
    assert.deepEqual(await drain(a, f.users[0].id), []);
    assert.deepEqual(await drain(b, f.users[1].id), []);
    assert.deepEqual(await drain(c, f.users[2].id), []);
  } finally {
    interception.mock.restore();
  }
});

test("a delayed action hint cannot reach an assignee removed after a later transition released blockers", async () => {
  await configure();
  const a = await connect(f.users[0].id),
    b = await connect(f.users[1].id);
  const order = await create();
  await drain(a, f.users[0].id);
  assert.equal((await decide(order.id, 0)).statusCode, 200);
  await drain(b, f.users[1].id);
  await configure(true, 1, f.users[1].id);
  assert.equal(
    (
      await app.inject({
        method: "DELETE",
        url: `/api/v1/projects/${f.project.id}/members/${f.users[0].id}`,
        headers: headers(f.admin.id),
      })
    ).statusCode,
    204,
  );
  // Reproduce the earlier route resuming late with its already-returned DTO.
  await notifyCommittedOrder(app, order);
  assert.deepEqual(await drain(a, f.users[0].id), []);
  assert.equal((await decide(order.id, 1)).statusCode, 200);
  assert.deepEqual(await drain(a, f.users[0].id), []);
});

test("deactivation disconnects only after success and reconnect rechecks active state; pending assignments block removal", async () => {
  await configure();
  const a = await connect(f.users[0].id),
    b = await connect(f.users[1].id),
    outsider = await connect(f.users[2].id);
  const order = await create();
  await drain(a, f.users[0].id);
  const remove = (id: string) =>
    app.inject({
      method: "DELETE",
      url: `/api/v1/projects/${f.project.id}/members/${id}`,
      headers: headers(f.admin.id),
    });
  const disable = (id: string) =>
    app.inject({ method: "DELETE", url: `/api/v1/users/${id}`, headers: headers(f.admin.id) });
  assert.equal((await disable(f.users[0].id)).statusCode, 409);
  assert.equal((await remove(f.users[0].id)).statusCode, 409);
  await configure(true, 1, f.users[1].id);
  assert.equal((await remove(f.users[0].id)).statusCode, 409); // undecided snapshot assignment
  assert.equal(a.connected, true);
  assert.equal(b.connected, true);
  const disconnected = event(outsider, "disconnect");
  assert.equal((await disable(f.users[2].id)).statusCode, 204);
  await disconnected;
  const rejected = event(outsider, "connect_error");
  outsider.connect();
  await rejected;
  assert.equal((await decide(order.id, 0)).statusCode, 200);
  await drain(b, f.users[1].id);
  const creatorDisconnected = event(a, "disconnect");
  assert.equal((await disable(f.users[0].id)).statusCode, 204);
  await creatorDisconnected;
  assert.equal((await decide(order.id, 1)).statusCode, 200);
  assert.deepEqual(await drain(b, f.users[1].id), []);
});

test("case-varied UUIDs share canonical rooms and deactivation disconnects both JWT spellings only on success", async () => {
  await configure(true);
  const blocked = await connect(f.users[0].id);
  const eligibleId = f.users[2].id;
  const sockets: Socket[] = [];
  for (const subject of [eligibleId, eligibleId.toUpperCase()]) {
    const socket = client({ token: token(subject) });
    const ready = event(socket, "connect");
    socket.connect();
    await ready;
    sockets.push(socket);
    // The canonical room must reach both spellings before lifecycle changes.
    assert.deepEqual(await drain(socket, eligibleId), []);
  }
  const failed = await app.inject({
    method: "DELETE",
    url: `/api/v1/users/${f.users[0].id.toUpperCase()}`,
    headers: headers(f.admin.id),
  });
  assert.equal(failed.statusCode, 409);
  assert.equal(blocked.connected, true);
  assert.deepEqual(await drain(blocked, f.users[0].id), []);

  const disconnected = sockets.map((socket) => event(socket, "disconnect"));
  const disabled = await app.inject({
    method: "DELETE",
    url: `/api/v1/users/${eligibleId.toUpperCase()}`,
    headers: headers(f.admin.id),
  });
  assert.equal(disabled.statusCode, 204, disabled.body);
  assert.deepEqual(await Promise.all(disconnected), ["io server disconnect", "io server disconnect"]);
  for (const socket of sockets) {
    const rejected = event(socket, "connect_error");
    socket.connect();
    await rejected;
    assert.equal(socket.connected, false);
  }
  assert.equal(blocked.connected, true);
  assert.deepEqual(await drain(blocked, f.users[0].id), []);
});

test("terminal creator notification requires current project visibility, while current ADMIN remains eligible", async () => {
  await configure(true, 0, f.users[1].id);
  const creator = await connect(f.users[0].id),
    approver = await connect(f.users[1].id);
  const order = await create();
  await drain(approver, f.users[1].id);
  const removed = await app.inject({
    method: "DELETE",
    url: `/api/v1/projects/${f.project.id}/members/${f.users[0].id}`,
    headers: headers(f.admin.id),
  });
  assert.equal(removed.statusCode, 204);
  assert.equal((await decide(order.id, 0, "APPROVED", f.users[1].id)).statusCode, 200);
  assert.deepEqual(await drain(creator, f.users[0].id), []);
  assert.equal(
    (await app.inject({ url: `/api/v1/purchase-orders/${order.id}`, headers: headers(f.users[0].id) })).statusCode,
    404,
  );
  // ADMIN creator needs membership to create, but retains read access after removal.
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: `/api/v1/projects/${f.project.id}/members`,
        headers: headers(f.admin.id),
        payload: { userId: f.admin.id },
      })
    ).statusCode,
    201,
  );
  const admin = await connect(f.admin.id),
    adminOrder = await create(f.admin.id);
  await drain(approver, f.users[1].id);
  assert.equal(
    (
      await app.inject({
        method: "DELETE",
        url: `/api/v1/projects/${f.project.id}/members/${f.admin.id}`,
        headers: headers(f.admin.id),
      })
    ).statusCode,
    204,
  );
  assert.equal((await decide(adminOrder.id, 0, "APPROVED", f.users[1].id)).statusCode, 200);
  assert.deepEqual(await drain(admin, f.admin.id), [finalized(adminOrder, 1, "APPROVED")]);
});

test("expiry disconnects an established socket; shutdown closes active sockets and clears long timers", async () => {
  const socket = client({ token: app.jwt.sign({ sub: f.users[0].id }, { expiresIn: 2 }) });
  const ready = event(socket, "connect");
  socket.connect();
  await ready;
  assert.equal(await event(socket, "disconnect"), "io server disconnect");
  const other = await (await import("../src/app.js")).buildApp();
  try {
    const address = await other.listen({ host: "127.0.0.1", port: 0 });
    const live = io(address, {
      transports: ["websocket"],
      auth: { token: other.jwt.sign({ sub: f.users[0].id }, { expiresIn: "100d" }) },
      autoConnect: false,
      reconnection: false,
    });
    clients.push(live);
    const connected = event(live, "connect");
    live.connect();
    await connected;
    const disconnected = event(live, "disconnect");
    await other.close();
    await disconnected;
  } finally {
    await other.close();
  }
});

test("throwing or rejecting transport and uncertain recipient lookup never turn committed REST writes into errors", async (t) => {
  await configure(true);
  const original = app.realtime.sendToUser;
  for (const fail of [
    () => {
      throw new Error("transport");
    },
    async () => {
      throw new Error("transport");
    },
  ]) {
    const mock = t.mock.method(app.realtime, "sendToUser", fail);
    try {
      const order = await create();
      const result = await decide(order.id, 0);
      assert.equal(result.statusCode, 200);
      assert.equal(result.json().status, "APPROVED");
      assert.equal(mock.mock.callCount(), 2);
    } finally {
      mock.mock.restore();
    }
  }
  assert.equal(app.realtime.sendToUser, original);
  const a = await connect(f.users[0].id);
  const order = await create();
  await drain(a, f.users[0].id);
  const getExists = SelectQueryBuilder.prototype.getExists;
  const mock = t.mock.method(
    SelectQueryBuilder.prototype,
    "getExists",
    async function (this: SelectQueryBuilder<ObjectLiteral>) {
      if (this.alias === "u") throw new Error("recipient check unavailable");
      return getExists.call(this);
    },
  );
  try {
    assert.equal((await decide(order.id, 0)).statusCode, 200);
  } finally {
    mock.mock.restore();
  }
  assert.deepEqual(await drain(a, f.users[0].id), []);
  const detail = (
    await app.inject({ url: `/api/v1/purchase-orders/${order.id}`, headers: headers(f.users[0].id) })
  ).json<PurchaseOrderDetail>();
  const selected = notificationFor(detail)!;
  assert.deepEqual(selected.event, finalized(order, 1, "APPROVED"));
  let sent = false;
  await notifyOrder(
    detail,
    {
      sendToUser() {
        sent = true;
      },
    },
    async () => false,
  );
  assert.equal(sent, false);
});
