import { after, afterEach, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import Fastify, { type FastifyInstance } from "fastify";
import { dataSource } from "../src/db/data-source.js";
import { UserEntity } from "../src/modules/users/entities.js";
import { registerJwt } from "../src/auth/jwt.js";
import { authenticate, registerActorContext, requireRole } from "../src/auth/guards.js";
import { registerErrorHandling } from "../src/lib/error-handler.js";
import { fixture, setup } from "./helpers.js";

let app: FastifyInstance;
let f: Awaited<ReturnType<typeof fixture>>;
before(async () => {
  app = await setup();
});
beforeEach(async () => {
  f = await fixture();
});
afterEach(async () => {
  await f?.cleanup();
});
after(async () => {
  await app?.close();
  if (dataSource.isInitialized) await dataSource.destroy();
});

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
const identity = (id: string) => bearer(app.jwt.sign({ sub: id }));
// Sign exact claim sets without the application's automatic expiry/issued-at defaults.
function rawToken(payload: object) {
  const unsigned = [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
    Buffer.from(JSON.stringify(payload)).toString("base64url"),
  ].join(".");
  return `${unsigned}.${createHmac("sha256", process.env.JWT_SECRET!).update(unsigned).digest("base64url")}`;
}
const unauthenticated = (message = "Faça login para continuar.") => ({
  error: { code: "UNAUTHENTICATED", message, details: [] },
});
const forbidden = { error: { code: "FORBIDDEN", message: "Você não tem permissão para esta operação.", details: [] } };

type Route = { method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; url: string; adminStatus?: number };
function adminRoutes(): Route[] {
  const missing = randomUUID();
  return [
    { method: "POST", url: "/api/v1/users", adminStatus: 400 },
    { method: "DELETE", url: `/api/v1/users/${missing}`, adminStatus: 404 },
    { method: "POST", url: "/api/v1/projects", adminStatus: 400 },
    { method: "POST", url: `/api/v1/projects/${f.project.id}/members`, adminStatus: 400 },
    { method: "DELETE", url: `/api/v1/projects/${f.project.id}/members/${missing}`, adminStatus: 404 },
    { method: "PUT", url: `/api/v1/projects/${f.project.id}/coa`, adminStatus: 400 },
    { method: "GET", url: `/api/v1/projects/${f.project.id}/coa/revisions`, adminStatus: 200 },
    { method: "POST", url: "/api/v1/suppliers", adminStatus: 400 },
    { method: "PATCH", url: `/api/v1/suppliers/${missing}`, adminStatus: 400 },
    { method: "DELETE", url: `/api/v1/suppliers/${missing}`, adminStatus: 404 },
    { method: "GET", url: "/api/v1/audit/events", adminStatus: 200 },
  ];
}
function protectedRoutes(): Route[] {
  return [
    ...adminRoutes(),
    { method: "GET", url: "/api/v1/auth/me" },
    { method: "GET", url: "/api/v1/users" },
    { method: "GET", url: "/api/v1/projects" },
    { method: "GET", url: `/api/v1/projects/${f.project.id}/members` },
    { method: "GET", url: `/api/v1/projects/${f.project.id}/coa` },
    { method: "GET", url: "/api/v1/suppliers" },
    { method: "GET", url: "/api/v1/purchase-orders" },
    { method: "POST", url: "/api/v1/purchase-orders" },
    { method: "GET", url: `/api/v1/purchase-orders/${randomUUID()}` },
    { method: "POST", url: `/api/v1/purchase-orders/${randomUUID()}/decisions` },
  ];
}

test("every protected method rejects missing authentication before route validation or discovery", async () => {
  for (const { method, url } of protectedRoutes()) {
    const response = await app.inject({
      method,
      url,
      ...(method === "POST" || method === "PUT" || method === "PATCH" ? { payload: {} } : {}),
    });
    assert.equal(response.statusCode, 401, `${method} ${url}: ${response.body}`);
    assert.deepEqual(response.json(), unauthenticated());
  }
});

test("every ADMIN method rejects USERs despite signed role claims and allows the database administrator through", async () => {
  const user = bearer(app.jwt.sign({ sub: f.users[0].id, role: "ADMIN" }));
  for (const { method, url, adminStatus } of adminRoutes()) {
    const payload = method === "POST" || method === "PUT" || method === "PATCH" ? { payload: {} } : {};
    const denied = await app.inject({ method, url, headers: user, ...payload });
    assert.equal(denied.statusCode, 403, `${method} ${url}: ${denied.body}`);
    assert.deepEqual(denied.json(), forbidden);
    const allowed = await app.inject({ method, url, headers: identity(f.admin.id), ...payload });
    assert.equal(allowed.statusCode, adminStatus, `${method} ${url}: ${allowed.body}`);
  }
});

test("REST requires subject and expiry without enforcing issuer/audience", async () => {
  const issued = app.jwt.sign({ sub: f.users[0].id });
  const claims = app.jwt.decode<Record<string, unknown>>(issued)!;
  assert.equal(claims.iss, undefined);
  assert.equal(claims.aud, undefined);
  const minimal = { sub: f.users[0].id, exp: Math.floor(Date.now() / 1000) + 60 };
  for (const token of [
    issued,
    rawToken(minimal),
    rawToken({ ...minimal, iss: "optional-issuer", aud: "optional-audience" }),
  ]) {
    const response = await app.inject({ method: "GET", url: "/api/v1/auth/me", headers: bearer(token) });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().id, f.users[0].id);
  }
  for (const claim of ["sub", "exp"]) {
    const missing: Record<string, unknown> = { ...minimal };
    delete missing[claim];
    const response = await app.inject({ method: "GET", url: "/api/v1/auth/me", headers: bearer(rawToken(missing)) });
    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.json(), unauthenticated());
  }
});

