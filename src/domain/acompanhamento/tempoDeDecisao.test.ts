import { describe, expect, it } from "vitest";
import { tempoPorAprovador, tempoPorObra } from "./tempoDeDecisao";
import type { PedidoAcompanhado } from "./tipos";

const DIA = 86_400_000;

/** Criado no dia 10; João aprovou no dia 12 (2 dias); Amanda aprovou no dia 13 (1 dia). */
const aprovadoEmDoisNiveis: PedidoAcompanhado = {
  id: 1,
  obraId: 1,
  totalCents: 100_000,
  status: "APROVADO",
  stepAtual: 2,
  criadoEm: 10 * DIA,
  aprovacoes: [
    { ordem: 0, aprovadorId: 1, status: "APROVADA", decididoEm: 12 * DIA },
    { ordem: 1, aprovadorId: 2, status: "APROVADA", decididoEm: 13 * DIA },
  ],
};

/** Criado no dia 20; João rejeitou no dia 24 (4 dias); Amanda foi cancelada. */
const rejeitadoNoPrimeiro: PedidoAcompanhado = {
  id: 2,
  obraId: 2,
  totalCents: 100_000,
  status: "REJEITADO",
  stepAtual: 0,
  criadoEm: 20 * DIA,
  aprovacoes: [
    { ordem: 0, aprovadorId: 1, status: "REJEITADA", decididoEm: 24 * DIA },
    { ordem: 1, aprovadorId: 2, status: "CANCELADA", decididoEm: null },
  ],
};

const pendente: PedidoAcompanhado = {
  id: 3,
  obraId: 1,
  totalCents: 100_000,
  status: "PENDENTE",
  stepAtual: 0,
  criadoEm: 30 * DIA,
  aprovacoes: [{ ordem: 0, aprovadorId: 3, status: "PENDENTE", decididoEm: null }],
};

describe("tempoPorAprovador", () => {
  it("mede da chegada na mesa até a decisão, por nível", () => {
    expect(tempoPorAprovador([aprovadoEmDoisNiveis])).toEqual([
      { aprovadorId: 1, decisoes: 1, mediaMs: 2 * DIA },
      { aprovadorId: 2, decisoes: 1, mediaMs: 1 * DIA },
    ]);
  });

  it("rejeição conta como decisão; cancelada e pendente não contam", () => {
    const tempos = tempoPorAprovador([rejeitadoNoPrimeiro, pendente]);
    expect(tempos).toEqual([{ aprovadorId: 1, decisoes: 1, mediaMs: 4 * DIA }]);
  });

  it("faz a média por pessoa e põe o mais lento primeiro", () => {
    const tempos = tempoPorAprovador([aprovadoEmDoisNiveis, rejeitadoNoPrimeiro]);
    expect(tempos).toEqual([
      { aprovadorId: 1, decisoes: 2, mediaMs: 3 * DIA },
      { aprovadorId: 2, decisoes: 1, mediaMs: 1 * DIA },
    ]);
  });

  it("sem decisões, não há o que medir", () => {
    expect(tempoPorAprovador([pendente])).toEqual([]);
  });
});

describe("tempoPorObra", () => {
  it("mede da criação até a última decisão, só para pedidos encerrados", () => {
    expect(tempoPorObra([aprovadoEmDoisNiveis, rejeitadoNoPrimeiro, pendente])).toEqual([
      { obraId: 1, pedidosEncerrados: 1, mediaMs: 3 * DIA },
      { obraId: 2, pedidosEncerrados: 1, mediaMs: 4 * DIA },
    ]);
  });

  it("faz a média por obra", () => {
    const outro: PedidoAcompanhado = { ...rejeitadoNoPrimeiro, id: 4, obraId: 1 };
    expect(tempoPorObra([aprovadoEmDoisNiveis, outro])).toEqual([
      { obraId: 1, pedidosEncerrados: 2, mediaMs: 3.5 * DIA },
    ]);
  });
});
