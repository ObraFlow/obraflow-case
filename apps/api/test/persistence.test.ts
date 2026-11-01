import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";
import { dataSource } from "../src/db/data-source.js";
import { setup, fixture } from "./helpers.js";
import { PurchaseOrderEntity, PurchaseOrderItemEntity } from "../src/modules/purchase-orders/entities.js";
import { CoaRevisionEntity } from "../src/modules/coa/entities.js";

let app: FastifyInstance;
before(async () => {
  app = await setup();
});
after(async () => {
  await app?.close();
  if (dataSource.isInitialized) await dataSource.destroy();
});

test("all thirteen entity mappings match the migrated physical columns, keys, checks and foreign keys", async () => {
  assert.equal(dataSource.options.synchronize, false);
  assert.equal(dataSource.entityMetadatas.length, 13);
  const runner = dataSource.createQueryRunner();
  try {
    const tables = await runner.getTables(dataSource.entityMetadatas.map((metadata) => metadata.tableName));
    const defaults: { table_name: string; column_name: string; column_default: string | null }[] = await runner.query(
      "SELECT table_name,column_name,column_default FROM information_schema.columns WHERE table_schema='public'",
    );
    for (const metadata of dataSource.entityMetadatas) {
      const table = tables.find((table) => table.name === metadata.tableName)!;
      assert.ok(table, metadata.tableName);
      assert.deepEqual(
        metadata.columns.map((column) => column.databaseName).sort(),
        table.columns.map((column) => column.name).sort(),
      );
      for (const column of metadata.columns) {
        const physical = table.findColumnByName(column.databaseName)!;
        const label = `${table.name}.${column.databaseName}`;
        assert.equal(dataSource.driver.normalizeType(column), physical.type, label);
        assert.equal(column.isNullable, physical.isNullable, label);
        assert.equal(column.isPrimary, physical.isPrimary, label);
        if (column.length) assert.equal(column.length, physical.length, label);
        if (column.precision !== undefined) assert.equal(column.precision, physical.precision, label);
        if (column.scale !== undefined) assert.equal(column.scale, physical.scale, label);
        const normalize = (value: unknown) =>
          String(value ?? "")
            .replace(/::[\w ]+/g, "")
            .replaceAll("'", "")
            .replace(/\s/g, "");
        const storedDefault = defaults.find(
          (value) => value.table_name === table.name && value.column_name === column.databaseName,
        )!.column_default;
        assert.equal(normalize(dataSource.driver.normalizeDefault(column)), normalize(storedDefault), label);
        if (column.isPrimary) assert.equal(column.primaryKeyConstraintName, `${table.name}_pkey`);
      }
      const keys = (
        values: {
          name?: string;
          columnNames: string[];
          referencedColumnNames: string[];
          referencedTableName: string;
        }[],
      ) =>
        values
          .map((key) => ({
            name: key.name,
            columns: key.columnNames,
            target: key.referencedTableName,
            references: key.referencedColumnNames,
          }))
          .sort((a, b) => a.name!.localeCompare(b.name!));
      assert.deepEqual(
        keys(
          metadata.foreignKeys.map((key) => ({
            name: key.name,
            columnNames: key.columnNames,
            referencedColumnNames: key.referencedColumnNames,
            referencedTableName: key.referencedTablePath,
          })),
        ),
        keys(table.foreignKeys),
        table.name,
      );
      assert.deepEqual(
        metadata.checks.map((check) => check.name).sort(),
        table.checks.map((check) => check.name).sort(),
        table.name,
      );
      assert.deepEqual(
        metadata.uniques
          .map((unique) => [unique.name, unique.columns.map((column) => column.databaseName).sort()])
          .sort(),
        table.uniques.map((unique) => [unique.name, [...unique.columnNames].sort()]).sort(),
        table.name,
      );
    }
  } finally {
    await runner.release();
  }
});

