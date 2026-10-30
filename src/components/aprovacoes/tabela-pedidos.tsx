import Link from "next/link";
import type { FiltroLista } from "@/components/aprovacoes/abas-filtro";
import { BadgeSituacao } from "@/components/aprovacoes/badge-situacao";
import { DialogDecisao } from "@/components/aprovacoes/dialog-decisao";
import { temFiltroAtivo, type FiltrosDaLista } from "@/components/aprovacoes/url-da-lista";
import { LinhaPedido } from "@/components/aprovacoes/linha-pedido";
import { CadeiaAlcada } from "@/components/alcada/cadeia-alcada";
import { aguardandoDesde, ehSuaVez, niveisDoPedido } from "@/lib/cadeia";
import { descreverIdade, formatarData } from "@/lib/datas";
import type { PedidoResumo } from "@/lib/dto";
import { formatarCentavos } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Etiqueta ao lado do número do pedido (docs/design.md > Etiqueta "Sua vez"). */
function EtiquetaSuaVez() {
  return (
    <span className="rounded-sm bg-sinalizacao px-1 text-[11px] leading-4 font-bold text-foreground">
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
      className="font-semibold tabular-nums after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
    >
      #{pedido.id}
      <span className="sr-only">, abrir detalhes do pedido</span>
    </Link>
  );
}

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
      <div className="flex flex-col items-start gap-2 rounded-sm border bg-card p-6">
        <p className="font-medium">Nenhum pedido com esses filtros.</p>
        <Link
          href={filtro === "minhas" ? "/aprovacoes?filtro=minhas" : "/aprovacoes"}
          className="font-medium underline underline-offset-4"
        >
          Limpar filtros
        </Link>
      </div>
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
  if (filtro === "minhas") {
    return (
      <div className="flex flex-col items-start gap-2 rounded-sm border bg-card p-6">
        <p className="font-medium">Nenhum pedido aguarda a sua decisão.</p>
        <Link href="/aprovacoes" className="font-medium underline underline-offset-4">
          Ver todos os pedidos
        </Link>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start gap-2 rounded-sm border bg-card p-6">
      <p className="font-medium">Nenhum pedido cadastrado.</p>
      <Link href="/pedidos/novo" className="font-medium underline underline-offset-4">
        Criar o primeiro pedido
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

  return (
    <>
      {/* Celular: blocos empilhados. */}
      <div className="flex flex-col divide-y divide-linha rounded-sm border bg-card md:hidden">
        {pedidos.map((pedido) => {
          const suaVez = ehSuaVez(pedido, usuarioAtualId);
          return (
            <LinhaPedido
              key={pedido.id}
              elemento="div"
              suaVez={suaVez}
              usuarioAtualId={usuarioAtualId}
              className="relative flex flex-col gap-2 px-3 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <LinkDoPedido pedido={pedido} />
                {suaVez && <EtiquetaSuaVez />}
                <span className="ml-auto flex items-center gap-2">
                  {idade(pedido) && (
                    <span className="text-xs text-muted-foreground">aguarda {idade(pedido)}</span>
                  )}
                  <BadgeSituacao status={pedido.status} />
                </span>
              </div>
              <p className="font-medium">{pedido.obraNome}</p>
              <p className="text-muted-foreground">{pedido.fornecedorNome}</p>
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm tabular-nums">
                <span className="text-muted-foreground">{formatarData(pedido.dataPedido)}</span>
                <span className="text-muted-foreground">
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
            {/* Entre md e xl o espaço é curto: Fornecedor só em xl, Data e Itens só a partir de lg
                (os blocos do celular mostram tudo). */}
            <tr className="border-b-2 border-foreground text-left text-xs font-semibold text-muted-foreground">
              <th scope="col" className="px-3 py-2.5 whitespace-nowrap">
                Pedido
              </th>
              <th scope="col" className="px-3 py-2.5">
                Obra
              </th>
              <th scope="col" className="hidden px-3 py-2.5 xl:table-cell">
                Fornecedor
              </th>
              <th scope="col" className="hidden px-3 py-2.5 whitespace-nowrap lg:table-cell">
                Data
              </th>
              <th
                scope="col"
                className="hidden px-3 py-2.5 text-right whitespace-nowrap lg:table-cell"
              >
                Itens
              </th>
              <th scope="col" className="px-3 py-2.5 text-right whitespace-nowrap">
                Total
              </th>
              <th scope="col" className="px-3 py-2.5 whitespace-nowrap">
                Situação
              </th>
              <th scope="col" className="px-3 py-2.5 whitespace-nowrap">
                Alçada
              </th>
              <th scope="col" className="w-0 px-3 py-2.5" aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {pedidos.map((pedido) => {
              const suaVez = ehSuaVez(pedido, usuarioAtualId);
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
                  {/* py-3: linha de 46px (docs/design.md > Forma), igual ao skeleton. */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="flex items-center gap-2">
                      <LinkDoPedido pedido={pedido} />
                      {suaVez && <EtiquetaSuaVez />}
                    </span>
                  </td>
                  <td className="max-w-36 truncate px-3 py-3 lg:max-w-48" title={pedido.obraNome}>
                    {pedido.obraNome}
                  </td>
                  <td
                    className="hidden max-w-40 truncate px-3 py-3 text-muted-foreground xl:table-cell"
                    title={pedido.fornecedorNome}
                  >
                    {pedido.fornecedorNome}
                  </td>
                  <td className="hidden px-3 py-3 whitespace-nowrap tabular-nums lg:table-cell">
                    {formatarData(pedido.dataPedido)}
                  </td>
                  <td className="hidden px-3 py-3 text-right tabular-nums lg:table-cell">
                    {pedido.totalItens}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold whitespace-nowrap tabular-nums">
                    {formatarCentavos(pedido.totalCents)}
                  </td>
                  <td className="px-3 py-3">
                    {/* Idade na mesma linha do badge: a tabela mantém as 46px em toda linha. */}
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <BadgeSituacao status={pedido.status} />
                      {idade(pedido) && (
                        <span className="text-xs text-muted-foreground">{idade(pedido)}</span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {/* Entre md e xl a cadeia quebra linha em vez de forçar rolagem. */}
                    <CadeiaAlcada niveis={niveisDoPedido(pedido)} className="xl:flex-nowrap" />
                  </td>
                  <td className="w-0 px-3 py-1 text-right whitespace-nowrap">
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
