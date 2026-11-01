import { connection } from "next/server";
import { AbasFiltro } from "@/components/aprovacoes/abas-filtro";
import { CardsResumo } from "@/components/aprovacoes/cards-resumo";
import { FiltrosPedidos } from "@/components/aprovacoes/filtros-pedidos";
import { Paginacao } from "@/components/aprovacoes/paginacao";
import { BarraSelecao, SelecaoPedidos } from "@/components/aprovacoes/selecao-pedidos";
import { TabelaPedidos } from "@/components/aprovacoes/tabela-pedidos";
import { lerFiltroLista, type FiltrosDaLista } from "@/components/aprovacoes/url-da-lista";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { DIAS_PARA_ATRASO } from "@/domain/acompanhamento/estaAtrasado";
import { ehSuaVez } from "@/lib/cadeia";
import type { PedidoResumo } from "@/lib/dto";
import { filtroPedidosSchema, paginacaoSchema, type FiltroPedidos } from "@/lib/schemas/pedido";
import { listarObras } from "@/server/services/cadastros";
import { paginarPedidos, resumoPedidos } from "@/server/services/pedidos";
import { usuarioAtualId } from "@/server/usuario-atual";

export const metadata = { title: "Aprovações" };

type ParametrosDaUrl = {
  filtro?: string;
  obra?: string;
  busca?: string;
  pagina?: string;
};

/** O que cada aba pede ao service. */
function filtroDaAba(
  filtro: FiltrosDaLista["filtro"],
  usuarioId: number | null,
): Partial<FiltroPedidos> {
  switch (filtro) {
    case "minhas":
      return { pendentesPara: usuarioId ?? undefined };
    case "pendentes":
      return { status: "PENDENTE" };
    case "atrasados":
      return { status: "PENDENTE", atrasadoHaDias: DIAS_PARA_ATRASO };
    case "aprovados":
      return { status: "APROVADO" };
    case "rejeitados":
      return { status: "REJEITADO" };
    case "todos":
      return {};
  }
}

/**
 * Lista de pedidos com a alçada de cada um. Tudo que muda a lista vive na URL (aba, obra,
 * busca, página), então a página continua Server Component e o link é compartilhável. Os
 * filtros e a paginação rodam no banco (`paginarPedidos`); os números dos cards e das abas
 * vêm de `resumoPedidos`, já recortados pela obra. Pedidos mudam a cada decisão e não são
 * cacheados: a leitura vem depois de `connection()`.
 */
export default async function AprovacoesPage({
  searchParams,
}: {
  searchParams: Promise<ParametrosDaUrl>;
}) {
  const [parametros, usuarioId, obras] = await Promise.all([
    searchParams,
    usuarioAtualId(),
    listarObras(),
  ]);

  const filtro = lerFiltroLista(parametros.filtro);
  // Valor inválido na URL (obra que não existe) vira "sem filtro".
  const lidos = filtroPedidosSchema.safeParse({
    obraId: parametros.obra || undefined,
    busca: parametros.busca || undefined,
  });
  const filtros = lidos.success ? lidos.data : {};
  const paginacao = paginacaoSchema.parse({ pagina: parametros.pagina });

  const valores: FiltrosDaLista = {
    filtro,
    obraId: filtros.obraId ?? null,
    busca: filtros.busca ?? "",
  };

  await connection();
  const [pagina, resumo] = await Promise.all([
    paginarPedidos({ ...filtros, ...filtroDaAba(filtro, usuarioId) }, paginacao),
    resumoPedidos(usuarioId, filtros.obraId),
  ]);

  // Na aba "Todos", o que precisa da decisão do usuário vem primeiro, depois os outros
  // pendentes, depois os encerrados; dentro de cada grupo fica a ordem do banco.
  const grupo = (pedido: PedidoResumo) =>
    ehSuaVez(pedido, usuarioId) ? 0 : pedido.status === "PENDENTE" ? 1 : 2;
  const itens =
    filtro === "todos" ? [...pagina.itens].sort((a, b) => grupo(a) - grupo(b)) : pagina.itens;

  // Sem usuário, a aba "minhas" não tem como existir: a tabela mostra o aviso.
  const semUsuarioNaAbaMinhas = filtro === "minhas" && usuarioId === null;
  const agora = new Date().toISOString();

  return (
    <>
      <CabecalhoPagina
        titulo="Aprovações"
        descricao="Abra um pedido para ver itens e histórico, ou marque os da sua vez para aprovar de uma vez."
      />

      <CardsResumo
        resumo={resumo}
        valores={valores}
        temUsuario={usuarioId !== null}
        agora={agora}
      />

      <AbasFiltro valores={valores} resumo={resumo} temUsuario={usuarioId !== null} />

      <FiltrosPedidos obras={obras} valores={valores} />

      <SelecaoPedidos>
        <BarraSelecao />
        <TabelaPedidos
          pedidos={semUsuarioNaAbaMinhas ? [] : itens}
          usuarioAtualId={usuarioId}
          valores={valores}
          agora={agora}
        />
      </SelecaoPedidos>

      {!semUsuarioNaAbaMinhas && <Paginacao pagina={pagina} valores={valores} />}
    </>
  );
}
