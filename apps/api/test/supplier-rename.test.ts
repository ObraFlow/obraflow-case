import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
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

test("supplier rename is ADMIN-only, strict and trimmed, and keeps the supplier's identity", async () => {
  const f = await fixture();
  try {
    const rename = (as: string, payload: object, id = f.supplier.id) =>
      app.inject({ method: "PATCH", url: `/api/v1/suppliers/${id}`, headers: headers(as), payload });

    // Only an ADMIN may rename; unknown ids are 404 and malformed ids are 400.
    assert.equal((await rename(f.users[0].id, { name: "Outro nome" })).statusCode, 403);
    assert.equal((await rename(f.admin.id, { name: "Outro nome" }, randomUUID())).statusCode, 404);
    assert.equal((await rename(f.admin.id, { name: "Outro nome" }, "not-a-uuid")).statusCode, 400);

    // The body follows the creation contract: trimmed, 1-150 characters, no extra fields.
    for (const name of ["", "   ", "x".repeat(151)]) {
      assert.equal((await rename(f.admin.id, { name })).statusCode, 400, JSON.stringify(name));
    }
    assert.equal((await rename(f.admin.id, { name: "Valido", isActive: false })).statusCode, 400);

    const before = await dataSource.query("SELECT * FROM suppliers WHERE id=$1", [f.supplier.id]);
    const renamed = await rename(f.admin.id, { name: "  Fornecedor corrigido  " });
    assert.equal(renamed.statusCode, 200, renamed.body);
    assert.deepEqual(renamed.json(), { id: f.supplier.id, name: "Fornecedor corrigido", isActive: true });

    // Only the name changed on the row, and the list shows the new name.
    const [after] = await dataSource.query("SELECT * FROM suppliers WHERE id=$1", [f.supplier.id]);
    assert.deepEqual({ ...after, name: before[0].name }, before[0]);
    const listed = await app.inject({ url: "/api/v1/suppliers", headers: headers(f.users[0].id) });
    assert.equal(listed.json().data.find((s: { id: string }) => s.id === f.supplier.id).name, "Fornecedor corrigido");

    // Repeating the same name succeeds without effect.
    assert.equal((await rename(f.admin.id, { name: "Fornecedor corrigido" })).statusCode, 200);

    // Exactly one audit entry for the real rename (the no-op left none), recorded against the ADMIN.
    const events = async (eventType: string) =>
      (
        await app.inject({
          url: `/api/v1/audit/events?eventType=${eventType}&pageSize=100`,
          headers: headers(f.admin.id),
        })
      )
        .json()
        .data.filter((event: { resource: { id: string } }) => event.resource.id === f.supplier.id);
    const renames = await events("SUPPLIER_RENAMED");
    assert.equal(renames.length, 1);
    assert.equal(renames[0].actor.id, f.admin.id);
    assert.deepEqual(renames[0].details, { previousName: before[0].name, name: "Fornecedor corrigido" });
    assert.equal(renames[0].resource.name, "Fornecedor corrigido");

    // The creation event keeps the name the supplier had then, not the new one.
    const [created] = await events("SUPPLIER_CREATED");
    assert.equal(created.details.name, before[0].name);
    assert.equal(created.resource.name, "Fornecedor corrigido");
  } finally {
    await f.cleanup();
  }
});

test("an inactive supplier cannot be renamed", async () => {
  const f = await fixture();
  try {
    const url = `/api/v1/suppliers/${f.supplier.id}`;
    assert.equal((await app.inject({ method: "DELETE", url, headers: headers(f.admin.id) })).statusCode, 204);

    const denied = await app.inject({
      method: "PATCH",
      url,
      headers: headers(f.admin.id),
      payload: { name: "Nome novo" },
    });
    assert.equal(denied.statusCode, 409, denied.body);
    assert.equal(denied.json().error.code, "SUPPLIER_INACTIVE");

    // Nothing changed, not even a rename record.
    const [row] = await dataSource.query("SELECT name FROM suppliers WHERE id=$1", [f.supplier.id]);
    assert.equal(row.name, f.supplier.name);
    const renames = await dataSource.query("SELECT 1 FROM supplier_renames WHERE supplier_id=$1", [f.supplier.id]);
    assert.equal(renames.length, 0);
  } finally {
    await f.cleanup();
  }
});