test("no table or index exists without a matching entity mapping, and migration-owned DESC indexes stay descending", async () => {
  const mapped = new Set(dataSource.entityMetadatas.map((metadata) => metadata.tableName));
  const tables: { tablename: string }[] = await dataSource.query(
    "SELECT tablename FROM pg_tables WHERE schemaname='public'",
  );
  // `migrations` is TypeORM's own bookkeeping table; every other table needs an entity.
  assert.deepEqual(
    tables
      .map((table) => table.tablename)
      .filter((name) => name !== "migrations" && !mapped.has(name))
      .sort(),
    [],
  );

  const indexes: { tablename: string; indexname: string; indexdef: string }[] = await dataSource.query(
    "SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public'",
  );
  for (const metadata of dataSource.entityMetadatas) {
    // Primary keys and unique constraints are indexes too, under the constraint's own name.
    const expected = [
      ...metadata.primaryColumns.map((column) => column.primaryKeyConstraintName!),
      ...metadata.uniques.map((unique) => unique.name!),
      ...metadata.indices.map((index) => index.name!),
    ];
    const physical = indexes.filter((index) => index.tablename === metadata.tableName).map((index) => index.indexname);
    assert.deepEqual([...new Set(expected)].sort(), physical.sort(), metadata.tableName);
  }

  // TypeORM cannot declare DESC ordering, so the entities leave these two to the migration.
  for (const name of ["po_project_created_idx", "po_status_created_idx"]) {
    const definition = indexes.find((index) => index.indexname === name)!.indexdef;
    assert.match(definition, /created_at DESC, id DESC/, name);
  }
});

test("mapped money remains decimal strings, DATE remains date-only, JSONB snapshots and timestamp transport retain their contracts", async () => {
  const f = await fixture();
  const headers = (id: string) => ({ authorization: `Bearer ${app.jwt.sign({ sub: id })}` });
  try {
    const coa = await app.inject({
      method: "PUT",
      url: `/api/v1/projects/${f.project.id}/coa`,
      headers: headers(f.admin.id),
      payload: { expectedCoaVersion: 0, bands: [{ upperLimit: null, approverId: f.users[0].id }] },
    });
    assert.equal(coa.statusCode, 200, coa.body);
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/purchase-orders",
      headers: headers(f.users[0].id),
      payload: {
        projectId: f.project.id,
        supplierId: f.supplier.id,
        orderDate: "2026-10-28",
        items: [
          { description: "Material", quantity: "0.005", unit: "un", unitPrice: "1.00" },
          { description: "Lote", quantity: "1", unit: "lote", unitPrice: "999999999999.99" },
        ],
      },
    });
    assert.equal(created.statusCode, 201, created.body);
    const order = await dataSource.getRepository(PurchaseOrderEntity).findOneByOrFail({ id: created.json().id });
    const items = await dataSource
      .getRepository(PurchaseOrderItemEntity)
      .find({ where: { orderId: order.id }, order: { itemIndex: "ASC" } });
    assert.equal(order.orderDate, "2026-10-28");
    assert.equal(order.total, "1000000000000.00");
    assert.ok(order.createdAt instanceof Date);
    assert.equal(items[0].quantity, "0.005");
    assert.equal(items[0].lineTotal, "0.01");
    assert.equal(items[1].unitPrice, "999999999999.99");
    const revision = await dataSource
      .getRepository(CoaRevisionEntity)
      .findOneByOrFail({ projectId: f.project.id, version: 1 });
    assert.deepEqual(revision.bands, [{ upperLimit: null, approverId: f.users[0].id }]);
    assert.ok(revision.changedAt instanceof Date);
    const listed = await app.inject({
      url: `/api/v1/purchase-orders?projectId=${f.project.id}`,
      headers: headers(f.users[0].id),
    });
    assert.equal(listed.json().data[0].createdAt, order.createdAt.toISOString());
    assert.equal(created.json().createdAt, order.createdAt.toISOString());
  } finally {
    await f.cleanup();
  }
});
