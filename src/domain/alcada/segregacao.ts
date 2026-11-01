/**
 * Segregação de funções: quem vai aprovar um pedido não pode ser quem o cadastra.
 *
 * Devolve a posição (0..n-1) do usuário na cadeia que o pedido teria, ou null se ele não
 * aprova esse pedido. O service usa o resultado para recusar a criação com uma mensagem
 * que diz em qual nível a pessoa está; `aplicarDecisao` faz a segunda trava na decisão.
 */
export function posicaoNaCadeia(
  cadeia: ReadonlyArray<{ aprovadorId: number }>,
  usuarioId: number,
): number | null {
  const posicao = cadeia.findIndex((nivel) => nivel.aprovadorId === usuarioId);
  return posicao === -1 ? null : posicao;
}
