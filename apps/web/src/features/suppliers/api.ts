import type { z } from "zod";
import { createSupplierSchema, type SupplierSummary } from "@dokimos/shared";
import { request } from "@/lib/api";

export const getSuppliers = (signal?: AbortSignal) => request<{ data: SupplierSummary[] }>("/suppliers", { signal });
export const createSupplier = (input: z.infer<typeof createSupplierSchema>) =>
  request<SupplierSummary>("/suppliers", { method: "POST", body: JSON.stringify(input) });
export const deactivateSupplier = (id: string) =>
  request<void>(`/suppliers/${encodeURIComponent(id)}`, { method: "DELETE" });
export const renameSupplier = (id: string, name: string) =>
  request<SupplierSummary>(`/suppliers/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ name }) });
