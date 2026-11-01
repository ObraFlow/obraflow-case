import { DEMO_PERSONAS, DEMO_PROJECTS } from "@dokimos/shared";
import { ProjectEntity, ProjectMemberEntity, type Project } from "../../modules/projects/entities.js";
import { insertProjectEvent } from "../../modules/projects/repository.js";
import type { User } from "../../modules/users/entities.js";
import { dataSource } from "../data-source.js";
import { lockProject } from "../locks.js";

// renameLegacyProject: gives a project created under an older demo name its current
// name. Returns null if it changed since it was read, which the caller treats as absent.
async function renameLegacyProject(id: string, legacyName: string, name: string): Promise<Project | null> {
  return dataSource.transaction(async (manager) => {
    // Rename only: writing back a stale copy would overwrite a newer CoA version.
    const current = await lockProject(manager, id);
    if (!current || current.name !== legacyName) return null;
    await manager.getRepository(ProjectEntity).update({ id }, { name });
    const renamed = { ...current, name };
    await insertProjectEvent(manager, renamed, null, "PROJECT_RENAMED", { previousName: legacyName });
    return renamed;
  });
}

async function findOrCreateProject(name: string, legacyName: string): Promise<Project> {
  const repository = dataSource.getRepository(ProjectEntity);
  const current = await repository.findOneBy({ name });
  if (current) return current;
  const legacy = await repository.findOneBy({ name: legacyName });
  const renamed = legacy && (await renameLegacyProject(legacy.id, legacyName, name));
  if (renamed) return renamed;
  return dataSource.transaction(async (manager) => {
    const created = await manager.getRepository(ProjectEntity).save({ name, coaVersion: 0 });
    await insertProjectEvent(manager, created, null, "PROJECT_CREATED");
    return created;
  });
}

// addDemoMember: adds one membership unless it exists or the project was archived
// meanwhile; the project lock keeps it consistent with concurrent admin changes.
async function addDemoMember(projectId: string, user: User): Promise<void> {
  await dataSource.transaction(async (manager) => {
    const project = await lockProject(manager, projectId);
    const members = manager.getRepository(ProjectMemberEntity);
    if (!project?.isActive || (await members.existsBy({ projectId, userId: user.id }))) return;
    await members.insert({ projectId, userId: user.id });
    await insertProjectEvent(manager, project, null, "PROJECT_MEMBER_ADDED", {
      member: { userId: user.id, username: user.username, displayName: user.displayName },
    });
  });
}

// seedProjects: creates the demo projects (renaming legacy-named ones) and adds each
// persona's memberships. Archived projects and deactivated users are left alone.
export async function seedProjects(users: User[]): Promise<void> {
  const members = dataSource.getRepository(ProjectMemberEntity);
  for (const { name, legacyName } of DEMO_PROJECTS) {
    const project = await findOrCreateProject(name, legacyName);
    if (!project.isActive) continue;
    for (const user of users) {
      const persona = DEMO_PERSONAS.find((demo) => demo.username === user.username);
      if (!user.isActive || !persona?.projects.some((projectName) => projectName === name)) continue;
      if (!(await members.existsBy({ projectId: project.id, userId: user.id }))) await addDemoMember(project.id, user);
    }
  }
}
