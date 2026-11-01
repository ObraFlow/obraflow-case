import { auditQuerySchema } from "@dokimos/shared";

/** Keep the existing timestamp/filter contract; discard malformed or UI-only values. */
export function normalizeAuditQuery(params: URLSearchParams) {
  const query = new URLSearchParams();
  for (const key of ["eventType", "projectId", "from", "to", "page", "pageSize"] as const) {
    const value = params.get(key);
    if (value !== null && auditQuerySchema.shape[key].safeParse(value).success) query.set(key, value);
  }
  const from = query.get("from"),
    to = query.get("to");
  if (from && to && Date.parse(from) >= Date.parse(to)) {
    query.delete("from");
    query.delete("to");
  }
  return query;
}
