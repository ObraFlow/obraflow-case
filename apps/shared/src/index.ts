// Contracts shared by the API and the web: request schemas both sides validate, and
// the response shapes the API returns. Importing from here keeps them in step.

export const API_PREFIX = "/api/v1" as const;

export type { Role } from "./roles.js";
export * from "./audit.js";
export * from "./coa.js";
export * from "./demo.js";
export * from "./errors.js";
export * from "./money.js";
export * from "./projects.js";
export * from "./purchase-orders.js";
export * from "./realtime.js";
export * from "./suppliers.js";
export * from "./users.js";
