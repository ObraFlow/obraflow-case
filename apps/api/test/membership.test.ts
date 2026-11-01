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
type Fixture = Awaited<ReturnType<typeof fixture>>;
const remove = (f: Fixture, userId: string) =>
  app.inject({
    method: "DELETE",
    url: `/api/v1/projects/${f.project.id}/members/${userId}`,
    headers: headers(f.admin.id),
  });
const configure = (f: Fixture, version: number, bands: { approverId: string; upperLimit: string | null }[]) =>
  app.inject({
    method: "PUT",
    url: `/api/v1/projects/${f.project.id}/coa`,
    headers: headers(f.admin.id),
    payload: { expectedCoaVersion: version, bands },
  });

test("membership removal is ADMIN-only, validated, idempotent and revokes ordinary-user project access", async () => {
  const f = await fixture();
  try {
    const url = `/api/v1/projects/${f.project.id}/members/${f.users[0].id}`;
    assert.equal((await app.inject({ method: "DELETE", url })).statusCode, 401);
    assert.equal((await app.inject({ method: "DELETE", url, headers: headers(f.users[0].id) })).statusCode, 403);
    assert.equal((await remove(f, "bad-id")).statusCode, 400);
    assert.equal((await remove(f, randomUUID())).statusCode, 404);
    assert.equal(
      (
        await app.inject({
          method: "DELETE",
          url: `/api/v1/projects/${randomUUID()}/members/${f.users[0].id}`,
          headers: headers(f.admin.id),
        })
      ).statusCode,
      404,
    );
    assert.equal((await remove(f, f.users[0].id)).statusCode, 204);
    assert.equal((await remove(f, f.users[0].id)).statusCode, 204);
    assert.equal(
      (await app.inject({ url: `/api/v1/projects/${f.project.id}/members`, headers: headers(f.users[0].id) }))
        .statusCode,
      404,
    );
    const projects = (await app.inject({ url: "/api/v1/projects", headers: headers(f.users[0].id) })).json().data;
    assert.ok(!projects.some((project: { id: string }) => project.id === f.project.id));
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: `/api/v1/projects/${f.project.id}/members`,
          headers: headers(f.admin.id),
          payload: { userId: f.users[0].id },
        })
      ).statusCode,
      201,
    );
    assert.equal(
      (await app.inject({ url: `/api/v1/projects/${f.project.id}/members`, headers: headers(f.users[0].id) }))
        .statusCode,
      200,
    );
  } finally {
    await f.cleanup();
  }
});

for (const terminal of ["APPROVED", "REJECTED"] as const)
  test(`removal protects active CoA and future approvals, but preserves ${terminal} history`, async () => {
    const f = await fixture();
    try {
      const bands = [
        { upperLimit: "10000.00", approverId: f.users[0].id },
        { upperLimit: null, approverId: f.users[1].id },
      ];
      assert.equal((await configure(f, 0, bands)).statusCode, 200);
      const blocked = await remove(f, f.users[1].id);
      assert.equal(blocked.statusCode, 409);
      assert.equal(blocked.json().error.code, "MEMBER_ASSIGNED_TO_ACTIVE_COA");
      const created = await app.inject({
        method: "POST",
        url: "/api/v1/purchase-orders",
        headers: headers(f.users[0].id),
        payload: {
          projectId: f.project.id,
          supplierId: f.supplier.id,
          orderDate: "2026-10-23",
          items: [{ description: "Material", quantity: "1", unit: "un", unitPrice: "12500.00" }],
        },
      });
      assert.equal(created.statusCode, 201, created.body);
      const id = created.json().id;
      assert.equal((await configure(f, 1, [{ upperLimit: null, approverId: f.users[0].id }])).statusCode, 200);
      const pending = await remove(f, f.users[1].id);
      assert.equal(pending.statusCode, 409);
      assert.equal(pending.json().error.code, "MEMBER_HAS_PENDING_APPROVALS");
      const decide = (index: number, decision: string) =>
        app.inject({
          method: "POST",
          url: `/api/v1/purchase-orders/${id}/decisions`,
          headers: headers(f.users[index].id),
          payload: {
            expectedStepIndex: index,
            decision,
            ...(decision === "REJECTED" ? { reason: "Cotação recusada." } : {}),
          },
        });
      assert.equal((await decide(0, terminal)).statusCode, 200);
      if (terminal === "APPROVED") {
        assert.equal((await remove(f, f.users[1].id)).statusCode, 409);
        assert.equal((await decide(1, "APPROVED")).statusCode, 200);
      }
      const before = (await app.inject({ url: `/api/v1/purchase-orders/${id}`, headers: headers(f.admin.id) })).json();
      const revisions = (
        await app.inject({ url: `/api/v1/projects/${f.project.id}/coa/revisions`, headers: headers(f.admin.id) })
      ).json();
      assert.equal((await remove(f, f.users[1].id)).statusCode, 204);
      assert.deepEqual(
        (await app.inject({ url: `/api/v1/purchase-orders/${id}`, headers: headers(f.admin.id) })).json(),
        before,
      );
      assert.deepEqual(
        (
          await app.inject({ url: `/api/v1/projects/${f.project.id}/coa/revisions`, headers: headers(f.admin.id) })
        ).json(),
        revisions,
      );
      assert.equal(
        (await app.inject({ url: `/api/v1/purchase-orders/${id}`, headers: headers(f.users[1].id) })).statusCode,
        404,
      );
      assert.equal(before.status, terminal);
    } finally {
      await f.cleanup();
    }
  });

test("concurrent publication and membership removal cannot leave an ineligible CoA", async () => {
  const f = await fixture();
  try {
    const [publication, removal] = await Promise.all([
      configure(f, 0, [{ upperLimit: null, approverId: f.users[0].id }]),
      remove(f, f.users[0].id),
    ]);
    assert.ok(
      (publication.statusCode === 200 && removal.statusCode === 409) ||
        (publication.statusCode === 400 && removal.statusCode === 204),
      `${publication.body} / ${removal.body}`,
    );
    assert.deepEqual(
      await dataSource.query(
        "SELECT b.id FROM coa_bands b LEFT JOIN project_members m ON m.project_id=b.project_id AND m.user_id=b.approver_id WHERE b.project_id=$1 AND m.user_id IS NULL",
        [f.project.id],
      ),
      [],
    );
  } finally {
    await f.cleanup();
  }
});

test("project list reports member counts and the caller's own membership in one read", async () => {
  const f = await fixture();
  try {
    const members = (
      await app.inject({ url: `/api/v1/projects/${f.project.id}/members`, headers: headers(f.admin.id) })
    ).json().data as Array<{ isActive: boolean }>;
    const find = async (userId: string) =>
      (await app.inject({ url: "/api/v1/projects", headers: headers(userId) }))
        .json()
        .data.find((project: { id: string }) => project.id === f.project.id);
    const expected = { count: members.length, activeCount: members.filter((member) => member.isActive).length };
    // ADMIN sees the project without being a member; a member sees their own membership.
    assert.deepEqual((await find(f.admin.id)).membership, { ...expected, isMember: false });
    assert.deepEqual((await find(f.users[0].id)).membership, { ...expected, isMember: true });
    assert.equal(await find(f.users[2].id), undefined);
    // The count follows membership changes, and a removed member loses the project and the flag.
    assert.equal((await remove(f, f.users[0].id)).statusCode, 204);
    assert.deepEqual((await find(f.admin.id)).membership, {
      count: expected.count - 1,
      activeCount: expected.activeCount - 1,
      isMember: false,
    });
    assert.equal(await find(f.users[0].id), undefined);
  } finally {
    await f.cleanup();
  }
});
