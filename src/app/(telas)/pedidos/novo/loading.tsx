import { Skeleton } from "@/components/ui/skeleton";

/** Mesmo formato do formulário: título, dados gerais em duas colunas, itens, rodapé com total. */
export default function Loading() {
  return (
    <div
      role="status"
      className="flex flex-col gap-5"
      aria-busy="true"
      aria-label="Carregando novo pedido"
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-[-0.015em]">Novo pedido</h1>
        <Skeleton className="h-4 w-[520px] max-w-full rounded-sm" />
      </div>
      <div className="flex flex-col gap-6 rounded-sm border bg-card px-6 py-5">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-28 rounded-sm" />
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }, (_, indice) => (
              <div key={indice} className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-20 rounded-sm" />
                <Skeleton className="h-[38px] w-full rounded-sm" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-32 rounded-sm" />
          <div className="hidden gap-3 border-b-2 border-foreground pb-2 lg:flex">
            <Skeleton className="h-3 w-40 rounded-sm" />
            <Skeleton className="ml-auto h-3 w-16 rounded-sm" />
            <Skeleton className="h-3 w-12 rounded-sm" />
            <Skeleton className="h-3 w-24 rounded-sm" />
            <Skeleton className="h-3 w-16 rounded-sm" />
          </div>
          <div className="flex flex-col gap-3 border-b border-linha pb-3 lg:flex-row">
            <Skeleton className="h-[38px] flex-1 rounded-sm" />
            <Skeleton className="h-[38px] w-full rounded-sm lg:w-24" />
            <Skeleton className="h-[38px] w-full rounded-sm lg:w-20" />
            <Skeleton className="h-[38px] w-full rounded-sm lg:w-32" />
          </div>
          <Skeleton className="h-[38px] w-36 rounded-sm" />
        </div>
        <div className="flex flex-col gap-4 border-t-2 border-foreground pt-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28 rounded-sm" />
            <Skeleton className="h-6 w-32 rounded-sm" />
          </div>
          <Skeleton className="h-4 w-80 max-w-full rounded-sm" />
          <div className="flex justify-end">
            <Skeleton className="h-[38px] w-40 rounded-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
