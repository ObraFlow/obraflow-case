import { describe, expect, it } from "vitest";
import { resolverRegra } from "./resolverRegra";
import type { FaixaAlcada } from "./tipos";

// Obra do enunciado: até R$ 10.000,00 → João; acima → João → Amanda.
const faixaBaixa: FaixaAlcada = {
  id: 1,
  minCents: 0,
  maxCents: 1_000_000,
  niveis: [{ ordem: 0, usuarioId: 1 }],
};
const faixaAlta: FaixaAlcada = {
  id: 2,
  minCents: 1_000_001,
  maxCents: null,
  niveis: [
    { ordem: 0, usuarioId: 1 },
    { ordem: 1, usuarioId: 2 },
  ],
};
const faixas = [faixaBaixa, faixaAlta];

describe("resolverRegra", () => {
  it("valor no meio da faixa baixa cai na faixa baixa", () => {
    expect(resolverRegra(faixas, 800_000)?.id).toBe(1);
  });

  it("valor exatamente no teto (R$ 10.000,00) ainda é da faixa baixa: teto é inclusivo", () => {
    expect(resolverRegra(faixas, 1_000_000)?.id).toBe(1);
  });

  it("um centavo acima do teto (R$ 10.000,01) já é da faixa alta: mínimo é inclusivo", () => {
    expect(resolverRegra(faixas, 1_000_001)?.id).toBe(2);
  });

  it("valor muito alto cai na faixa sem teto (maxCents null)", () => {
    expect(resolverRegra(faixas, 250_000_000)?.id).toBe(2);
  });

  it("pedido de R$ 0,00 cai na faixa que começa em zero", () => {
    expect(resolverRegra(faixas, 0)?.id).toBe(1);
  });

  it("devolve null quando o valor fica em um buraco entre faixas", () => {
    const comBuraco: FaixaAlcada[] = [
      { ...faixaBaixa, maxCents: 500_000 },
      { ...faixaAlta, minCents: 1_000_001 },
    ];
    expect(resolverRegra(comBuraco, 700_000)).toBeNull();
  });

  it("devolve null quando o valor fica abaixo da primeira faixa", () => {
    const comecaEmMil = [{ ...faixaBaixa, minCents: 100_000 }];
    expect(resolverRegra(comecaEmMil, 50_000)).toBeNull();
  });

  it("devolve null quando o valor passa do teto e não há faixa aberta", () => {
    expect(resolverRegra([faixaBaixa], 1_000_001)).toBeNull();
  });

  it("obra sem nenhuma faixa devolve null", () => {
    expect(resolverRegra([], 100)).toBeNull();
  });

  it("não depende da ordem em que as faixas chegam", () => {
    expect(resolverRegra([faixaAlta, faixaBaixa], 800_000)?.id).toBe(1);
    expect(resolverRegra([faixaAlta, faixaBaixa], 5_000_000)?.id).toBe(2);
  });
});
