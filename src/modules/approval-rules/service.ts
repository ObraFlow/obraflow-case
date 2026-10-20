import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import { ApiError } from "@/lib/http";
import { approvalRulesInput, type ApprovalRulesInput } from "./schema";

async function readConfiguration(transaction: Prisma.TransactionClient, projectId: string) {
  const project = await transaction.project.findUnique({ where: { id: projectId }, include: {
    bands: { orderBy: { position: "asc" }, include: { approvers: { orderBy: { position: "asc" }, include: { user: { select: { id: true, name: true } } } } } },
  } });
  if (!project) throw new ApiError(404, "PROJECT_NOT_FOUND", "Obra não encontrada.");
  return { projectId: project.id, version: project.rulesVersion, bands: project.bands.map((band) => ({
    upperLimit: band.upperLimit?.toFixed(2) ?? null,
    approvers: band.approvers.map(({ user }) => user),
  })) };
}

export async function getApprovalRules(database: PrismaClient, projectId: string) {
  return database.$transaction(async (transaction) => {
    await transaction.$executeRaw`SET TRANSACTION READ ONLY`;
    return readConfiguration(transaction, projectId);
  }, { isolationLevel: "RepeatableRead" });
}

export async function replaceApprovalRules(database: PrismaClient, projectId: string, input: ApprovalRulesInput) {
  const parsed = approvalRulesInput.parse(input);
  return database.$transaction(async (transaction) => {
    const projects = await transaction.$queryRaw<{ id: string; rulesVersion: number }[]>`SELECT "id", "rulesVersion" FROM "Project" WHERE "id" = ${projectId}::uuid FOR UPDATE`;
    const project = projects[0];
    if (!project) throw new ApiError(404, "PROJECT_NOT_FOUND", "Obra não encontrada.");
    if (project.rulesVersion !== parsed.expectedVersion) throw new ApiError(409, "RULES_VERSION_CONFLICT", "As regras foram alteradas. Recarregue a configuração antes de salvar.");
    const ids = [...new Set(parsed.bands.flatMap((band) => band.approverIds))];
    const users = await transaction.user.findMany({ where: { id: { in: ids } }, select: { id: true } });
    const available = new Set(users.map(({ id }) => id));
    const errors = parsed.bands.flatMap((band, index) => band.approverIds.flatMap((id, position) => available.has(id) ? [] : [{ path: `bands.${index}.approverIds.${position}`, message: "Aprovador não encontrado." }]));
    if (errors.length) throw new ApiError(400, "VALIDATION_ERROR", "Revise os aprovadores indicados.", errors);
    await transaction.approvalBand.deleteMany({ where: { projectId } });
    for (const [index, band] of parsed.bands.entries()) {
      await transaction.approvalBand.create({ data: {
        projectId, position: index + 1, upperLimit: band.upperLimit,
        approvers: { create: band.approverIds.map((userId, position) => ({ userId, position: position + 1 })) },
      } });
    }
    await transaction.project.update({ where: { id: projectId }, data: { rulesVersion: { increment: 1 } } });
    return readConfiguration(transaction, projectId);
  }, { isolationLevel: "ReadCommitted", timeout: 15000 });
}
