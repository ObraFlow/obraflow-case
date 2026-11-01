import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { OrderList, PurchaseOrderDetail } from "@dokimos/shared";
import { Decimal } from "decimal.js";
import { dataSource } from "../src/db/data-source.js";
import { fixture, setup } from "./helpers.js";

let app: FastifyInstance;
before(async () => {
  app = await setup();
});
after(async () => {
  await app?.close();
  if (dataSource.isInitialized) await dataSource.destroy();
});
const headers = (id: string) => ({ authorization: `Bearer ${app.jwt.sign({ sub: id })}` });
type Fixture = Awaited<ReturnType<typeof fixture>>;
const item = (price = "1.00", quantity = "1") => ({ description: "Material", quantity, unit: "un", unitPrice: price });
const body = (f: Fixture, items = [item()]) => ({
  projectId: f.project.id,
  supplierId: f.supplier.id,
  orderDate: "2026-10-21",
  items,
});
const create = (f: Fixture, items = [item()], actorId = f.users[0].id) =>
  app.inject({
    method: "POST",
    url: "/api/v1/purchase-orders",
    headers: headers(actorId),
    payload: body(f, items),
  });
const decide = (id: string, actorId: string, stepIndex: number, decision = "APPROVED", reason?: string) =>
  app.inject({
    method: "POST",
    url: `/api/v1/purchase-orders/${id}/decisions`,
    headers: headers(actorId),
    payload: { expectedStepIndex: stepIndex, decision, ...(reason === undefined ? {} : { reason }) },
  });
async function configure(
  f: Fixture,
  version = 0,
  bands = [
    { upperLimit: "10000.00" as string | null, approverId: f.users[0].id },
    { upperLimit: null as string | null, approverId: f.users[1].id },
  ],
) {
  const result = await app.inject({
    method: "PUT",
    url: `/api/v1/projects/${f.project.id}/coa`,
    headers: headers(f.admin.id),
    payload: { expectedCoaVersion: version, bands },
  });
  assert.equal(result.statusCode, 200, result.body);
  return result.json();
}

function consistent(order: PurchaseOrderDetail) {
  const decisions = order.steps.filter((step) => step.decision !== null);
  const rejected = decisions.some((step) => step.decision?.type === "REJECTED");
  const expectedStatus = rejected ? "REJECTED" : decisions.length === order.steps.length ? "APPROVED" : "PENDING";
  assert.equal(order.status, expectedStatus);
  assert.equal(order.currentApproval?.stepIndex ?? null, expectedStatus === "PENDING" ? decisions.length : null);
  assert.equal(new Decimal(order.total).toFixed(2), order.total);
  assert.equal(order.items.reduce((sum, line) => sum.plus(line.lineTotal), new Decimal("0")).toFixed(2), order.total);
  for (const step of decisions) assert.equal(step.decision?.actorId, step.approverId);
}

test("exact per-line rounding and cumulative inclusive thresholds, including zero and large totals", async () => {
  const f = await fixture();
  try {
    await configure(f);
    for (const [items, total, stepCount] of [
      [[item("0.01", "0.5"), item("0.01", "0.5")], "0.02", 1],
      [[item("0.1"), item("0.2")], "0.30", 1],
      [[item("0", "0.001")], "0.00", 1],
      [[item("9999.99")], "9999.99", 1],
      [[item("10000.00")], "10000.00", 1],
      [[item("10000.01")], "10000.01", 2],
      [[item("999999999999.99", "1000")], "999999999999990.00", 2],
      [[item("999999999999.99", "10000"), item("99.99")], "9999999999999999.99", 2],
    ] as const) {
      const result = await create(f, [...items]);
      assert.equal(result.statusCode, 201, result.body);
      const order = result.json() as PurchaseOrderDetail;
      assert.equal(order.total, total);
      assert.equal(order.steps.length, stepCount);
      assert.equal(order.coaVersion, 1);
      assert.equal(order.items[0].quantity, new Decimal(items[0].quantity).toFixed(3));
      consistent(order);
      const stored = await dataSource.query("SELECT total::text FROM purchase_orders WHERE id=$1", [order.id]);
      assert.equal(stored[0].total, total);
    }
    // Repeated accepted submissions are distinct (no Phase 1 deduplication).
    const [first, second] = await Promise.all([create(f), create(f)]);
    assert.equal(first.statusCode, 201);
    assert.equal(second.statusCode, 201);
    assert.notEqual(first.json().id, second.json().id);
  } finally {
    await f.cleanup();
  }
});

