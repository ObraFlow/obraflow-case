import "dotenv/config";
import { assertTestDatabase } from "./database-guard.js";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { buildApp } from "../src/app.js";
import { dataSource } from "../src/db/data-source.js";
import { ProjectEntity, ProjectMemberEntity } from "../src/modules/projects/entities.js";
import { SupplierEntity } from "../src/modules/suppliers/entities.js";
import { UserEntity, type User } from "../src/modules/users/entities.js";

export async function setup() {
  assertTestDatabase();
  await dataSource.initialize();
  assert.equal(await dataSource.showMigrations(), false, "Run db:migrate first");
  return buildApp();
}

export async function waitForBlockedConnection(blockerPid: number, minimum = 1) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const rows: Array<{ blocked: boolean }> = await dataSource.query(
      `WITH RECURSIVE waits AS (
        SELECT pid,unnest(pg_blocking_pids(pid)) AS blocker FROM pg_stat_activity
      ), blocked AS (
        SELECT pid FROM waits WHERE blocker=$1
        UNION SELECT w.pid FROM waits w JOIN blocked b ON w.blocker=b.pid
      ) SELECT count(DISTINCT pid) >= $2 AS blocked FROM blocked`,
      [blockerPid, minimum],
    );
    if (rows[0].blocked) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail("Expected a PostgreSQL row-lock wait");
}

export async function fixture() {
  const admin = await dataSource.getRepository(UserEntity).findOneByOrFail({ username: "admin" });
  const users: User[] = [];
  for (let i = 0; i < 3; i++) {
    users.push(
      await dataSource.getRepository(UserEntity).save({
        username: `test-${randomUUID()}`,
        displayName: `Approver ${i}`,
        passwordHash: "test-fixture-no-login",
        role: "USER",
        isActive: true,
      }),
    );
  }
  const project = await dataSource.getRepository(ProjectEntity).save({ name: `Test ${randomUUID()}`, coaVersion: 0 });
  for (const user of users.slice(0, 2)) {
    await dataSource.getRepository(ProjectMemberEntity).insert({ projectId: project.id, userId: user.id });
  }
  const supplier = await dataSource
    .getRepository(SupplierEntity)
    .save({ name: "Test supplier", isActive: true, createdBy: admin.id });
  return {
    admin,
    users,
    project,
    supplier,
    async cleanup() {
      await dataSource.transaction(async (manager) => {
        await manager.query(
          "DELETE FROM approval_decisions WHERE step_id IN (SELECT id FROM purchase_order_steps WHERE order_id IN (SELECT id FROM purchase_orders WHERE project_id=$1))",
          [project.id],
        );
        await manager.query(
          "DELETE FROM purchase_order_steps WHERE order_id IN (SELECT id FROM purchase_orders WHERE project_id=$1)",
          [project.id],
        );
        await manager.query(
          "DELETE FROM purchase_order_items WHERE order_id IN (SELECT id FROM purchase_orders WHERE project_id=$1)",
          [project.id],
        );
        await manager.query("DELETE FROM purchase_orders WHERE project_id=$1", [project.id]);
        await manager.query("DELETE FROM coa_bands WHERE project_id=$1", [project.id]);
        await manager.query("DELETE FROM coa_revisions WHERE project_id=$1", [project.id]);
        await manager.query("DELETE FROM project_members WHERE project_id=$1", [project.id]);
        await manager.query("DELETE FROM project_lifecycle_events WHERE project_id=$1", [project.id]);
        await manager.query("DELETE FROM projects WHERE id=$1", [project.id]);
        await manager.query("DELETE FROM supplier_renames WHERE supplier_id=$1", [supplier.id]);
        await manager.query("DELETE FROM suppliers WHERE id=$1", [supplier.id]);
        await manager.query("DELETE FROM user_lifecycle_events WHERE target_user_id=ANY($1::uuid[])", [
          users.map((u) => u.id),
        ]);
        await manager.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [users.map((u) => u.id)]);
      });
    },
  };
}
