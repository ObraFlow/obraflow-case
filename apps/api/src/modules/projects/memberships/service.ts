import { insertProjectEvent } from "../repository.js";
import { requireActiveProject, visibleProject } from "../access.js";
import type { Actor } from "../../../auth/actor.js";
import { dataSource } from "../../../db/data-source.js";
import { lockProject, lockUser } from "../../../db/locks.js";
import { errors } from "../../../lib/errors.js";
import { isUniqueViolation } from "../../../lib/pg-errors.js";
import { hasCoaAssignment } from "../../coa/repository.js";
import { hasPendingApproval } from "../../purchase-orders/repository.js";
import type { User } from "../../users/entities.js";
import * as members from "./repository.js";

// memberDetails: who the member was, copied into the audit event so it stays readable
// after the user is renamed or deactivated.
const memberDetails = (user: User) => ({
  member: { userId: user.id, username: user.username, displayName: user.displayName },
});

export async function listMembers(projectId: string, actor: Actor) {
  return dataSource.transaction("REPEATABLE READ", async (manager) => {
    await visibleProject(manager, projectId, actor);
    return members.listMembers(manager, projectId);
  });
}

// Trusted writes: the caller must enforce ADMIN. Lock project before user.
export async function addProjectMember(actor: Actor, projectId: string, userId: string) {
  try {
    const member = await dataSource.transaction(async (manager) => {
      const project = await lockProject(manager, projectId);
      if (!project) throw errors.notFound("project");
      requireActiveProject(project);

      const user = await lockUser(manager, userId);
      if (!user || !user.isActive) throw errors.invalidMember();

      // A duplicate trips the primary key; it is translated to MEMBERSHIP_ALREADY_EXISTS below.
      const member = await members.insertMember(manager, projectId, user.id);
      await insertProjectEvent(manager, project, actor.id, "PROJECT_MEMBER_ADDED", memberDetails(user));
      return member;
    });
    return { projectId: member.projectId, userId: member.userId, createdAt: member.createdAt.toISOString() };
  } catch (error) {
    if (isUniqueViolation(error)) throw errors.membershipExists();
    throw error;
  }
}

export async function removeProjectMember(actor: Actor, projectId: string, userId: string) {
  await dataSource.transaction(async (manager) => {
    // Lock project -> target user. Blocker reads never lock POs in reverse order.
    const project = await lockProject(manager, projectId);
    if (!project) throw errors.notFound("project");
    requireActiveProject(project);

    const user = await lockUser(manager, userId);
    if (!user) throw errors.notFound("user");

    // Removing someone who is not a member succeeds without doing anything (idempotent).
    if (!(await members.isProjectMember(manager, projectId, userId))) return;

    // A member who still has a role in the project cannot leave: first take them out of the
    // published CoA, and let their pending approvals finish. History keeps pointing at them.
    if (await hasCoaAssignment(manager, userId, projectId)) throw errors.memberAssignedToActiveCoa();
    if (await hasPendingApproval(manager, userId, projectId)) throw errors.memberHasPendingApprovals();

    await members.deleteMember(manager, projectId, userId);
    await insertProjectEvent(manager, project, actor.id, "PROJECT_MEMBER_REMOVED", memberDetails(user));
  });
}
