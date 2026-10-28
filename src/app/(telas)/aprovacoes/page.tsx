import { connection } from "next/server";
import { AbasFiltro, type FiltroLista } from "@/components/aprovacoes/abas-filtro";
import { FiltrosPedidos } from "@/components/aprovacoes/filtros-pedidos";
import { Paginacao } from "@/components/aprovacoes/paginacao";
import { TabelaPedidos } from "@/components/aprovacoes/tabela-pedidos";
import type { FiltrosDaLista } from "@/components/aprovacoes/url-da-lista";
import type { PedidoResumo } from "@/lib/dto";
import { filtroPedidosSchema, paginacaoSchema } from "@/lib/schemas/pedido";
import { listarObras } from "@/server/services/cadastros";
import { listarPedidos, paginarPedidos } from "@/server/services/pedidos";
import { usuarioAtualId } from "@/server/usuario-atual";

export const metadata = { title: "Aprovações — ObraFlow" };

type ParametrosDaUrl = {
  filtro?: string;
  obra?: string;
  situacao?: string;
  busca?: string;
  pagina?: string;
};

/**
 * Lista de pedidos com a alçada de cada um. Tudo que muda a lista vive na URL (aba, obra,
 * situação, busca, página), então a página continua Server Component e o link é
 * compartilhável. Os filtros e a paginação rodam no banco (`paginarPedidos`); o número da
 * aba "Aguardando minha decisão" vem de uma segunda consulta pequena (`pendentesPara`).
 * Pedidos mudam a cada decisão e não são cacheados: a leitura vem depois de `connection()`.
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

  const filtro: FiltroLista = parametros.filtro === "minhas" ? "minhas" : "todos";
  // Valor inválido na URL (obra que não existe, situação desconhecida) vira "sem filtro".
  const lidos = filtroPedidosSchema.safeParse({
    obraId: parametros.obra || undefined,
    status: parametros.situacao || undefined,
    busca: parametros.busca || undefined,
  });
  const filtros = lidos.success ? lidos.data : {};
  const paginacao = paginacaoSchema.parse({ pagina: parametros.pagina });

  const valores: FiltrosDaLista = {
    filtro,
    obraId: filtros.obraId ?? null,
    status: filtros.status ?? null,
    busca: filtros.busca ?? "",
  };

  await connection();
  const [pagina, minhas] = await Promise.all([
    paginarPedidos(
      { ...filtros, pendentesPara: filtro === "minhas" ? (usuarioId ?? undefined) : undefined },
      paginacao,
    ),
    usuarioId === null ? Promise.resolve([]) : listarPedidos({ pendentesPara: usuarioId }),
  ]);

  // Na aba "Todos", o que precisa da decisão do usuário vem primeiro, depois os outros
  // pendentes, depois os encerrados; dentro de cada grupo fica a ordem do banco.
  const ehMinha = (pedido: PedidoResumo) =>
    pedido.status === "PENDENTE" && usuarioId !== null && pedido.aprovadorAtualId === usuarioId;
  const grupo = (pedido: PedidoResumo) =>
    ehMinha(pedido) ? 0 : pedido.status === "PENDENTE" ? 1 : 2;
  const itens =
    filtro === "minhas" ? pagina.itens : [...pagina.itens].sort((a, b) => grupo(a) - grupo(b));

  // Sem usuário, a aba "minhas" não tem como existir: a tabela mostra o aviso.
  const semUsuarioNaAbaMinhas = filtro === "minhas" && usuarioId === null;

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.015em]">Aprovações</h1>
        <p className="text-muted-foreground">Abra um pedido para ver itens e histórico.</p>
      </div>

      <AbasFiltro filtro={filtro} pendentes={minhas.length} />

      <FiltrosPedidos obras={obras} valores={valores} />

      <TabelaPedidos
        pedidos={semUsuarioNaAbaMinhas ? [] : itens}
        usuarioAtualId={usuarioId}
        valores={valores}
      />

      {!semUsuarioNaAbaMinhas && <Paginacao pagina={pagina} valores={valores} />}
    </>
  );
}
