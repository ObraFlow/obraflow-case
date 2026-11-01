import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { AuditPage } from "@dokimos/shared";
import { dataSource } from "../src/db/data-source.js";
import { UserEntity } from "../src/modules/users/entities.js";
import { createOrderInTransaction } from "../src/modules/purchase-orders/service.js";
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

test("audit authenticates current database roles before query validation and exposes no write routes", async () => {
  const f = await fixture();
  try {
    const url = "/api/v1/audit/events";
    assert.equal((await app.inject({ url })).statusCode, 401);
    const denied = await app.inject({ url: `${url}?eventType=invalid`, headers: headers(f.users[0].id) });
    assert.equal(denied.statusCode, 403);
    assert.equal(denied.json().error.code, "FORBIDDEN");
    assert.deepEqual(denied.json().error.details, []);
    assert.equal(typeof denied.json().error.message, "string");
    assert.equal(
      (
        await app.inject({
          url,
          headers: { authorization: `Bearer ${app.jwt.sign({ sub: f.users[0].id, role: "ADMIN" })}` },
        })
      ).statusCode,
      403,
    );
    assert.equal(
      (await app.inject({ method: "DELETE", url: `/api/v1/users/${f.users[2].id}`, headers: headers(f.admin.id) }))
        .statusCode,
      204,
    );
    assert.equal((await app.inject({ url, headers: headers(f.users[2].id) })).statusCode, 401);
    for (const method of ["POST", "PUT", "PATCH", "DELETE"] as const) {
      assert.equal((await app.inject({ method, url, headers: headers(f.admin.id) })).statusCode, 404);
    }
    const allowed = await app.inject({ url: `${url}?projectId=${f.project.id}`, headers: headers(f.admin.id) });
    assert.equal(allowed.statusCode, 200, allowed.body);
    assert.deepEqual(allowed.json(), { data: [], pagination: { page: 1, pageSize: 20, total: 0 } });
  } finally {
    await f.cleanup();
  }
});

test("audit composes original PO snapshots, decisions, complete revisions and user lifecycle without losing decimal precision or inactive actors", async () => {
  const f = await fixture();
  const coa = `/api/v1/projects/${f.project.id}/coa`;
  try {
    const initial = [
      { upperLimit: "10000.00", approverId: f.users[0].id },
      { upperLimit: null, approverId: f.users[1].id },
    ];
    assert.equal(
      (
        await app.inject({
          method: "PUT",
          url: coa,
          headers: headers(f.admin.id),
          payload: { expectedCoaVersion: 0, bands: initial },
        })
      ).statusCode,
      200,
    );
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/purchase-orders",
      headers: headers(f.users[0].id),
      payload: {
        projectId: f.project.id,
        supplierId: f.supplier.id,
        orderDate: "2026-10-22",
        items: [
          { description: "Compra exata", quantity: "10000", unit: "un", unitPrice: "999999999999.99" },
          { description: "Complemento", quantity: "1", unit: "un", unitPrice: "99.99" },
        ],
      },
    });
    assert.equal(created.statusCode, 201, created.body);
    const order = created.json();
    for (const [index, decision] of ["APPROVED", "REJECTED"].entries()) {
      const response = await app.inject({
        method: "POST",
        url: `/api/v1/purchase-orders/${order.id}/decisions`,
        headers: headers(f.users[index].id),
        payload: {
          expectedStepIndex: index,
          decision,
          ...(decision === "REJECTED" ? { reason: "Preço precisa ser revisto.\nCotação recusada." } : {}),
        },
      });
      assert.equal(response.statusCode, 200, response.body);
    }
    const revised = { expectedCoaVersion: 1, bands: [{ upperLimit: null, approverId: f.users[1].id }] };
    assert.equal(
      (await app.inject({ method: "PUT", url: coa, headers: headers(f.admin.id), payload: revised })).statusCode,
      200,
    );
    assert.equal(
      (
        await app.inject({
          method: "PUT",
          url: coa,
          headers: headers(f.admin.id),
          payload: { ...revised, expectedCoaVersion: 2 },
        })
      ).statusCode,
      200,
    );
    assert.equal(
      (await app.inject({ method: "DELETE", url: `/api/v1/users/${f.users[0].id}`, headers: headers(f.admin.id) }))
        .statusCode,
      204,
    );
    assert.equal(
      (await app.inject({ method: "DELETE", url: `/api/v1/suppliers/${f.supplier.id}`, headers: headers(f.admin.id) }))
        .statusCode,
      204,
    );
    const read = await app.inject({
      url: `/api/v1/audit/events?projectId=${f.project.id}`,
      headers: headers(f.admin.id),
    });
    assert.equal(read.statusCode, 200, read.body);
    const events = read.json<AuditPage>();
    assert.equal(events.pagination.total, 5); // two revisions, one creation, two decisions; no no-op event.
    const creation = events.data.find((event) => event.type === "ORDER_CREATED");
    assert.equal(creation?.type, "ORDER_CREATED");
    if (creation?.type !== "ORDER_CREATED") assert.fail("Missing order creation");
    assert.equal(creation.details.total, "9999999999999999.99");
    assert.equal(creation.details.coaVersion, 1);
    assert.deepEqual(
      creation.details.steps.map((step) => step.approverId),
      f.users.slice(0, 2).map((user) => user.id),
    );
    assert.equal(creation.actor.id, f.users[0].id);
    assert.equal(creation.actor.displayName, f.users[0].displayName);
    assert.equal(creation.resource.id, order.id);
    const revision = events.data.find((event) => event.type === "COA_REVISED" && event.details.version === 1);
    if (revision?.type !== "COA_REVISED") assert.fail("Missing initial revision");
    assert.deepEqual(
      revision.details.bands.map(({ approverName: _name, ...band }) => band),
      initial,
    );
    assert.equal(revision.actor.id, f.admin.id);
    const rejection = events.data.find((event) => event.type === "STEP_REJECTED");
    if (rejection?.type !== "STEP_REJECTED") assert.fail("Missing rejection");
    assert.equal(rejection.actor.id, f.users[1].id);
    assert.equal(rejection.details.stepIndex, 1);
    assert.equal(rejection.details.reason, "Preço precisa ser revisto.\nCotação recusada.");
    assert.equal(events.data.filter((event) => event.type === "STEP_APPROVED").length, 1);
    for (const event of events.data) {
      assert.ok(Number.isFinite(Date.parse(event.occurredAt)));
      assert.equal(event.project?.id, f.project.id);
    }
    const account = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      headers: headers(f.admin.id),
      payload: {
        username: `audit-${randomUUID()}`,
        displayName: "Usuário auditado",
        password: "test-audit-password",
      },
    });
    assert.equal(account.statusCode, 201, account.body);
    const id = account.json().id;
    f.users.push(await dataSource.getRepository(UserEntity).findOneByOrFail({ id }));
    for (let i = 0; i < 2; i++)
      assert.equal(
        (await app.inject({ method: "DELETE", url: `/api/v1/users/${id}`, headers: headers(f.admin.id) })).statusCode,
        204,
      );
    const lifecycle = await app.inject({ url: "/api/v1/audit/events?pageSize=100", headers: headers(f.admin.id) });
    const own = lifecycle.json<AuditPage>().data.filter((event) => event.resource.id === id);
    assert.deepEqual(
      own.map((event) => event.type),
      ["USER_DISABLED", "USER_CREATED"],
    );
    assert.ok(own.every((event) => event.project === null && event.actor.id === f.admin.id));
    assert.ok(
      lifecycle.json<AuditPage>().data.some((event) => event.actor.kind === "SYSTEM" && event.actor.id === null),
    );
    assert.doesNotMatch(lifecycle.body, /password|passwordHash|password_hash|test-audit-password/);
  } finally {
    await f.cleanup();
  }
});

