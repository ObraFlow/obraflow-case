import { chegouNaMesa } from "./chegouNaMesa";
import type { PedidoAcompanhado } from "./tipos";

export type FilaAprovador = {
  aprovadorId: number;
  /** Pedidos aguardando a decisão desta pessoa agora. */
  quantidade: number;
  /** Soma dos totais desses pedidos. */
  totalCents: number;
  /** O pedido que está há mais tempo na mesa dela e desde quando (ms). */
  maisAntigo: { pedidoId: number; desde: number };
};

/**
 * Quanto está parado com cada aprovador: só pedidos PENDENTES contam, e cada um conta
 * para o aprovador da posição `stepAtual`. Ordenado do maior valor parado para o menor
 * (empate: mais pedidos primeiro, depois id), porque a pergunta da tela é "onde está o
 * dinheiro parado?".
 */
export function filaPorAprovador(pedidos: ReadonlyArray<PedidoAcompanhado>): FilaAprovador[] {
  const filas = new Map<number, FilaAprovador>();

  for (const pedido of pedidos) {
    if (pedido.status !== "PENDENTE") continue;
    const atual = pedido.aprovacoes.find((aprovacao) => aprovacao.ordem === pedido.stepAtual);
    if (!atual) continue;

    const desde = chegouNaMesa(pedido, pedido.stepAtual);
    const fila = filas.get(atual.aprovadorId);
    if (!fila) {
      filas.set(atual.aprovadorId, {
        aprovadorId: atual.aprovadorId,
        quantidade: 1,
        totalCents: pedido.totalCents,
        maisAntigo: { pedidoId: pedido.id, desde },
      });
      continue;
    }
    fila.quantidade += 1;
    fila.totalCents += pedido.totalCents;
    if (desde < fila.maisAntigo.desde) fila.maisAntigo = { pedidoId: pedido.id, desde };
  }

  return [...filas.values()].sort(
    (a, b) =>
      b.totalCents - a.totalCents || b.quantidade - a.quantidade || a.aprovadorId - b.aprovadorId,
  );
}