test("200 items persist atomically with exact per-line totals; 201 items fail validation without partial records", async () => {
  const f = await fixture();
  try {
    await configure(f);
    const accepted = await create(
      f,
      Array.from({ length: 200 }, () => item("0.01", "0.5")),
    );
    assert.equal(accepted.statusCode, 201, accepted.body);
    const order = accepted.json<PurchaseOrderDetail>();
    assert.equal(order.items.length, 200);
    assert.equal(order.total, "2.00");
    consistent(order);
    const read = await app.inject({ url: `/api/v1/purchase-orders/${order.id}`, headers: headers(f.users[0].id) });
    assert.deepEqual(read.json(), order);
    const counts = () =>
      dataSource.query(
        `SELECT
      (SELECT count(*)::int FROM purchase_orders WHERE project_id=$1) AS orders,
      (SELECT count(*)::int FROM purchase_order_items WHERE order_id IN (SELECT id FROM purchase_orders WHERE project_id=$1)) AS items,
      (SELECT count(*)::int FROM purchase_order_steps WHERE order_id IN (SELECT id FROM purchase_orders WHERE project_id=$1)) AS steps,
      (SELECT count(*)::int FROM approval_decisions WHERE step_id IN (SELECT id FROM purchase_order_steps WHERE order_id IN (SELECT id FROM purchase_orders WHERE project_id=$1))) AS decisions`,
        [f.project.id],
      );
    const before = await counts();
    assert.deepEqual(before, [{ orders: 1, items: 200, steps: 1, decisions: 0 }]);
    const rejected = await create(
      f,
      Array.from({ length: 201 }, () => item()),
    );
    assert.equal(rejected.statusCode, 400, rejected.body);
    assert.equal(rejected.json().error.code, "VALIDATION_ERROR");
    assert.ok(rejected.json().error.details.some((issue: { field: string }) => issue.field === "items"));
    assert.deepEqual(await counts(), before);
  } finally {
    await f.cleanup();
  }
});

test("strict financial/calendar validation rejects input and aggregate overflow before persistence", async () => {
  const f = await fixture();
  try {
    await configure(f);
    const base = body(f);
    const invalid = [
      { ...base, items: [] },
      { ...base, total: "1.00" },
      { ...base, status: "APPROVED" },
      { ...base, coaVersion: 1 },
      { ...base, createdBy: f.admin.id },
      ...["2026-02-30", "2026-13-01", "21/10/2026", ""].map((orderDate) => ({ ...base, orderDate })),
      ...["0", "-1", "0.0001", "1000000000", "1e2", "NaN", 1].map((quantity) => ({
        ...base,
        items: [{ ...item(), quantity }],
      })),
      ...["-1", "1.001", "1000000000000", "1,00", "Infinity", 1].map((unitPrice) => ({
        ...base,
        items: [{ ...item(), unitPrice }],
      })),
      { ...base, items: [{ ...item(), lineTotal: "1.00" }] },
      { ...base, items: [{ ...item(), description: "  " }] },
      { ...base, items: [item("999999999999.99", "999999999.999")] },
      { ...base, items: [item("999999999999", "10000"), item("999999999999", "10000")] },
    ];
    for (const payload of invalid) {
      const result = await app.inject({
        method: "POST",
        url: "/api/v1/purchase-orders",
        headers: headers(f.users[0].id),
        payload,
      });
      assert.equal(result.statusCode, 400, JSON.stringify(payload) + result.body);
      assert.ok(result.json().error.details.length > 0);
    }
    assert.deepEqual(await dataSource.query("SELECT id FROM purchase_orders WHERE project_id=$1", [f.project.id]), []);
  } finally {
    await f.cleanup();
  }
});

