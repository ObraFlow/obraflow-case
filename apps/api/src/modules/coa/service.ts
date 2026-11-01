import type { EntityManager } from "typeorm";
import { Decimal } from "decimal.js";
import { z } from "zod";
import { coaBandsSchema, replaceCoaSchema, type CoaBand } from "@dokimos/shared";
import type { Actor } from "../../auth/actor.js";
import { dataSource } from "../../db/data-source.js";
import { lockProject, lockUsersForEligibility } from "../../db/locks.js";
import { errors, IssueCode } from "../../lib/errors.js";
import { parseBody } from "../../lib/validation.js";
import { requireActiveProject, visibleProject } from "../projects/access.js";
import type { Project } from "../projects/entities.js";
import { listMemberUserIds } from "../projects/memberships/repository.js";
import { setCoaVersion } from "../projects/repository.js";
import { insertRevision, listRevisions, readBands, replaceBands } from "./repository.js";

// Cumulative ladder: an order needs every approver from the first band up to the first
// band whose limit covers the total (the last band has no limit).
function resolveApprovers(bands: CoaBand[], total: string): string[] {
  const match = bands.findIndex((band) => band.upperLimit === null || new Decimal(total).lte(band.upperLimit));
  if (match < 0) throw errors.coaNotConfigured();
  return bands.slice(0, match + 1).map((band) => band.approverId);
}

// approversForOrder: ordered approver ids a new order of `total` needs under the
// project's published CoA. Run inside the caller's transaction, with the project locked.
export async function approversForOrder(
  manager: EntityManager,
  project: Pick<Project, "id" | "coaVersion">,
  total: string,
): Promise<string[]> {
  const bands = coaBandsSchema.safeParse(await readBands(manager, project.id));
  if (!bands.success || project.coaVersion === 0) throw errors.coaNotConfiguredForOrders();
  return resolveApprovers(bands.data, total);
}

export async function readCoa(projectId: string, actor: Actor) {
  // One snapshot, so the version always matches the bands returned with it.
  return dataSource.transaction("REPEATABLE READ", async (manager) => {
    const project = await visibleProject(manager, projectId, actor);
    return { projectId, coaVersion: project.coaVersion, bands: await readBands(manager, projectId) };
  });
}

export async function readRevisions(projectId: string, actor: Actor) {
  // The route restricts history to ADMIN, who sees every project, so this only has to 404 unknown ids.
  await visibleProject(dataSource.manager, projectId, actor);
  return (await listRevisions(dataSource.manager, projectId)).map((revision) => ({
    version: revision.version,
    changedById: revision.changedById,
    changedAt: revision.changedAt.toISOString(),
    bands: revision.bands,
  }));
}

// replaceCoa: publishes the complete ladder as the project's next CoA version, or fails
// without changing anything. Trusted entry: the route enforces ADMIN, and the seed
// calls it with the database-resolved administrator.
export async function replaceCoa(projectId: string, actor: Actor, input: unknown) {
  // Only the version is read here; the bands are validated after the version check, so a
  // stale editor gets COA_VERSION_CONFLICT instead of field errors for a ladder that is
  // about to be discarded anyway.
  const envelope = parseBody(replaceCoaSchema.extend({ bands: z.unknown() }), input);
  return dataSource.transaction(async (manager) => {
    // Lock order: project -> proposed approvers (see db/locks.ts).
    const project = await lockProject(manager, projectId);
    if (!project) throw errors.notFound("project");
    requireActiveProject(project);
    if (project.coaVersion !== envelope.expectedCoaVersion) throw errors.coaVersionConflict();

    const body = parseBody(replaceCoaSchema, input);
    // Store limits at the column's scale so the comparison below is exact.
    const bands = body.bands.map((band) => ({
      upperLimit: band.upperLimit === null ? null : new Decimal(band.upperLimit).toFixed(2),
      approverId: band.approverId,
    }));

    // Every approver must be an active member of this project, checked under lock so
    // none can be deactivated or removed before the ladder is saved.
    const eligible = await lockUsersForEligibility(
      manager,
      bands.map((band) => band.approverId),
    );
    const members = await listMemberUserIds(manager, projectId);
    const activeIds = new Set(eligible.filter((user) => user.isActive).map((user) => user.id));
    const memberIds = new Set(members.map((member) => member.userId));
    const details = bands.flatMap((band, index) =>
      activeIds.has(band.approverId) && memberIds.has(band.approverId)
        ? []
        : [
            {
              field: `bands.${index}.approverId`,
              code: IssueCode.INVALID_APPROVER,
              message: "Selecione um membro ativo desta obra.",
            },
          ],
    );
    if (details.length) throw errors.invalidApprovers(details);

    // Saving an identical ladder is a no-op, not a new version. The comparison relies on
    // both sides listing keys in the same order (upperLimit, then approverId).
    const current = await readBands(manager, projectId);
    if (JSON.stringify(current) === JSON.stringify(bands))
      return { projectId, coaVersion: project.coaVersion, bands: current };

    // Bands are replaced wholesale and the full ladder is stored as a revision, so
    // history never depends on the current bands. Existing orders keep their own snapshot.
    const version = project.coaVersion + 1;
    await replaceBands(manager, projectId, bands);
    await setCoaVersion(manager, projectId, version);
    await insertRevision(manager, projectId, version, bands, actor.id);
    return { projectId, coaVersion: version, bands };
  });
}
