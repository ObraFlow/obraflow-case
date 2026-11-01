import { describe, expect, it } from "vitest";
import { fornecedoresMaisComprados } from "./fornecedoresMaisComprados";
import type { PedidoAcompanhado } from "./tipos";

type Pedido = PedidoAcompanhado & { fornecedorId: number };

function pedido(
  id: number,
  fornecedorId: number,
  totalCents: number,
  status: Pedido["status"] = "APROVADO",
): Pedido {
  return {
    id,
    obraId: 1,
    fornecedorId,
    totalCents,
    status,
    stepAtual: 1,
    criadoEm: 0,
    aprovacoes: [{ ordem: 0, aprovadorId: 1, status: "APROVADA", decididoEm: 1 }],
  };
}

describe("fornecedoresMaisComprados", () => {
  it("soma por fornecedor e ordena do maior valor para o menor", () => {
    const ranking = fornecedoresMaisComprados([
      pedido(1, 10, 100),
      pedido(2, 20, 500),
      pedido(3, 10, 300),
    ]);
    expect(ranking).toEqual([
      { fornecedorId: 20, pedidosAprovados: 1, totalCents: 500 },
      { fornecedorId: 10, pedidosAprovados: 2, totalCents: 400 },
    ]);
  });

  it("só compras aprovadas contam", () => {
    const ranking = fornecedoresMaisComprados([
      pedido(1, 10, 100, "PENDENTE"),
      pedido(2, 20, 100, "REJEITADO"),
      pedido(3, 30, 1, "APROVADO"),
    ]);
    expect(ranking.map((f) => f.fornecedorId)).toEqual([30]);
  });

  it("respeita o limite e desempata por quantidade e id", () => {
    const ranking = fornecedoresMaisComprados(
      [pedido(1, 3, 100), pedido(2, 1, 50), pedido(3, 1, 50), pedido(4, 2, 100)],
      2,
    );
    // Os três somam 100: o 1 tem dois pedidos e vem primeiro; 2 e 3 empatam e o id decide.
    expect(ranking.map((f) => f.fornecedorId)).toEqual([1, 2]);
  });

  it("sem aprovados devolve lista vazia", () => {
    expect(fornecedoresMaisComprados([])).toEqual([]);
  });
});
