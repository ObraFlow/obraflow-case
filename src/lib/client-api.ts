"use client";

import { useCallback, useEffect, useState } from "react";
import type { Entity, Page } from "./ui-types";

export const DEFAULT_USER = "66666666-6666-4666-8666-666666666666";
export class ApiError extends Error {
  constructor(public code: string, message: string, public fields: { path: string; message: string }[] = [], public status = 0) { super(message); }
}
export async function api<T>(path: string, actor: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`/api${path}`, { ...options, cache: "no-store", signal: controller.signal, headers: { "X-Demo-User-Id": actor, ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers } });
    const result = await response.json();
    if (!response.ok) throw new ApiError(result.error?.code ?? "UNKNOWN", result.error?.message ?? "Não foi possível concluir. Tente novamente.", result.error?.fieldErrors ?? [], response.status);
    return result as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("NETWORK", "A conexão não foi concluída. Verifique sua conexão e tente novamente.");
  } finally { clearTimeout(timeout); }
}
export function errorText(error: unknown): string { return error instanceof Error ? error.message : "Não foi possível carregar os dados."; }
export function useData<T>(path: string | null, actor: string) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string | null; source: string }>({ data: null, loading: true, error: null, source: "" });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  const source = `${actor}:${path}:${revision}`;
  useEffect(() => {
    let active = true;
    // Keep fetch and state transitions asynchronous; obsolete responses cannot replace a newer selection.
    Promise.resolve().then(async () => {
      if (!active) return;
      setState({ data: null, loading: !!path, error: null, source });
      if (!path) return;
      try { const data = await api<T>(path, actor); if (active) setState({ data, loading: false, error: null, source }); }
      catch (error) { if (active) setState({ data: null, loading: false, error: errorText(error), source }); }
    });
    return () => { active = false; };
  }, [path, actor, revision, source]);
  return state.source === source ? { ...state, reload } : { data: null, loading: !!path, error: null, reload };
}
export async function allEntities(path: string, actor: string): Promise<Entity[]> {
  const first = await api<Page<Entity>>(`${path}?pageSize=100`, actor);
  const remaining = await Promise.all(Array.from({ length: Math.max(0, first.pagination.totalPages - 1) }, (_, index) => api<Page<Entity>>(`${path}?pageSize=100&page=${index + 2}`, actor)));
  return [...first.data, ...remaining.flatMap(page => page.data)];
}
export function useEntities(path: string, actor: string) {
  const [state, setState] = useState<{ data: Entity[] | null; loading: boolean; error: string | null; source: string }>({ data: null, loading: true, error: null, source: "" });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  const source = `${actor}:${path}:${revision}`;
  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      if (!active) return;
      setState({ data: null, loading: true, error: null, source });
      try { const data = await allEntities(path, actor); if (active) setState({ data, loading: false, error: null, source }); }
      catch (error) { if (active) setState({ data: null, loading: false, error: errorText(error), source }); }
    });
    return () => { active = false; };
  }, [path, actor, revision, source]);
  return state.source === source ? { ...state, reload } : { data: null, loading: true, error: null, reload };
}