test("creation requires configured CoA, active supplier and explicit project membership even for ADMIN", async () => {
  const f = await fixture();
  try {
    assert.equal((await create(f)).json().error.code, "PROJECT_COA_NOT_CONFIGURED");
    await configure(f);
    assert.equal((await create(f, [item()], f.admin.id)).statusCode, 403);
    assert.equal((await create(f, [item()], f.users[2].id)).statusCode, 404);
    const unknownSupplier = await app.inject({
      method: "POST",
      url: "/api/v1/purchase-orders",
      headers: headers(f.users[0].id),
      payload: { ...body(f), supplierId: randomUUID() },
    });
    assert.equal(unknownSupplier.statusCode, 400);
    await app.inject({ method: "DELETE", url: `/api/v1/suppliers/${f.supplier.id}`, headers: headers(f.admin.id) });
    const inactive = await create(f);
    assert.equal(inactive.statusCode, 409);
    assert.equal(inactive.json().error.code, "SUPPLIER_INACTIVE");
    assert.deepEqual(await dataSource.query("SELECT id FROM purchase_orders WHERE project_id=$1", [f.project.id]), []);
  } finally {
    await f.cleanup();
  }
});

test("sequential decisions preserve snapshots, reject admin bypass and stale/terminal attempts", async () => {
  const f = await fixture();
  try {
    await configure(f);
    const order = (await create(f, [item("10000.01")])).json() as PurchaseOrderDetail;
    const a = f.users[0].id,
      b = f.users[1].id;
    assert.equal((await decide(order.id, b, 0)).statusCode, 403);
    assert.equal((await decide(order.id, b, 1)).json().error.code, "APPROVAL_STEP_CONFLICT");
    assert.equal((await decide(order.id, f.admin.id, 0)).statusCode, 403);
    assert.equal((await decide(order.id, f.users[2].id, 0)).statusCode, 404);
    await configure(f, 1, [{ upperLimit: null, approverId: b }]);
    const afterEdit = (await app.inject({ url: `/api/v1/purchase-orders/${order.id}`, headers: headers(a) })).json();
    assert.equal(afterEdit.coaVersion, 1);
    assert.deepEqual(afterEdit.steps, order.steps);
    // Supplier deactivation affects future orders, not current approvals.
    await app.inject({ method: "DELETE", url: `/api/v1/suppliers/${f.supplier.id}`, headers: headers(f.admin.id) });
    const approved = await decide(order.id, a, 0);
    assert.equal(approved.statusCode, 200, approved.body);
    consistent(approved.json());
    assert.equal(approved.json().status, "PENDING");
    assert.equal(approved.json().currentApproval.approverId, b);
    assert.equal(approved.json().supplier.isActive, false);
    const oldDecision = approved.json().steps[0].decision;
    assert.equal((await decide(order.id, a, 0)).json().error.code, "APPROVAL_STEP_CONFLICT");
    // A's decided step and historical revision do not block deactivation.
    const disableA = await app.inject({ method: "DELETE", url: `/api/v1/users/${a}`, headers: headers(f.admin.id) });
    assert.equal(disableA.statusCode, 204, disableA.body);
    const final = await decide(order.id, b, 1);
    assert.equal(final.statusCode, 200, final.body);
    assert.equal(final.json().status, "APPROVED");
    assert.equal(final.json().currentApproval, null);
    assert.deepEqual(final.json().steps[0].decision, oldDecision);
    consistent(final.json());
    assert.equal((await decide(order.id, b, 1)).json().error.code, "ORDER_ALREADY_DECIDED");
    assert.equal((await decide(order.id, f.admin.id, 0)).json().error.code, "ORDER_ALREADY_DECIDED");
  } finally {
    await f.cleanup();
  }
});

