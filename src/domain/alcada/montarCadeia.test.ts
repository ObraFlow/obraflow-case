import { describe, expect, it } from "vitest";
import { FaixaInvalida } from "../erros";
import { montarCadeia, niveisAcumulados } from "./montarCadeia";
import type { FaixaAlcada } from "./tipos";

// Enunciado: até 10 mil → João; acima → João primeiro, depois Amanda.
const BAIXA: FaixaAlcada = {
  id: 1,
  minCents: 0,
  maxCents: 1_000_000,
  niveis: [{ ordem: 0, usuarioId: 1 }],
};
const ALTA: FaixaAlcada = {
  id: 2,
  minCents: 1_000_001,
  maxCents: null,
  niveis: [{ ordem: 0, usuarioId: 2 }],
};

describe("niveisAcumulados", () => {
  it("na faixa mais baixa, só os aprovadores dela", () => {
    expect(niveisAcumulados([BAIXA, ALTA], BAIXA)).toEqual([{ usuarioId: 1, faixaId: 1 }]);
  });

  it("na faixa de cima, primeiro quem aprova a de baixo, depois os dela", () => {
    expect(niveisAcumulados([BAIXA, ALTA], ALTA)).toEqual([
      { usuarioId: 1, faixaId: 1 },
      { usuarioId: 2, faixaId: 2 },
    ]);
  });

  it("com três faixas, acumula em ordem crescente de valor, não na ordem recebida", () => {
    const MEDIA: FaixaAlcada = {
      id: 3,
      minCents: 500_001,
      maxCents: 1_000_000,
      niveis: [{ ordem: 0, usuarioId: 3 }],
    };
    const baixa = { ...BAIXA, maxCents: 500_000 };
    expect(niveisAcumulados([ALTA, MEDIA, baixa], ALTA).map((n) => n.usuarioId)).toEqual([1, 3, 2]);
  });

  it("respeita a ordem interna de cada faixa", () => {
    const alta: FaixaAlcada = {
      ...ALTA,
      niveis: [
        { ordem: 1, usuarioId: 4 },
        { ordem: 0, usuarioId: 2 },
      ],
    };
    expect(niveisAcumulados([BAIXA, alta], alta).map((n) => n.usuarioId)).toEqual([1, 2, 4]);
  });

  it("ignora faixas acima da aplicável", () => {
    expect(niveisAcumulados([BAIXA, ALTA], BAIXA).map((n) => n.usuarioId)).toEqual([1]);
  });

  it("uma pessoa repetida em duas faixas entra uma vez, na primeira posição", () => {
    const alta: FaixaAlcada = {
      ...ALTA,
      niveis: [
        { ordem: 0, usuarioId: 1 },
        { ordem: 1, usuarioId: 2 },
      ],
    };
    expect(niveisAcumulados([BAIXA, alta], alta).map((n) => n.usuarioId)).toEqual([1, 2]);
  });
});

describe("montarCadeia", () => {
  it("pedido de R$ 12.500 na faixa alta: João (0) e depois Amanda (1), ambos pendentes", () => {
    expect(montarCadeia([BAIXA, ALTA], ALTA)).toEqual([
      { ordem: 0, aprovadorId: 1, status: "PENDENTE", motivo: null },
      { ordem: 1, aprovadorId: 2, status: "PENDENTE", motivo: null },
    ]);
  });

  it("pedido de R$ 8.000 na faixa baixa: só João", () => {
    expect(montarCadeia([BAIXA, ALTA], BAIXA).map((a) => a.aprovadorId)).toEqual([1]);
  });

  it("renumera de 0 a n-1 mesmo com ordens com buraco (0, 5, 9) dentro da faixa", () => {
    const faixa: FaixaAlcada = {
      id: 9,
      minCents: 0,
      maxCents: null,
      niveis: [
        { ordem: 0, usuarioId: 1 },
        { ordem: 5, usuarioId: 2 },
        { ordem: 9, usuarioId: 3 },
      ],
    };
    expect(montarCadeia([faixa], faixa).map((a) => a.ordem)).toEqual([0, 1, 2]);
  });

  it("não altera as faixas recebidas", () => {
    const niveis = [
      { ordem: 1, usuarioId: 2 },
      { ordem: 0, usuarioId: 1 },
    ];
    const faixa: FaixaAlcada = { id: 2, minCents: 0, maxCents: null, niveis };
    montarCadeia([faixa], faixa);
    expect(faixa.niveis).toBe(niveis);
    expect(niveis[0].ordem).toBe(1);
  });

  it("faixa sem aprovadores (nem herdados) é erro de domínio", () => {
    const faixa: FaixaAlcada = { id: 3, minCents: 0, maxCents: null, niveis: [] };
    expect(() => montarCadeia([faixa], faixa)).toThrow(FaixaInvalida);
  });
});
