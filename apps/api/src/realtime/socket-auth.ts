import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { dataSource } from "../db/data-source.js";
import { findUser } from "../modules/users/repository.js";

export interface SocketIdentity {
  id: string;
  // Epoch milliseconds at which the token, and so the connection, expires.
  expiresAt: number;
}

// socketIdentity: verifies the handshake token like a REST request would, then confirms
// the account is still active. Any failure rejects the connection.
export async function socketIdentity(app: FastifyInstance, token: unknown): Promise<SocketIdentity> {
  if (typeof token !== "string" || !token) throw new Error("UNAUTHENTICATED");
  const claims = app.jwt.verify<{ sub?: unknown; exp?: unknown }>(token, { requiredClaims: ["sub", "exp"] });
  const id = z.uuid().parse(claims.sub).toLowerCase();
  const exp = z
    .number()
    .int()
    .positive()
    .max(Number.MAX_SAFE_INTEGER / 1000)
    .parse(claims.exp);
  // The exp claim is in seconds, but we want milliseconds for the expiresAt property.
  if (exp * 1000 <= Date.now()) throw new Error("UNAUTHENTICATED");
  // if token is for an expired user we also do not allow the connection to be established
  const user = await findUser(dataSource.manager, id);
  if (!user?.isActive) throw new Error("UNAUTHENTICATED");
  return { id, expiresAt: exp * 1000 };
}
