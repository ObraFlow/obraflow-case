import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import type { FastifyInstance, InjectOptions } from "fastify";
import type { AuditPage } from "@dokimos/shared";
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
const headers = (id: string) => ({ authorization: `Bearer ${app.jwt.sign({ sub: id })}` });
async function events(actorId: string, query: Record<string, string> = {}) {
  const response = await app.inject({
    url: `/api/v1/audit/events?${new URLSearchParams({ pageSize: "100", ...query })}`,
    headers: headers(actorId),
  });
  assert.equal(response.statusCode, 200, response.body);
  return response.json<AuditPage>();
}

test("project creation, member removal/readdition and lifecycle keep actor and immutable operation snapshots without no-op events", async () => {
  const f = await fixture();
  let id: string | undefined;
  try {
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/projects",
      headers: headers(f.admin.id),
      payload: { name: "Nome original auditado" },
    });
    assert.equal(created.statusCode, 201, created.body);
    id = created.json().id;
    const base = `/api/v1/projects/${id}`;
    const mutate = (method: InjectOptions["method"], suffix: string, payload?: object) =>
      app.inject({ method, url: base + suffix, headers: headers(f.admin.id), payload });
    assert.equal((await mutate("POST", "/members", { userId: f.users[2].id })).statusCode, 201);
    assert.equal((await mutate("POST", "/members", { userId: f.users[2].id })).statusCode, 409);
    for (let i = 0; i < 2; i++) assert.equal((await mutate("DELETE", `/members/${f.users[2].id}`)).statusCode, 204);
    assert.equal((await mutate("POST", "/members", { userId: f.users[2].id })).statusCode, 201);
    for (let i = 0; i < 2; i++)
      assert.equal((await mutate("PATCH", "", { name: "Nome corrigido auditado" })).statusCode, 200);
    for (let i = 0; i < 2; i++) assert.equal((await mutate("POST", "/archive")).statusCode, 200);
    assert.equal((await mutate("POST", "/members", { userId: f.users[0].id })).statusCode, 409);
    for (let i = 0; i < 2; i++) assert.equal((await mutate("POST", "/reactivate")).statusCode, 200);
    const history = await events(f.admin.id, { projectId: id! });
    assert.equal(history.pagination.total, 7);
    assert.equal(history.data.filter((e) => e.type === "PROJECT_MEMBER_ADDED").length, 2);
    for (const type of [
      "PROJECT_CREATED",
      "PROJECT_MEMBER_REMOVED",
      "PROJECT_RENAMED",
      "PROJECT_ARCHIVED",
      "PROJECT_REACTIVATED",
    ])
      assert.equal(history.data.filter((e) => e.type === type).length, 1);
    assert.ok(
      history.data.every(
        (e) =>
          e.actor.id === f.admin.id && e.actor.kind === "USER" && e.resource.kind === "PROJECT" && e.resource.id === id,
      ),
    );
    const rename = history.data.find((e) => e.type === "PROJECT_RENAMED")!;
    assert.ok("projectName" in rename.details);
    assert.equal(rename.details.previousName, "Nome original auditado");
    assert.equal(rename.details.projectName, "Nome corrigido auditado");
    const creation = history.data.find((e) => e.type === "PROJECT_CREATED")!;
    assert.equal(creation.resource.name, "Nome original auditado");
    const removal = history.data.find((e) => e.type === "PROJECT_MEMBER_REMOVED")!;
    assert.ok("member" in removal.details);
    assert.deepEqual(removal.details.member, {
      userId: f.users[2].id,
      username: f.users[2].username,
      displayName: f.users[2].displayName,
    });
    assert.equal(
      (await app.inject({ method: "DELETE", url: `/api/v1/users/${f.users[2].id}`, headers: headers(f.admin.id) }))
        .statusCode,
      204,
    );
    assert.deepEqual((await events(f.admin.id, { projectId: id! })).data, history.data);
    const pages = [];
    for (let page = 1; page <= 4; page++)
      pages.push(...(await events(f.admin.id, { projectId: id!, pageSize: "2", page: String(page) })).data);
    assert.deepEqual(pages, history.data);
    assert.equal(
      (await app.inject({ url: `/api/v1/audit/events?projectId=${id}`, headers: headers(f.users[0].id) })).statusCode,
      403,
    );
    assert.equal(
      (await events(f.admin.id, { projectId: f.project.id, eventType: "PROJECT_CREATED" })).pagination.total,
      0,
      "No invented creator for a preexisting/unaudited record",
    );
  } finally {
    if (id) {
      await dataSource.query("DELETE FROM project_lifecycle_events WHERE project_id=$1", [id]);
      await dataSource.query("DELETE FROM project_members WHERE project_id=$1", [id]);
      await dataSource.query("DELETE FROM projects WHERE id=$1", [id]);
    }
    await f.cleanup();
  }
});

