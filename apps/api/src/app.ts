import Fastify from "fastify";
import { API_PREFIX } from "@dokimos/shared";
import { dataSource } from "./db/data-source.js";
import { registerActorContext } from "./auth/guards.js";
import { registerJwt } from "./auth/jwt.js";
import { authRoutes } from "./auth/routes.js";
import { registerErrorHandling } from "./lib/error-handler.js";
import { auditRoutes } from "./modules/audit/routes.js";
import { coaRoutes } from "./modules/coa/routes.js";
import { projectRoutes } from "./modules/projects/routes.js";
import { projectMembershipRoutes } from "./modules/projects/memberships/routes.js";
import { purchaseOrderRoutes } from "./modules/purchase-orders/routes.js";
import { supplierRoutes } from "./modules/suppliers/routes.js";
import { userRoutes } from "./modules/users/routes.js";
import { registerRealtime } from "./realtime/index.js";

const apiRoutes = [
  authRoutes,
  userRoutes,
  projectRoutes,
  projectMembershipRoutes,
  supplierRoutes,
  coaRoutes,
  purchaseOrderRoutes,
  auditRoutes,
];

export async function buildApp() {
  const app = Fastify({ logger: true });
  registerErrorHandling(app);
  await registerJwt(app);
  registerRealtime(app);
  registerActorContext(app);
  // Unauthenticated liveness probe that also proves the database connection works.
  app.get("/healthz", async () => {
    await dataSource.query("SELECT 1");
    return { status: "ok", database: "connected" };
  });
  for (const routes of apiRoutes) await app.register(routes, { prefix: API_PREFIX });
  return app;
}
