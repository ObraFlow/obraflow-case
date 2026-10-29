import Link from "next/link";
import { CLASSE_LINK_PENDENTE, MarcadorPendente } from "@/components/layout/marcador-pendente";
import { cn } from "@/lib/utils";

export type FiltroLista = "todos" | "minhas";

/**
 * Duas abas por link (a lista continua Server Component). O número só aparece na aba
 * "Aguardando minha decisão" e em amarelo, porque é a única coisa aqui que é "sua vez".
 */
export function AbasFiltro({ filtro, pendentes }: { filtro: FiltroLista; pendentes: number }) {
  const abas: Array<{ chave: FiltroLista; rotulo: string; rotuloCurto?: string; href: string }> = [
    { chave: "todos", rotulo: "Todos os pedidos", href: "/aprovacoes" },
    {
      chave: "minhas",
      rotulo: "Aguardando minha decisão",
      rotuloCurto: "Minha decisão",
      href: "/aprovacoes?filtro=minhas",
    },
  ];

  return (
    <nav
      aria-label="Filtro de pedidos"
      // `overflow-x-auto` força overflow-y auto; sem `overflow-y-hidden`, o `-mb-px` dos links
      // criaria uma barra de rolagem vertical de 1px.
      className="-mx-4 flex [scrollbar-width:none] gap-1 overflow-x-auto overflow-y-hidden border-b border-border px-4 sm:mx-0 sm:px-0"
    >
      {abas.map((aba) => {
        const ativa = aba.chave === filtro;
        return (
          <Link
            key={aba.chave}
            href={aba.href}
            aria-current={ativa ? "page" : undefined}
            className={cn(
              "-mb-px flex h-10 items-center gap-2 border-b-[3px] px-2 text-sm whitespace-nowrap focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset sm:px-3",
              CLASSE_LINK_PENDENTE,
              ativa
                ? "border-foreground font-semibold text-foreground"
                : "border-transparent font-medium text-muted-foreground hover:text-foreground",
            )}
          >
            <MarcadorPendente />
            {/* Em 375 as duas abas com o contador não cabem com o rótulo inteiro. */}
            {aba.rotuloCurto ? (
              <>
                <span className="sm:hidden">{aba.rotuloCurto}</span>
                <span className="max-sm:sr-only">{aba.rotulo}</span>
              </>
            ) : (
              aba.rotulo
            )}
            {aba.chave === "minhas" && pendentes > 0 && (
              <span className="rounded-sm bg-sinalizacao px-1.5 text-[11px] leading-[18px] font-bold text-foreground tabular-nums">
                {pendentes}
                <span className="sr-only">
                  {pendentes === 1 ? " pedido aguardando" : " pedidos aguardando"}
                </span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
