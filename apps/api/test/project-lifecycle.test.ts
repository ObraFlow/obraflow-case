import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { FastifyInstance, InjectOptions } from "fastify";
import { dataSource } from "../src/db/data-source.js";
import { fixture, setup, waitForBlockedConnection } from "./helpers.js";

let app: FastifyInstance;
before(async () => {
  app = await setup();
});
after(async () => {
  await app?.close();
  if (dataSource.isInitialized) await dataSource.destroy();
});
type Fixture = Awaited<ReturnType<typeof fixture>>;
const headers = (id: string) => ({ authorization: `Bearer ${app.jwt.sign({ sub: id })}` });
const lifecycle = (f: Fixture, action: string): InjectOptions => ({
  method: "POST",
  url: `/api/v1/projects/${f.project.id}/${action}`,
  headers: headers(f.admin.id),
});
const publication = (f: Fixture): InjectOptions => ({
  method: "PUT",
  url: `/api/v1/projects/${f.project.id}/coa`,
  headers: headers(f.admin.id),
  payload: { expectedCoaVersion: 0, bands: [{ upperLimit: null, approverId: f.users[1].id }] },
});
const creation = (f: Fixture): InjectOptions => ({
  method: "POST",
  url: "/api/v1/purchase-orders",
  headers: headers(f.users[0].id),
  payload: {
    projectId: f.project.id,
    supplierId: f.supplier.id,
    orderDate: "2026-10-30",
    items: [{ description: "Concreto", quantity: "1", unit: "m³", unitPrice: "20.00" }],
  },
});
// projectState: the project row and its audit history; a denied write must change neither.
async function projectState(f: Fixture) {
  return {
    project: (await dataSource.query("SELECT name,is_active,coa_version FROM projects WHERE id=$1", [f.project.id]))[0],
    events: await dataSource.query(
      "SELECT action FROM project_lifecycle_events WHERE project_id=$1 ORDER BY created_at,id",
      [f.project.id],
    ),
  };
}
async function snapshot(f: Fixture) {
  const result: Record<string, unknown> = {};
  for (const table of ["project_members", "coa_bands", "coa_revisions", "purchase_orders"]) {
    result[table] = await dataSource.query(`SELECT * FROM ${table} WHERE project_id=$1 ORDER BY 1,2`, [f.project.id]);
  }
  for (const table of ["purchase_order_items", "purchase_order_steps"]) {
    result[table] = await dataSource.query(
      `SELECT * FROM ${table} WHERE order_id IN (SELECT id FROM purchase_orders WHERE project_id=$1) ORDER BY id`,
      [f.project.id],
    );
  }
  result.decisions = await dataSource.query(
    "SELECT * FROM approval_decisions WHERE step_id IN (SELECT id FROM purchase_order_steps WHERE order_id IN (SELECT id FROM purchase_orders WHERE project_id=$1)) ORDER BY id",
    [f.project.id],
  );
  return result;
}

test("project lifecycle validates authorization, UUIDs and the same strict name contract as creation", async () => {
  const f = await fixture();
  try {
    assert.equal(
      (await app.inject({ url: "/api/v1/projects", headers: headers(f.admin.id) }))
        .json()
        .data.find((p: { id: string }) => p.id === f.project.id).isActive,
      true,
    );
    const rename: InjectOptions = {
      method: "PATCH",
      url: `/api/v1/projects/${f.project.id}`,
      payload: { name: "  Nome corrigido  " },
      headers: headers(f.admin.id),
    };
    for (const options of [rename, lifecycle(f, "archive"), lifecycle(f, "reactivate")]) {
      assert.equal((await app.inject({ ...options, headers: {} })).statusCode, 401);
      assert.equal((await app.inject({ ...options, headers: headers(f.users[0].id) })).statusCode, 403);
      assert.equal(
        (await app.inject({ ...options, url: (options.url as string).replace(f.project.id, "invalid") })).statusCode,
        400,
      );
      assert.equal(
        (await app.inject({ ...options, url: (options.url as string).replace(f.project.id, randomUUID()) })).statusCode,
        404,
      );
    }
    for (const name of ["", "  ", "x".repeat(151)]) {
      assert.equal((await app.inject({ ...rename, payload: { name } })).statusCode, 400);
    }
    assert.equal((await app.inject({ ...rename, payload: { name: "Valid", isActive: false } })).statusCode, 400);
    const renamed = await app.inject(rename);
    assert.equal(renamed.statusCode, 200, renamed.body);
    assert.equal(renamed.json().id, f.project.id);
    assert.equal(renamed.json().name, "Nome corrigido");
  } finally {
    await f.cleanup();
  }
});

