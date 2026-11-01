import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";
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

for (const resource of ["coa", "members"] as const)
  test(`${resource} visibility and data share a snapshot across committed membership removal`, async (t) => {
    const f = await fixture();
    let release!: () => void, reached!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const ready = new Promise<void>((resolve) => {
      reached = resolve;
    });
    const factory = dataSource.createQueryRunner.bind(dataSource);
    let paused = false;
    const snapshotQueries: string[] = [];
    const interception = t.mock.method(dataSource, "createQueryRunner", (...args: Parameters<typeof factory>) => {
      const runner = factory(...args),
        query = runner.query.bind(runner);
      let repeatable = false,
        selected = false;
      t.mock.method(runner, "query", async (...args: Parameters<typeof query>) => {
        const result = await query(...args);
        if (args[0] === "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ") repeatable = true;
        if (!paused && repeatable && /FROM "projects"/.test(args[0]) && args[1]?.includes(f.project.id)) {
          paused = true;
          selected = true;
          snapshotQueries.push(args[0]);
          // PostgreSQL has established this transaction's snapshot. No locks or timing race.
          reached();
          await gate;
        } else if (selected) snapshotQueries.push(args[0]);
        return result;
      });
      return runner;
    });
    let read: Promise<Awaited<ReturnType<typeof app.inject>>> | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const url = `/api/v1/projects/${f.project.id}/${resource}`;
      read = Promise.resolve(app.inject({ url, headers: headers(f.users[0].id) }));
      await Promise.race([
        ready,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("Read did not establish its repeatable snapshot")), 10000);
        }),
      ]);
      const removed = await app.inject({
        method: "DELETE",
        url: `/api/v1/projects/${f.project.id}/members/${f.users[0].id}`,
        headers: headers(f.admin.id),
      });
      assert.equal(removed.statusCode, 204, removed.body);
      const publication = await app.inject({
        method: "PUT",
        url: `/api/v1/projects/${f.project.id}/coa`,
        headers: headers(f.admin.id),
        payload: {
          expectedCoaVersion: 0,
          bands: [{ upperLimit: null, approverId: f.users[1].id }],
        },
      });
      assert.equal(publication.statusCode, 200, publication.body);
      release();
      const response = await read;
      assert.equal(response.statusCode, 200, response.body);
      if (resource === "coa") assert.deepEqual(response.json(), { projectId: f.project.id, coaVersion: 0, bands: [] });
      else
        assert.deepEqual(
          response
            .json()
            .data.map((member: { userId: string }) => member.userId)
            .sort(),
          f.users
            .slice(0, 2)
            .map((user) => user.id)
            .sort(),
        );
      assert.ok(
        snapshotQueries.some((query) => /FROM "project_members"/.test(query)),
        "Visibility reads membership on the same runner",
      );
      assert.ok(snapshotQueries.includes("COMMIT"));
      assert.ok(
        snapshotQueries.every((query) => !/FOR (?:NO KEY )?UPDATE/.test(query)),
        "Simple reads take no write locks",
      );
      assert.equal((await app.inject({ url, headers: headers(f.users[0].id) })).statusCode, 404);
      assert.equal((await app.inject({ url, headers: headers(f.admin.id) })).statusCode, 200);
    } finally {
      release();
      if (timer) clearTimeout(timer);
      await read?.catch(() => undefined);
      interception.mock.restore();
      await f.cleanup();
    }
  });