test("rejection requires reason, is terminal at any stage and releases future pending-assignment blocker", async () => {
  const f = await fixture();
  try {
    await configure(f);
    const order = (await create(f, [item("10000.01")])).json();
    const a = f.users[0].id,
      b = f.users[1].id;
    for (const payload of [
      { expectedStepIndex: 0, decision: "REJECTED" },
      { expectedStepIndex: 0, decision: "REJECTED", reason: "  " },
      { expectedStepIndex: 0, decision: "APPROVED", reason: "extraneous" },
      { expectedStepIndex: 0, decision: "APPROVED", actorId: b },
      { expectedStepIndex: -1, decision: "APPROVED" },
    ]) {
      assert.equal(
        (
          await app.inject({
            method: "POST",
            url: `/api/v1/purchase-orders/${order.id}/decisions`,
            headers: headers(a),
            payload,
          })
        ).statusCode,
        400,
      );
    }
    await configure(f, 1, [{ upperLimit: null, approverId: a }]);
    const blocked = await app.inject({ method: "DELETE", url: `/api/v1/users/${b}`, headers: headers(f.admin.id) });
    assert.equal(blocked.json().error.code, "USER_HAS_PENDING_APPROVALS");
    const rejected = await decide(order.id, a, 0, "REJECTED", "  Preço alto  ");
    assert.equal(rejected.statusCode, 200, rejected.body);
    assert.equal(rejected.json().status, "REJECTED");
    assert.equal(rejected.json().steps[0].decision.reason, "Preço alto");
    assert.equal(rejected.json().steps[1].decision, null);
    consistent(rejected.json());
    assert.equal((await decide(order.id, b, 1)).json().error.code, "ORDER_ALREADY_DECIDED");
    assert.equal(
      (await app.inject({ method: "DELETE", url: `/api/v1/users/${b}`, headers: headers(f.admin.id) })).statusCode,
      204,
    );
    // Reject after an earlier approval too.
    await app.inject({
      method: "POST",
      url: `/api/v1/projects/${f.project.id}/members`,
      headers: headers(f.admin.id),
      payload: { userId: f.admin.id },
    });
    await configure(f, 2, [
      { upperLimit: "0", approverId: a },
      { upperLimit: null, approverId: f.admin.id },
    ]);
    const later = (await create(f)).json();
    assert.equal((await decide(later.id, a, 0)).statusCode, 200);
    const finalRejection = await decide(later.id, f.admin.id, 1, "REJECTED", "Quantidade incorreta");
    assert.equal(finalRejection.statusCode, 200, finalRejection.body);
    consistent(finalRejection.json());
    assert.equal(finalRejection.json().steps[0].decision.type, "APPROVED");
    assert.equal(finalRejection.json().steps[1].decision.type, "REJECTED");
  } finally {
    await f.cleanup();
  }
});

