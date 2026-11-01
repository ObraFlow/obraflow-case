import type { FastifyInstance } from "fastify";
import { projectInputSchema } from "@dokimos/shared";
import { adminOnly, authenticated, currentActor } from "../../auth/guards.js";
import { parseBody, uuidParam, type IdParams } from "../../lib/validation.js";
import * as projects from "./service.js";

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  // GET /projects: all projects for ADMIN, only the caller's projects otherwise.
  app.get("/projects", authenticated, async (request) => {
    return { data: await projects.listProjects(currentActor(request)) };
  });

  // POST /projects: creates a project with no CoA yet (ADMIN only).
  app.post("/projects", adminOnly, async (request, reply) => {
    const { name } = parseBody(projectInputSchema, request.body);
    return reply.code(201).send(await projects.createProject(currentActor(request), name));
  });

  app.patch<IdParams>("/projects/:id", adminOnly, async (request) => {
    const { name } = parseBody(projectInputSchema, request.body);
    return projects.renameProject(currentActor(request), uuidParam(request.params.id), name);
  });

  // POST /projects/:id/archive: blocked while the project has pending orders.
  app.post<IdParams>("/projects/:id/archive", adminOnly, async (request) => {
    return projects.setProjectActive(currentActor(request), uuidParam(request.params.id), false);
  });

  app.post<IdParams>("/projects/:id/reactivate", adminOnly, async (request) => {
    return projects.setProjectActive(currentActor(request), uuidParam(request.params.id), true);
  });
}
