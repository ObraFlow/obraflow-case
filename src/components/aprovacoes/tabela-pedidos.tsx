import Link from "next/link";
import { BadgeSituacao } from "@/components/aprovacoes/badge-situacao";
import { DialogDecisao } from "@/components/aprovacoes/dialog-decisao";
import { CaixaMarcar, CaixaMarcarTodos } from "@/components/aprovacoes/selecao-pedidos";
import {
  temFiltroAtivo,
  urlDaLista,
  type FiltroLista,
  type FiltrosDaLista,
} from "@/components/aprovacoes/url-da-lista";
import { LinhaPedido } from "@/components/aprovacoes/linha-pedido";
import { CadeiaAlcada } from "@/components/alcada/cadeia-alcada";
import { DIAS_PARA_ATRASO } from "@/domain/acompanhamento/estaAtrasado";
import { aguardandoDesde, ehSuaVez, niveisDoPedido } from "@/lib/cadeia";
import { descreverIdade, formatarData } from "@/lib/datas";
import type { PedidoResumo } from "@/lib/dto";
import { formatarCentavos } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Etiqueta ao lado do número do pedido (docs/design.md > Etiqueta "Sua vez"). */
function EtiquetaSuaVez() {
  return (
    <span className="rounded-sm bg-sinalizacao px-1 text-[11px] leading-4 font-bold text-sinalizacao-foreground">
      Sua vez
    </span>
  );
}

/**
 * Link que cobre a linha inteira: o `after:` absoluto ocupa a linha (que é `relative`),
 * e os botões de decisão ficam acima dele com `relative`. Assim a linha é clicável sem
 * virar um <a> gigante e o texto do link continua sendo só o número do pedido.
 */
function LinkDoPedido({ pedido }: { pedido: PedidoResumo }) {
  return (
    <Link
      href={`/aprovacoes/${pedido.id}`}
      className="font-semibold font-stretch-[112%] tabular-nums after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
    >
      #{pedido.id}
      <span className="sr-only">, abrir detalhes do pedido</span>
    </Link>
  );
}

/** Uma frase do que não existe e a próxima ação, por aba (ui-obraflow > Estados). */
function EstadoVazio({
  filtro,
  temUsuario,
  comFiltro,
}: {
  filtro: FiltroLista;
  temUsuario: boolean;
  comFiltro: boolean;
}) {
  if (comFiltro) {
    return (
      <Vazio
        frase="Nenhum pedido com esses filtros."
        href={urlDaLista({ filtro })}
        acao="Limpar filtros"
      />
    );
  }
  if (filtro === "minhas" && !temUsuario) {
    return (
      <div className="flex flex-col items-start gap-2 rounded-sm border bg-card p-6">
        <p className="font-medium">Escolha quem está agindo para ver suas pendências.</p>
        <p className="text-muted-foreground">
          O seletor &ldquo;Agindo como&rdquo; fica no topo da página.
        </p>
      </div>
    );
  }
  switch (filtro) {
    case "minhas":
      return (
        <Vazio
          frase="Nenhum pedido aguarda a sua decisão."
          href={urlDaLista({ filtro: "pendentes" })}
          acao="Ver os pendentes"
        />
      );
    case "pendentes":
      return <Vazio frase="Nenhum pedido pendente." href="/pedidos/novo" acao="Cadastrar pedido" />;
    case "atrasados":
      return (
        <Vazio
          frase={`Nenhum pedido sem decisão há ${DIAS_PARA_ATRASO} dias ou mais.`}
          href={urlDaLista({ filtro: "pendentes" })}
          acao="Ver os pendentes"
        />
      );
    case "aprovados":
      return (
        <Vazio
          frase="Nenhum pedido aprovado ainda."
          href={urlDaLista({ filtro: "pendentes" })}
          acao="Ver os pendentes"
        />
      );
    case "rejeitados":
      return <Vazio frase="Nenhum pedido rejeitado." href="/aprovacoes" acao="Ver todos" />;
    case "todos":
      return (
        <Vazio
          frase="Nenhum pedido cadastrado."
          href="/pedidos/novo"
          acao="Criar o primeiro pedido"
        />
      );
  }
}

function Vazio({ frase, href, acao }: { frase: string; href: string; acao: string }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-sm border bg-card p-6">
      <p className="font-medium">{frase}</p>
      <Link href={href} className="font-medium underline underline-offset-4">
        {acao}
      </Link>
    </div>
  );
}