test("supplier metadata projects creation and one deactivation; absent legacy attribution is explicitly unknown", async () => {
  const f = await fixture();
  let id: string | undefined;
  try {
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/suppliers",
      headers: headers(f.admin.id),
      payload: { name: "Fornecedor auditado" },
    });
    assert.equal(created.statusCode, 201);
    id = created.json().id;
    for (let i = 0; i < 2; i++)
      assert.equal(
        (await app.inject({ method: "DELETE", url: `/api/v1/suppliers/${id}`, headers: headers(f.admin.id) }))
          .statusCode,
        204,
      );
    const history = (await events(f.admin.id)).data.filter((e) => e.resource.id === id);
    assert.deepEqual(
      history.map((e) => e.type),
      ["SUPPLIER_DISABLED", "SUPPLIER_CREATED"],
    );
    assert.ok(history.every((e) => e.actor.id === f.admin.id && e.project === null && e.resource.kind === "SUPPLIER"));
    assert.equal(
      (await events(f.admin.id, { projectId: f.project.id, eventType: "SUPPLIER_CREATED" })).pagination.total,
      0,
    );
    await dataSource.query("UPDATE suppliers SET created_by=NULL WHERE id=$1", [f.supplier.id]);
    const legacy = (await events(f.admin.id, { eventType: "SUPPLIER_CREATED" })).data.find(
      (e) => e.resource.id === f.supplier.id,
    )!;
    assert.deepEqual(legacy.actor, { kind: "UNKNOWN", id: null, displayName: "Não registrado" });
    assert.ok(!JSON.stringify(history).match(/password|passwordHash|password_hash/));
  } finally {
    if (id) await dataSource.query("DELETE FROM suppliers WHERE id=$1", [id]);
    await f.cleanup();
  }
});

test("a PostgreSQL audit failure rolls back every project administration mutation", async (t) => {
  const f = await fixture();
  const factory = dataSource.createQueryRunner.bind(dataSource);
  let attempts = 0;
  const interception = t.mock.method(dataSource, "createQueryRunner", (...args: Parameters<typeof factory>) => {
    const runner = factory(...args),
      query = runner.query.bind(runner);
    t.mock.method(runner, "query", async (...args: Parameters<typeof query>) => {
      if (/INSERT INTO "project_lifecycle_events"/.test(args[0])) {
        attempts++;
        return query("SELECT 1 / 0");
      }
      return query(...args);
    });
    return runner;
  });
  try {
    const base = `/api/v1/projects/${f.project.id}`;
    const commands: InjectOptions[] = [
      { method: "POST", url: "/api/v1/projects", payload: { name: `rollback-${f.project.id}` } },
      { method: "PATCH", url: base, payload: { name: "Must roll back" } },
      { method: "POST", url: base + "/archive" },
      { method: "POST", url: base + "/members", payload: { userId: f.users[2].id } },
      { method: "DELETE", url: base + `/members/${f.users[0].id}` },
    ];
    for (const command of commands) {
      const response = await app.inject({ ...command, headers: headers(f.admin.id) });
      assert.equal(response.statusCode, 500, response.body);
    }
    await dataSource.query("UPDATE projects SET is_active=false WHERE id=$1", [f.project.id]);
    assert.equal(
      (await app.inject({ method: "POST", url: base + "/reactivate", headers: headers(f.admin.id) })).statusCode,
      500,
    );
    assert.equal(attempts, 6);
    const project = (await dataSource.query("SELECT name,is_active FROM projects WHERE id=$1", [f.project.id]))[0];
    assert.deepEqual(project, { name: f.project.name, is_active: false });
    assert.equal(
      (await dataSource.query("SELECT count(*)::int AS n FROM projects WHERE name=$1", [`rollback-${f.project.id}`]))[0]
        .n,
      0,
    );
    assert.deepEqual(
      (
        await dataSource.query("SELECT user_id FROM project_members WHERE project_id=$1 ORDER BY user_id", [
          f.project.id,
        ])
      ).map((r: { user_id: string }) => r.user_id),
      f.users
        .slice(0, 2)
        .map((u) => u.id)
        .sort(),
    );
    assert.equal((await events(f.admin.id, { projectId: f.project.id })).pagination.total, 0);
  } finally {
    interception.mock.restore();
    await f.cleanup();
  }
});

for (const action of ["archive", "add", "remove"] as const)
  test(`competing ${action} requests append one event for one actual change`, async () => {
    const f = await fixture(),
      runner = dataSource.createQueryRunner();
    const requests: Array<Promise<Awaited<ReturnType<typeof app.inject>>>> = [];
    try {
      await runner.connect();
      await runner.startTransaction();
      const [{ pid }] = await runner.query("SELECT pg_backend_pid() AS pid");
      await runner.query("SELECT id FROM projects WHERE id=$1 FOR NO KEY UPDATE", [f.project.id]);
      const command: InjectOptions =
        action === "archive"
          ? { method: "POST", url: `/api/v1/projects/${f.project.id}/archive` }
          : action === "add"
            ? { method: "POST", url: `/api/v1/projects/${f.project.id}/members`, payload: { userId: f.users[2].id } }
            : { method: "DELETE", url: `/api/v1/projects/${f.project.id}/members/${f.users[0].id}` };
      for (let i = 0; i < 2; i++)
        requests.push(Promise.resolve(app.inject({ ...command, headers: headers(f.admin.id) })));
      await waitForBlockedConnection(pid, 2);
      await runner.commitTransaction();
      const responses = await Promise.all(requests);
      assert.deepEqual(
        responses.map((r) => r.statusCode).sort(),
        action === "archive" ? [200, 200] : action === "add" ? [201, 409] : [204, 204],
      );
      const history = await events(f.admin.id, { projectId: f.project.id });
      assert.equal(history.pagination.total, 1);
      assert.equal(
        history.data[0].type,
        action === "archive"
          ? "PROJECT_ARCHIVED"
          : action === "add"
            ? "PROJECT_MEMBER_ADDED"
            : "PROJECT_MEMBER_REMOVED",
      );
    } finally {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      await runner.release();
      await Promise.allSettled(requests);
      await f.cleanup();
    }
  });
