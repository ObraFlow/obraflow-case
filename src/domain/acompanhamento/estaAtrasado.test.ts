import { describe, expect, it } from "vitest";
import { DIA_MS, esperandoDesde, estaAtrasado } from "./estaAtrasado";
import type { PedidoAcompanhado } from "./tipos";

const AGORA = Date.UTC(2026, 9, 31, 12);
const JOAO = 1;
const AMANDA = 2;

function pedido(parte: Partial<PedidoAcompanhado>): PedidoAcompanhado {
  return {
    id: 1,
    obraId: 1,
    totalCents: 100_000,
    status: "PENDENTE",
    stepAtual: 0,
    criadoEm: AGORA - 4 * DIA_MS,
    aprovacoes: [
      { ordem: 0, aprovadorId: JOAO, status: "PENDENTE", decididoEm: null },
      { ordem: 1, aprovadorId: AMANDA, status: "PENDENTE", decididoEm: null },
    ],
    ...parte,
  };
}

describe("esperandoDesde", () => {
  it("no primeiro nível conta desde a criação", () => {
    expect(esperandoDesde(pedido({}))).toBe(AGORA - 4 * DIA_MS);
  });

  it("no segundo nível conta desde a decisão do primeiro", () => {
    const p = pedido({
      stepAtual: 1,
      criadoEm: AGORA - 10 * DIA_MS,
      aprovacoes: [
        { ordem: 0, aprovadorId: JOAO, status: "APROVADA", decididoEm: AGORA - DIA_MS },
        { ordem: 1, aprovadorId: AMANDA, status: "PENDENTE", decididoEm: null },
      ],
    });
    expect(esperandoDesde(p)).toBe(AGORA - DIA_MS);
  });

  it("pedido encerrado não espera ninguém", () => {
    expect(esperandoDesde(pedido({ status: "APROVADO" }))).toBeNull();
    expect(esperandoDesde(pedido({ status: "REJEITADO" }))).toBeNull();
  });
});

describe("estaAtrasado", () => {
  it("quatro dias sem decisão no primeiro nível: atrasado", () => {
    expect(estaAtrasado(pedido({}), AGORA)).toBe(true);
  });

  it("criado há dez dias, mas o nível atual só recebeu ontem: não está atrasado", () => {
    const p = pedido({
      stepAtual: 1,
      criadoEm: AGORA - 10 * DIA_MS,
      aprovacoes: [
        { ordem: 0, aprovadorId: JOAO, status: "APROVADA", decididoEm: AGORA - DIA_MS },
        { ordem: 1, aprovadorId: AMANDA, status: "PENDENTE", decididoEm: null },
      ],
    });
    expect(estaAtrasado(p, AGORA)).toBe(false);
  });

  it("exatamente três dias já conta como atraso", () => {
    expect(estaAtrasado(pedido({ criadoEm: AGORA - 3 * DIA_MS }), AGORA)).toBe(true);
    expect(estaAtrasado(pedido({ criadoEm: AGORA - 3 * DIA_MS + 1 }), AGORA)).toBe(false);
  });

  it("aprovado ou rejeitado nunca está atrasado", () => {
    expect(estaAtrasado(pedido({ status: "APROVADO" }), AGORA)).toBe(false);
    expect(estaAtrasado(pedido({ status: "REJEITADO" }), AGORA)).toBe(false);
  });

  it("aceita outro limite", () => {
    expect(estaAtrasado(pedido({}), AGORA, 5 * DIA_MS)).toBe(false);
  });
});
