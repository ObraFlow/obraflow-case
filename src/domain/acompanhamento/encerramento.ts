import type { PedidoAcompanhado } from "./tipos";

/**
 * Instante (ms) em que o pedido foi encerrado: a última decisão registrada na cadeia.
 * Null se ainda está pendente ou se nenhuma posição tem instante (dado inconsistente).
 */
export function instanteDeEncerramento(pedido: PedidoAcompanhado): number | null {
  if (pedido.status === "PENDENTE") return null;
  const instantes = pedido.aprovacoes
    .map((aprovacao) => aprovacao.decididoEm)
    .filter((instante): instante is number => instante !== null);
  return instantes.length === 0 ? null : Math.max(...instantes);
}

/**
 * Instante (ms) da aprovação final do pedido: quando o último nível aprovou e o dinheiro
 * ficou comprometido de fato. Só pedidos APROVADOS têm; os demais devolvem null.
 */
export function instanteDeAprovacao(pedido: PedidoAcompanhado): number | null {
  if (pedido.status !== "APROVADO") return null;
  return instanteDeEncerramento(pedido);
}
