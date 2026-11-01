import type { EntityManager } from "typeorm";
import type { CreatePurchaseOrder, DecisionInput, PurchaseOrderItemInput } from "@dokimos/shared";
import {
  ApprovalDecisionEntity,
  PurchaseOrderEntity,
  PurchaseOrderItemEntity,
  PurchaseOrderStepEntity,
} from "./entities.js";
import { ProjectMemberEntity } from "../projects/entities.js";
import { UserEntity } from "../users/entities.js";

// undecidedSteps: the order's steps that have no decision yet, in approval order. The
// first one is the current step; the number left tells whether an approval is the last.
export function undecidedSteps(manager: EntityManager, orderId: string) {
  return manager
    .getRepository(PurchaseOrderStepEntity)
    .createQueryBuilder("step")
    .select(["step.id", "step.stepIndex", "step.approverId"])
    .leftJoin(ApprovalDecisionEntity.options.name, "decision", "decision.stepId = step.id")
    .where("step.orderId = :orderId", { orderId })
    .andWhere("decision.id IS NULL")
    .orderBy("step.stepIndex", "ASC")
    .getMany();
}

// hasPendingApproval: whether the user still owes a decision on a pending order, in one
// project or in any. Deactivation and membership removal are blocked while it is true.
export function hasPendingApproval(manager: EntityManager, approverId: string, projectId?: string) {
  const query = manager
    .getRepository(PurchaseOrderStepEntity)
    .createQueryBuilder("step")
    .innerJoin(PurchaseOrderEntity.options.name, "po", "po.id = step.orderId")
    .leftJoin(ApprovalDecisionEntity.options.name, "decision", "decision.stepId = step.id")
    .where("step.approverId = :approverId", { approverId })
    .andWhere("po.status = :status", { status: "PENDING" })
    .andWhere("decision.id IS NULL");
  if (projectId) query.andWhere("po.projectId = :projectId", { projectId });
  return query.getExists();
}

export function insertOrder(
  manager: EntityManager,
  actorId: string,
  input: CreatePurchaseOrder,
  total: string,
  coaVersion: number,
) {
  const repo = manager.getRepository(PurchaseOrderEntity);
  return repo.save(
    repo.create({
      projectId: input.projectId,
      supplierId: input.supplierId,
      createdById: actorId,
      orderDate: input.orderDate,
      notes: input.notes ?? null,
      total,
      status: "PENDING",
      coaVersion,
    }),
    { transaction: false },
  );
}

export async function insertItems(
  manager: EntityManager,
  orderId: string,
  items: (PurchaseOrderItemInput & { lineTotal: string })[],
) {
  await manager
    .getRepository(PurchaseOrderItemEntity)
    .insert(items.map((item, itemIndex) => ({ ...item, orderId, itemIndex })));
}

export async function insertSteps(manager: EntityManager, orderId: string, approvers: string[]) {
  await manager
    .getRepository(PurchaseOrderStepEntity)
    .insert(approvers.map((approverId, stepIndex) => ({ orderId, stepIndex, approverId })));
}

export async function insertDecision(manager: EntityManager, stepId: string, actorId: string, input: DecisionInput) {
  // The database also requires a reason for REJECTED and forbids one for APPROVED.
  await manager
    .getRepository(ApprovalDecisionEntity)
    .insert({ stepId, actorId, decision: input.decision, reason: input.decision === "REJECTED" ? input.reason : null });
}

export async function setOrderStatus(manager: EntityManager, id: string, status: DecisionInput["decision"]) {
  await manager.getRepository(PurchaseOrderEntity).update({ id }, { status });
}

// canReceiveNotification: whether the user is still active and a member of the order's
// project (or an ADMIN, when `allowAdmin`), so a hint is never sent to someone who lost access.
export function canReceiveNotification(
  manager: EntityManager,
  userId: string,
  orderId: string,
  allowAdmin: boolean,
): Promise<boolean> {
  return manager
    .getRepository(UserEntity)
    .createQueryBuilder("u")
    .innerJoin(PurchaseOrderEntity.options.name, "po", "po.id = :orderId", { orderId })
    .leftJoin(ProjectMemberEntity.options.name, "member", "member.projectId = po.projectId AND member.userId = u.id")
    .where("u.id = :userId AND u.isActive = true", { userId })
    .andWhere("(member.userId IS NOT NULL OR (:allowAdmin = true AND u.role = 'ADMIN'))", { allowAdmin })
    .getExists();
}

export const hasPendingOrders = (manager: EntityManager, projectId: string) =>
  manager.getRepository(PurchaseOrderEntity).existsBy({ projectId, status: "PENDING" });
