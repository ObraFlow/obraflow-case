import type { AuditPage } from "@dokimos/shared";
import { request } from "@/lib/api";

export const getAuditEvents = (query: string, signal?: AbortSignal) =>
  request<AuditPage>(`/audit/events?${query}`, { signal });
