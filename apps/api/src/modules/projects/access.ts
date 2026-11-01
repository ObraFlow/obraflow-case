import type { EntityManager } from "typeorm";
import type { Actor } from "../../auth/actor.js";
import { errors } from "../../lib/errors.js";
import type { Project } from "./entities.js";
import { isProjectMember } from "./memberships/repository.js";
import { findProject } from "./repository.js";

// visibleProject: loads a project the actor may see (ADMIN: any; others: their own).
// Non-members get 404, not 403, so project ids are not discoverable.
export async function visibleProject(manager: EntityManager, id: string, actor: Actor): Promise<Project> {
  const project = await findProject(manager, id);
  if (!project) throw errors.notFound("project");
  if (actor.role !== "ADMIN") {
    const member = await isProjectMember(manager, id, actor.id);
    if (!member) throw errors.notFound("project");
  }
  return project;
}

// requireActiveProject: archived projects accept no new orders, membership changes, CoA changes or renames.
export function requireActiveProject(project: Project) {
  if (!project.isActive) throw errors.projectArchived();
}
