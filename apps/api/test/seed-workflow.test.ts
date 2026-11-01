import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";
import { dataSource } from "../src/db/data-source.js";
import { ProjectMemberEntity } from "../src/modules/projects/entities.js";
import { UserEntity } from "../src/modules/users/entities.js";
import { seedWorkflow } from "../src/db/seed/workflow.js";
import { decideOrder } from "../src/modules/purchase-orders/service.js";
import { findOrderDetail } from "../src/modules/purchase-orders/order-detail.js";
import { replaceCoa } from "../src/modules/coa/service.js";
import { fixture, setup } from "./helpers.js";
import { DEMO_PERSONAS, DEMO_PROJECTS, DEMO_SUPPLIERS, displayOrderNotes } from "@dokimos/shared";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import argon2 from "argon2";
import { randomUUID } from "node:crypto";
import { DataSource } from "typeorm";

let app: FastifyInstance;
before(async () => {
  app = await setup();
});
after(async () => {
  await app?.close();
  if (dataSource.isInitialized) await dataSource.destroy();
});

test("the demo seed bootstraps an empty database and preserves credentials and orders on repeat", async () => {
  const name = `obraflow_test_${randomUUID().replaceAll("-", "")}`;
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = `/${name}`;
  const isolated = new DataSource({
    type: "postgres",
    url: url.toString(),
    entities: dataSource.options.entities,
    migrations: dataSource.options.migrations,
    synchronize: false,
  });
  const npm = process.env.npm_execpath!;
  const run = (script: string, password: string) =>
    promisify(execFile)(process.execPath, [npm, "run", script, "--workspace", "@dokimos/api"], {
      cwd: fileURLToPath(new URL("../../../", import.meta.url)),
      env: {
        ...process.env,
        DATABASE_URL: url.toString(),
        OBRAFLOW_TEST_DATABASE: name,
        SEED_ADMIN_PASSWORD: password,
      },
    });
  await dataSource.query(`CREATE DATABASE "${name}" TEMPLATE template0`);
  try {
    await isolated.initialize();
    assert.equal(await isolated.showMigrations(), true);
    await run("db:seed", "bootstrap-admin-password");
    assert.equal(await isolated.showMigrations(), false);
    const users = await isolated.getRepository(UserEntity).find({ order: { username: "ASC" } });
    assert.equal(users.length, 6);
    const admin = users.find((user) => user.role === "ADMIN")!;
    assert.equal(admin.username, "admin");
    assert.ok(await argon2.verify(admin.passwordHash, "bootstrap-admin-password"));
    const lifecycle = await isolated.query(
      "SELECT target_user_id,actor_kind,action FROM user_lifecycle_events ORDER BY target_user_id",
    );
    assert.equal(lifecycle.length, 6);
    assert.ok(
      lifecycle.every(
        (event: { actor_kind: string; action: string }) => event.actor_kind === "SYSTEM" && event.action === "CREATED",
      ),
    );
    assert.equal((await isolated.query("SELECT count(*)::int AS count FROM purchase_orders"))[0].count, 12);
    // Each project's requester creates its orders, and each project has its own ladder.
    const created = await isolated.query(`SELECT p.name AS project, u.username AS creator, count(*)::int AS orders,
      max((SELECT count(*) FROM purchase_order_steps s WHERE s.order_id=po.id))::int AS longest_chain
      FROM purchase_orders po JOIN projects p ON p.id=po.project_id JOIN users u ON u.id=po.created_by_id GROUP BY p.name, u.username ORDER BY p.name`);
    assert.deepEqual(
      created,
      DEMO_PROJECTS.map((project) => ({
        project: project.name,
        creator: project.requester,
        orders: 6,
        longest_chain: project.bands.length,
      })).sort((a, b) => a.project.localeCompare(b.project)),
    );
    const ladders =
      await isolated.query(`SELECT p.name AS project, array_agg(u.username ORDER BY b.position) AS approvers FROM coa_bands b
      JOIN projects p ON p.id=b.project_id JOIN users u ON u.id=b.approver_id GROUP BY p.name ORDER BY p.name`);
    assert.deepEqual(
      ladders,
      DEMO_PROJECTS.map((project) => ({
        project: project.name,
        approvers: project.bands.map((band) => band.approver),
      })).sort((a, b) => a.project.localeCompare(b.project)),
    );
    await run("db:seed", "a-different-password");
    assert.deepEqual(await isolated.getRepository(UserEntity).find({ order: { username: "ASC" } }), users);
    assert.deepEqual(
      await isolated.query(
        "SELECT target_user_id,actor_kind,action FROM user_lifecycle_events ORDER BY target_user_id",
      ),
      lifecycle,
    );
    assert.equal((await isolated.query("SELECT count(*)::int AS count FROM purchase_orders"))[0].count, 12);
  } finally {
    if (isolated.isInitialized) await isolated.destroy();
    await dataSource.query(`DROP DATABASE "${name}" WITH (FORCE)`);
  }
});

