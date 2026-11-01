import type { FastifyInstance } from "fastify";
import { auditQuerySchema } from "@dokimos/shared";
import { adminOnly } from "../../auth/guards.js";
import { parseBody } from "../../lib/validation.js";
import { listAuditEvents } from "./service.js";

export async function auditRoutes(app: FastifyInstance): Promise<void> {
  // GET /audit/events: paginated, filterable history of recorded changes (ADMIN only).
  app.get("/audit/events", adminOnly, async (request) => {
    return listAuditEvents(parseBody(auditQuerySchema, request.query));
  });
}
