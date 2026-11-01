import type { FastifyRequest } from "fastify";
import { z } from "zod";
import type { Identity, Role } from "@dokimos/shared";
import { dataSource } from "../db/data-source.js";
import { errors } from "../lib/errors.js";
import { findUser } from "../modules/users/repository.js";

export interface Actor {
  readonly id: string;
  readonly role: Role;
}

export interface AuthenticatedActor extends Actor {
  readonly username: string;
  readonly displayName: string;
}

export function toIdentity(user: AuthenticatedActor): Identity {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  };
}

// resolveIdentity: verifies the bearer token and re-reads the account, so a
// deactivated user loses access immediately rather than when the token expires.
export async function resolveIdentity(request: FastifyRequest): Promise<AuthenticatedActor> {
  try {
    await request.jwtVerify();
  } catch {
    throw errors.loginRequired();
  }
  const payload = request.user as { sub?: unknown };
  const subject = z.uuid().safeParse(payload.sub);
  if (!subject.success) throw errors.invalidSession();
  const user = await findUser(dataSource.manager, subject.data);
  if (!user || !user.isActive) throw errors.inactiveSession();
  return toIdentity(user);
}
