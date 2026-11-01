import type { FastifyInstance } from "fastify";
import jwt from "@fastify/jwt";

// This single application uses a dedicated signing secret without issuer/audience claims.
// The secret is mandatory; token lifetime defaults to 30 minutes.
export async function registerJwt(app: FastifyInstance): Promise<void> {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be supplied and contain at least 32 characters");
  }

  // Require subject and expiry and pin verification to HS256.
  await app.register(jwt, {
    secret,
    sign: {
      algorithm: "HS256",
      expiresIn: process.env.JWT_TTL ?? "30m",
    },
    verify: {
      algorithms: ["HS256"],
      requiredClaims: ["sub", "exp"],
    },
  });
}
