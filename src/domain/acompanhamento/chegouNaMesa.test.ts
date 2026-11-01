import { describe, expect, it } from "vitest";
import { chegouNaMesa } from "./chegouNaMesa";
import type { PedidoAcompanhado } from "./tipos";

const DIA = 86_400_000;

const pedido: PedidoAcompanhado = {
  id: 1,
  obraId: 1,
  totalCents: 100_000,
  status: "PENDENTE",
  stepAtual: 1,
  criadoEm: 10 * DIA,
  aprovacoes: [
    { ordem: 0, aprovadorId: 1, status: "APROVADA", decididoEm: 12 * DIA },
    { ordem: 1, aprovadorId: 2, status: "PENDENTE", decididoEm: null },
  ],
};

describe("chegouNaMesa", () => {
  it("na primeira posição, o pedido chega na mesa quando é criado", () => {
    expect(chegouNaMesa(pedido, 0)).toBe(10 * DIA);
  });

  it("nas seguintes, chega quando a posição anterior decidiu", () => {
    expect(chegouNaMesa(pedido, 1)).toBe(12 * DIA);
  });

  it("sem instante na posição anterior, cai na criação (pior caso honesto)", () => {
    const inconsistente: PedidoAcompanhado = {
      ...pedido,
      aprovacoes: [
        { ordem: 0, aprovadorId: 1, status: "APROVADA", decididoEm: null },
        { ordem: 1, aprovadorId: 2, status: "PENDENTE", decididoEm: null },
      ],
    };
    expect(chegouNaMesa(inconsistente, 1)).toBe(10 * DIA);
  });
});
