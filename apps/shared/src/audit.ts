import { z } from "zod";
import type { Role } from "./roles.js";

export const projectAuditEventTypes = [
  "PROJECT_CREATED",
  "PROJECT_RENAMED",
  "PROJECT_ARCHIVED",
  "PROJECT_REACTIVATED",
  "PROJECT_MEMBER_ADDED",
  "PROJECT_MEMBER_REMOVED",
] as const;

export type ProjectAuditEventType = (typeof projectAuditEventTypes)[number];

export interface AuditProjectDetails {
  projectName: string;
  previousName: string | null;
  isActive: boolean;
  member: { userId: string; username: string; displayName: string } | null;
}

export const auditEventTypes = [
  ...projectAuditEventTypes,
  "SUPPLIER_CREATED",
  "SUPPLIER_RENAMED",
  "SUPPLIER_DISABLED",
  "ORDER_CREATED",
  "STEP_APPROVED",
  "STEP_REJECTED",
  "COA_REVISED",
  "USER_CREATED",
  "USER_DISABLED",
] as const;

export const auditEventTypeSchema = z.enum(auditEventTypes);

const positiveInteger = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .pipe(z.number().int().max(2147483647));
// Date-filter bounds must survive a round trip through JS Date and PostgreSQL timestamptz:
// at most millisecond precision, a year PostgreSQL accepts (1-9999, never 0000), and a
// UTC offset within +-15 hours.
const auditTimestamp = z.iso.datetime({ offset: true }).refine((value) => {
  const date = new Date(value),
    offset = value.match(/[+-](\d{2}):?\d{2}$/);
  const precision = value.match(/\.(\d+)/)?.[1].length ?? 0;
  const year = date.getUTCFullYear();
  return (
    Number.isFinite(date.getTime()) &&
    precision <= 3 &&
    !value.startsWith("0000-") &&
    year >= 1 &&
    year <= 9999 &&
    (!offset || Number(offset[1]) <= 15)
  );
}, "Informe uma data e hora válidas.");

export const auditQuerySchema = z
  .object({
    eventType: auditEventTypeSchema.optional(),
    projectId: z.uuid().optional(),
    from: auditTimestamp.optional(),
    to: auditTimestamp.optional(),
    page: positiveInteger.default(1),
    pageSize: positiveInteger.pipe(z.number().max(100)).default(20),
  })
  .strict()
  .refine((query) => !query.from || !query.to || Date.parse(query.from) < Date.parse(query.to), {
    path: ["to"],
    message: "O fim do período deve ser posterior ao início.",
  });

export type AuditQuery = z.output<typeof auditQuerySchema>;
export type AuditEventType = (typeof auditEventTypes)[number];

interface AuditEventBase {
  id: string;
  occurredAt: string;
  actor: { kind: "USER" | "SYSTEM" | "UNKNOWN"; id: string | null; displayName: string };
  project: { id: string; name: string } | null;
  resource: { kind: "PURCHASE_ORDER" | "PROJECT" | "USER" | "SUPPLIER"; id: string; name: string };
}

export interface AuditApprovalStep {
  stepIndex: number;
  approverId: string;
  approverName: string;
}

export type AuditEvent = AuditEventBase &
  (
    | { type: ProjectAuditEventType; details: AuditProjectDetails }
    | { type: "SUPPLIER_CREATED" | "SUPPLIER_DISABLED"; details: { name: string; isActive: boolean } }
    | { type: "SUPPLIER_RENAMED"; details: { previousName: string; name: string } }
    | {
        type: "ORDER_CREATED";
        details: {
          total: string;
          coaVersion: number;
          orderDate: string;
          itemCount: number;
          supplier: { id: string; name: string };
          steps: AuditApprovalStep[];
        };
      }
    | {
        type: "STEP_APPROVED" | "STEP_REJECTED";
        details: AuditApprovalStep & { reason: string | null; coaVersion: number };
      }
    | {
        type: "COA_REVISED";
        details: { version: number; bands: { upperLimit: string | null; approverId: string; approverName: string }[] };
      }
    | { type: "USER_CREATED" | "USER_DISABLED"; details: { username: string; displayName: string; role: Role } }
  );

export interface AuditPage {
  data: AuditEvent[];
  pagination: { page: number; pageSize: number; total: number };
}
