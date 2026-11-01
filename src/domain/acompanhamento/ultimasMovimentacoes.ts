import type { PedidoAcompanhadoCompleto } from "./tipos";

export type TipoMovimentacao = "cadastrou" | "refez" | "aprovou" | "rejeitou";

export type Movimentacao = {
  tipo: TipoMovimentacao;
  /** Instante em ms. */
  em: number;
  pedidoId: number;
  obraId: number;
  /** Quem fez: o solicitante (cadastrou/refez) ou o aprovador (aprovou/rejeitou). */
  usuarioId: number;
  totalCents: number;
};

/**
 * As últimas coisas que aconteceram com os pedidos, da mais recente para a mais antiga.
 * Tudo sai do que a cadeia já guarda: a criação (ou o refazer, quando há `origemId`) e
 * cada decisão com instante. Nível cancelado por rejeição não é movimentação: ninguém agiu.
 */
export function ultimasMovimentacoes(
  pedidos: ReadonlyArray<PedidoAcompanhadoCompleto>,
  limite = 8,
): Movimentacao[] {
  const movimentacoes: Movimentacao[] = [];

  for (const pedido of pedidos) {
    movimentacoes.push({
      tipo: pedido.origemId === null ? "cadastrou" : "refez",
      em: pedido.criadoEm,
      pedidoId: pedido.id,
      obraId: pedido.obraId,
      usuarioId: pedido.criadoPorId,
      totalCents: pedido.totalCents,
    });

    for (const aprovacao of pedido.aprovacoes) {
      if (aprovacao.decididoEm === null) continue;
      if (aprovacao.status !== "APROVADA" && aprovacao.status !== "REJEITADA") continue;
      movimentacoes.push({
        tipo: aprovacao.status === "APROVADA" ? "aprovou" : "rejeitou",
        em: aprovacao.decididoEm,
        pedidoId: pedido.id,
        obraId: pedido.obraId,
        usuarioId: aprovacao.aprovadorId,
        totalCents: pedido.totalCents,
      });
    }
  }

  return movimentacoes.sort((a, b) => b.em - a.em || b.pedidoId - a.pedidoId).slice(0, limite);
}
