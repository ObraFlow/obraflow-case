import type { EntityManager } from "typeorm";
import type { CoaBand } from "@dokimos/shared";
import { CoaBandEntity, CoaRevisionEntity } from "./entities.js";

export async function readBands(manager: EntityManager, projectId: string): Promise<CoaBand[]> {
  return manager
    .getRepository(CoaBandEntity)
    .find({ where: { projectId }, select: { upperLimit: true, approverId: true }, order: { position: "ASC" } });
}

// hasCoaAssignment: whether the user is an approver in the published CoA of one project,
// or of any project when `projectId` is omitted.
export const hasCoaAssignment = (manager: EntityManager, approverId: string, projectId?: string) =>
  manager.getRepository(CoaBandEntity).existsBy({ approverId, ...(projectId ? { projectId } : {}) });

// replaceBands: swaps the whole ladder; `position` records the approval order. Delete and
// insert run in the caller's transaction, so readers never see a partial ladder.
export async function replaceBands(manager: EntityManager, projectId: string, bands: CoaBand[]) {
  const repo = manager.getRepository(CoaBandEntity);
  await repo.delete({ projectId });
  await repo.insert(bands.map((band, position) => ({ ...band, projectId, position })));
}

// insertRevision: the immutable history row; it keeps the full ladder as published.
export async function insertRevision(
  manager: EntityManager,
  projectId: string,
  version: number,
  bands: CoaBand[],
  changedById: string,
) {
  await manager.getRepository(CoaRevisionEntity).insert({ projectId, version, bands, changedById });
}

export const listRevisions = (manager: EntityManager, projectId: string) =>
  manager.getRepository(CoaRevisionEntity).find({
    where: { projectId },
    select: { version: true, changedById: true, changedAt: true, bands: true },
    order: { version: "DESC" },
  });
