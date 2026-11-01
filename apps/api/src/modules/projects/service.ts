import type { ProjectListItem, ProjectSummary } from "@dokimos/shared";
import type { Actor } from "../../auth/actor.js";
import { dataSource } from "../../db/data-source.js";
import { lockProject } from "../../db/locks.js";
import type { Project } from "./entities.js";
import { hasPendingOrders } from "../purchase-orders/repository.js";
import { errors } from "../../lib/errors.js";
import { requireActiveProject } from "./access.js";
import * as projects from "./repository.js";

const toProjectSummary = (project: Project): ProjectSummary => ({
  id: project.id,
  name: project.name,
  coaVersion: project.coaVersion,
  isActive: project.isActive,
  createdAt: project.createdAt.toISOString(),
});

export async function listProjects(actor: Actor): Promise<ProjectListItem[]> {
  // ADMIN sees every project; everyone else only the projects they belong to.
  const rows = await projects.listProjects(dataSource.manager, actor.id, actor.role === "ADMIN");
  return rows.map((row) => ({
    ...toProjectSummary(row),
    membership: { count: row.memberCount, activeCount: row.activeMemberCount, isMember: row.isMember },
  }));
}

// Trusted write: the caller must enforce ADMIN.
export async function createProject(actor: Actor, name: string) {
  return dataSource.transaction(async (manager) => {
    const project = await projects.insertProject(manager, name);
    await projects.insertProjectEvent(manager, project, actor.id, "PROJECT_CREATED");
    return toProjectSummary(project);
  });
}

// Trusted writes: ADMIN is enforced by the routes. All mutations serialize with
// PO creation/publication on the same project row, before checking blockers.
export async function renameProject(actor: Actor, id: string, name: string) {
  return dataSource.transaction(async (manager) => {
    const project = await lockProject(manager, id);
    if (!project) throw errors.notFound("project");
    requireActiveProject(project);

    // Renaming to the current name changes nothing and records no event.
    if (project.name === name) return toProjectSummary(project);

    await projects.renameProject(manager, id, name);
    // The event keeps the old name so the audit trail can show what changed.
    await projects.insertProjectEvent(manager, { ...project, name }, actor.id, "PROJECT_RENAMED", {
      previousName: project.name,
    });
    return toProjectSummary({ ...project, name });
  });
}

export async function setProjectActive(actor: Actor, id: string, isActive: boolean) {
  return dataSource.transaction(async (manager) => {
    const project = await lockProject(manager, id);
    if (!project) throw errors.notFound("project");
    // Already in the requested state: nothing to do (idempotent).
    if (project.isActive === isActive) return toProjectSummary(project);
    // Pending orders must be approved or rejected before the project can be archived.
    if (!isActive && (await hasPendingOrders(manager, id))) throw errors.projectHasPendingOrders();

    await projects.setProjectActive(manager, id, isActive);
    await projects.insertProjectEvent(
      manager,
      { ...project, isActive },
      actor.id,
      isActive ? "PROJECT_REACTIVATED" : "PROJECT_ARCHIVED",
    );
    return toProjectSummary({ ...project, isActive });
  });
}
