import "dotenv/config";
import { assertTestDatabase } from "./database-guard.js";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { dataSource } from "../src/db/data-source.js";

let app: FastifyInstance;
let token: string;
const owned = { users: [] as string[], projects: [] as string[], suppliers: [] as string[] };

function bearer(value: string) {
  return { authorization: `Bearer ${value}` };
}

before(async () => {
  assertTestDatabase();
  await dataSource.initialize();
  assert.equal(await dataSource.showMigrations(), false, "Run db:migrate before integration tests");
  app = await buildApp();
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { username: "admin", password: process.env.SEED_ADMIN_PASSWORD ?? "demo-admin-2026" },
  });
  assert.equal(response.statusCode, 200, response.body);
  token = (response.json() as { accessToken: string }).accessToken;
});

after(async () => {
  try {
    if (dataSource.isInitialized)
      await dataSource.transaction(async (manager) => {
        for (const id of owned.projects) {
          await manager.query("DELETE FROM project_members WHERE project_id=$1", [id]);
          await manager.query("DELETE FROM project_lifecycle_events WHERE project_id=$1", [id]);
          await manager.query("DELETE FROM projects WHERE id=$1", [id]);
        }
        for (const id of owned.suppliers) await manager.query("DELETE FROM suppliers WHERE id=$1", [id]);
        for (const id of owned.users) {
          await manager.query("DELETE FROM user_lifecycle_events WHERE target_user_id=$1", [id]);
          await manager.query("DELETE FROM users WHERE id=$1", [id]);
        }
      });
  } finally {
    if (app) await app.close();
    if (dataSource.isInitialized) await dataSource.destroy();
  }
});

for (const scenario of [
  {
    status: 413,
    contentType: "application/json",
    payload: JSON.stringify({ notes: "x".repeat(1024 * 1024) }),
    code: "PAYLOAD_TOO_LARGE",
    message: "O corpo da requisição excede o limite permitido.",
  },
  {
    status: 415,
    contentType: "application/x-private-format",
    payload: "private request content",
    code: "UNSUPPORTED_MEDIA_TYPE",
    message: "Tipo de conteúdo não suportado. Envie JSON.",
  },
  {
    status: 400,
    contentType: "application/json",
    payload: '{"notes":',
    code: "INVALID_REQUEST",
    message: "Requisição inválida.",
  },
]) {
  test(`framework rejection preserves HTTP ${scenario.status} and the sanitized error envelope`, async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/purchase-orders",
      headers: { ...bearer(token), "content-type": scenario.contentType },
      payload: scenario.payload,
    });
    assert.equal(response.statusCode, scenario.status);
    assert.deepEqual(response.json(), { error: { code: scenario.code, message: scenario.message, details: [] } });
  });
}

for (const ttl of [undefined, "7m"]) {
  test(`login reports the signed token lifetime with ${ttl ?? "default"} JWT_TTL`, async () => {
    const previous = process.env.JWT_TTL;
    let configuredApp: FastifyInstance | undefined;
    try {
      if (ttl === undefined) delete process.env.JWT_TTL;
      else process.env.JWT_TTL = ttl;
      configuredApp = await buildApp();
      const response = await configuredApp.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { username: "admin", password: process.env.SEED_ADMIN_PASSWORD ?? "demo-admin-2026" },
      });
      assert.equal(response.statusCode, 200, response.body);
      const result = response.json();
      const claims = configuredApp.jwt.verify<{ exp: number; iat: number; sub: string }>(result.accessToken);
      assert.deepEqual(Object.keys(result).sort(), ["accessToken", "expiresIn", "tokenType", "user"]);
      assert.equal(result.tokenType, "Bearer");
      assert.equal(result.expiresIn, claims.exp - claims.iat);
      assert.equal(result.expiresIn, ttl === undefined ? 1800 : 420);
      assert.deepEqual(result.user, {
        id: claims.sub,
        username: "admin",
        displayName: result.user.displayName,
        role: "ADMIN",
      });
      assert.equal(typeof result.user.displayName, "string");
      const me = await configuredApp.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: bearer(result.accessToken),
      });
      assert.equal(me.statusCode, 200);
      assert.deepEqual(me.json(), result.user);
    } finally {
      if (previous === undefined) delete process.env.JWT_TTL;
      else process.env.JWT_TTL = previous;
      await configuredApp?.close();
    }
  });
}

