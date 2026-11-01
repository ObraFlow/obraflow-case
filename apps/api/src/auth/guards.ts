import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Role } from "@dokimos/shared";
import { errors } from "../lib/errors.js";
import { resolveIdentity, type AuthenticatedActor } from "./actor.js";

declare module "fastify" {
  interface FastifyRequest {
    // Only `authenticate` may establish this server-generated identity.
    actor: AuthenticatedActor | null;
  }
}

export function registerActorContext(app: FastifyInstance): void {
  app.decorateRequest("actor", null);
}

export async function authenticate(request: FastifyRequest): Promise<void> {
  request.actor = await resolveIdentity(request);
}

export function requireRole(role: Role) {
  return async (request: FastifyRequest): Promise<void> => {
    if (currentActor(request).role !== role) throw errors.forbidden();
  };
}

// currentActor: the authenticated actor of a request; handlers behind
// `authenticated` or `adminOnly` can rely on it.
export function currentActor(request: FastifyRequest): AuthenticatedActor {
  if (!request.actor) throw errors.loginRequired();
  return request.actor;
}

// Route options shared by every protected route.
export const authenticated = { preHandler: [authenticate] };
export const adminOnly = { preHandler: [authenticate, requireRole("ADMIN")] };
