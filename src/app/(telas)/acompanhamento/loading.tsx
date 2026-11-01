import { Skeleton } from "@/components/ui/skeleton";

function Titulo() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-5 w-48 rounded-sm" />
      <Skeleton className="h-4 w-72 max-w-full rounded-sm" />
    </div>
  );
}

/** Linhas com barra, como Orçamento das obras, Fila, Tempos e Fornecedores. */
function BlocoDeLinhas({ linhas, className }: { linhas: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-3 ${className ?? ""}`}>
      <Titulo />
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

/** Valor grande com barra e legenda, como Orçamento comprometido. */
function BlocoDeValor({ className }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-3 ${className ?? ""}`}>
      <Titulo />
      <div className="flex flex-col gap-3 rounded-sm border bg-card px-5 py-4">
        <Skeleton className="h-8 w-40 rounded-sm" />
        <Skeleton className="h-4 w-48 rounded-sm" />
        <Skeleton className="h-3 w-full rounded-sm" />
        <Skeleton className="h-4 w-full rounded-sm" />
        <Skeleton className="h-4 w-full rounded-sm" />
        <Skeleton className="h-4 w-full rounded-sm" />
      </div>
    </div>
  );
}

const ALTURAS = [40, 64, 48, 80, 56, 96];

/** Seis barras com alturas fixas, alinhadas embaixo, como Compras aprovadas por mês. */
function BlocoMensal({ className }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-3 ${className ?? ""}`}>
      <Titulo />
      <div className="rounded-sm border bg-card px-5 pt-4 pb-3">
        <div className="grid h-32 grid-cols-6 items-end gap-2">
          {ALTURAS.map((altura, indice) => (
            <Skeleton key={indice} className="w-full rounded-sm" style={{ height: altura }} />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-6 gap-2">
          {ALTURAS.map((_, indice) => (
            <Skeleton key={indice} className="mx-auto h-3 w-6 rounded-sm" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Lista em colunas, como Últimas movimentações. */
function BlocoDeMovimentacoes({ className }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-3 ${className ?? ""}`}>
      <Titulo />
      <div className="grid divide-y divide-linha rounded-sm border bg-card md:grid-cols-2 md:divide-y-0 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, indice) => (
          <div key={indice} className="flex flex-col gap-2 px-5 py-3">
            <Skeleton className="h-4 w-48 rounded-sm" />
            <Skeleton className="h-3 w-40 rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Mesma grade da tela: cabeçalho e os sete blocos nas mesmas posições. */
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
          <Skeleton className="h-4 w-72 max-w-full rounded-sm" />
        </div>
        <div className="flex flex-col gap-1 sm:items-end">
          <Skeleton className="h-6 w-32 rounded-sm" />
          <Skeleton className="h-3 w-36 rounded-sm" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <BlocoDeLinhas linhas={2} className="lg:col-span-7" />
        <BlocoDeValor className="lg:col-span-5" />
        <BlocoMensal className="lg:col-span-7" />
        <BlocoDeLinhas linhas={3} className="lg:col-span-5" />
        <BlocoDeLinhas linhas={2} className="lg:col-span-6" />
        <BlocoDeLinhas linhas={2} className="lg:col-span-6" />
        <BlocoDeMovimentacoes className="lg:col-span-12" />
      </div>
    </div>
  );
}
