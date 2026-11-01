import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { adminOnly, authenticated, currentActor } from "../../../auth/guards.js";
import { parseBody, uuidParam, type IdParams } from "../../../lib/validation.js";
import { addProjectMember, listMembers, removeProjectMember } from "./service.js";

const createMember = z.object({ userId: z.uuid() }).strict();

export async function projectMembershipRoutes(app: FastifyInstance): Promise<void> {
  app.get<IdParams>("/projects/:id/members", authenticated, async (request) => {
    return { data: await listMembers(uuidParam(request.params.id), currentActor(request)) };
  });

  app.post<IdParams>("/projects/:id/members", adminOnly, async (request, reply) => {
    const projectId = uuidParam(request.params.id);
    const body = parseBody(createMember, request.body);
    return reply.code(201).send(await addProjectMember(currentActor(request), projectId, body.userId));
  });

  // DELETE /projects/:id/members/:userId: blocked by CoA assignments or pending approvals.
  app.delete<{ Params: { id: string; userId: string } }>(
    "/projects/:id/members/:userId",
    adminOnly,
    async (request, reply) => {
      await removeProjectMember(currentActor(request), uuidParam(request.params.id), uuidParam(request.params.userId));
      return reply.code(204).send();
    },
  );
}
