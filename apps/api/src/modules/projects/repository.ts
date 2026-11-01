import type { AuditProjectDetails, ProjectAuditEventType } from "@dokimos/shared";
import type { EntityManager } from "typeorm";
import { ProjectEntity, ProjectLifecycleEventEntity, type Project } from "./entities.js";

export const findProject = (manager: EntityManager, id: string) =>
  manager.getRepository(ProjectEntity).findOneBy({ id });

export interface ProjectListRow extends Project {
  memberCount: number;
  activeMemberCount: number;
  isMember: boolean;
}

// listProjects: the projects the actor may see with their membership figures, read by one
// statement (one snapshot). ADMIN sees every project; everyone else only the ones they belong
// to, so `isMember` is true for all of theirs. Counts include inactive users; the active count
// only members whose account is active.
export function listProjects(manager: EntityManager, actorId: string, seesAll: boolean): Promise<ProjectListRow[]> {
  return manager.query(
    `
    SELECT p.id, p.name, p.coa_version AS "coaVersion", p.is_active AS "isActive", p.created_at AS "createdAt",
      (SELECT count(*)::int FROM project_members m WHERE m.project_id=p.id) AS "memberCount",
      (SELECT count(*)::int FROM project_members m JOIN users u ON u.id=m.user_id
        WHERE m.project_id=p.id AND u.is_active) AS "activeMemberCount",
      EXISTS (SELECT 1 FROM project_members m WHERE m.project_id=p.id AND m.user_id=$1) AS "isMember"
    FROM projects p
    WHERE $2::boolean OR EXISTS (SELECT 1 FROM project_members m WHERE m.project_id=p.id AND m.user_id=$1)
    ORDER BY p.created_at ASC, p.id ASC`,
    [actorId, seesAll],
  );
}

export function insertProject(manager: EntityManager, name: string) {
  const repo = manager.getRepository(ProjectEntity);
  return repo.save(repo.create({ name, coaVersion: 0 }), { transaction: false });
}

export async function setCoaVersion(manager: EntityManager, id: string, coaVersion: number) {
  await manager.getRepository(ProjectEntity).update({ id }, { coaVersion });
}

export async function renameProject(manager: EntityManager, id: string, name: string) {
  await manager.getRepository(ProjectEntity).update({ id }, { name });
}

export async function setProjectActive(manager: EntityManager, id: string, isActive: boolean) {
  await manager.getRepository(ProjectEntity).update({ id }, { isActive });
}

// insertProjectEvent: appends to the project's audit history inside the caller's
// transaction, so a failure rolls the whole change back. `details` snapshots the project's
// name and state as of this event; later renames never rewrite it. A null actor is
// reserved for explicit system/seed operations, never HTTP input.
export async function insertProjectEvent(
  manager: EntityManager,
  project: { id: string; name: string; isActive: boolean },
  actorUserId: string | null,
  action: ProjectAuditEventType,
  changes: Partial<Pick<AuditProjectDetails, "previousName" | "member">> = {},
) {
  await manager.getRepository(ProjectLifecycleEventEntity).insert({
    projectId: project.id,
    actorUserId,
    actorKind: actorUserId === null ? "SYSTEM" : "USER",
    action,
    details: { projectName: project.name, isActive: project.isActive, previousName: null, member: null, ...changes },
  });
}
