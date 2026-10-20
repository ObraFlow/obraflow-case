import { z } from "zod";

const decimal = (places: number, positive: boolean) =>
  z
    .string()
    .max(20)
    .regex(
      new RegExp(`^\\d+(?:\\.\\d{1,${places}})?$`),
      `Informe um decimal com até ${places} casas.`,
    )
    .transform((value, context) => {
      const [integer, fraction = ""] = value.split(".");
      const normalized = `${integer.replace(/^0+(?=\d)/, "")}.${fraction.padEnd(places, "0")}`;
      const units = BigInt(normalized.replace(".", ""));
      if (units > 1000000n * 10n ** BigInt(places) || (positive && units === 0n)) {
        context.addIssue({ code: "custom", message: "Valor fora do limite permitido." });
        return z.NEVER;
      }
      return normalized;
    });

export const orderItemSchema = z
  .object({
    description: z.string().trim().min(1).max(200),
    quantity: decimal(3, true),
    unit: z.string().trim().min(1).max(16),
    unitPrice: decimal(2, false),
  })
  .strict();

export const createOrderSchema = z
  .object({
    projectId: z.uuid().transform((value) => value.toLowerCase()),
    supplierId: z.uuid().transform((value) => value.toLowerCase()),
    orderDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((value) => {
        const date = new Date(`${value}T00:00:00.000Z`);
        return (
          !Number.isNaN(date.valueOf()) &&
          date.toISOString().slice(0, 10) === value &&
          Number(value.slice(0, 4)) > 0
        );
      }, "Informe uma data válida."),
    notes: z
      .string()
      .trim()
      .max(2000)
      .nullable()
      .optional()
      .transform((value) => value || null),
    items: z.array(orderItemSchema).min(1).max(100),
  })
  .strict();

export const decisionSchema = z.discriminatedUnion("outcome", [
  z.object({ expectedVersion: z.number().int().min(1), outcome: z.literal("APPROVE") }).strict(),
  z
    .object({
      expectedVersion: z.number().int().min(1),
      outcome: z.literal("REJECT"),
      reason: z.string().trim().min(1).max(2000),
    })
    .strict(),
]);

export const orderQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1000000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
    projectId: z
      .uuid()
      .transform((value) => value.toLowerCase())
      .optional(),
    mine: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
    search: z
      .string()
      .trim()
      .regex(/^[a-fA-F0-9-]{1,36}$/)
      .optional(),
  })
  .strict();

export type CreateOrderInput = z.output<typeof createOrderSchema>;
export type DecisionInput = z.output<typeof decisionSchema>;
export type OrderQuery = z.output<typeof orderQuerySchema>;
