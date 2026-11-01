import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createUserSchema } from "@dokimos/shared";
import { adminOnly, authenticated, currentActor } from "../../auth/guards.js";
import { parseBody, uuidParam, type IdParams } from "../../lib/validation.js";
import { disconnectDeactivatedUser } from "../../realtime/index.js";
import * as users from "./service.js";

// An explicit `role: "USER"` is tolerated; ADMIN is rejected by the literal.
const createUser = createUserSchema.extend({ role: z.literal("USER").optional() });

export async function userRoutes(app: FastifyInstance): Promise<void> {
  // GET /users: every user, including inactive ones.
  app.get("/users", authenticated, async () => ({ data: await users.listUsers() }));

  // POST /users: creates an active USER account (ADMIN only; ADMIN accounts are never created here).
  app.post("/users", adminOnly, async (request, reply) => {
    return reply.code(201).send(await users.createUser(currentActor(request), parseBody(createUser, request.body)));
  });

  // DELETE /users/:id: logical deactivation; also closes the user's live sockets.
  app.delete<IdParams>("/users/:id", adminOnly, async (request, reply) => {
    // Canonical lowercase: socket rooms are keyed `user:<lowercase uuid>`.
    const userId = uuidParam(request.params.id).toLowerCase();
    await users.deactivateUser(currentActor(request), userId);
    disconnectDeactivatedUser(app, userId);
    return reply.code(204).send();
  });
}
