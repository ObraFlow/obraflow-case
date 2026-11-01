"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/* ---------- formatação ---------- */
export const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const toCents = (v: string) => Math.round(parseFloat(v.replace(/\./g, "").replace(",", ".")) * 100);

/* ---------- cliente da API ---------- */
export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      cache: "no-store",
      headers: { "Content-Type": "application/json", "X-User-Id": localStorage.getItem("uid") ?? "", ...init?.headers },
    });
  } catch {
    throw new Error("Sem resposta da API");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message ?? `A API respondeu com erro ${res.status}`);
  return body as T;
}

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const controllerRef = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    controllerRef.current?.abort();
    if (!path) {
      setData(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);
    try { setData(await api<T>(path, { signal: controller.signal })); }
    catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    }
    finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null);
    load();
    return () => controllerRef.current?.abort();
  }, [load]);
  return { data, error, loading, reload: load };
}

/* usuário "logado" (simula autenticação; ver README) */
export function useUid() {
  const [uid, setUid] = useState(0);
  useEffect(() => {
    const read = () => setUid(Number(localStorage.getItem("uid")) || 0);
    read();
    window.addEventListener("uid-change", read);
    return () => window.removeEventListener("uid-change", read);
  }, []);
  return uid;
}

/* ---------- estilos ---------- */
const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose disabled:cursor-not-allowed disabled:opacity-40";
export const btn = {
  dark: `${base} bg-night text-white hover:bg-black`,
  rose: `${base} bg-rose text-white hover:bg-[#c90f42]`,
  ghost: `${base} border border-line bg-white hover:bg-[#f4f4f7]`,
};
export const inp =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-muted/60 focus:border-rose focus:ring-2 focus:ring-rose/20";
export const card = "rounded-2xl border border-line bg-white";

/* ---------- peças compartilhadas ---------- */
export function Field({
  label, error, children, className = "", compact = false,
}: { label: string; error?: string | false | null; children: ReactNode; className?: string; compact?: boolean }) {
  return (
    <label className={`block ${className}`}>
      <span className={`mb-1.5 block text-sm font-medium ${compact ? "md:sr-only" : ""}`}>{label}</span>
      {children}
      {error && <span role="alert" className="mt-1 block text-xs text-rose">{error}</span>}
    </label>
  );
}

const ST = {
  PENDING: ["Pendente", "bg-amber-100 text-amber-800"],
  APPROVED: ["Aprovado", "bg-green-100 text-ok"],
  REJECTED: ["Rejeitado", "bg-rose-soft text-rose"],
} as const;
export function StatusBadge({ status }: { status: keyof typeof ST }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ST[status][1]}`}>{ST[status][0]}</span>;
}

export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-line" />)}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className={`${card} border-rose/30 bg-rose-soft p-6`}>
      <p className="font-semibold text-plum">Não foi possível carregar os dados</p>
      <p className="mt-1 text-sm text-muted">{message}. Confira se a API está no ar e tente de novo.</p>
      <button className={`${btn.dark} mt-4`} onClick={onRetry}>Tentar novamente</button>
    </div>
  );
}

export function Empty({ title, hint, children }: { title: string; hint: string; children?: ReactNode }) {
  return (
    <div className={`${card} border-dashed p-10 text-center`}>
      <p className="text-lg font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{hint}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

export function Async({
  loading, error, onRetry, children,
}: { loading: boolean; error: string | null; onRetry: () => void; children: ReactNode }) {
  if (loading) return <Skeleton />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  return <>{children}</>;
}