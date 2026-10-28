import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CabecalhoPedido } from "@/components/aprovacoes/cabecalho-pedido";
import { FaixaDecisao } from "@/components/aprovacoes/faixa-decisao";
import { TabelaItens } from "@/components/aprovacoes/tabela-itens";
import { TimelineAlcada } from "@/components/aprovacoes/timeline-alcada";
import { NaoEncontrado } from "@/domain/erros";
import type { PedidoDetalhe } from "@/lib/dto";
import { obterPedido } from "@/server/services/pedidos";
import { usuarioAtualId } from "@/server/usuario-atual";

/**
 * `NaoEncontrado` é o único erro de domínio que este segmento traduz, e para 404: é a
 * mesma tradução que `_http.ts` faz na API. Qualquer outro erro sobe para o error.tsx.
 */
async function carregarPedido(id: number): Promise<PedidoDetalhe> {
  try {
    return await obterPedido(id);
  } catch (erro) {
    if (erro instanceof NaoEncontrado) notFound();
    throw erro;
  }
}

/**
 * Detalhe do pedido: cabeçalho, faixa de decisão, itens e timeline da alçada.
 * `params` é assíncrono no Next 16; id que não é inteiro positivo vira 404 sem ir ao banco.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Pedido #${id} — ObraFlow` };
}

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, usuarioId] = await Promise.all([params, usuarioAtualId()]);
  const pedidoId = /^[1-9]\d*$/.test(id) ? Number(id) : null;
  if (pedidoId === null) notFound();

  await connection();
  const pedido = await carregarPedido(pedidoId);

  return (
    <>
      <CabecalhoPedido pedido={pedido} />

      {/* A key remonta a faixa ao trocar o "Agindo como": o "Você aprovou às..." é de quem decidiu. */}
      <FaixaDecisao key={usuarioId ?? "nenhum"} pedido={pedido} usuarioAtualId={usuarioId} />

      {/* `minmax(0,1fr)` também na coluna única: sem isso a trilha cresce até o min-content da tabela. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <TabelaItens
          itens={pedido.itens}
          totalCents={pedido.totalCents}
          observacoes={pedido.observacoes}
        />
        <TimelineAlcada pedido={pedido} usuarioAtualId={usuarioId} />
      </div>
    </>
  );
}
