import { Skeleton } from "@/components/ui/skeleton";

/** Mesmo formato da tela: título com seletor de obra, tabela de faixas (3 linhas) e simulador. */
export default function Loading() {
  return (
    <div
      role="status"
      className="flex flex-col gap-5"
      aria-busy="true"
      aria-label="Carregando regras de alçada"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-[-0.015em] font-stretch-[112%]">
            Regras de alçada
          </h1>
          <Skeleton className="h-4 w-80 rounded-sm" />
        </div>
        <div className="flex flex-col gap-1 sm:items-end">
          <Skeleton className="h-6 w-8 rounded-sm" />
          <Skeleton className="h-3 w-32 rounded-sm" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-[38px] w-64 rounded-sm" />
          <Skeleton className="h-[38px] w-28 rounded-sm" />
        </div>
      </div>
      <div className="rounded-sm border bg-card">
        <div className="flex gap-3 border-b-2 border-foreground px-3 py-3">
          <Skeleton className="h-3 w-16 rounded-sm" />
          <Skeleton className="h-3 w-44 rounded-sm" />
          <Skeleton className="ml-auto h-3 w-24 rounded-sm" />
        </div>
        {Array.from({ length: 3 }, (_, indice) => (
          <div
            key={indice}
            className="flex items-center gap-3 border-b border-linha px-3 py-3 last:border-b-0"
          >
            <Skeleton className="h-4 w-44 rounded-sm" />
            <Skeleton className="h-5 w-24 rounded-sm" />
            <Skeleton className="h-5 w-28 rounded-sm" />
            <Skeleton className="ml-auto h-7 w-28 rounded-sm" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 rounded-sm border bg-card p-5">
        <Skeleton className="h-5 w-32 rounded-sm" />
        <Skeleton className="h-4 w-80 rounded-sm" />
        <Skeleton className="h-[38px] w-72 rounded-sm" />
      </div>
    </div>
  );
}
