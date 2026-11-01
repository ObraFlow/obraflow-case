import Link from "next/link";
import {
  urlDaLista,
  type FiltroLista,
  type FiltrosDaLista,
} from "@/components/aprovacoes/url-da-lista";
import { DIAS_PARA_ATRASO } from "@/domain/acompanhamento/estaAtrasado";
import { descreverIdade, nomeDoMesCurto } from "@/lib/datas";
import type { ResumoPedidosDto } from "@/lib/dto";
import { formatarCentavos } from "@/lib/money";
import { cn } from "@/lib/utils";

type Card = {
  filtro: FiltroLista;
  rotulo: string;
  valor: string;
  sublinha: string;
  /** Só o card "Minha decisão" é amarelo, e só quando há algo a decidir. */
  suaVez?: boolean;
};

/**
 * Quatro números no topo da lista, cada um um link para a aba correspondente. Ativo com a
 * mesma marca da aba ativa (borda inferior de 3px). "Atrasados" é neutro: não é ação de
 * quem olha, e vermelho aqui diria "rejeitado".
 */
export function CardsResumo({
  resumo,
  valores,
  temUsuario,
  agora,
}: {
  resumo: ResumoPedidosDto;
  valores: FiltrosDaLista;
  temUsuario: boolean;
  agora: string;
}) {
  const cards: Card[] = [
    {
      filtro: "minhas",
      rotulo: "Minha decisão",
      valor: temUsuario ? String(resumo.minhaDecisao.quantidade) : "—",
      sublinha: !temUsuario
        ? "escolha quem está agindo"
        : resumo.minhaDecisao.quantidade === 0
          ? "nada aguarda você"
          : formatarCentavos(resumo.minhaDecisao.totalCents),
      suaVez: temUsuario && resumo.minhaDecisao.quantidade > 0,
    },
    {
      filtro: "pendentes",
      rotulo: "Pendentes",
      valor: String(resumo.pendentes.quantidade),
      sublinha: formatarCentavos(resumo.pendentes.totalCents),
    },
    {
      filtro: "atrasados",
      rotulo: `Atrasados (${DIAS_PARA_ATRASO}+ dias)`,
      valor: String(resumo.atrasados.quantidade),
      sublinha: resumo.atrasados.maisAntigoDesde
        ? `o mais antigo espera ${descreverIdade(resumo.atrasados.maisAntigoDesde, agora)}`
        : "nenhum sem decisão",
    },
    {
      filtro: "aprovados",
      rotulo: "Aprovados no mês",
      valor: String(resumo.aprovadosNoMes.quantidade),
      sublinha: `${formatarCentavos(resumo.aprovadosNoMes.totalCents)} em ${nomeDoMesCurto(resumo.mes)}`,
    },
  ];

  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => {
        const ativo = valores.filtro === card.filtro;
        const conteudo = (
          <>
            <span className="text-xs font-semibold text-muted-foreground">{card.rotulo}</span>
            <span
              className={cn(
                "w-fit text-xl leading-none font-bold tabular-nums",
                card.suaVez && "rounded-sm bg-sinalizacao px-1.5 text-sinalizacao-foreground",
              )}
            >
              {card.valor}
            </span>
            <span className="truncate text-xs text-muted-foreground tabular-nums">
              {card.sublinha}
            </span>
          </>
        );
        const classe = cn(
          "relative flex h-full flex-col gap-0.5 rounded-sm border bg-card px-4 py-2",
          ativo &&
            "border-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-foreground",
        );
        return (
          <li key={card.filtro} className="min-w-0">
            {card.filtro === "minhas" && !temUsuario ? (
              <div className={classe}>{conteudo}</div>
            ) : (
              <Link
                href={urlDaLista({ obraId: valores.obraId, filtro: card.filtro })}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  classe,
                  "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset",
                )}
              >
                {conteudo}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
