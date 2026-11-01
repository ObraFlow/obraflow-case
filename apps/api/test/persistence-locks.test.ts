import { after, before, test } from "node:test";
import assert from "node:assert/strict";
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
const publish = (f: Fixture, approver = f.users[1].id): InjectOptions => ({
  method: "PUT",
  url: `/api/v1/projects/${f.project.id}/coa`,
  headers: headers(f.admin.id),
  payload: { expectedCoaVersion: 0, bands: [{ upperLimit: null, approverId: approver }] },
});
const create = (f: Fixture): InjectOptions => ({
  method: "POST",
  url: "/api/v1/purchase-orders",
  headers: headers(f.users[0].id),
  payload: {
    projectId: f.project.id,
    supplierId: f.supplier.id,
    orderDate: "2026-10-29",
    items: [{ description: "Material", quantity: "0.5", unit: "un", unitPrice: "0.01" }],
  },
});
const deactivate = (f: Fixture, kind: "users" | "suppliers", id: string): InjectOptions => ({
  method: "DELETE",
  url: `/api/v1/${kind}/${id}`,
  headers: headers(f.admin.id),
});

// Hold a real row lock until BOTH HTTP workflows are observed waiting in
// pg_stat_activity. Promise.all alone does not prove overlapping transactions.
async function race(
  table: "projects" | "users" | "suppliers" | "purchase_orders",
  id: string,
  requests: InjectOptions[],
) {
  const runner = dataSource.createQueryRunner();
  const pending: Array<Promise<Awaited<ReturnType<typeof app.inject>>>> = [];
  try {
    await runner.connect();
    await runner.startTransaction();
    const [{ pid }] = (await runner.query("SELECT pg_backend_pid() AS pid")) as Array<{ pid: number }>;
    await runner.query(
      `SELECT id FROM ${table} WHERE id=$1 FOR ${table === "purchase_orders" ? "UPDATE" : "NO KEY UPDATE"}`,
      [id],
    );
    pending.push(...requests.map((request) => Promise.resolve(app.inject(request))));
    await waitForBlockedConnection(pid, requests.length);
    await runner.commitTransaction();
    return await Promise.all(pending);
  } finally {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    await runner.release();
    await Promise.allSettled(pending);
  }
}
async function configure(f: Fixture) {
  const response = await app.inject(publish(f));
  assert.equal(response.statusCode, 200, response.body);
}
async function orderCount(f: Fixture) {
  const [{ count }] = await dataSource.query("SELECT count(*)::int AS count FROM purchase_orders WHERE project_id=$1", [
    f.project.id,
  ]);
  return count as number;
}

test("held PO lock blocks competing decisions before exactly one terminal write", async () => {
  const f = await fixture();
  try {
    await configure(f);
    const created = await app.inject(create(f));
    assert.equal(created.statusCode, 201, created.body);
    const id: string = created.json().id;
    const decision: InjectOptions = {
      method: "POST",
      url: `/api/v1/purchase-orders/${id}/decisions`,
      headers: headers(f.users[1].id),
      payload: { expectedStepIndex: 0, decision: "APPROVED" },
    };
    const results = await race("purchase_orders", id, [decision, decision]);
    assert.deepEqual(results.map((r) => r.statusCode).sort(), [200, 409]);
    assert.equal(results.find((r) => r.statusCode === 409)!.json().error.code, "ORDER_ALREADY_DECIDED");
    const detail = (await app.inject({ url: `/api/v1/purchase-orders/${id}`, headers: headers(f.admin.id) })).json();
    assert.equal(detail.status, "APPROVED");
    assert.equal(detail.steps.filter((s: { decision: unknown }) => s.decision).length, 1);
  } finally {
    await f.cleanup();
  }
});

test("held project lock blocks concurrent CoA publications with one revision", async () => {
  const f = await fixture();
  try {
    const results = await race("projects", f.project.id, [publish(f), publish(f, f.users[0].id)]);
    assert.deepEqual(results.map((r) => r.statusCode).sort(), [200, 409]);
    assert.equal(results.find((r) => r.statusCode === 409)!.json().error.code, "COA_VERSION_CONFLICT");
    const revisions = (
      await app.inject({ url: `/api/v1/projects/${f.project.id}/coa/revisions`, headers: headers(f.admin.id) })
    ).json().data;
    assert.equal(revisions.length, 1);
    assert.deepEqual(revisions[0].bands, results.find((r) => r.statusCode === 200)!.json().bands);
  } finally {
    await f.cleanup();
  }
});

test("held user lock coordinates CoA publication and deactivation", async () => {
  const f = await fixture();
  try {
    const [publication, deactivation] = await race("users", f.users[1].id, [
      publish(f),
      deactivate(f, "users", f.users[1].id),
    ]);
    assert.ok(
      (publication.statusCode === 200 && deactivation.statusCode === 409) ||
        (publication.statusCode === 400 && deactivation.statusCode === 204),
      `${publication.body} / ${deactivation.body}`,
    );
    const invalid = await dataSource.query(
      "SELECT 1 FROM coa_bands b JOIN users u ON u.id=b.approver_id WHERE b.project_id=$1 AND NOT u.is_active",
      [f.project.id],
    );
    assert.deepEqual(invalid, []);
  } finally {
    await f.cleanup();
  }
});

