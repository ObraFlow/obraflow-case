import type { Identity } from "@dokimos/shared";
import { request } from "@/lib/api";

export const login = (username: string, password: string) =>
  request<{ accessToken: string; user: Identity }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
export const getIdentity = (signal?: AbortSignal) => request<Identity>("/auth/me", { signal });