/**
 * Lista de pedidos (RSC). Tabela no desktop, blocos empilhados abaixo de `md`, com o mesmo
 * conteúdo. A linha do pedido que aguarda o usuário atual é a única coisa amarela da tela,
 * e só ela tem os botões: a explicação de por que os outros não podem ser decididos fica
 * no detalhe (ui-obraflow > Lista).
 */
export function TabelaPedidos({
  pedidos,
  usuarioAtualId,
  valores,
  agora,
}: {
  pedidos: PedidoResumo[];
  usuarioAtualId: number | null;
  valores: FiltrosDaLista;
  /** Instante de referência (ISO) para "há N dias": vem do server para bater na hidratação. */
  agora: string;
}) {
  // Pendente: há quanto tempo espera o aprovador da vez. Encerrado: nada.
  const idade = (pedido: PedidoResumo) => {
    const desde = aguardandoDesde(pedido);
    return desde === null ? null : descreverIdade(desde, agora);
  };
  if (pedidos.length === 0) {
    const comFiltro = temFiltroAtivo(valores);
    return (
      <EstadoVazio
        filtro={valores.filtro}
        temUsuario={usuarioAtualId !== null}
        comFiltro={comFiltro}
      />
    );
  }

  // Só as linhas da vez do usuário podem ser marcadas (e aprovadas de uma vez).
  const marcavel = (pedido: PedidoResumo) => ({
    id: pedido.id,
    fornecedorNome: pedido.fornecedorNome,
    totalCents: pedido.totalCents,
  });
  const daMinhaVez = pedidos.filter((pedido) => ehSuaVez(pedido, usuarioAtualId)).map(marcavel);

  return (
    <>
      {/* Celular: blocos empilhados. */}
      <div className="flex flex-col divide-y divide-linha rounded-sm border bg-card md:hidden">
        {pedidos.map((pedido) => {
          const suaVez = ehSuaVez(pedido, usuarioAtualId);
          const secundario = suaVez ? "text-foreground/80" : "text-muted-foreground";
          return (
            <LinhaPedido
              key={pedido.id}
              elemento="div"
              suaVez={suaVez}
              usuarioAtualId={usuarioAtualId}
              className="relative flex flex-col gap-2 px-3 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                {/* z-10: a caixa vem antes do link que cobre a linha e precisa ficar por cima dele. */}
                {suaVez && (
                  <span className="relative z-10 flex items-center">
                    <CaixaMarcar pedido={marcavel(pedido)} />
                  </span>
                )}
                <LinkDoPedido pedido={pedido} />
                {suaVez && <EtiquetaSuaVez />}
                <span className="ml-auto flex items-center gap-2">
                  {idade(pedido) && (
                    <span className={cn("text-xs", secundario)}>aguarda {idade(pedido)}</span>
                  )}
                  <BadgeSituacao status={pedido.status} />
                </span>
              </div>
              <p className="font-medium">{pedido.obraNome}</p>
              {/* Sobre o fundo amarelo o cinza secundário não alcança AA; no escuro ainda menos. */}
              <p className={secundario}>{pedido.fornecedorNome}</p>
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm tabular-nums">
                <span className={secundario}>{formatarData(pedido.dataPedido)}</span>
                <span className={secundario}>
                  {pedido.totalItens === 1 ? "1 item" : `${pedido.totalItens} itens`}
                </span>
                <span className="font-semibold">{formatarCentavos(pedido.totalCents)}</span>
              </div>
              <CadeiaAlcada niveis={niveisDoPedido(pedido)} />
              {suaVez && (
                <div className="relative pt-1">
                  <DialogDecisao pedido={pedido} />
                </div>
              )}
            </LinhaPedido>
          );
        })}
      </div>

      {/* Desktop: tabela. `relative` segura os textos sr-only dentro do container com rolagem. */}
      <div className="relative hidden overflow-x-auto rounded-sm border bg-card md:block">
        <table className="w-full border-collapse">
          <thead>
            {/* Obra e fornecedor são o contexto do pedido. A partir de xl (1280) a obra aparece
                inteira e o fornecedor abreviado a 160px (title com o nome): cabe sem rolar com 9px
                de folga, e acima disso o <main> para em 1200px, então não há mais espaço em 2xl.
                Abaixo de xl a obra é abreviada e o fornecedor some; Data e Itens só a partir de lg.
                Os blocos do celular mostram tudo. */}
            <tr className="border-b-2 border-foreground text-left text-xs font-semibold text-muted-foreground">
              {usuarioAtualId !== null && (
                <th scope="col" className="w-0 py-2.5 pr-0 pl-2.5">
                  <span className="flex items-center">
                    <CaixaMarcarTodos pedidos={daMinhaVez} />
                    {daMinhaVez.length === 0 && <span className="sr-only">Marcar</span>}
                  </span>
                </th>
              )}
              <th scope="col" className="px-2.5 py-2.5 whitespace-nowrap">
                Pedido
              </th>
              <th scope="col" className="px-2.5 py-2.5">
                Obra
              </th>
              <th scope="col" className="hidden px-2.5 py-2.5 xl:table-cell">
                Fornecedor
              </th>
              <th scope="col" className="hidden px-2.5 py-2.5 whitespace-nowrap lg:table-cell">
                Data
              </th>
              <th
                scope="col"
                className="hidden px-2.5 py-2.5 text-right whitespace-nowrap lg:table-cell"
              >
                Itens
              </th>
              <th scope="col" className="px-2.5 py-2.5 text-right whitespace-nowrap">
                Total
              </th>
              <th scope="col" className="px-2.5 py-2.5 whitespace-nowrap">
                Situação
              </th>
              <th scope="col" className="px-2.5 py-2.5 whitespace-nowrap">
                Alçada
              </th>
              <th scope="col" className="w-0 px-2.5 py-2.5" aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {pedidos.map((pedido) => {
              const suaVez = ehSuaVez(pedido, usuarioAtualId);
              const secundario = suaVez ? "text-foreground/80" : "text-muted-foreground";
              return (
                <LinhaPedido
                  key={pedido.id}
                  elemento="tr"
                  suaVez={suaVez}
                  usuarioAtualId={usuarioAtualId}
                  // Hover só nas linhas neutras: na linha "sua vez" ele apagaria o amarelo.
                  className={cn(
                    "relative border-b border-linha last:border-b-0",
                    !suaVez && "hover:bg-muted",
                  )}
                >
                  {/* py-3: linha de 46px (docs/design.md > Forma), igual ao skeleton. px-2.5 nas
                      células: com a idade ao lado do badge, 1134px só cabem sem rolar assim. */}
                  {usuarioAtualId !== null && (
                    <td className="w-0 py-3 pr-0 pl-2.5">
                      {suaVez && (
                        <span className="relative z-10 flex items-center">
                          <CaixaMarcar pedido={marcavel(pedido)} />
                        </span>
                      )}
                    </td>
                  )}
                  <td className="px-2.5 py-3 whitespace-nowrap">
                    <span className="flex items-center gap-2">
                      <LinkDoPedido pedido={pedido} />
                      {suaVez && <EtiquetaSuaVez />}
                    </span>
                  </td>
                  <td
                    className="max-w-44 truncate px-2.5 py-3 whitespace-nowrap xl:max-w-none"
                    title={pedido.obraNome}
                  >
                    {pedido.obraNome}
                  </td>
                  <td
                    className={cn("hidden max-w-40 truncate px-2.5 py-3 xl:table-cell", secundario)}
                    title={pedido.fornecedorNome}
                  >
                    {pedido.fornecedorNome}
                  </td>
                  <td className="hidden px-2.5 py-3 whitespace-nowrap tabular-nums lg:table-cell">
                    {formatarData(pedido.dataPedido)}
                  </td>
                  <td className="hidden px-2.5 py-3 text-right tabular-nums lg:table-cell">
                    {pedido.totalItens}
                  </td>
                  <td className="px-2.5 py-3 text-right font-semibold whitespace-nowrap tabular-nums">
                    {formatarCentavos(pedido.totalCents)}
                  </td>
                  <td className="px-2.5 py-3">
                    {/* Idade na mesma linha do badge: a tabela mantém as 46px em toda linha. */}
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <BadgeSituacao status={pedido.status} />
                      {idade(pedido) && (
                        <span className={cn("text-xs", secundario)}>{idade(pedido)}</span>
                      )}
                    </span>
                  </td>
                  <td className="px-2.5 py-3">
                    {/* A cadeia quebra linha (três níveis em uma linha são 300px) em vez de forçar rolagem. */}
                    <CadeiaAlcada niveis={niveisDoPedido(pedido)} />
                  </td>
                  <td className="w-0 px-2.5 py-1 text-right whitespace-nowrap">
                    {suaVez && (
                      <span className="relative inline-flex">
                        <DialogDecisao pedido={pedido} />
                      </span>
                    )}
                  </td>
                </LinhaPedido>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
