import "dotenv/config";
import "reflect-metadata";
import { DataSource } from "typeorm";
import { databaseConnection } from "./connection.js";
import { ProjectEntity, ProjectMemberEntity, ProjectLifecycleEventEntity } from "../modules/projects/entities.js";
import { SupplierEntity, SupplierRenameEntity } from "../modules/suppliers/entities.js";
import { UserEntity, UserLifecycleEventEntity } from "../modules/users/entities.js";
import { CoaBandEntity, CoaRevisionEntity } from "../modules/coa/entities.js";
import {
  PurchaseOrderEntity,
  PurchaseOrderItemEntity,
  PurchaseOrderStepEntity,
  ApprovalDecisionEntity,
} from "../modules/purchase-orders/entities.js";
import { InitialSchema2026102100000 } from "./migrations/InitialSchema2026102100000.js";
import { ProjectLifecycle2026103000000 } from "./migrations/ProjectLifecycle2026103000000.js";
import { ProjectAudit2026103000001 } from "./migrations/ProjectAudit2026103000001.js";
import { SupplierRenames2026103000002 } from "./migrations/SupplierRenames2026103000002.js";

// The schema belongs to the migrations (listed explicitly, in order); the entities only
// map rows. `synchronize` and `migrationsRun` stay off so nothing alters the schema implicitly.
export const dataSource = new DataSource({
  type: "postgres",
  ...databaseConnection(),
  entities: [
    UserEntity,
    UserLifecycleEventEntity,
    ProjectEntity,
    ProjectMemberEntity,
    ProjectLifecycleEventEntity,
    SupplierEntity,
    SupplierRenameEntity,
    CoaBandEntity,
    CoaRevisionEntity,
    PurchaseOrderEntity,
    PurchaseOrderItemEntity,
    PurchaseOrderStepEntity,
    ApprovalDecisionEntity,
  ],
  migrations: [
    InitialSchema2026102100000,
    ProjectLifecycle2026103000000,
    ProjectAudit2026103000001,
    SupplierRenames2026103000002,
  ],
  migrationsRun: false,
  synchronize: false,
  logging: false,
});