test("audit filters and server pagination have stable ordering for tied timestamps and preserve totals on empty pages", async () => {
  const f = await fixture();
  try {
    assert.equal(
      (
        await app.inject({
          method: "PUT",
          url: `/api/v1/projects/${f.project.id}/coa`,
          headers: headers(f.admin.id),
          payload: { expectedCoaVersion: 0, bands: [{ upperLimit: null, approverId: f.users[0].id }] },
        })
      ).statusCode,
      200,
    );
    const orders = await dataSource.transaction(async (manager) => {
      const input = {
        projectId: f.project.id,
        supplierId: f.supplier.id,
        orderDate: "2026-10-22",
        items: [{ description: "Teste", quantity: "1", unit: "un", unitPrice: "1.00" }],
      };
      return [
        await createOrderInTransaction(manager, f.users[0], input),
        await createOrderInTransaction(manager, f.users[0], input),
      ];
    });
    assert.equal(orders[0].createdAt, orders[1].createdAt);
    const ids = orders
      .map((order) => `order:${order.id}`)
      .sort()
      .reverse();
    const url = `/api/v1/audit/events?eventType=ORDER_CREATED&projectId=${f.project.id}&pageSize=1`;
    for (let page = 1; page <= 3; page++) {
      const result = await app.inject({ url: `${url}&page=${page}`, headers: headers(f.admin.id) });
      assert.equal(result.statusCode, 200, result.body);
      const body = result.json<AuditPage>();
      assert.deepEqual(body.pagination, { page, pageSize: 1, total: 2 });
      assert.deepEqual(
        body.data.map((event) => event.id),
        page === 3 ? [] : [ids[page - 1]],
      );
    }
    for (const filter of [`projectId=${randomUUID()}`, `projectId=${f.project.id}&eventType=USER_CREATED`]) {
      const body = (
        await app.inject({ url: `/api/v1/audit/events?${filter}`, headers: headers(f.admin.id) })
      ).json<AuditPage>();
      assert.equal(body.pagination.total, 0);
      assert.deepEqual(body.data, []);
    }
  } finally {
    await f.cleanup();
  }
});

