import type { FastifyInstance } from "fastify";
import { adminOnly, authenticated, currentActor } from "../../auth/guards.js";
import { uuidParam, type IdParams } from "../../lib/validation.js";
import { readCoa, readRevisions, replaceCoa } from "./service.js";

export async function coaRoutes(app: FastifyInstance): Promise<void> {
  app.get<IdParams>("/projects/:id/coa", authenticated, async (request) => {
    return readCoa(uuidParam(request.params.id), currentActor(request));
  });

  // PUT /projects/:id/coa: replaces the whole ladder, checked against the expected version.
  app.put<IdParams>("/projects/:id/coa", adminOnly, async (request) => {
    return replaceCoa(uuidParam(request.params.id), currentActor(request), request.body);
  });

  app.get<IdParams>("/projects/:id/coa/revisions", adminOnly, async (request) => {
    return { data: await readRevisions(uuidParam(request.params.id), currentActor(request)) };
  });
}
