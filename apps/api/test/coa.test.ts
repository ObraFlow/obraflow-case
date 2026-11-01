import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
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

test("CoA reads enforce project visibility and admin-only writes/history", async () => {
  const f = await fixture();
  try {
    const url = `/api/v1/projects/${f.project.id}/coa`;
    assert.equal((await app.inject({ url })).statusCode, 401);
    assert.equal((await app.inject({ url, headers: headers(f.users[2].id) })).statusCode, 404);
    assert.equal(
      (await app.inject({ url: `/api/v1/projects/${randomUUID()}/coa`, headers: headers(f.admin.id) })).statusCode,
      404,
    );
    const read = await app.inject({ url, headers: headers(f.users[0].id) });
    assert.deepEqual(read.json(), { projectId: f.project.id, coaVersion: 0, bands: [] });
    assert.equal((await app.inject({ url: `${url}/revisions`, headers: headers(f.users[0].id) })).statusCode, 403);
    assert.equal(
      (await app.inject({ method: "PUT", url, headers: headers(f.users[0].id), payload: {} })).statusCode,
      403,
    );
  } finally {
    await f.cleanup();
  }
});

test("CoA full replacement normalizes no-ops, checks version first and preserves revisions", async () => {
  const f = await fixture();
  try {
    const url = `/api/v1/projects/${f.project.id}/coa`;
    const bands = [
      { upperLimit: "10000", approverId: f.users[0].id },
      { upperLimit: null, approverId: f.users[1].id },
    ];
    const put = (version: number, value = bands) =>
      app.inject({
        method: "PUT",
        url,
        headers: headers(f.admin.id),
        payload: { expectedCoaVersion: version, bands: value },
      });
    const created = await put(0);
    assert.equal(created.statusCode, 200, created.body);
    assert.equal(created.json().coaVersion, 1);
    assert.equal(created.json().bands[0].upperLimit, "10000.00");
    const originalIds = await dataSource.query("SELECT id FROM coa_bands WHERE project_id=$1 ORDER BY position", [
      f.project.id,
    ]);
    const noop = await put(1, [{ ...bands[0], upperLimit: "010000.0" }, bands[1]]);
    assert.equal(noop.statusCode, 200, noop.body);
    assert.equal(noop.json().coaVersion, 1);
    assert.deepEqual(
      await dataSource.query("SELECT id FROM coa_bands WHERE project_id=$1 ORDER BY position", [f.project.id]),
      originalIds,
    );
    assert.equal((await put(0)).json().error.code, "COA_VERSION_CONFLICT");
    assert.equal((await put(1, [{ ...bands[0], upperLimit: "20000.00" }, bands[1]])).json().coaVersion, 2);
    const revisions = (await app.inject({ url: `${url}/revisions`, headers: headers(f.admin.id) })).json().data;
    assert.deepEqual(
      revisions.map((r: { version: number }) => r.version),
      [2, 1],
    );
    assert.deepEqual(revisions[1].bands, created.json().bands);
    assert.equal(revisions[1].changedById, f.admin.id);
    assert.ok(Number.isFinite(Date.parse(revisions[1].changedAt)));
    const blocked = await app.inject({
      method: "DELETE",
      url: `/api/v1/users/${f.users[0].id}`,
      headers: headers(f.admin.id),
    });
    assert.equal(blocked.json().error.code, "USER_ASSIGNED_TO_ACTIVE_COA");
  } finally {
    await f.cleanup();
  }
});

test("invalid complete ladders roll back without a revision or partial bands", async () => {
  const f = await fixture();
  try {
    const a = f.users[0].id,
      b = f.users[1].id;
    const invalid: unknown[] = [
      [],
      [{ upperLimit: "10", approverId: a }],
      [
        { upperLimit: null, approverId: a },
        { upperLimit: null, approverId: b },
      ],
      [
        { upperLimit: "10", approverId: a },
        { upperLimit: null, approverId: a },
      ],
      [
        { upperLimit: "10", approverId: a },
        { upperLimit: "10.00", approverId: b },
        { upperLimit: null, approverId: f.users[2].id },
      ],
      [
        { upperLimit: "20", approverId: a },
        { upperLimit: "10", approverId: b },
        { upperLimit: null, approverId: f.users[2].id },
      ],
      ...["-1", "1.001", "1e2", "NaN", "10000000000000000", 10].map((upperLimit) => [
        { upperLimit, approverId: a },
        { upperLimit: null, approverId: b },
      ]),
      [{ upperLimit: null, approverId: f.users[2].id }],
      [{ upperLimit: null, approverId: randomUUID() }],
    ];
    for (const bands of invalid) {
      const result = await app.inject({
        method: "PUT",
        url: `/api/v1/projects/${f.project.id}/coa`,
        headers: headers(f.admin.id),
        payload: { expectedCoaVersion: 0, bands },
      });
      assert.equal(result.statusCode, 400, result.body);
      assert.ok(result.json().error.details.length > 0);
    }
    const read = await app.inject({ url: `/api/v1/projects/${f.project.id}/coa`, headers: headers(f.admin.id) });
    assert.deepEqual(read.json(), { projectId: f.project.id, coaVersion: 0, bands: [] });
    assert.deepEqual(await dataSource.query("SELECT * FROM coa_revisions WHERE project_id=$1", [f.project.id]), []);
    await app.inject({ method: "DELETE", url: `/api/v1/users/${a}`, headers: headers(f.admin.id) });
    const inactive = await app.inject({
      method: "PUT",
      url: `/api/v1/projects/${f.project.id}/coa`,
      headers: headers(f.admin.id),
      payload: { expectedCoaVersion: 0, bands: [{ upperLimit: null, approverId: a }] },
    });
    assert.equal(inactive.statusCode, 400);
  } finally {
    await f.cleanup();
  }
});

