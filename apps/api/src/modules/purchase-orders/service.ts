import type { EntityManager } from "typeorm";
import type { CreatePurchaseOrder, DecisionInput } from "@dokimos/shared";
import type { Actor } from "../../auth/actor.js";
import { dataSource } from "../../db/data-source.js";
import { lockOrderForDecision, lockProject, lockSupplier, lockUsersForEligibility } from "../../db/locks.js";
import { errors } from "../../lib/errors.js";
import { approversForOrder } from "../coa/service.js";
import { requireActiveProject } from "../projects/access.js";
import { isProjectMember } from "../projects/memberships/repository.js";
import { calculateTotals } from "./money.js";
import { findOrderDetail } from "./order-detail.js";
import { listOrderSummaries, type OrderFilters } from "./order-list.js";
import * as orders from "./repository.js";

// lockActiveUsers: locks the users in a stable order and returns which of them are active.
async function lockActiveUsers(manager: EntityManager, ids: string[]): Promise<Set<string>> {
  const users = await lockUsersForEligibility(manager, ids);
  return new Set(users.filter((user) => user.isActive).map((user) => user.id));
}

// requireActive: a deactivated actor cannot write, even with a still-valid token.
function requireActive(active: Set<string>, actor: Actor) {
  if (!active.has(actor.id)) throw errors.inactiveSession();
}

export async function createOrder(actor: Actor, input: CreatePurchaseOrder) {
  return dataSource.transaction((manager) => createOrderInTransaction(manager, actor, input));
}

// createOrderInTransaction: validates, prices and creates an order with its approval
// steps. The seed calls this directly to compose a complete demo lifecycle in one
// transaction under the same authorization and calculation rules.
export async function createOrderInTransaction(manager: EntityManager, actor: Actor, input: CreatePurchaseOrder) {
  // Priced first, so an amount that cannot be stored fails before any lock is taken.
  const calculated = calculateTotals(input.items);

  // Lock order: project -> users -> supplier (see db/locks.ts).
  // The creator must be a member. A non-member USER gets 404 (the project is not theirs to
  // know about); an ADMIN, who can see every project, gets 403.
  const project = await lockProject(manager, input.projectId);
  if (!project) throw errors.notFound("project");
  if (!(await isProjectMember(manager, project.id, actor.id))) {
    throw actor.role === "ADMIN" ? errors.forbidden() : errors.notFound("project");
  }
  requireActiveProject(project);

  // The total picks the approvers from the published CoA; each must still be active and a member.
  const approvers = await approversForOrder(manager, project, calculated.total);
  const active = await lockActiveUsers(manager, [...approvers, actor.id]);
  requireActive(active, actor);
  for (const approverId of approvers) {
    if (!active.has(approverId) || !(await isProjectMember(manager, project.id, approverId))) {
      throw errors.coaApproverUnavailable();
    }
  }

  const supplier = await lockSupplier(manager, input.supplierId);
  if (!supplier) throw errors.invalidSupplier();
  if (!supplier.isActive) throw errors.supplierInactive();

  // The order keeps the CoA version and approver list it was created under.
  const order = await orders.insertOrder(manager, actor.id, input, calculated.total, project.coaVersion);
  await orders.insertItems(manager, order.id, calculated.items);
  await orders.insertSteps(manager, order.id, approvers);
  return findOrderDetail(manager, order.id, actor);
}

export async function decideOrder(actor: Actor, id: string, input: DecisionInput) {
  return dataSource.transaction((manager) => decideOrderInTransaction(manager, actor, id, input));
}

// decideOrderInTransaction: only the current step's approver, a project member, may
// decide, in order. A rejection or the last approval closes the order.
export async function decideOrderInTransaction(manager: EntityManager, actor: Actor, id: string, input: DecisionInput) {
  // The order row lock serializes competing decisions on the same order.
  const order = await lockOrderForDecision(manager, id);
  if (!order) throw errors.notFound("order");
  const member = await isProjectMember(manager, order.projectId, actor.id);
  // ADMIN may see any order but is not a decider unless assigned and a member.
  if (actor.role !== "ADMIN" && !member) throw errors.notFound("order");
  if (order.status !== "PENDING") throw errors.orderAlreadyDecided();

  // `expectedStepIndex` is the step the client saw. If another decision got there first the
  // current step has moved on, and the client must reload instead of deciding the wrong step.
  const steps = await orders.undecidedSteps(manager, id);
  const current = steps[0];
  if (!current || current.stepIndex !== input.expectedStepIndex) throw errors.approvalStepConflict();
  if (!member || current.approverId !== actor.id) throw errors.forbidden();
  requireActive(await lockActiveUsers(manager, [actor.id]), actor);

  await orders.insertDecision(manager, current.id, actor.id, input);
  // A rejection ends the order at once; an approval ends it only when no step is left.
  if (input.decision === "REJECTED" || steps.length === 1) {
    await orders.setOrderStatus(manager, id, input.decision);
  }
  return findOrderDetail(manager, id, actor);
}

export const getOrder = (id: string, actor: Actor) => findOrderDetail(dataSource.manager, id, actor);

// listOrders: a page of order summaries visible to the actor, from one snapshot.
export const listOrders = (actor: Actor, filters: OrderFilters) =>
  dataSource.transaction("REPEATABLE READ", (manager) => listOrderSummaries(manager, actor, filters));
