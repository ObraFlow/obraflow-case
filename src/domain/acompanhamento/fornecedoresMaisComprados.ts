import type { PedidoAcompanhado } from "./tipos";

export type FornecedorComprado = {
  fornecedorId: number;
  pedidosAprovados: number;
  totalCents: number;
};

/**
 * Fornecedores com mais compras aprovadas, do maior valor para o menor (empate: mais
 * pedidos primeiro, depois id). Só pedidos APROVADOS contam: pendente ainda pode cair e
 * rejeitado não virou compra.
 */
export function fornecedoresMaisComprados(
  pedidos: ReadonlyArray<PedidoAcompanhado & { fornecedorId: number }>,
  limite = 5,
): FornecedorComprado[] {
  const porFornecedor = new Map<number, FornecedorComprado>();

  for (const pedido of pedidos) {
    if (pedido.status !== "APROVADO") continue;
    const atual = porFornecedor.get(pedido.fornecedorId) ?? {
      fornecedorId: pedido.fornecedorId,
      pedidosAprovados: 0,
      totalCents: 0,
    };
    atual.pedidosAprovados += 1;
    atual.totalCents += pedido.totalCents;
    porFornecedor.set(pedido.fornecedorId, atual);
  }

  return [...porFornecedor.values()]
    .sort(
      (a, b) =>
        b.totalCents - a.totalCents ||
        b.pedidosAprovados - a.pedidosAprovados ||
        a.fornecedorId - b.fornecedorId,
    )
    .slice(0, limite);
}