test("PO list filters/counts authorize before pagination and current-step actionability", async () => {
  const f = await fixture();
  try {
    await configure(f);
    const ids = [];
    for (let i = 0; i < 3; i++) ids.push((await create(f, [item("10000.01")])).json().id);
    await decide(ids[0], f.users[0].id, 0);
    await decide(ids[0], f.users[1].id, 1);
    await decide(ids[1], f.users[0].id, 0, "REJECTED", "Preço alto");
    const list = (userId: string, query = "") =>
      app.inject({ url: `/api/v1/purchase-orders?projectId=${f.project.id}${query}`, headers: headers(userId) });
    const all = (await list(f.users[0].id, "&pageSize=2")).json();
    assert.equal(all.data.length, 2);
    assert.equal(all.pagination.total, 3);
    assert.equal((await list(f.users[2].id)).json().pagination.total, 0);
    assert.equal((await list(f.admin.id)).json().pagination.total, 3);
    for (const status of ["PENDING", "APPROVED", "REJECTED"]) {
      const result = (await list(f.users[0].id, `&status=${status}`)).json();
      assert.equal(result.pagination.total, 1);
      assert.equal(result.data[0].status, status);
      assert.equal(result.data[0].itemCount, 1);
    }
    assert.equal((await list(f.users[0].id, "&actionableByMe=true")).json().pagination.total, 1);
    assert.equal((await list(f.users[1].id, "&actionableByMe=true")).json().pagination.total, 0);
    await decide(ids[2], f.users[0].id, 0);
    assert.equal((await list(f.users[0].id, "&actionableByMe=true")).json().pagination.total, 0);
    assert.equal((await list(f.users[1].id, "&actionableByMe=true")).json().data[0].currentApproval.stepIndex, 1);
    assert.deepEqual((await list(f.users[0].id, "&page=99")).json().data, []);
    // The distribution counts every visible order, not the page, and ignores the status and
    // actionableByMe filters so every view tab keeps its size whichever view is selected.
    const distribution = { total: 3, byStatus: { PENDING: 1, APPROVED: 1, REJECTED: 1 }, actionableByMe: 0 };
    for (const query of ["&pageSize=1", "&status=APPROVED", "&actionableByMe=true", "&page=99"]) {
      assert.deepEqual((await list(f.users[0].id, query)).json().distribution, distribution);
    }
    assert.equal((await list(f.users[1].id)).json().distribution.actionableByMe, 1);
    assert.deepEqual((await list(f.users[2].id)).json().distribution, {
      total: 0,
      byStatus: { PENDING: 0, APPROVED: 0, REJECTED: 0 },
      actionableByMe: 0,
    });
    assert.equal(
      (await app.inject({ url: "/api/v1/purchase-orders", headers: headers(f.admin.id) })).json().distribution.total >=
        3,
      true,
    );
    for (const query of [
      "page=0",
      "page=-1",
      "page=1.5",
      "pageSize=101",
      "pageSize=0",
      "actionableByMe=1",
      "status=DRAFT",
    ]) {
      assert.equal((await list(f.users[0].id, `&${query}`)).statusCode, 400);
    }
    assert.equal(
      (await app.inject({ url: `/api/v1/purchase-orders/${ids[0]}`, headers: headers(f.users[2].id) })).statusCode,
      404,
    );
    assert.equal(
      (await app.inject({ url: `/api/v1/purchase-orders/${randomUUID()}`, headers: headers(f.users[0].id) }))
        .statusCode,
      404,
    );
    assert.equal((await app.inject({ url: `/api/v1/purchase-orders/${ids[0]}` })).statusCode, 401);
    assert.equal((await app.inject({ url: "/api/v1/purchase-orders" })).statusCode, 401);
  } finally {
    await f.cleanup();
  }
});

