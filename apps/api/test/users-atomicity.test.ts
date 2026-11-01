import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import type { FastifyInstance } from "fastify";
import { dataSource } from "../src/db/data-source.js";
import { UserEntity, UserLifecycleEventEntity } from "../src/modules/users/entities.js";
import { setup } from "./helpers.js";

let app: FastifyInstance;
before(async () => {
  app = await setup();
});
after(async () => {
  await app?.close();
  if (dataSource.isInitialized) await dataSource.destroy();
});
async function create(username: string) {
  const admin = await dataSource.getRepository(UserEntity).findOneByOrFail({ username: "admin" });
  return app.inject({
    method: "POST",
    url: "/api/v1/users",
    headers: { authorization: `Bearer ${app.jwt.sign({ sub: admin.id })}` },
    payload: { username, displayName: "Hash transaction test", password: "test-user-atomicity" },
  });
}

test("real Argon2 hashing finishes before user creation starts its transaction", async (t) => {
  const queries: string[] = [],
    username = `hash-${randomUUID()}`;
  const logger = t.mock.method(dataSource.logger, "logQuery", (query: string) => queries.push(query));
  const hash = argon2.hash;
  const hashing = t.mock.method(argon2, "hash", async (...args: Parameters<typeof hash>) => {
    assert.ok(!queries.includes("START TRANSACTION"));
    const result = await hash(...args);
    assert.ok(!queries.includes("START TRANSACTION"));
    return result;
  });
  try {
    const result = await create(username.toUpperCase());
    assert.equal(result.statusCode, 201, result.body);
    assert.equal(hashing.mock.callCount(), 1);
    assert.equal(queries.filter((query) => query === "START TRANSACTION").length, 1);
    const user = await dataSource.getRepository(UserEntity).findOneByOrFail({ username });
    assert.equal(await argon2.verify(user.passwordHash, "test-user-atomicity"), true);
    assert.equal(
      await dataSource.getRepository(UserLifecycleEventEntity).countBy({ targetUserId: user.id, action: "CREATED" }),
      1,
    );
  } finally {
    hashing.mock.restore();
    logger.mock.restore();
    const user = await dataSource.getRepository(UserEntity).findOneBy({ username });
    if (user) {
      await dataSource.getRepository(UserLifecycleEventEntity).delete({ targetUserId: user.id });
      await dataSource.getRepository(UserEntity).delete({ id: user.id });
    }
  }
});

test("a real database failure on lifecycle insertion rolls back the already-inserted user", async (t) => {
  const username = `rollback-${randomUUID()}`;
  const factory = dataSource.createQueryRunner.bind(dataSource);
  let attempted = false,
    targetId: string | undefined;
  const interception = t.mock.method(dataSource, "createQueryRunner", (...args: Parameters<typeof factory>) => {
    const runner = factory(...args),
      query = runner.query.bind(runner);
    t.mock.method(runner, "query", async (...args: Parameters<typeof query>) => {
      if (/INSERT INTO "user_lifecycle_events"/.test(args[0])) {
        attempted = true;
        targetId = args[1]?.[0] as string;
        // Exercise a PostgreSQL transaction error, without DDL or a production fault hook.
        return query("SELECT 1 / 0");
      }
      return query(...args);
    });
    return runner;
  });
  try {
    const response = await create(username);
    assert.equal(response.statusCode, 500, response.body);
    assert.ok(attempted);
    assert.equal(await dataSource.getRepository(UserEntity).countBy({ username }), 0);
    assert.ok(targetId);
    assert.equal(await dataSource.getRepository(UserLifecycleEventEntity).countBy({ targetUserId: targetId }), 0);
  } finally {
    interception.mock.restore();
  }
});
