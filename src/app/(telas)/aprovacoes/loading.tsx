import { Skeleton } from "@/components/ui/skeleton";

/** Mesmo formato da lista: título, abas e tabela de pedidos com 6 linhas. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Carregando aprovações">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-[-0.015em]">Aprovações</h1>
        <Skeleton className="h-4 w-64 rounded-sm" />
      </div>
      <div className="flex gap-1 border-b border-border">
        <Skeleton className="mb-2 h-6 w-32 rounded-sm" />
        <Skeleton className="mb-2 ml-3 h-6 w-48 rounded-sm" />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Skeleton className="h-[38px] w-44 rounded-sm" />
        <Skeleton className="h-[38px] w-28 rounded-sm" />
        <Skeleton className="h-[38px] w-64 rounded-sm" />
        <Skeleton className="h-[38px] w-20 rounded-sm" />
      </div>
      {/* Pedido, Obra, Fornecedor, Data, Itens, Total, Situação, Alçada (ações colapsa). */}
      <div className="rounded-sm border bg-card">
        <div className="flex items-center gap-6 border-b-2 border-foreground px-3 py-3">
          <Skeleton className="h-3 w-12 rounded-sm" />
          <Skeleton className="h-3 w-40 rounded-sm" />
          <Skeleton className="hidden h-3 w-32 rounded-sm sm:block" />
          <Skeleton className="hidden h-3 w-16 rounded-sm sm:block" />
          <Skeleton className="hidden h-3 w-8 rounded-sm md:block" />
          <Skeleton className="ml-auto h-3 w-20 rounded-sm" />
          <Skeleton className="h-3 w-14 rounded-sm" />
          <Skeleton className="hidden h-3 w-36 rounded-sm md:block" />
        </div>
        {Array.from({ length: 8 }, (_, indice) => (
          <div
            key={indice}
            className="flex h-[46px] items-center gap-6 border-b border-linha px-3 last:border-b-0"
          >
            <Skeleton className="h-4 w-8 rounded-sm" />
            <Skeleton className="h-4 w-44 rounded-sm" />
            <Skeleton className="hidden h-4 w-32 rounded-sm sm:block" />
            <Skeleton className="hidden h-4 w-20 rounded-sm sm:block" />
            <Skeleton className="hidden h-4 w-4 rounded-sm md:block" />
            <Skeleton className="ml-auto h-4 w-24 rounded-sm" />
            <Skeleton className="h-5 w-16 rounded-sm" />
            <Skeleton className="hidden h-5 w-40 rounded-sm md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