test("demo workflow seed is repeatable and preserves progressed orders, credentials and custom CoA", async () => {
  const f = await fixture();
  try {
    const joao = await dataSource.getRepository(UserEntity).findOneByOrFail({ username: "joao" });
    const amanda = await dataSource.getRepository(UserEntity).findOneByOrFail({ username: "amanda" });
    for (const user of [joao, amanda]) {
      await dataSource.getRepository(ProjectMemberEntity).insert({ projectId: f.project.id, userId: user.id });
    }
    await seedWorkflow(f.project, DEMO_PROJECTS[0]);
    // Simulate one pre-upgrade marker. Reseeding must recognize it unchanged.
    await dataSource.query(
      "UPDATE purchase_orders SET notes=$2 WHERE project_id=$1 AND notes LIKE '%:pending-first]'",
      [f.project.id, `[obraflow-demo:v1:${f.project.name}:pending-first]`],
    );
    const original = await dataSource.query(
      "SELECT id,status,notes FROM purchase_orders WHERE project_id=$1 ORDER BY id",
      [f.project.id],
    );
    assert.equal(original.length, 6);
    assert.deepEqual(original.map((o: { status: string }) => o.status).sort(), [
      "APPROVED",
      "PENDING",
      "PENDING",
      "PENDING",
      "PENDING",
      "REJECTED",
    ]);
    const limitOrder = original.find((o: { notes: string }) => o.notes.endsWith(":at-limit]"));
    const limitDetail = await findOrderDetail(dataSource.manager, limitOrder.id, f.admin);
    assert.equal(limitDetail.total, "10000.00");
    assert.equal(limitDetail.steps.length, 1);
    const fractional = original.find((o: { notes: string }) => o.notes.endsWith(":fractional]"));
    const fractionalDetail = await findOrderDetail(dataSource.manager, fractional.id, f.admin);
    assert.equal(fractionalDetail.total, "24.12");
    assert.deepEqual(
      fractionalDetail.items.map((item) => item.lineTotal),
      ["1.56", "1.56", "21.00"],
    );
    assert.ok(original.every((order: { notes: string }) => !displayOrderNotes(order.notes).includes("obraflow-demo")));
    const pending = original.find((o: { notes: string }) => o.notes.endsWith(":pending-first]"));
    await decideOrder(joao, pending.id, {
      expectedStepIndex: 0,
      decision: "REJECTED",
      reason: "Alterado pelo avaliador",
    });
    const changed = await findOrderDetail(dataSource.manager, pending.id, f.admin);
    const revisions = await dataSource.query("SELECT * FROM coa_revisions WHERE project_id=$1", [f.project.id]);
    await seedWorkflow(f.project, DEMO_PROJECTS[0]);
    const after = await dataSource.query(
      "SELECT id,status,notes FROM purchase_orders WHERE project_id=$1 ORDER BY id",
      [f.project.id],
    );
    assert.deepEqual(
      after.map((o: { id: string }) => o.id),
      original.map((o: { id: string }) => o.id),
    );
    assert.deepEqual(await findOrderDetail(dataSource.manager, pending.id, f.admin), changed);
    assert.deepEqual(
      await dataSource.query("SELECT * FROM coa_revisions WHERE project_id=$1", [f.project.id]),
      revisions,
    );
    assert.equal(
      (await dataSource.getRepository(UserEntity).findOneByOrFail({ id: joao.id })).passwordHash,
      joao.passwordHash,
    );
    await replaceCoa(f.project.id, f.admin, {
      expectedCoaVersion: 1,
      bands: [{ upperLimit: null, approverId: f.users[0].id }],
    });
    await seedWorkflow(f.project, DEMO_PROJECTS[0]);
    const bands = await dataSource.query("SELECT approver_id FROM coa_bands WHERE project_id=$1", [f.project.id]);
    assert.deepEqual(bands, [{ approver_id: f.users[0].id }]);
    assert.deepEqual(
      await dataSource.query("SELECT id,status,notes FROM purchase_orders WHERE project_id=$1 ORDER BY id", [
        f.project.id,
      ]),
      after,
    );
  } finally {
    await f.cleanup();
  }
});