test("archive blocks pending orders, freezes configuration and preserves complete financial history across reactivation", async () => {
  const f = await fixture();
  try {
    assert.equal((await app.inject(publication(f))).statusCode, 200);
    const order = (await app.inject(creation(f))).json();
    const blocked = await app.inject(lifecycle(f, "archive"));
    assert.equal(blocked.statusCode, 409, blocked.body);
    assert.equal(blocked.json().error.code, "PROJECT_HAS_PENDING_ORDERS");
    assert.deepEqual(blocked.json().error.details, []);
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: `/api/v1/purchase-orders/${order.id}/decisions`,
          headers: headers(f.users[1].id),
          payload: { expectedStepIndex: 0, decision: "APPROVED" },
        })
      ).statusCode,
      200,
    );
    const rejected = (await app.inject(creation(f))).json();
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: `/api/v1/purchase-orders/${rejected.id}/decisions`,
          headers: headers(f.users[1].id),
          payload: { expectedStepIndex: 0, decision: "REJECTED", reason: "Fora do orçamento" },
        })
      ).statusCode,
      200,
    );
    const original = await snapshot(f);
    for (let i = 0; i < 2; i++) {
      const archived = await app.inject(lifecycle(f, "archive"));
      assert.equal(archived.statusCode, 200, archived.body);
      assert.equal(archived.json().isActive, false);
    }
    const frozen = await projectState(f);
    for (const options of [
      creation(f),
      { ...publication(f), payload: { ...(publication(f).payload as object), expectedCoaVersion: 1 } },
      {
        method: "POST",
        url: `/api/v1/projects/${f.project.id}/members`,
        headers: headers(f.admin.id),
        payload: { userId: f.users[2].id },
      },
      {
        method: "DELETE",
        url: `/api/v1/projects/${f.project.id}/members/${f.users[0].id}`,
        headers: headers(f.admin.id),
      },
    ] as InjectOptions[]) {
      const denied = await app.inject(options);
      assert.equal(denied.statusCode, 409, denied.body);
      assert.equal(denied.json().error.code, "PROJECT_ARCHIVED");
    }
    for (const url of [
      `/projects/${f.project.id}/members`,
      `/projects/${f.project.id}/coa`,
      `/projects/${f.project.id}/coa/revisions`,
      `/purchase-orders/${order.id}`,
      `/audit/events?projectId=${f.project.id}`,
    ]) {
      const read = await app.inject({ url: `/api/v1${url}`, headers: headers(f.admin.id) });
      assert.equal(read.statusCode, 200, read.body);
    }
    const memberRead = await app.inject({
      url: `/api/v1/purchase-orders/${order.id}`,
      headers: headers(f.users[0].id),
    });
    assert.equal(memberRead.statusCode, 200);
    assert.equal(memberRead.json().coaVersion, 1);
    const renamed = await app.inject({
      method: "PATCH",
      url: `/api/v1/projects/${f.project.id}`,
      headers: headers(f.admin.id),
      payload: { name: "Arquivo corrigido" },
    });
    assert.equal(renamed.statusCode, 409, renamed.body);
    assert.equal(renamed.json().error.code, "PROJECT_ARCHIVED");
    assert.deepEqual(await projectState(f), frozen);
    assert.deepEqual(await snapshot(f), original);
    for (let i = 0; i < 2; i++) assert.equal((await app.inject(lifecycle(f, "reactivate"))).json().isActive, true);
    assert.deepEqual(await snapshot(f), original);
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: `/api/v1/projects/${f.project.id}/members`,
          headers: headers(f.admin.id),
          payload: { userId: f.users[2].id },
        })
      ).statusCode,
      201,
    );
    assert.equal((await app.inject(creation(f))).statusCode, 201);
  } finally {
    await f.cleanup();
  }
});

