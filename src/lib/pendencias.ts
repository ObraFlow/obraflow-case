// Texto das pendências do usuário atual, compartilhado pelo contador da navegação, pelo sino
// e pelo leitor de tela, para os três dizerem a mesma coisa.

export function rotuloPendencias(total: number): string {
  if (total === 0) return "Nenhum pedido aguarda a sua decisão";
  if (total === 1) return "1 pedido aguarda a sua decisão";
  return `${total} pedidos aguardam a sua decisão`;
}