test("list chains follow ordered PO snapshots and decisions through approval and rejection", async () => {
  const f = await fixture();
  try {
    const added = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${f.project.id}/members`,
      headers: headers(f.admin.id),
      payload: { userId: f.users[2].id },
    });
    assert.equal(added.statusCode, 201, added.body);
    await configure(
      f,
      0,
      f.users.map((user, i) => ({ approverId: user.id, upperLimit: i === 2 ? null : `${i + 1}.00` })),
    );
    const created = await create(f, [item("3.00")]);
    assert.equal(created.statusCode, 201, created.body);
    const id = created.json().id;
    async function check(states: string[], status = "PENDING") {
      const response = await app.inject({
        url: `/api/v1/purchase-orders?projectId=${f.project.id}&pageSize=1`,
        headers: headers(f.users[0].id),
      });
      assert.equal(response.statusCode, 200, response.body);
      const list = response.json<OrderList>();
      const order = list.data[0];
      assert.equal(order.status, status);
      assert.deepEqual(
        order.approvalSteps,
        f.users.map((user, i) => ({
          stepIndex: i,
          approverId: user.id,
          approverName: user.displayName,
          state: states[i],
        })),
      );
      assert.equal(order.decidedStepCount, states.filter((state) => ["APPROVED", "REJECTED"].includes(state)).length);
      assert.equal(order.currentApproval?.stepIndex ?? -1, states.indexOf("CURRENT"));
    }
    await check(["CURRENT", "UPCOMING", "UPCOMING"]);
    // Publishing another ladder must never change the existing list's chain.
    await configure(f, 1, [{ upperLimit: null, approverId: f.users[2].id }]);
    assert.equal((await decide(id, f.users[0].id, 0)).statusCode, 200);
    await check(["APPROVED", "CURRENT", "UPCOMING"]);
    assert.equal((await decide(id, f.users[1].id, 1, "REJECTED", "Revisar orçamento")).statusCode, 200);
    await check(["APPROVED", "REJECTED", "SKIPPED"], "REJECTED");
    // Historical identities remain visible even after logical deactivation.
    const disabled = await app.inject({
      method: "DELETE",
      url: `/api/v1/users/${f.users[1].id}`,
      headers: headers(f.admin.id),
    });
    assert.equal(disabled.statusCode, 204, disabled.body);
    await check(["APPROVED", "REJECTED", "SKIPPED"], "REJECTED");
    const hidden = await app.inject({
      url: "/api/v1/purchase-orders?actionableByMe=true",
      headers: headers(f.users[2].id),
    });
    assert.ok(!hidden.json<OrderList>().data.some((order) => order.id === id));
    await configure(
      f,
      2,
      f.users
        .filter((_, i) => i !== 1)
        .map((user, i) => ({ approverId: user.id, upperLimit: i === 1 ? null : "1.00" })),
    );
    const second = await create(f, [item("3.00")]);
    assert.equal(second.statusCode, 201, second.body);
    for (const [i, user] of [f.users[0], f.users[2]].entries())
      assert.equal((await decide(second.json().id, user.id, i)).statusCode, 200);
    const approved = await app.inject({
      url: `/api/v1/purchase-orders?projectId=${f.project.id}&status=APPROVED`,
      headers: headers(f.admin.id),
    });
    assert.deepEqual(
      approved.json<OrderList>().data[0].approvalSteps.map((step) => step.state),
      ["APPROVED", "APPROVED"],
    );
    assert.equal(approved.json<OrderList>().data[0].currentApproval, null);
  } finally {
    await f.cleanup();
  }
});

test("competing decisions append once; concurrent detail reads agree with their history", async () => {
  const f = await fixture();
  try {
    await configure(f);
    const id = (await create(f, [item("10000.01")])).json().id;
    const a = f.users[0].id,
      b = f.users[1].id;
    const [first, duplicate] = await Promise.all([decide(id, a, 0), decide(id, a, 0)]);
    assert.deepEqual([first.statusCode, duplicate.statusCode].sort(), [200, 409]);
    assert.equal((first.statusCode === 409 ? first : duplicate).json().error.code, "APPROVAL_STEP_CONFLICT");
    const results = await Promise.all([
      decide(id, b, 1),
      decide(id, b, 1, "REJECTED", "Preço alto"),
      ...Array.from({ length: 12 }, () => app.inject({ url: `/api/v1/purchase-orders/${id}`, headers: headers(a) })),
    ]);
    assert.deepEqual(
      results
        .slice(0, 2)
        .map((r) => r.statusCode)
        .sort(),
      [200, 409],
    );
    for (const result of results.filter((r) => r.statusCode === 200)) consistent(result.json());
    const decisions = await dataSource.query(
      "SELECT d.id FROM approval_decisions d JOIN purchase_order_steps step ON step.id=d.step_id WHERE step.order_id=$1",
      [id],
    );
    assert.equal(decisions.length, 2);
  } finally {
    await f.cleanup();
  }
});

test("creation racing CoA publication pins exactly one complete revision", async () => {
  const f = await fixture();
  try {
    await configure(f);
    const [created] = await Promise.all([
      create(f, [item("10000.01")]),
      configure(f, 1, [{ upperLimit: null, approverId: f.users[1].id }]),
    ]);
    assert.equal(created.statusCode, 201, created.body);
    const order = created.json();
    const revisions = await dataSource.query("SELECT bands FROM coa_revisions WHERE project_id=$1 AND version=$2", [
      f.project.id,
      order.coaVersion,
    ]);
    assert.deepEqual(
      order.steps.map((s: { approverId: string }) => s.approverId),
      revisions[0].bands.map((b: { approverId: string }) => b.approverId),
    );
    assert.ok(order.coaVersion === 1 || order.coaVersion === 2);
    consistent(order);
  } finally {
    await f.cleanup();
  }
});

test("creation racing supplier deactivation either commits before it or leaves no order", async () => {
  const f = await fixture();
  try {
    await configure(f);
    const [created, disabled] = await Promise.all([
      create(f),
      app.inject({ method: "DELETE", url: `/api/v1/suppliers/${f.supplier.id}`, headers: headers(f.admin.id) }),
    ]);
    assert.equal(disabled.statusCode, 204);
    assert.ok(created.statusCode === 201 || created.statusCode === 409, created.body);
    const orders = await dataSource.query("SELECT id FROM purchase_orders WHERE project_id=$1", [f.project.id]);
    assert.equal(orders.length, created.statusCode === 201 ? 1 : 0);
    if (orders.length) {
      const approved = await decide(orders[0].id, f.users[0].id, 0);
      assert.equal(approved.statusCode, 200, approved.body);
      assert.equal(approved.json().supplier.isActive, false);
    } else assert.equal(created.json().error.code, "SUPPLIER_INACTIVE");
  } finally {
    await f.cleanup();
  }
});

test("creator deactivation racing creation is rechecked under its user lock", async () => {
  const f = await fixture();
  try {
    // Creator is a member but is not an assignee, so ordinary deactivation is eligible.
    await configure(f, 0, [{ upperLimit: null, approverId: f.users[1].id }]);
    const [created, disabled] = await Promise.all([
      create(f),
      app.inject({ method: "DELETE", url: `/api/v1/users/${f.users[0].id}`, headers: headers(f.admin.id) }),
    ]);
    assert.equal(disabled.statusCode, 204, disabled.body);
    assert.ok(created.statusCode === 201 || created.statusCode === 401, created.body);
    const orders = await dataSource.query("SELECT id FROM purchase_orders WHERE project_id=$1", [f.project.id]);
    assert.equal(orders.length, created.statusCode === 201 ? 1 : 0);
    if (created.statusCode === 201) {
      const result = await decide(created.json().id, f.users[1].id, 0);
      assert.equal(result.statusCode, 200, result.body);
    }
  } finally {
    await f.cleanup();
  }
});

test("input that is valid JSON but unstorable in PostgreSQL returns 400 and writes nothing", async () => {
  const f = await fixture();
  try {
    await configure(f);
    const post = (payload: object) =>
      app.inject({ method: "POST", url: "/api/v1/purchase-orders", headers: headers(f.users[0].id), payload });
    const rejected = [
      await post({ ...body(f), orderDate: "0000-01-01" }),
      await post({ ...body(f), notes: "a\u0000b" }),
      await post(body(f, [{ ...item(), description: "a\u0000b" }])),
    ];
    for (const response of rejected) {
      assert.equal(response.statusCode, 400, response.body);
      assert.equal(response.json().error.code, "VALIDATION_ERROR");
    }
    const count = await dataSource.query("SELECT count(*)::int AS count FROM purchase_orders WHERE project_id=$1", [
      f.project.id,
    ]);
    assert.equal(count[0].count, 0);
  } finally {
    await f.cleanup();
  }
});
