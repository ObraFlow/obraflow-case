import { Skeleton } from "@/components/ui/skeleton";

/** Mesmo formato do formulário: dados gerais em duas colunas, tabela de itens, rodapé com total. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Carregando novo pedido">
      <h1 className="text-2xl font-bold tracking-[-0.015em]">Novo pedido</h1>
      <div className="flex flex-col gap-5 rounded-sm border bg-card p-5">
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, indice) => (
            <div key={indice} className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-20 rounded-sm" />
              <Skeleton className="h-9 w-full rounded-sm" />
            </div>
          ))}
        </div>
        <div className="flex flex-col">
          <div className="flex gap-3 border-b-2 border-foreground py-2">
            <Skeleton className="h-3 w-40 rounded-sm" />
            <Skeleton className="ml-auto h-3 w-16 rounded-sm" />
            <Skeleton className="h-3 w-12 rounded-sm" />
            <Skeleton className="h-3 w-24 rounded-sm" />
          </div>
          <div className="flex gap-3 border-b border-linha py-3">
            <Skeleton className="h-9 flex-1 rounded-sm" />
            <Skeleton className="h-9 w-20 rounded-sm" />
            <Skeleton className="h-9 w-16 rounded-sm" />
            <Skeleton className="h-9 w-28 rounded-sm" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          <Skeleton className="h-4 w-48 rounded-sm" />
          <Skeleton className="h-9 w-36 rounded-sm" />
        </div>
      </div>
    </div>
  );
}