test("audit rejects malformed and excessive query input with stable field errors", async () => {
  const f = await fixture();
  try {
    for (const query of [
      "page=0",
      "page=-1",
      "page=1.5",
      "page=2147483648",
      "pageSize=101",
      "pageSize=0",
      "projectId=invalid",
      "eventType=UNKNOWN",
      "eventType=ORDER_CREATED&eventType=COA_REVISED",
      "unknown=true",
      "from=invalid",
      "from=2026-10-29T00:00:00.000001Z",
      "from=0000-01-01T00:00:00Z",
      "from=2026-10-29T00:00:00%2B23:00",
      "to=2026-02-30T00:00:00Z",
      "from=2026-10-29",
      "from=2026-10-30T00:00:00Z&to=2026-10-29T00:00:00Z",
      "from=2026-10-29T00:00:00Z&to=2026-10-29T00:00:00Z",
      "from=2026-10-29T00:00:00Z&from=2026-10-30T00:00:00Z",
    ]) {
      const response = await app.inject({ url: `/api/v1/audit/events?${query}`, headers: headers(f.admin.id) });
      assert.equal(response.statusCode, 400, `${query}: ${response.body}`);
      assert.equal(response.json().error.code, "VALIDATION_ERROR");
      assert.ok(response.json().error.details.length > 0);
    }
  } finally {
    await f.cleanup();
  }
});

test("audit timestamp ranges include the lower boundary, exclude the upper boundary and paginate every source consistently", async () => {
  const f = await fixture();
  try {
    assert.equal(
      (
        await app.inject({
          method: "PUT",
          url: `/api/v1/projects/${f.project.id}/coa`,
          headers: headers(f.admin.id),
          payload: { expectedCoaVersion: 0, bands: [{ upperLimit: null, approverId: f.users[0].id }] },
        })
      ).statusCode,
      200,
    );
    const creation = await app.inject({
      method: "POST",
      url: "/api/v1/purchase-orders",
      headers: headers(f.users[0].id),
      payload: {
        projectId: f.project.id,
        supplierId: f.supplier.id,
        orderDate: "2026-10-29",
        items: [{ description: "Período auditado", quantity: "1", unit: "un", unitPrice: "1.00" }],
      },
    });
    assert.equal(creation.statusCode, 201, creation.body);
    const order = creation.json();
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: `/api/v1/purchase-orders/${order.id}/decisions`,
          headers: headers(f.users[0].id),
          payload: { expectedStepIndex: 0, decision: "REJECTED", reason: "Teste de período." },
        })
      ).statusCode,
      200,
    );
    // Fixed timestamps belong only to this disposable fixture; normal application history is unchanged.
    await dataSource.query("UPDATE purchase_orders SET created_at='2040-06-01T02:59:59.999999Z' WHERE id=$1", [
      order.id,
    ]);
    await dataSource.query("UPDATE coa_revisions SET changed_at='2040-06-01T03:00:00Z' WHERE project_id=$1", [
      f.project.id,
    ]);
    await dataSource.query(
      "UPDATE approval_decisions SET decided_at='2040-06-02T02:59:59.999999Z' WHERE step_id IN (SELECT id FROM purchase_order_steps WHERE order_id=$1)",
      [order.id],
    );
    await dataSource.query(
      "INSERT INTO user_lifecycle_events (target_user_id,actor_user_id,actor_kind,action,created_at) VALUES ($1,$2,'USER','CREATED','2040-06-02T03:00:00Z')",
      [f.users[2].id, f.admin.id],
    );
    const from = "2040-06-01T00:00:00-03:00",
      to = "2040-06-02T00:00:00-03:00";
    async function read(values: Record<string, string>) {
      const result = await app.inject({
        url: `/api/v1/audit/events?${new URLSearchParams(values)}`,
        headers: headers(f.admin.id),
      });
      assert.equal(result.statusCode, 200, result.body);
      return result.json<AuditPage>();
    }
    const bounded = await read({ from, to });
    assert.equal(bounded.pagination.total, 2);
    assert.deepEqual(
      bounded.data.map((event) => event.type),
      ["STEP_REJECTED", "COA_REVISED"],
    );
    assert.equal((await read({ from })).pagination.total, 3);
    assert.equal((await read({ to, projectId: f.project.id })).pagination.total, 3);
    assert.equal((await read({ from, to, projectId: f.project.id, eventType: "COA_REVISED" })).pagination.total, 1);
    assert.equal((await read({ from, to, eventType: "USER_CREATED" })).pagination.total, 0);
    for (let page = 1; page <= 3; page++) {
      const result = await read({ from, to, pageSize: "1", page: String(page) });
      assert.deepEqual(result.pagination, { page, pageSize: 1, total: 2 });
      assert.deepEqual(
        result.data.map((event) => event.id),
        page === 3 ? [] : [bounded.data[page - 1].id],
      );
    }
  } finally {
    await f.cleanup();
  }
});