test("invalid, expired, wrong-algorithm, invalid-subject, inactive and deleted identities fail closed", async () => {
  const deletedToken = app.jwt.sign({ sub: f.users[2].id });
  await dataSource.getRepository(UserEntity).delete(f.users[2].id);
  await dataSource.getRepository(UserEntity).update(f.users[1].id, { isActive: false });
  const expired = app.jwt.sign({ sub: f.users[0].id, iat: 1 }, { expiresIn: 1 });
  assert.equal(app.jwt.decode<{ exp: number }>(expired)!.exp, 2);
  for (const [token, message] of [
    ["not-a-jwt", "Faça login para continuar."],
    [expired, "Faça login para continuar."],
    [app.jwt.sign({ sub: f.users[0].id }, { algorithm: "HS384" }), "Faça login para continuar."],
    [app.jwt.sign({ sub: "invalid-uuid" }), "Sessão inválida."],
    [app.jwt.sign({ sub: f.users[1].id }), "Sessão inválida ou usuário inativo."],
    [deletedToken, "Sessão inválida ou usuário inativo."],
  ]) {
    const response = await app.inject({ method: "GET", url: "/api/v1/auth/me", headers: bearer(token) });
    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.json(), unauthenticated(message));
  }
});

test("the same JWT follows current database role changes without an actor cache", async () => {
  const headers = bearer(app.jwt.sign({ sub: f.users[2].id, role: "USER" }));
  const audit = () => app.inject({ method: "GET", url: "/api/v1/audit/events", headers });
  assert.equal((await audit()).statusCode, 403);
  await dataSource.getRepository(UserEntity).update(f.users[2].id, { role: "ADMIN" });
  assert.equal((await audit()).statusCode, 200);
  await dataSource.getRepository(UserEntity).update(f.users[2].id, { role: "USER" });
  assert.equal((await audit()).statusCode, 403);
});

test("middleware resolves one safe, independent actor per authenticated request", async (t) => {
  const probe = Fastify();
  registerActorContext(probe);
  await registerJwt(probe);
  probe.get("/actor", { preHandler: [authenticate] }, async (request) => request.actor);
  const lookup = t.mock.method(dataSource.getRepository(UserEntity), "findOneBy");
  try {
    for (const [index, user] of [f.users[0], f.users[1], f.users[0]].entries()) {
      const response = await probe.inject({ method: "GET", url: "/actor", headers: identity(user.id) });
      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.json(), {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      });
      assert.equal(lookup.mock.callCount(), index + 1);
    }
  } finally {
    await probe.close();
  }
});

