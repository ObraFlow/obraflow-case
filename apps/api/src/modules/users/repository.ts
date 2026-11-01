import type { EntityManager } from "typeorm";
import { UserEntity, UserLifecycleEventEntity, type User, type UserLifecycleEvent } from "./entities.js";

export const findUser = (manager: EntityManager, id: string) => manager.getRepository(UserEntity).findOneBy({ id });

export const findUserByUsername = (manager: EntityManager, username: string) =>
  manager.getRepository(UserEntity).findOneBy({ username });

export const listUsers = (manager: EntityManager) =>
  manager.getRepository(UserEntity).find({ order: { createdAt: "ASC", id: "ASC" } });

export function insertUser(manager: EntityManager, input: Pick<User, "username" | "displayName" | "passwordHash">) {
  const repo = manager.getRepository(UserEntity);
  return repo.save(repo.create({ ...input, role: "USER", isActive: true }), { transaction: false });
}

export async function insertLifecycleEvent(
  manager: EntityManager,
  targetUserId: string,
  actorUserId: string,
  action: UserLifecycleEvent["action"],
) {
  await manager
    .getRepository(UserLifecycleEventEntity)
    .insert({ targetUserId, actorUserId, actorKind: "USER", action });
}

export async function markUserInactive(manager: EntityManager, id: string, actorId: string) {
  await manager
    .getRepository(UserEntity)
    .update({ id }, { isActive: false, deactivatedAt: new Date(), deactivatedBy: actorId });
}
