import { Skeleton } from "@/components/ui/skeleton";

/**
 * Esqueleto no formato de uma tabela de pedidos ou regras: título, uma linha de filtros,
 * cabeçalho e N linhas. Usado pelos loading.tsx das listas (ui-obraflow > Estados).
 */
export function SkeletonTabela({ titulo, linhas = 6 }: { titulo: string; linhas?: number }) {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label={`Carregando ${titulo}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-[-0.015em]">{titulo}</h1>
          <Skeleton className="h-4 w-56 rounded-sm" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-40 rounded-sm" />
          <Skeleton className="h-8 w-28 rounded-sm" />
        </div>
      </div>
      <div className="rounded-sm border bg-card">
        <div className="flex gap-3 border-b-2 border-foreground px-3 py-3">
          <Skeleton className="h-3 w-16 rounded-sm" />
          <Skeleton className="h-3 w-20 rounded-sm" />
          <Skeleton className="h-3 w-40 rounded-sm" />
          <Skeleton className="hidden h-3 w-32 rounded-sm sm:block" />
          <Skeleton className="ml-auto h-3 w-20 rounded-sm" />
          <Skeleton className="h-3 w-14 rounded-sm" />
        </div>
        {Array.from({ length: linhas }, (_, indice) => (
          <div
            key={indice}
            className="flex items-center gap-3 border-b border-linha px-3 py-3.5 last:border-b-0"
          >
            <Skeleton className="h-4 w-10 rounded-sm" />
            <Skeleton className="h-4 w-20 rounded-sm" />
            <Skeleton className="h-4 w-44 rounded-sm" />
            <Skeleton className="hidden h-4 w-36 rounded-sm sm:block" />
            <Skeleton className="ml-auto h-4 w-24 rounded-sm" />
            <Skeleton className="h-5 w-16 rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}
