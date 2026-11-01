import type { EntityManager } from "typeorm";
import type { ProjectMember } from "@dokimos/shared";
import { ProjectMemberEntity } from "../entities.js";
import { UserEntity } from "../../users/entities.js";

export const isProjectMember = (manager: EntityManager, projectId: string, userId: string) =>
  manager.getRepository(ProjectMemberEntity).existsBy({ projectId, userId });

export const listMemberUserIds = (manager: EntityManager, projectId: string) =>
  manager.getRepository(ProjectMemberEntity).find({ where: { projectId }, select: { userId: true } });

export function listMembers(manager: EntityManager, projectId: string) {
  return manager
    .getRepository(ProjectMemberEntity)
    .createQueryBuilder("member")
    .innerJoin(UserEntity.options.name, "u", "u.id = member.userId")
    .select("u.id", "userId")
    .addSelect("u.displayName", "displayName")
    .addSelect("u.isActive", "isActive")
    .where("member.projectId = :projectId", { projectId })
    .orderBy("u.displayName", "ASC")
    .addOrderBy("u.id", "ASC")
    .getRawMany<ProjectMember>();
}

export async function insertMember(manager: EntityManager, projectId: string, userId: string) {
  const repo = manager.getRepository(ProjectMemberEntity);
  await repo.insert({ projectId, userId });
  return repo.findOneByOrFail({ projectId, userId });
}

// Removes the link to the project; the user and the project stay.
export async function deleteMember(manager: EntityManager, projectId: string, userId: string) {
  await manager.getRepository(ProjectMemberEntity).delete({ projectId, userId });
}
