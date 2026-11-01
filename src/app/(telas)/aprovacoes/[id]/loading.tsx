import { Skeleton } from "@/components/ui/skeleton";

/** Mesmo formato do detalhe: cabeçalho, faixa de decisão, tabela de itens e timeline. */
export default function Loading() {
  return (
    <div
      role="status"
      className="flex flex-col gap-5"
      aria-busy="true"
      aria-label="Carregando pedido"
    >
      <div className="flex flex-col gap-3">
        {/* Trilha "Aprovações / #12". */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20 rounded-sm" />
          <Skeleton className="h-4 w-2 rounded-sm" />
          <Skeleton className="h-4 w-8 rounded-sm" />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-40 rounded-sm" />
            <Skeleton className="h-4 w-96 max-w-full rounded-sm" />
          </div>
          <Skeleton className="h-8 w-36 rounded-sm" />
        </div>
      </div>
      <Skeleton className="h-14 w-full rounded-sm" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-36 rounded-sm" />
          <div className="rounded-sm border bg-card">
            <div className="flex gap-3 border-b-2 border-foreground px-3 py-3">
              <Skeleton className="h-3 w-40 rounded-sm" />
              <Skeleton className="ml-auto h-3 w-16 rounded-sm" />
              <Skeleton className="h-3 w-12 rounded-sm" />
              <Skeleton className="h-3 w-20 rounded-sm" />
            </div>
            {Array.from({ length: 3 }, (_, indice) => (
              <div
                key={indice}
                className="flex items-center gap-3 border-b border-linha px-3 py-3 last:border-b-0"
              >
                <Skeleton className="h-4 w-48 rounded-sm" />
                <Skeleton className="ml-auto h-4 w-12 rounded-sm" />
                <Skeleton className="h-4 w-10 rounded-sm" />
                <Skeleton className="h-4 w-20 rounded-sm" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-20 rounded-sm" />
          <div className="flex flex-col gap-4 rounded-sm border bg-card px-5 py-4">
            {Array.from({ length: 2 }, (_, indice) => (
              <div key={indice} className="flex gap-3">
                <Skeleton className="size-7 rounded-sm" />
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-4 w-32 rounded-sm" />
                  <Skeleton className="h-3 w-44 rounded-sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