test("concurrent publications serialize: exactly one version/revision wins", async () => {
  const f = await fixture();
  try {
    const responses = await Promise.all(
      f.users.slice(0, 2).map((user) =>
        app.inject({
          method: "PUT",
          url: `/api/v1/projects/${f.project.id}/coa`,
          headers: headers(f.admin.id),
          payload: { expectedCoaVersion: 0, bands: [{ upperLimit: null, approverId: user.id }] },
        }),
      ),
    );
    assert.deepEqual(responses.map((r) => r.statusCode).sort(), [200, 409]);
    const revisions = await dataSource.query("SELECT bands FROM coa_revisions WHERE project_id=$1", [f.project.id]);
    assert.equal(revisions.length, 1);
    const read = (
      await app.inject({ url: `/api/v1/projects/${f.project.id}/coa`, headers: headers(f.admin.id) })
    ).json();
    assert.equal(read.coaVersion, 1);
    assert.deepEqual(read.bands, revisions[0].bands);
  } finally {
    await f.cleanup();
  }
});

test("publication racing deactivation cannot leave an inactive active-CoA approver", async () => {
  const f = await fixture();
  try {
    const [publication, deactivation] = await Promise.all([
      app.inject({
        method: "PUT",
        url: `/api/v1/projects/${f.project.id}/coa`,
        headers: headers(f.admin.id),
        payload: { expectedCoaVersion: 0, bands: [{ upperLimit: null, approverId: f.users[0].id }] },
      }),
      app.inject({ method: "DELETE", url: `/api/v1/users/${f.users[0].id}`, headers: headers(f.admin.id) }),
    ]);
    assert.ok(
      (publication.statusCode === 200 && deactivation.statusCode === 409) ||
        (publication.statusCode === 400 && deactivation.statusCode === 204),
      `${publication.body} / ${deactivation.body}`,
    );
    const invalid = await dataSource.query(
      "SELECT b.id FROM coa_bands b JOIN users u ON u.id=b.approver_id WHERE b.project_id=$1 AND NOT u.is_active",
      [f.project.id],
    );
    assert.deepEqual(invalid, []);
  } finally {
    await f.cleanup();
  }
});

test("project publication lock allows membership FK checks while waiting on a user", async () => {
  const f = await fixture();
  const runner = dataSource.createQueryRunner();
  let publication: Promise<{ statusCode: number; body: string }> | undefined;
  try {
    await runner.connect();
    await runner.startTransaction();
    await runner.query("SET LOCAL statement_timeout = '5s'");
    const [{ pid }] = await runner.query("SELECT pg_backend_pid() AS pid");
    // Model membership's user-eligibility lock, then let publication take project.
    await runner.query("SELECT id FROM users WHERE id=$1 FOR NO KEY UPDATE", [f.users[2].id]);
    publication = app.inject({
      method: "PUT",
      url: `/api/v1/projects/${f.project.id}/coa`,
      headers: headers(f.admin.id),
      payload: { expectedCoaVersion: 0, bands: [{ upperLimit: null, approverId: f.users[2].id }] },
    });
    // inject's thenable is lazy: start it before observing the database wait.
    const pending = Promise.resolve(publication);
    await waitForBlockedConnection(pid);
    await runner.query("INSERT INTO project_members (project_id,user_id) VALUES ($1,$2)", [
      f.project.id,
      f.users[2].id,
    ]);
    await runner.commitTransaction();
    const result = await pending;
    assert.equal(result.statusCode, 200, result.body);
  } finally {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    await runner.release();
    if (publication) await publication;
    await f.cleanup();
  }
});
