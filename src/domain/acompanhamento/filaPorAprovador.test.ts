import { describe, expect, it } from "vitest";
import { filaPorAprovador } from "./filaPorAprovador";
import type { PedidoAcompanhado } from "./tipos";

const DIA = 86_400_000;

function pedido(parcial: Partial<PedidoAcompanhado> & Pick<PedidoAcompanhado, "id">) {
  const base: PedidoAcompanhado = {
    id: parcial.id,
    obraId: 1,
    totalCents: 100_000,
    status: "PENDENTE",
    stepAtual: 0,
    criadoEm: 10 * DIA,
    aprovacoes: [{ ordem: 0, aprovadorId: 1, status: "PENDENTE", decididoEm: null }],
  };
  return { ...base, ...parcial };
}

describe("filaPorAprovador", () => {
  it("sem pedidos pendentes, ninguém tem fila", () => {
    expect(filaPorAprovador([pedido({ id: 1, status: "APROVADO" })])).toEqual([]);
  });

  it("no primeiro nível, o pedido está na mesa desde a criação", () => {
    expect(filaPorAprovador([pedido({ id: 1 })])).toEqual([
      {
        aprovadorId: 1,
        quantidade: 1,
        totalCents: 100_000,
        maisAntigo: { pedidoId: 1, desde: 10 * DIA },
      },
    ]);
  });

  it("no segundo nível, conta para o aprovador da vez desde a decisão anterior", () => {
    const fila = filaPorAprovador([
      pedido({
        id: 1,
        stepAtual: 1,
        aprovacoes: [
          { ordem: 0, aprovadorId: 1, status: "APROVADA", decididoEm: 12 * DIA },
          { ordem: 1, aprovadorId: 2, status: "PENDENTE", decididoEm: null },
        ],
      }),
    ]);
    expect(fila).toEqual([
      {
        aprovadorId: 2,
        quantidade: 1,
        totalCents: 100_000,
        maisAntigo: { pedidoId: 1, desde: 12 * DIA },
      },
    ]);
  });

  it("soma os pedidos da mesma pessoa e guarda o mais antigo", () => {
    const [fila] = filaPorAprovador([
      pedido({ id: 1, criadoEm: 15 * DIA, totalCents: 50_000 }),
      pedido({ id: 2, criadoEm: 9 * DIA, totalCents: 70_000 }),
    ]);
    expect(fila.quantidade).toBe(2);
    expect(fila.totalCents).toBe(120_000);
    expect(fila.maisAntigo).toEqual({ pedidoId: 2, desde: 9 * DIA });
  });

  it("ordena pelo valor parado, do maior para o menor", () => {
    const filas = filaPorAprovador([
      pedido({ id: 1, totalCents: 10_000 }),
      pedido({
        id: 2,
        totalCents: 900_000,
        aprovacoes: [{ ordem: 0, aprovadorId: 2, status: "PENDENTE", decididoEm: null }],
      }),
    ]);
    expect(filas.map((fila) => fila.aprovadorId)).toEqual([2, 1]);
  });

  it("ignora pedido pendente sem posição para o step atual (dado inconsistente)", () => {
    expect(filaPorAprovador([pedido({ id: 1, stepAtual: 3 })])).toEqual([]);
  });
});
