import { z } from "zod";
import { orderStatusSchema } from "@dokimos/shared";

const page = z
  .string()
  .regex(/^[1-9]\d*$/)
  .refine((value) => Number(value) <= 2147483647);
const fields = {
  page,
  pageSize: page.refine((value) => Number(value) <= 100),
  status: orderStatusSchema,
  projectId: z.uuid(),
  actionableByMe: z.enum(["true", "false"]),
};

/** Browser context stays in the URL; only valid list filters cross the API boundary. */
export function normalizeOrdersQuery(params: URLSearchParams) {
  const query = new URLSearchParams();
  for (const key of ["page", "pageSize", "status", "projectId", "actionableByMe"] as const) {
    const value = params.get(key);
    if (value !== null && fields[key].safeParse(value).success) query.set(key, value);
  }
  return query;
}
