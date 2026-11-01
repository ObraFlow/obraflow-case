import { amountSchema } from "@dokimos/shared";

// Limits and totals are compared as whole cents (bigint), never as floating point.

/** A decimal amount string as cents, or null when it is not a valid amount. */
export function cents(value: string): bigint | null {
  if (!amountSchema.safeParse(value).success) return null;
  const [integer, fraction = ""] = value.split(".");
  return BigInt(integer) * 100n + BigInt(fraction.padEnd(2, "0"));
}
/** Cents back to a decimal amount string with two places. */
export function decimal(value: bigint) {
  return `${value / 100n}.${String(value % 100n).padStart(2, "0")}`;
}

/** Finite ceilings are inclusive; every level inherits its preceding approvers. */
export function approvalLevel(thresholds: readonly bigint[], total: bigint) {
  const finite = thresholds.findIndex((limit) => total <= limit);
  return finite === -1 ? thresholds.length : finite;
}
