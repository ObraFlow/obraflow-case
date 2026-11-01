import argon2 from "argon2";
import type { UserSummary } from "@dokimos/shared";
import { type Actor, toIdentity } from "../../auth/actor.js";
import { dataSource } from "../../db/data-source.js";
import { lockUser } from "../../db/locks.js";
import { errors } from "../../lib/errors.js";
import { isUniqueViolation } from "../../lib/pg-errors.js";
import { hasCoaAssignment } from "../coa/repository.js";
import { hasPendingApproval } from "../purchase-orders/repository.js";
import * as users from "./repository.js";
import type { User } from "./entities.js";

const toUserSummary = (user: User): UserSummary => ({ ...toIdentity(user), isActive: user.isActive });

export async function listUsers() {
  return (await users.listUsers(dataSource.manager)).map(toUserSummary);
}

// Trusted writes: callers must enforce the ADMIN route guard.
export async function createUser(actor: Actor, input: { username: string; displayName: string; password: string }) {
  const username = input.username.toLowerCase();
  // Hashing is slow on purpose, so it runs before the transaction opens; the database
  // work then stays short.
  const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
  try {
    // The user row and its creation event are written together or not at all.
    const user = await dataSource.transaction(async (manager) => {
      const created = await users.insertUser(manager, { username, displayName: input.displayName, passwordHash });
      await users.insertLifecycleEvent(manager, created.id, actor.id, "CREATED");
      return created;
    });
    return toUserSummary(user);
  } catch (error) {
    // The unique index, not a prior lookup, decides duplicates, so two concurrent creates cannot both win.
    if (isUniqueViolation(error)) throw errors.usernameExists();
    throw error;
  }
}

export async function deactivateUser(actor: Actor, id: string) {
  await dataSource.transaction(async (manager) => {
    // Target user only; never wait on a project or PO while holding this lock.
    const user = await lockUser(manager, id);
    if (!user) throw errors.notFound("user");
    if (user.role === "ADMIN") throw errors.adminCannotBeDisabled();
    // Already inactive: nothing to do (idempotent).
    if (!user.isActive) return;

    // Deactivation is logical and must not strand an approval: the user has to leave every
    // published CoA and finish pending approvals first. Their history is kept.
    if (await hasCoaAssignment(manager, id)) throw errors.userAssignedToActiveCoa();
    if (await hasPendingApproval(manager, id)) throw errors.userHasPendingApprovals();

    await users.markUserInactive(manager, id, actor.id);
    await users.insertLifecycleEvent(manager, id, actor.id, "DISABLED");
  });
}
