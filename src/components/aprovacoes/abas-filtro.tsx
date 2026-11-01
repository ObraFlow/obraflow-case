import Link from "next/link";
import {
  urlDaLista,
  type FiltroLista,
  type FiltrosDaLista,
} from "@/components/aprovacoes/url-da-lista";
import { CLASSE_LINK_PENDENTE, MarcadorPendente } from "@/components/layout/marcador-pendente";
import type { ResumoPedidosDto } from "@/lib/dto";
import { cn } from "@/lib/utils";

export type { FiltroLista };

type Aba = { chave: FiltroLista; rotulo: string; rotuloCurto?: string; contagem?: number };

/**
 * Abas por link (a lista continua Server Component); a obra escolhida acompanha. As três
 * primeiras mostram a contagem; só a de "Aguardando minha decisão" é amarela, porque é a
 * única coisa aqui que é "sua vez".
 */
export function AbasFiltro({
  valores,
  resumo,
  temUsuario,
}: {
  valores: FiltrosDaLista;
  resumo: ResumoPedidosDto;
  temUsuario: boolean;
}) {
  const abas: Aba[] = [
    {
      chave: "minhas",
      rotulo: "Aguardando minha decisão",
      rotuloCurto: "Minha decisão",
      contagem: temUsuario ? resumo.minhaDecisao.quantidade : undefined,
    },
    { chave: "pendentes", rotulo: "Pendentes", contagem: resumo.pendentes.quantidade },
    { chave: "atrasados", rotulo: "Atrasados", contagem: resumo.atrasados.quantidade },
    { chave: "aprovados", rotulo: "Aprovados" },
    { chave: "rejeitados", rotulo: "Rejeitados" },
    { chave: "todos", rotulo: "Todos" },
  ];

  return (
    <nav
      aria-label="Filtro de pedidos"
      // `overflow-x-auto` força overflow-y auto; sem `overflow-y-hidden`, o `-mb-px` dos links
      // criaria uma barra de rolagem vertical de 1px.
      className="-mx-4 flex [scrollbar-width:none] gap-1 overflow-x-auto overflow-y-hidden border-b border-border px-4 sm:mx-0 sm:px-0"
    >
      {abas.map((aba) => {
        const ativa = aba.chave === valores.filtro;
        const amarela = aba.chave === "minhas" && (aba.contagem ?? 0) > 0;
        return (
          <Link
            key={aba.chave}
            href={urlDaLista({ obraId: valores.obraId, filtro: aba.chave })}
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
            {aba.rotuloCurto ? (
              <>
                <span className="sm:hidden">{aba.rotuloCurto}</span>
                <span className="max-sm:sr-only">{aba.rotulo}</span>
              </>
            ) : (
              aba.rotulo
            )}
            {aba.contagem !== undefined &&
              (amarela ? (
                <span className="rounded-sm bg-sinalizacao px-1.5 text-[11px] leading-[18px] font-bold text-sinalizacao-foreground tabular-nums">
                  {aba.contagem}
                  <span className="sr-only">
                    {aba.contagem === 1 ? " pedido aguardando" : " pedidos aguardando"}
                  </span>
                </span>
              ) : (
                <span className="text-xs text-muted-foreground tabular-nums">{aba.contagem}</span>
              ))}
          </Link>
        );
      })}
    </nav>
  );
}
