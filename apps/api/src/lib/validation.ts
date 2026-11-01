import { z, type ZodError, type ZodType } from "zod";
import { errors, HttpError, IssueCode, validation } from "./errors.js";

export type IdParams = { Params: { id: string } };

export function badInput(error: ZodError): HttpError {
  return validation(
    error.issues.map((issue) => ({
      field: issue.path.map(String).join("."),
      code: IssueCode.INVALID_FIELD,
      message: issue.message,
    })),
  );
}

export function parseBody<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw badInput(result.error);
}

export function uuidParam(value: string, field = "id"): string {
  const result = z.uuid().safeParse(value);
  if (!result.success) throw errors.invalidUuid(field);
  return result.data;
}
