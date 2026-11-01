import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { errors, HttpError } from "./errors.js";
import { isInvalidData } from "./pg-errors.js";
import { badInput } from "./validation.js";

// frameworkError: maps Fastify's own failures (malformed JSON, oversized body,
// wrong content type) to the API envelope.
function frameworkError(error: unknown): HttpError | null {
  const status = error && typeof error === "object" && "statusCode" in error ? error.statusCode : undefined;
  if (status === 400) return errors.invalidRequest();
  if (status === 413) return errors.payloadTooLarge();
  if (status === 415) return errors.unsupportedMediaType();
  return null;
}

// registerErrorHandling: every failure leaves as `{ error: { code, message, details } }`;
// anything unrecognised is logged and returned as a generic 500.
export function registerErrorHandling(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const known =
      error instanceof HttpError
        ? error
        : error instanceof ZodError
          ? badInput(error)
          : isInvalidData(error)
            ? errors.invalidData()
            : frameworkError(error);
    if (known) {
      return reply
        .code(known.status)
        .send({ error: { code: known.code, message: known.message, details: known.details } });
    }
    request.log.error({ err: error }, "Unhandled API error");
    const internal = errors.internal();
    return reply.code(internal.status).send({ error: { code: internal.code, message: internal.message, details: [] } });
  });

  app.setNotFoundHandler((_request, reply) => {
    const missing = errors.notFound("resource");
    return reply.code(missing.status).send({ error: { code: missing.code, message: missing.message, details: [] } });
  });
}