// Force actual lock contention and exercise both serial orders deterministically.
for (const first of ["create", "archive"] as const)
  test(`project lock serializes ${first} before the competing lifecycle operation`, async () => {
    const f = await fixture(),
      runner = dataSource.createQueryRunner();
    const requests: Array<Promise<Awaited<ReturnType<typeof app.inject>>>> = [];
    try {
      assert.equal((await app.inject(publication(f))).statusCode, 200);
      await runner.connect();
      await runner.startTransaction();
      const [{ pid }] = await runner.query("SELECT pg_backend_pid() AS pid");
      await runner.query("SELECT id FROM projects WHERE id=$1 FOR NO KEY UPDATE", [f.project.id]);
      const operations =
        first === "create" ? [creation(f), lifecycle(f, "archive")] : [lifecycle(f, "archive"), creation(f)];
      requests.push(Promise.resolve(app.inject(operations[0])));
      await waitForBlockedConnection(pid);
      requests.push(Promise.resolve(app.inject(operations[1])));
      await waitForBlockedConnection(pid, 2);
      await runner.commitTransaction();
      const [winner, loser] = await Promise.all(requests);
      assert.equal(winner.statusCode, first === "create" ? 201 : 200, winner.body);
      assert.equal(loser.statusCode, 409, loser.body);
      assert.equal(loser.json().error.code, first === "create" ? "PROJECT_HAS_PENDING_ORDERS" : "PROJECT_ARCHIVED");
      const invalid = await dataSource.query(
        "SELECT 1 FROM purchase_orders po JOIN projects p ON p.id=po.project_id WHERE p.id=$1 AND NOT p.is_active AND po.status='PENDING'",
        [f.project.id],
      );
      assert.deepEqual(invalid, []);
    } finally {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      await runner.release();
      await Promise.allSettled(requests);
      await f.cleanup();
    }
  });

for (const mutation of ["add", "remove", "coa", "rename"] as const)
  test(`configuration ${mutation} rechecks activity after waiting for archive`, async () => {
    const f = await fixture(),
      runner = dataSource.createQueryRunner();
    const requests: Array<Promise<Awaited<ReturnType<typeof app.inject>>>> = [];
    try {
      await runner.connect();
      await runner.startTransaction();
      const [{ pid }] = await runner.query("SELECT pg_backend_pid() AS pid");
      await runner.query("SELECT id FROM projects WHERE id=$1 FOR NO KEY UPDATE", [f.project.id]);
      requests.push(Promise.resolve(app.inject(lifecycle(f, "archive"))));
      await waitForBlockedConnection(pid);
      const options: InjectOptions =
        mutation === "coa"
          ? publication(f)
          : mutation === "rename"
            ? {
                method: "PATCH",
                url: `/api/v1/projects/${f.project.id}`,
                headers: headers(f.admin.id),
                payload: { name: "Renomeada durante o arquivamento" },
              }
            : mutation === "add"
              ? {
                  method: "POST",
                  url: `/api/v1/projects/${f.project.id}/members`,
                  headers: headers(f.admin.id),
                  payload: { userId: f.users[2].id },
                }
              : {
                  method: "DELETE",
                  url: `/api/v1/projects/${f.project.id}/members/${f.users[0].id}`,
                  headers: headers(f.admin.id),
                };
      requests.push(Promise.resolve(app.inject(options)));
      await waitForBlockedConnection(pid, 2);
      await runner.commitTransaction();
      const [archived, denied] = await Promise.all(requests);
      assert.equal(archived.statusCode, 200, archived.body);
      assert.equal(denied.statusCode, 409, denied.body);
      assert.equal(denied.json().error.code, "PROJECT_ARCHIVED");
      assert.deepEqual(
        (await app.inject({ url: `/api/v1/projects/${f.project.id}/members`, headers: headers(f.admin.id) }))
          .json()
          .data.map((member: { userId: string }) => member.userId)
          .sort(),
        f.users
          .slice(0, 2)
          .map((user) => user.id)
          .sort(),
      );
      assert.equal(
        (
          await app.inject({ url: `/api/v1/projects/${f.project.id}/coa/revisions`, headers: headers(f.admin.id) })
        ).json().data.length,
        0,
      );
      assert.equal((await projectState(f)).project.name, f.project.name);
    } finally {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      await runner.release();
      await Promise.allSettled(requests);
      await f.cleanup();
    }
  });
