import argon2 from "argon2";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { dataSource } from "../db/data-source.js";
import { errors } from "../lib/errors.js";
import { parseBody } from "../lib/validation.js";
import { findUserByUsername } from "../modules/users/repository.js";
import { toIdentity } from "./actor.js";
import { authenticated, currentActor } from "./guards.js";

const loginBody = z
  .object({
    username: z.string().trim().min(1).max(64),
    password: z.string().min(1),
  })
  .strict();

// Same Argon2id parameters as real hashes. Verified when no usable account exists so
// unknown, inactive and wrong-password logins cost the same, not just look the same.
let unusableHash: Promise<string> | undefined;

const timingHash = () => (unusableHash ??= argon2.hash("timing-equalization-only", { type: argon2.argon2id }));

// Deliberately no rate limiting here; expected to be handled at load balancer/reverse proxy level.
export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/login", async (request) => {
    const body = parseBody(loginBody, request.body);
    const username = body.username.toLowerCase();
    const found = await findUserByUsername(dataSource.manager, username);
    const user = found?.isActive ? found : null;
    // A stored hash that cannot be parsed is a failed login, not a server error.
    const valid = await argon2.verify(user?.passwordHash ?? (await timingHash()), body.password).catch(() => false);
    if (!user || !valid) throw errors.invalidCredentials();
    const accessToken = app.jwt.sign({ sub: user.id });
    // Read only the token just signed here; TTL interpretation belongs to the signer.
    const { exp, iat } = app.jwt.decode<{ exp: number; iat: number }>(accessToken)!;
    return { accessToken, tokenType: "Bearer", expiresIn: exp - iat, user: toIdentity(user) };
  });

  app.get("/auth/me", authenticated, async (request) => toIdentity(currentActor(request)));
}
