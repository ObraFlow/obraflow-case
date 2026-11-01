import type { SupplierSummary } from "@dokimos/shared";
import type { Actor } from "../../auth/actor.js";
import { dataSource } from "../../db/data-source.js";
import { lockSupplier } from "../../db/locks.js";
import { errors } from "../../lib/errors.js";
import type { Supplier } from "./entities.js";
import * as suppliers from "./repository.js";

const toSupplierSummary = (supplier: Supplier): SupplierSummary => ({
  id: supplier.id,
  name: supplier.name,
  isActive: supplier.isActive,
});

export async function listSuppliers() {
  return (await suppliers.listSuppliers(dataSource.manager)).map(toSupplierSummary);
}

// Trusted writes: callers must enforce ADMIN. Transactions are service-owned.
export async function createSupplier(actor: Actor, name: string) {
  return toSupplierSummary(
    await dataSource.transaction((manager) => suppliers.insertSupplier(manager, name, actor.id)),
  );
}

// renameSupplier: changes the display name only; the id, orders and history are untouched.
// Only an active supplier can be renamed. Each rename is recorded for the audit trail.
export async function renameSupplier(actor: Actor, id: string, name: string) {
  return dataSource.transaction(async (manager) => {
    const supplier = await lockSupplier(manager, id);
    if (!supplier) throw errors.notFound("supplier");
    if (!supplier.isActive) throw errors.supplierInactiveRename();

    // Renaming to the current name changes nothing.
    if (supplier.name === name) return toSupplierSummary(supplier);

    await suppliers.renameSupplier(manager, id, name);
    await suppliers.insertRename(manager, id, actor.id, supplier.name, name);
    return toSupplierSummary({ ...supplier, name });
  });
}

export async function deactivateSupplier(actor: Actor, id: string) {
  await dataSource.transaction(async (manager) => {
    const supplier = await lockSupplier(manager, id);
    if (!supplier) throw errors.notFound("supplier");
    // Already inactive: nothing to do (idempotent). Orders keep pointing at the supplier.
    if (!supplier.isActive) return;
    await suppliers.markSupplierInactive(manager, id, actor.id);
  });
}