test("full seed preserves six identities, two projects and credentials across repeated runs", async () => {
  const names = DEMO_PERSONAS.map((persona) => persona.username);
  const snapshot = () =>
    dataSource.query("SELECT * FROM users WHERE username=ANY($1::text[]) ORDER BY username", [names]);
  const beforeUsers = await snapshot();
  assert.equal(beforeUsers.length, 6);
  assert.equal(beforeUsers.filter((user: { role: string }) => user.role === "ADMIN").length, 1);
  const auditBefore = await dataSource.query("SELECT * FROM project_lifecycle_events ORDER BY id");
  const projectNames = DEMO_PROJECTS.map((project) => project.name);
  const projects = await dataSource.query("SELECT * FROM projects WHERE name=ANY($1::text[]) ORDER BY id", [
    projectNames,
  ]);
  assert.ok(new Set(projects.map((project: { name: string }) => project.name)).size >= 2);
  for (let i = 0; i < 2; i++) {
    await promisify(execFile)(process.execPath, ["--import", "tsx", "src/db/seed/index.ts"], {
      cwd: fileURLToPath(new URL("../", import.meta.url)),
    });
  }
  assert.deepEqual(await snapshot(), beforeUsers);
  assert.deepEqual(await dataSource.query("SELECT * FROM project_lifecycle_events ORDER BY id"), auditBefore);
  assert.deepEqual(
    await dataSource.query("SELECT * FROM projects WHERE name=ANY($1::text[]) ORDER BY id", [projectNames]),
    projects,
  );
  const memberships = await dataSource.query(
    `SELECT u.username, p.name FROM project_members pm
    JOIN users u ON u.id=pm.user_id JOIN projects p ON p.id=pm.project_id WHERE u.username=ANY($1::text[])`,
    [names],
  );
  for (const persona of DEMO_PERSONAS)
    for (const projectName of persona.projects) {
      assert.ok(
        memberships.some(
          (member: { username: string; name: string }) =>
            member.username === persona.username && member.name === projectName,
        ),
      );
    }
});

test("seed upgrades only original demo names without replacing IDs, orders or approval history", async () => {
  const orders = await dataSource.query(
    "SELECT po.* FROM purchase_orders po JOIN projects p ON p.id=po.project_id WHERE p.name=ANY($1::text[]) ORDER BY po.id",
    [DEMO_PROJECTS.map((project) => project.name)],
  );
  const projects = await dataSource.query("SELECT * FROM projects WHERE name=ANY($1::text[]) ORDER BY id", [
    DEMO_PROJECTS.map((project) => project.name),
  ]);
  const suppliers = await dataSource.query("SELECT * FROM suppliers WHERE name=ANY($1::text[]) ORDER BY id", [
    DEMO_SUPPLIERS.map((supplier) => supplier.name),
  ]);
  const eventIds = (
    await dataSource.query("SELECT id FROM project_lifecycle_events WHERE project_id=ANY($1::uuid[])", [
      projects.map((p: { id: string }) => p.id),
    ])
  ).map((e: { id: string }) => e.id);
  try {
    for (const project of DEMO_PROJECTS)
      await dataSource.query("UPDATE projects SET name=$2 WHERE name=$1", [project.name, project.legacyName]);
    for (const supplier of DEMO_SUPPLIERS)
      if (supplier.legacyName)
        await dataSource.query("UPDATE suppliers SET name=$2 WHERE name=$1", [supplier.name, supplier.legacyName]);
    await promisify(execFile)(process.execPath, ["--import", "tsx", "src/db/seed/index.ts"], {
      cwd: fileURLToPath(new URL("../", import.meta.url)),
    });
    assert.deepEqual(
      await dataSource.query("SELECT * FROM projects WHERE id=ANY($1::uuid[]) ORDER BY id", [
        projects.map((project: { id: string }) => project.id),
      ]),
      projects,
    );
    assert.deepEqual(
      await dataSource.query("SELECT * FROM suppliers WHERE id=ANY($1::uuid[]) ORDER BY id", [
        suppliers.map((supplier: { id: string }) => supplier.id),
      ]),
      suppliers,
    );
    assert.deepEqual(
      await dataSource.query("SELECT po.* FROM purchase_orders po WHERE project_id=ANY($1::uuid[]) ORDER BY po.id", [
        projects.map((project: { id: string }) => project.id),
      ]),
      orders,
    );
    const upgrades = await dataSource.query(
      "SELECT actor_kind,action,details FROM project_lifecycle_events WHERE project_id=ANY($1::uuid[]) AND NOT (id=ANY($2::uuid[]))",
      [projects.map((p: { id: string }) => p.id), eventIds],
    );
    assert.equal(upgrades.length, projects.length);
    assert.ok(
      upgrades.every(
        (e: { actor_kind: string; action: string }) => e.actor_kind === "SYSTEM" && e.action === "PROJECT_RENAMED",
      ),
    );
  } finally {
    await dataSource.query(
      "DELETE FROM project_lifecycle_events WHERE project_id=ANY($1::uuid[]) AND NOT (id=ANY($2::uuid[]))",
      [projects.map((p: { id: string }) => p.id), eventIds],
    );
    for (const project of projects)
      await dataSource.query("UPDATE projects SET name=$2 WHERE id=$1", [project.id, project.name]);
    for (const supplier of suppliers)
      await dataSource.query("UPDATE suppliers SET name=$2 WHERE id=$1", [supplier.id, supplier.name]);
  }
});