test("auth, authorization and resource lifecycle work end-to-end", async () => {
  const unauth = await app.inject({ method: "GET", url: "/api/v1/users" });
  assert.equal(unauth.statusCode, 401);
  assert.deepEqual((unauth.json() as { error: { details: unknown[] } }).error.details, []);

  const me = await app.inject({
    method: "GET",
    url: "/api/v1/auth/me",
    headers: bearer(token),
  });
  assert.equal(me.statusCode, 200);
  assert.equal((me.json() as { role: string }).role, "ADMIN");

  const username = `user-${randomUUID().slice(0, 12)}`;
  const created = await app.inject({
    method: "POST",
    url: "/api/v1/users",
    headers: bearer(token),
    payload: { username, displayName: "Integration Test User", password: "integration-password" },
  });
  assert.equal(created.statusCode, 201, created.body);
  const user = created.json() as { id: string; role: string; isActive: boolean; passwordHash?: string };
  owned.users.push(user.id);
  assert.equal(user.role, "USER");
  assert.equal(user.isActive, true);
  assert.equal(user.passwordHash, undefined);

  const duplicated = await app.inject({
    method: "POST",
    url: "/api/v1/users",
    headers: bearer(token),
    payload: { username: username.toUpperCase(), displayName: "Duplicate", password: "integration-password" },
  });
  assert.equal(duplicated.statusCode, 409);
  assert.equal((duplicated.json() as { error: { code: string } }).error.code, "USERNAME_ALREADY_EXISTS");

  const userLogin = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { username, password: "integration-password" },
  });
  assert.equal(userLogin.statusCode, 200);
  const userToken = (userLogin.json() as { accessToken: string }).accessToken;

  const denied = await app.inject({
    method: "POST",
    url: "/api/v1/projects",
    headers: bearer(userToken),
    payload: { name: "Forbidden project" },
  });
  assert.equal(denied.statusCode, 403);

  const projectCreate = await app.inject({
    method: "POST",
    url: "/api/v1/projects",
    headers: bearer(token),
    payload: { name: `Test ${randomUUID()}` },
  });
  assert.equal(projectCreate.statusCode, 201, projectCreate.body);
  const projectId = (projectCreate.json() as { id: string }).id;
  owned.projects.push(projectId);

  const noAccess = await app.inject({
    method: "GET",
    url: `/api/v1/projects/${projectId}/members`,
    headers: bearer(userToken),
  });
  assert.equal(noAccess.statusCode, 404);

  const membership = await app.inject({
    method: "POST",
    url: `/api/v1/projects/${projectId}/members`,
    headers: bearer(token),
    payload: { userId: user.id },
  });
  assert.equal(membership.statusCode, 201, membership.body);

  const secondMembership = await app.inject({
    method: "POST",
    url: `/api/v1/projects/${projectId}/members`,
    headers: bearer(token),
    payload: { userId: user.id },
  });
  assert.equal(secondMembership.statusCode, 409);

  const visible = await app.inject({
    method: "GET",
    url: "/api/v1/projects",
    headers: bearer(userToken),
  });
  assert.equal(visible.statusCode, 200);
  assert.ok((visible.json() as { data: Array<{ id: string }> }).data.some((p) => p.id === projectId));

  const supplierCreate = await app.inject({
    method: "POST",
    url: "/api/v1/suppliers",
    headers: bearer(token),
    payload: { name: `Supplier ${randomUUID()}` },
  });
  assert.equal(supplierCreate.statusCode, 201);
  const supplierId = (supplierCreate.json() as { id: string }).id;
  owned.suppliers.push(supplierId);
  for (let i = 0; i < 2; i++) {
    const disabled = await app.inject({
      method: "DELETE",
      url: `/api/v1/suppliers/${supplierId}`,
      headers: bearer(token),
    });
    assert.equal(disabled.statusCode, 204);
    assert.equal(disabled.body, "");
  }

  const suppliers = await app.inject({
    method: "GET",
    url: "/api/v1/suppliers",
    headers: bearer(userToken),
  });
  assert.ok(
    (suppliers.json() as { data: Array<{ id: string; isActive: boolean }> }).data.some(
      (s) => s.id === supplierId && s.isActive === false,
    ),
  );

  for (let i = 0; i < 2; i++) {
    const disabled = await app.inject({
      method: "DELETE",
      url: `/api/v1/users/${user.id}`,
      headers: bearer(token),
    });
    assert.equal(disabled.statusCode, 204, disabled.body);
  }
  const staleLogin = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { username, password: "integration-password" },
  });
  assert.equal(staleLogin.statusCode, 401);
  const staleBearer = await app.inject({
    method: "GET",
    url: "/api/v1/auth/me",
    headers: bearer(userToken),
  });
  assert.equal(staleBearer.statusCode, 401);
});

test("validation envelopes and seeded administrator protection", async () => {
  const badCreate = await app.inject({
    method: "POST",
    url: "/api/v1/users",
    headers: bearer(token),
    payload: { username: "", displayName: "", password: "short", role: "ADMIN" },
  });
  assert.equal(badCreate.statusCode, 400);
  assert.ok((badCreate.json() as { error: { details: unknown[] } }).error.details.length > 0);

  const users = await app.inject({
    method: "GET",
    url: "/api/v1/users",
    headers: bearer(token),
  });
  const admin = (users.json() as { data: Array<{ id: string; role: string }> }).data.find((u) => u.role === "ADMIN");
  assert.ok(admin);
  const disallow = await app.inject({
    method: "DELETE",
    url: `/api/v1/users/${admin.id}`,
    headers: bearer(token),
  });
  assert.equal(disallow.statusCode, 403);
});
