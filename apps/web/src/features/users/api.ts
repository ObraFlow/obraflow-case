import type { z } from "zod";
import { createUserSchema, type UserSummary } from "@dokimos/shared";
import { request } from "@/lib/api";

export const getUsers = (signal?: AbortSignal) => request<{ data: UserSummary[] }>("/users", { signal });
export const createUser = (input: z.infer<typeof createUserSchema>) =>
  request<UserSummary>("/users", { method: "POST", body: JSON.stringify(input) });
export const deactivateUser = (id: string) => request<void>(`/users/${encodeURIComponent(id)}`, { method: "DELETE" });
