import type { EntityManager } from "typeorm";
import { SupplierEntity, SupplierRenameEntity } from "./entities.js";

export const listSuppliers = (manager: EntityManager) =>
  manager.getRepository(SupplierEntity).find({ order: { createdAt: "ASC", id: "ASC" } });

export function insertSupplier(manager: EntityManager, name: string, createdBy: string) {
  const repo = manager.getRepository(SupplierEntity);
  return repo.save(repo.create({ name, isActive: true, createdBy }), { transaction: false });
}

export async function markSupplierInactive(manager: EntityManager, id: string, actorId: string) {
  await manager
    .getRepository(SupplierEntity)
    .update({ id }, { isActive: false, deactivatedAt: new Date(), deactivatedBy: actorId });
}

export async function renameSupplier(manager: EntityManager, id: string, name: string) {
  await manager.getRepository(SupplierEntity).update({ id }, { name });
}

export async function insertRename(
  manager: EntityManager,
  supplierId: string,
  actorUserId: string,
  previousName: string,
  name: string,
) {
  await manager.getRepository(SupplierRenameEntity).insert({ supplierId, actorUserId, previousName, name });
}
