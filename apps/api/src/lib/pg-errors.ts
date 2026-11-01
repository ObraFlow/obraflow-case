// PostgreSQL error classification by SQLSTATE. TypeORM exposes the code on the error
// itself or on `driverError`, depending on where it was raised.

function hasSqlState(error: unknown, states: ReadonlySet<string>): boolean {
  if (!error || typeof error !== "object") return false;
  const outer = error as { code?: string; driverError?: { code?: string } };
  return states.has(outer.code ?? "") || states.has(outer.driverError?.code ?? "");
}

const UNIQUE_VIOLATION = new Set(["23505"]);
// Input that passes JSON validation but PostgreSQL cannot store: a NUL character in
// text (22021) or a date such as year 0000 (22007, 22008). These are client errors.
const INVALID_DATA = new Set(["22007", "22008", "22021"]);

export const isUniqueViolation = (error: unknown) => hasSqlState(error, UNIQUE_VIOLATION);

export const isInvalidData = (error: unknown) => hasSqlState(error, INVALID_DATA);
