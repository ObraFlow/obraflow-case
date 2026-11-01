import { In, type EntityManager } from "typeorm";
import { ProjectEntity } from "../modules/projects/entities.js";
import { SupplierEntity } from "../modules/suppliers/entities.js";
import { UserEntity, type User } from "../modules/users/entities.js";
import { PurchaseOrderEntity } from "../modules/purchase-orders/entities.js";

// Every pessimistic row lock in the application is acquired here, so the lock
// hierarchy is reviewable in one file. Each call must run inside the caller's
// transaction (the `manager` it owns); none opens a transaction of its own.
//
// Project, user and supplier rows use FOR NO KEY UPDATE: these writes never change
// a key, and the weaker mode still serializes writers while allowing the KEY SHARE
// locks PostgreSQL takes for foreign-key checks. The PO row uses FOR UPDATE.
//
// Acquisition order per operation (never reverse it):
//   create PO ........ project -> users (UUID ascending) -> supplier
//   publish CoA ...... project -> proposed approvers (UUID ascending)
//   add/remove member  project -> user
//   decide PO ........ purchase order -> deciding user
//   rename/archive ... project
//   deactivate user .. user   (blockers are read without locking projects or POs)
//   deactivate supplier supplier

export const lockProject = (manager: EntityManager, id: string) =>
  manager.getRepository(ProjectEntity).findOne({ where: { id }, lock: { mode: "for_no_key_update" } });

export const lockUser = (manager: EntityManager, id: string) =>
  manager.getRepository(UserEntity).findOne({ where: { id }, lock: { mode: "for_no_key_update" } });

// No joins: PostgreSQL locks only these users, in deterministic UUID order.
export function lockUsersForEligibility(
  manager: EntityManager,
  ids: string[],
): Promise<Pick<User, "id" | "isActive">[]> {
  return manager
    .getRepository(UserEntity)
    .createQueryBuilder("u")
    .select(["u.id", "u.isActive"])
    .where({ id: In(ids) })
    .orderBy("u.id", "ASC")
    .setLock("for_no_key_update")
    .getMany();
}

export const lockSupplier = (manager: EntityManager, id: string) =>
  manager.getRepository(SupplierEntity).findOne({ where: { id }, lock: { mode: "for_no_key_update" } });

// Root-row lock only. Do not join nullable decisions into this FOR UPDATE query.
export const lockOrderForDecision = (manager: EntityManager, id: string) =>
  manager.getRepository(PurchaseOrderEntity).findOne({
    where: { id },
    select: { projectId: true, status: true },
    lock: { mode: "pessimistic_write" },
  });
