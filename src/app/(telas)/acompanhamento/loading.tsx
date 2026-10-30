import { Skeleton } from "@/components/ui/skeleton";

function BlocoSkeleton({ linhas }: { linhas: number }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-40 rounded-sm" />
        <Skeleton className="h-4 w-72 max-w-full rounded-sm" />
      </div>
      <div className="flex flex-col divide-y divide-linha rounded-sm border bg-card">
        {Array.from({ length: linhas }, (_, indice) => (
          <div key={indice} className="flex flex-col gap-2 px-5 py-4">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-44 rounded-sm" />
              <Skeleton className="h-4 w-24 rounded-sm" />
            </div>
            <Skeleton className="h-2 w-full rounded-sm" />
            <Skeleton className="h-4 w-56 max-w-full rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Mesmo formato da tela: título e três blocos de linhas com barra. */
export default function Loading() {
  return (
    <div
      role="status"
      className="flex flex-col gap-5"
      aria-busy="true"
      aria-label="Carregando acompanhamento"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-[-0.015em] font-stretch-[112%]">
            Acompanhamento
          </h1>
          <Skeleton className="h-4 w-56 rounded-sm" />
        </div>
        <div className="flex flex-col gap-1 sm:items-end">
          <Skeleton className="h-6 w-32 rounded-sm" />
          <Skeleton className="h-3 w-36 rounded-sm" />
        </div>
      </div>
      <BlocoSkeleton linhas={2} />
      <div className="grid gap-5 lg:grid-cols-2">
        <BlocoSkeleton linhas={2} />
        <BlocoSkeleton linhas={2} />
      </div>
    </div>
  );
}
