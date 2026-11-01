import type { CoaConfiguration, CoaRevision, ReplaceCoa } from "@dokimos/shared";
import { request } from "@/lib/api";

export const getCoa = (id: string, signal?: AbortSignal) =>
  request<CoaConfiguration>(`/projects/${encodeURIComponent(id)}/coa`, { signal });
export const getCoaRevisions = (id: string, signal?: AbortSignal) =>
  request<{ data: CoaRevision[] }>(`/projects/${encodeURIComponent(id)}/coa/revisions`, { signal });
export const replaceCoa = (id: string, input: ReplaceCoa) =>
  request<CoaConfiguration>(`/projects/${encodeURIComponent(id)}/coa`, { method: "PUT", body: JSON.stringify(input) });