test("held supplier lock coordinates creation and supplier deactivation", async () => {
  const f = await fixture();
  try {
    await configure(f);
    const [creation, deactivation] = await race("suppliers", f.supplier.id, [
      create(f),
      deactivate(f, "suppliers", f.supplier.id),
    ]);
    assert.equal(deactivation.statusCode, 204, deactivation.body);
    assert.ok([201, 409].includes(creation.statusCode), creation.body);
    if (creation.statusCode === 409) assert.equal(creation.json().error.code, "SUPPLIER_INACTIVE");
    assert.equal(await orderCount(f), creation.statusCode === 201 ? 1 : 0);
  } finally {
    await f.cleanup();
  }
});

test("held creator lock coordinates creation and user deactivation without partial orders", async () => {
  const f = await fixture();
  try {
    await configure(f); // Creator is a member, but is not a CoA assignee.
    const [creation, deactivation] = await race("users", f.users[0].id, [
      create(f),
      deactivate(f, "users", f.users[0].id),
    ]);
    assert.equal(deactivation.statusCode, 204, deactivation.body);
    assert.ok([201, 401].includes(creation.statusCode), creation.body);
    assert.equal(await orderCount(f), creation.statusCode === 201 ? 1 : 0);
  } finally {
    await f.cleanup();
  }
});

test("held project lock coordinates membership removal and CoA publication", async () => {
  const f = await fixture();
  try {
    const removal: InjectOptions = {
      method: "DELETE",
      url: `/api/v1/projects/${f.project.id}/members/${f.users[1].id}`,
      headers: headers(f.admin.id),
    };
    const [publication, removed] = await race("projects", f.project.id, [publish(f), removal]);
    assert.ok(
      (publication.statusCode === 200 && removed.statusCode === 409) ||
        (publication.statusCode === 400 && removed.statusCode === 204),
      `${publication.body} / ${removed.body}`,
    );
    const invalid = await dataSource.query(
      "SELECT 1 FROM coa_bands b LEFT JOIN project_members m ON m.project_id=b.project_id AND m.user_id=b.approver_id WHERE b.project_id=$1 AND m.user_id IS NULL",
      [f.project.id],
    );
    assert.deepEqual(invalid, []);
  } finally {
    await f.cleanup();
  }
});

test("generated workflow SQL preserves lock modes, targets, order and four repeatable reads", async (t) => {
  const f = await fixture();
  const queries: string[] = [];
  const logger = t.mock.method(dataSource.logger, "logQuery", (query: string) => queries.push(query));
  const locks = () => queries.filter((q) => /FOR (?:NO KEY )?UPDATE/.test(q));
  const oneTransaction = () => {
    assert.equal(queries.filter((q) => q === "START TRANSACTION").length, 1);
    assert.equal(queries.filter((q) => q === "COMMIT").length, 1);
    assert.ok(!queries.some((q) => /SAVEPOINT|SET TRANSACTION ISOLATION/.test(q)));
  };
  try {
    await configure(f);
    assert.equal(locks().length, 2);
    assert.match(locks()[0], /FROM "projects".*FOR NO KEY UPDATE$/);
    assert.match(locks()[1], /FROM "users".*ORDER BY "u_id" ASC FOR NO KEY UPDATE$/);
    oneTransaction();
    queries.length = 0;
    const created = await app.inject(create(f));
    assert.equal(created.statusCode, 201, created.body);
    assert.equal(locks().length, 3);
    assert.match(locks()[0], /FROM "projects".*FOR NO KEY UPDATE$/);
    assert.match(locks()[1], /FROM "users".*ORDER BY "u_id" ASC FOR NO KEY UPDATE$/);
    assert.match(locks()[2], /FROM "suppliers".*FOR NO KEY UPDATE$/);
    oneTransaction();
    queries.length = 0;
    const result = await app.inject({
      method: "POST",
      url: `/api/v1/purchase-orders/${created.json().id}/decisions`,
      headers: headers(f.users[1].id),
      payload: { expectedStepIndex: 0, decision: "APPROVED" },
    });
    assert.equal(result.statusCode, 200, result.body);
    assert.equal(locks().length, 2);
    assert.match(locks()[0], /FROM "purchase_orders".*FOR UPDATE$/);
    assert.match(locks()[1], /FROM "users".*FOR NO KEY UPDATE$/);
    assert.ok(
      locks().every((q) => !/JOIN/.test(q)),
      "Lock only root rows, without joined lock targets",
    );
    oneTransaction();
    for (const url of [
      `/api/v1/projects/${f.project.id}/coa`,
      `/api/v1/projects/${f.project.id}/members`,
      "/api/v1/purchase-orders",
      "/api/v1/audit/events",
    ]) {
      queries.length = 0;
      const read = await app.inject({ url, headers: headers(f.admin.id) });
      assert.equal(read.statusCode, 200, read.body);
      assert.equal(queries.filter((q) => q === "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ").length, 1, url);
      assert.equal(queries.filter((q) => q === "COMMIT").length, 1, url);
    }
  } finally {
    logger.mock.restore();
    await f.cleanup();
  }
});