test("a role guard without authentication returns 401 and never executes its handler", async () => {
  const probe = Fastify();
  registerErrorHandling(probe);
  registerActorContext(probe);
  let executed = false;
  probe.get("/guard", { preHandler: [requireRole("ADMIN")] }, async () => {
    executed = true;
    return {};
  });
  try {
    const response = await probe.inject({ method: "GET", url: "/guard" });
    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.json(), unauthenticated());
    assert.equal(executed, false);
  } finally {
    await probe.close();
  }
});

test("resource visibility, current-assignee checks and actor impersonation protection survive route guards", async () => {
  const admin = identity(f.admin.id),
    author = identity(f.users[0].id),
    outsider = identity(f.users[2].id);
  const configured = await app.inject({
    method: "PUT",
    url: `/api/v1/projects/${f.project.id}/coa`,
    headers: admin,
    payload: { expectedCoaVersion: 0, bands: [{ upperLimit: null, approverId: f.users[1].id }] },
  });
  assert.equal(configured.statusCode, 200);
  for (const suffix of ["members", "coa"]) {
    const hidden = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${f.project.id}/${suffix}`,
      headers: outsider,
    });
    assert.equal(hidden.statusCode, 404);
    assert.equal(hidden.json().error.code, "NOT_FOUND");
  }
  const payload = {
    projectId: f.project.id,
    supplierId: f.supplier.id,
    orderDate: "2026-10-28",
    items: [{ description: "Material", quantity: "1", unit: "un", unitPrice: "10.00" }],
  };
  const spoofed = await app.inject({
    method: "POST",
    url: "/api/v1/purchase-orders",
    headers: author,
    payload: { ...payload, actor: { id: f.admin.id, role: "ADMIN" }, createdBy: f.admin.id },
  });
  assert.equal(spoofed.statusCode, 400);
  assert.equal(spoofed.json().error.code, "VALIDATION_ERROR");
  const created = await app.inject({ method: "POST", url: "/api/v1/purchase-orders", headers: author, payload });
  assert.equal(created.statusCode, 201);
  const order = created.json();
  assert.equal(order.createdById, f.users[0].id);
  const hiddenOrder = await app.inject({
    method: "GET",
    url: `/api/v1/purchase-orders/${order.id}`,
    headers: outsider,
  });
  assert.equal(hiddenOrder.statusCode, 404);
  for (const headers of [author, admin]) {
    const denied = await app.inject({
      method: "POST",
      url: `/api/v1/purchase-orders/${order.id}/decisions`,
      headers,
      payload: { expectedStepIndex: 0, decision: "APPROVED" },
    });
    assert.equal(denied.statusCode, 403);
  }
  const approved = await app.inject({
    method: "POST",
    url: `/api/v1/purchase-orders/${order.id}/decisions`,
    headers: identity(f.users[1].id),
    payload: { expectedStepIndex: 0, decision: "APPROVED" },
  });
  assert.equal(approved.statusCode, 200);
  assert.equal(approved.json().steps[0].decision.actorId, f.users[1].id);
});

test("health and credential login remain public with unchanged safe responses", async () => {
  const health = await app.inject({ method: "GET", url: "/healthz" });
  assert.equal(health.statusCode, 200);
  assert.deepEqual(health.json(), { status: "ok", database: "connected" });
  const login = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { username: "admin", password: process.env.SEED_ADMIN_PASSWORD ?? "demo-admin-2026" },
  });
  assert.equal(login.statusCode, 200);
  assert.equal(login.json().user.id, f.admin.id);
  assert.equal(login.json().tokenType, "Bearer");
  assert.equal(typeof login.json().expiresIn, "number");
});

test("an account whose stored hash cannot be parsed fails login with 401, not 500", async () => {
  // The fixture users carry a placeholder that is not a valid Argon2 hash.
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { username: f.users[0].username, password: "any-password-1" },
  });
  assert.equal(response.statusCode, 401, response.body);
  assert.equal(response.json().error.code, "INVALID_CREDENTIALS");
});
