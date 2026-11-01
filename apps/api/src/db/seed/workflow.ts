import type { EntityManager } from "typeorm";
import {
  createPurchaseOrderSchema,
  DEMO_ORDER_NOTES,
  DEMO_PROJECTS,
  DEMO_SUPPLIERS,
  type CoaBand,
} from "@dokimos/shared";
import { ErrorCode, HttpError } from "../../lib/errors.js";
import { parseBody } from "../../lib/validation.js";
import { readBands } from "../../modules/coa/repository.js";
import { replaceCoa } from "../../modules/coa/service.js";
import type { Project } from "../../modules/projects/entities.js";
import { isProjectMember } from "../../modules/projects/memberships/repository.js";
import { createOrderInTransaction, decideOrderInTransaction } from "../../modules/purchase-orders/service.js";
import { SupplierEntity } from "../../modules/suppliers/entities.js";
import { UserEntity, type User } from "../../modules/users/entities.js";
import { dataSource } from "../data-source.js";
import { lockProject } from "../locks.js";
import { DEMO_SCENARIOS, quantityScale, REJECTION_REASON, type DemoScenario } from "./scenarios.js";

// demoMarkers: trailing text that identifies a scenario's order on later runs. The first
// marker (by project id) survives renames and progress; the name-based ones keep
// recognising orders seeded before ids were used, without rewriting their notes.
function demoMarkers(project: Project, scenario: DemoScenario["key"]): string[] {
  const legacyName = DEMO_PROJECTS.find((demo) => demo.name === project.name)?.legacyName;
  return [project.id, project.name, ...(legacyName ? [legacyName] : [])].map(
    (key) => `[obraflow-demo:v1:${key}:${scenario}]`,
  );
}

async function scenarioOrderExists(manager: EntityManager, projectId: string, markers: string[]): Promise<boolean> {
  const rows: unknown[] = await manager.query(
    `SELECT id FROM purchase_orders WHERE project_id=$1 AND EXISTS (
    SELECT 1 FROM unnest($2::text[]) AS marker WHERE notes=marker OR right(notes,length(marker)+1)=chr(10)||marker
  )`,
    [projectId, markers],
  );
  return rows.length > 0;
}

// publishDemoCoa: sets the two-band ladder on a project that has none. A concurrent
// explicit save wins, so a version conflict is not an error.
async function publishDemoCoa(project: Project, admin: User, bands: CoaBand[]): Promise<void> {
  if (project.coaVersion !== 0) return;
  try {
    await replaceCoa(project.id, admin, { expectedCoaVersion: 0, bands });
  } catch (error) {
    if (!(error instanceof HttpError) || error.code !== ErrorCode.COA_VERSION_CONFLICT) throw error;
  }
}

// The part of a DEMO_PROJECTS entry the workflow seed needs: the ladder (approvers by
// username, in step order), the standard order size and who creates the project's orders.
export interface DemoPlan {
  orderPrice: string;
  requester: string;
  bands: readonly { upperLimit: string | null; approver: string }[];
}

// seedScenario: creates one demo order through the real services and applies the decisions
// its progress calls for. The chain comes from the order itself, so any ladder length works.
async function seedScenario(
  manager: EntityManager,
  project: Project,
  scenario: DemoScenario,
  ctx: {
    creator: User;
    approvers: Map<string, User>;
    plan: DemoPlan;
    supplierId: string;
  },
): Promise<void> {
  const notes = `${DEMO_ORDER_NOTES[scenario.key]}\n${demoMarkers(project, scenario.key)[0]}`;
  const order = await createOrderInTransaction(
    manager,
    ctx.creator,
    parseBody(createPurchaseOrderSchema, {
      projectId: project.id,
      supplierId: ctx.supplierId,
      orderDate: scenario.orderDate,
      notes,
      items: scenario.items(quantityScale(ctx.plan.orderPrice), ctx.plan.bands[0].upperLimit!),
    }),
  );
  const last = order.steps.length - 1;
  const decided = { start: 0, "before-last": last, complete: last + 1, "rejected-last": last + 1 }[scenario.progress];
  for (let stepIndex = 0; stepIndex < decided; stepIndex++) {
    // The CoA was published from this plan, so step i belongs to band i's approver.
    const approver = ctx.approvers.get(ctx.plan.bands[stepIndex].approver)!;
    const reject = scenario.progress === "rejected-last" && stepIndex === last;
    await decideOrderInTransaction(
      manager,
      approver,
      order.id,
      reject
        ? { expectedStepIndex: stepIndex, decision: "REJECTED", reason: REJECTION_REASON }
        : { expectedStepIndex: stepIndex, decision: "APPROVED" },
    );
  }
}

// seedWorkflow: publishes the project's demo CoA and creates the missing scenario orders.
// Each step that depends on current data (archived project, changed CoA, inactive demo
// user or supplier) is skipped with a message instead of overwriting it. The requester
// creates the orders; a requester who is not a member falls back to the first approver.
export async function seedWorkflow(project: Project, plan: DemoPlan): Promise<void> {
  if (!project.isActive) {
    console.log(`Skipped workflow for ${project.name}: project is archived.`);
    return;
  }
  const usernames = ["admin", plan.requester, ...plan.bands.map((band) => band.approver)];
  const users = await dataSource.getRepository(UserEntity).find({ where: usernames.map((username) => ({ username })) });
  const admin = users.find((u) => u.username === "admin");
  const approvers = new Map<string, User>();
  for (const band of plan.bands) {
    const user = users.find((u) => u.username === band.approver);
    if (user?.isActive) approvers.set(band.approver, user);
  }
  const suppliers = await dataSource
    .getRepository(SupplierEntity)
    .find({ where: DEMO_SUPPLIERS.map(({ name }) => ({ name })) });
  if (!admin?.isActive || approvers.size !== new Set(plan.bands.map((band) => band.approver)).size) {
    console.log(`Skipped workflow for ${project.name}: a demo identity/supplier is inactive or missing.`);
    return;
  }
  const bands: CoaBand[] = plan.bands.map((band) => ({
    upperLimit: band.upperLimit,
    approverId: approvers.get(band.approver)!.id,
  }));
  await publishDemoCoa(project, admin, bands);

  await dataSource.transaction(async (manager) => {
    const current = await lockProject(manager, project.id);
    if (!current?.isActive) {
      console.log(`Skipped workflow for ${project.name}: project is archived.`);
      return;
    }
    if (JSON.stringify(await readBands(manager, project.id)) !== JSON.stringify(bands)) {
      console.log(`Skipped demo orders for ${project.name}: existing CoA differs from demo configuration.`);
      return;
    }
    const requester = users.find((u) => u.username === plan.requester);
    const creator =
      requester?.isActive && (await isProjectMember(manager, project.id, requester.id))
        ? requester
        : approvers.get(plan.bands[0].approver)!;
    for (const scenario of DEMO_SCENARIOS) {
      if (await scenarioOrderExists(manager, project.id, demoMarkers(project, scenario.key))) continue;
      const supplier = suppliers.find(({ name }) => name === DEMO_SUPPLIERS[scenario.supplier].name);
      if (!supplier?.isActive) {
        console.log(`Skipped ${scenario.key} for ${project.name}: demo supplier unavailable.`);
        continue;
      }
      await seedScenario(manager, project, scenario, { creator, approvers, plan, supplierId: supplier.id });
    }
  });
}
