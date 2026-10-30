import type { PedidoAcompanhado } from "./tipos";

/**
 * Quando o pedido chegou na mesa do aprovador da posição `ordem`: na primeira posição é a
 * criação do pedido; nas seguintes é o instante em que a posição anterior decidiu, porque
 * até lá o aprovador nem sabia que ia decidir. Se a posição anterior não tem instante
 * (dado inconsistente), cai na criação, que é o pior caso honesto.
 */
export function chegouNaMesa(pedido: PedidoAcompanhado, ordem: number): number {
  if (ordem === 0) return pedido.criadoEm;
  const anterior = pedido.aprovacoes.find((aprovacao) => aprovacao.ordem === ordem - 1);
  return anterior?.decididoEm ?? pedido.criadoEm;
}
